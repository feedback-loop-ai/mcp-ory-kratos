/**
 * Analytics tools for Kratos MCP Server
 *
 * Implements session and credential analytics for business analysts
 * @module tools/analytics
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { mapError } from "../errors/mapper.js";
import type { KratosClients } from "../kratos/client.js";
import type { CorrelatedLogger } from "../logging/logger.js";
import {
  CredentialAnalyticsInputSchema,
  type CredentialAnalyticsOutput,
  SessionAnalyticsInputSchema,
  type SessionAnalyticsOutput,
} from "../schemas/tools.js";

/**
 * Parse user agent string to extract device type and browser
 */
export function parseUserAgent(userAgent: string): { deviceType: string; browser: string } {
  const ua = userAgent.toLowerCase();

  // Determine device type
  let deviceType = "desktop";
  if (/mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(ua)) {
    deviceType = "mobile";
  } else if (/tablet|ipad|playbook|silk/i.test(ua)) {
    deviceType = "tablet";
  } else if (/bot|crawler|spider|scraper/i.test(ua)) {
    deviceType = "bot";
  }

  // Determine browser
  let browser = "unknown";
  if (ua.includes("firefox")) {
    browser = "Firefox";
  } else if (ua.includes("edg/")) {
    browser = "Edge";
  } else if (ua.includes("chrome") && !ua.includes("edg/")) {
    browser = "Chrome";
  } else if (ua.includes("safari") && !ua.includes("chrome")) {
    browser = "Safari";
  } else if (ua.includes("opera") || ua.includes("opr/")) {
    browser = "Opera";
  } else if (ua.includes("msie") || ua.includes("trident/")) {
    browser = "Internet Explorer";
  }

  return { deviceType, browser };
}

/**
 * Increment count in a record
 */
function incrementCount(record: Record<string, number>, key: string): void {
  record[key] = (record[key] ?? 0) + 1;
}

/**
 * Register session analytics tool (US1)
 */
export function registerSessionAnalyticsTools(
  server: McpServer,
  kratosClients: KratosClients,
  getLogger: () => CorrelatedLogger,
): void {
  // kratos_session_analytics - Aggregated session statistics
  server.tool(
    "kratos_session_analytics",
    "Get aggregated session statistics including authentication methods, device types, and browser distribution. Useful for understanding user login patterns.",
    SessionAnalyticsInputSchema.shape,
    async (args) => {
      const log = getLogger();

      log.info("Generating session analytics", {
        tool: "kratos_session_analytics",
      });

      const startTime = Date.now();

      try {
        // Aggregate sessions by fetching pages
        const analytics: SessionAnalyticsOutput = {
          totalSessions: 0,
          activeSessions: 0,
          inactiveSessions: 0,
          byAuthenticationMethod: {},
          byAssuranceLevel: { aal1: 0, aal2: 0 },
          byDeviceType: {},
          byBrowser: {},
          timeRange: {
            from: args.from,
            to: args.to,
          },
        };

        let pageToken: string | undefined;
        let pagesProcessed = 0;
        const maxPages = 100; // Safety limit

        do {
          const response = await kratosClients.identity.listSessions({
            pageSize: 250, // Max page size for efficiency
            pageToken,
            expand: ["devices"],
          });

          const sessions = response.data;

          for (const session of sessions) {
            // Filter by time range if specified
            const authenticatedAt = session.authenticated_at
              ? new Date(session.authenticated_at)
              : null;

            if (args.from && authenticatedAt && authenticatedAt < new Date(args.from)) {
              continue;
            }
            if (args.to && authenticatedAt && authenticatedAt > new Date(args.to)) {
              continue;
            }

            analytics.totalSessions++;

            // Count active/inactive
            if (session.active) {
              analytics.activeSessions++;
            } else {
              analytics.inactiveSessions++;
            }

            // Aggregate by authentication method
            if (args.includeAuthMethods !== false && session.authentication_methods) {
              for (const method of session.authentication_methods) {
                if (method.method) {
                  incrementCount(analytics.byAuthenticationMethod, method.method);
                }
              }
            }

            // Aggregate by AAL
            const aal = session.authenticator_assurance_level;
            if (aal === "aal1") {
              analytics.byAssuranceLevel.aal1++;
            } else if (aal === "aal2" || aal === "aal3") {
              analytics.byAssuranceLevel.aal2++;
            }

            // Aggregate by device type and browser
            if (args.includeDevices !== false && session.devices) {
              for (const device of session.devices) {
                if (device.user_agent) {
                  const { deviceType, browser } = parseUserAgent(device.user_agent);
                  incrementCount(analytics.byDeviceType, deviceType);
                  incrementCount(analytics.byBrowser, browser);
                }
              }
            }
          }

          // Get next page token from Link header
          const linkHeader = response.headers?.link;
          pageToken = undefined;

          if (typeof linkHeader === "string") {
            const nextMatch = linkHeader.match(/<[^>]*[?&]page_token=([^&>]+)[^>]*>;\s*rel="next"/);
            if (nextMatch?.[1]) {
              pageToken = nextMatch[1];
            }
          }

          pagesProcessed++;
        } while (pageToken && pagesProcessed < maxPages);

        log.info("Session analytics generated successfully", {
          tool: "kratos_session_analytics",
          durationMs: Date.now() - startTime,
        });

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(analytics, null, 2),
            },
          ],
        };
      } catch (error) {
        log.error("Failed to generate session analytics", {
          tool: "kratos_session_analytics",
          durationMs: Date.now() - startTime,
          error: { message: error instanceof Error ? error.message : String(error) },
        });

        const mcpError = mapError(error, "session_analytics");
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ error: mcpError }, null, 2),
            },
          ],
          isError: true,
        };
      }
    },
  );
}

/**
 * Register credential analytics tool (US5)
 */
export function registerCredentialAnalyticsTools(
  server: McpServer,
  kratosClients: KratosClients,
  getLogger: () => CorrelatedLogger,
): void {
  // kratos_credential_analytics - Credential type distribution
  server.tool(
    "kratos_credential_analytics",
    "Get authentication method adoption statistics showing which credential types (password, OIDC, TOTP, WebAuthn) are most used and MFA adoption rates.",
    CredentialAnalyticsInputSchema.shape,
    async (args) => {
      const log = getLogger();

      log.info("Generating credential analytics", {
        tool: "kratos_credential_analytics",
      });

      const startTime = Date.now();

      try {
        const analytics: CredentialAnalyticsOutput = {
          totalIdentities: 0,
          credentialDistribution: {},
          mfaAdoption:
            args.includeMfa !== false
              ? {
                  enabled: 0,
                  disabled: 0,
                }
              : undefined,
        };

        let pageToken: string | undefined;
        let pagesProcessed = 0;
        const maxPages = 100;

        do {
          const response = await kratosClients.identity.listIdentities({
            pageSize: 250,
            pageToken,
          });

          const identities = response.data;

          for (const identity of identities) {
            analytics.totalIdentities++;

            // Count credential types
            const credentials = identity.credentials;
            if (credentials) {
              let hasMfa = false;
              const credentialTypes = Object.keys(credentials);

              for (const credType of credentialTypes) {
                incrementCount(analytics.credentialDistribution, credType);

                // Check for MFA credentials
                if (["totp", "webauthn", "lookup_secret"].includes(credType)) {
                  hasMfa = true;
                }
              }

              // Track MFA adoption
              if (analytics.mfaAdoption) {
                if (hasMfa) {
                  analytics.mfaAdoption.enabled++;
                } else {
                  analytics.mfaAdoption.disabled++;
                }
              }
            } else if (analytics.mfaAdoption) {
              // No credentials info available
              analytics.mfaAdoption.disabled++;
            }
          }

          // Get next page token from Link header
          const linkHeader = response.headers?.link;
          pageToken = undefined;

          if (typeof linkHeader === "string") {
            const nextMatch = linkHeader.match(/<[^>]*[?&]page_token=([^&>]+)[^>]*>;\s*rel="next"/);
            if (nextMatch?.[1]) {
              pageToken = nextMatch[1];
            }
          }

          pagesProcessed++;
        } while (pageToken && pagesProcessed < maxPages);

        log.info("Credential analytics generated successfully", {
          tool: "kratos_credential_analytics",
          durationMs: Date.now() - startTime,
        });

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(analytics, null, 2),
            },
          ],
        };
      } catch (error) {
        log.error("Failed to generate credential analytics", {
          tool: "kratos_credential_analytics",
          durationMs: Date.now() - startTime,
          error: { message: error instanceof Error ? error.message : String(error) },
        });

        const mcpError = mapError(error, "credential_analytics");
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ error: mcpError }, null, 2),
            },
          ],
          isError: true,
        };
      }
    },
  );
}
