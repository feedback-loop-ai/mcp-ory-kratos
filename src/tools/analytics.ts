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
  type CredentialAnalyticsInput,
  CredentialAnalyticsInputSchema,
  type CredentialAnalyticsOutput,
  type SessionAnalyticsInput,
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
 * Extract page token from Link header
 */
function extractPageToken(linkHeader: unknown): string | undefined {
  if (typeof linkHeader !== "string") return undefined;
  const nextMatch = linkHeader.match(/<[^>]*[?&]page_token=([^&>]+)[^>]*>;\s*rel="next"/);
  return nextMatch?.[1];
}

/**
 * Check if session is within time range
 */
function isSessionInTimeRange(
  authenticatedAt: string | undefined,
  fromDate: string | undefined,
  toDate: string | undefined,
): boolean {
  if (!authenticatedAt) return true;
  const authDate = new Date(authenticatedAt);
  if (fromDate && authDate < new Date(fromDate)) return false;
  if (toDate && authDate > new Date(toDate)) return false;
  return true;
}

/**
 * Aggregate authentication methods from session
 */
function aggregateAuthMethods(
  methods: Array<{ method?: string }> | undefined,
  target: Record<string, number>,
): void {
  if (!methods) return;
  for (const method of methods) {
    if (method.method) {
      incrementCount(target, method.method);
    }
  }
}

/**
 * Update assurance level counts
 */
function updateAssuranceLevel(
  aal: string | undefined,
  target: { aal1: number; aal2: number },
): void {
  if (aal === "aal1") {
    target.aal1++;
  } else if (aal === "aal2" || aal === "aal3") {
    target.aal2++;
  }
}

/**
 * Aggregate device information from session
 */
function aggregateDeviceInfo(
  devices: Array<{ user_agent?: string }> | undefined,
  byDeviceType: Record<string, number>,
  byBrowser: Record<string, number>,
): void {
  if (!devices) return;
  for (const device of devices) {
    if (device.user_agent) {
      const { deviceType, browser } = parseUserAgent(device.user_agent);
      incrementCount(byDeviceType, deviceType);
      incrementCount(byBrowser, browser);
    }
  }
}

/**
 * Process a single session for analytics aggregation
 */
function processSessionForAnalytics(
  session: {
    active?: boolean;
    authentication_methods?: Array<{ method?: string }>;
    authenticator_assurance_level?: string;
    devices?: Array<{ user_agent?: string }>;
  },
  analytics: SessionAnalyticsOutput,
  includeAuthMethods: boolean,
  includeDevices: boolean,
): void {
  analytics.totalSessions++;

  if (session.active) {
    analytics.activeSessions++;
  } else {
    analytics.inactiveSessions++;
  }

  if (includeAuthMethods) {
    aggregateAuthMethods(session.authentication_methods, analytics.byAuthenticationMethod);
  }

  updateAssuranceLevel(session.authenticator_assurance_level, analytics.byAssuranceLevel);

  if (includeDevices) {
    aggregateDeviceInfo(session.devices, analytics.byDeviceType, analytics.byBrowser);
  }
}

/**
 * Process identity for credential analytics
 */
function processIdentityForCredentialAnalytics(
  identity: { credentials?: Record<string, unknown> },
  analytics: CredentialAnalyticsOutput,
): void {
  analytics.totalIdentities++;

  const credentials = identity.credentials;
  if (!credentials) {
    if (analytics.mfaAdoption) {
      analytics.mfaAdoption.disabled++;
    }
    return;
  }

  let hasMfa = false;
  const credentialTypes = Object.keys(credentials);

  for (const credType of credentialTypes) {
    incrementCount(analytics.credentialDistribution, credType);
    if (["totp", "webauthn", "lookup_secret"].includes(credType)) {
      hasMfa = true;
    }
  }

  if (analytics.mfaAdoption) {
    if (hasMfa) {
      analytics.mfaAdoption.enabled++;
    } else {
      analytics.mfaAdoption.disabled++;
    }
  }
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
      log.info("Generating session analytics", { tool: "kratos_session_analytics" });
      const startTime = Date.now();

      try {
        const analytics = await fetchSessionAnalytics(kratosClients, args);

        log.info("Session analytics generated successfully", {
          tool: "kratos_session_analytics",
          durationMs: Date.now() - startTime,
        });

        return {
          content: [{ type: "text" as const, text: JSON.stringify(analytics, null, 2) }],
        };
      } catch (error) {
        log.error("Failed to generate session analytics", {
          tool: "kratos_session_analytics",
          durationMs: Date.now() - startTime,
          error: { message: error instanceof Error ? error.message : String(error) },
        });

        const mcpError = mapError(error, "session_analytics");
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ error: mcpError }, null, 2) }],
          isError: true,
        };
      }
    },
  );
}

/**
 * Fetch and aggregate session analytics
 */
async function fetchSessionAnalytics(
  kratosClients: KratosClients,
  args: SessionAnalyticsInput,
): Promise<SessionAnalyticsOutput> {
  const analytics: SessionAnalyticsOutput = {
    totalSessions: 0,
    activeSessions: 0,
    inactiveSessions: 0,
    byAuthenticationMethod: {},
    byAssuranceLevel: { aal1: 0, aal2: 0 },
    byDeviceType: {},
    byBrowser: {},
    timeRange: { from: args.from, to: args.to },
  };

  let pageToken: string | undefined;
  let pagesProcessed = 0;
  const maxPages = 100;

  do {
    const response = await kratosClients.identity.listSessions({
      pageSize: 250,
      pageToken,
      expand: ["devices"],
    });

    for (const session of response.data) {
      if (!isSessionInTimeRange(session.authenticated_at, args.from, args.to)) {
        continue;
      }
      processSessionForAnalytics(
        session,
        analytics,
        args.includeAuthMethods !== false,
        args.includeDevices !== false,
      );
    }

    pageToken = extractPageToken(response.headers?.link);
    pagesProcessed++;
  } while (pageToken && pagesProcessed < maxPages);

  return analytics;
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
      log.info("Generating credential analytics", { tool: "kratos_credential_analytics" });
      const startTime = Date.now();

      try {
        const analytics = await fetchCredentialAnalytics(kratosClients, args);

        log.info("Credential analytics generated successfully", {
          tool: "kratos_credential_analytics",
          durationMs: Date.now() - startTime,
        });

        return {
          content: [{ type: "text" as const, text: JSON.stringify(analytics, null, 2) }],
        };
      } catch (error) {
        log.error("Failed to generate credential analytics", {
          tool: "kratos_credential_analytics",
          durationMs: Date.now() - startTime,
          error: { message: error instanceof Error ? error.message : String(error) },
        });

        const mcpError = mapError(error, "credential_analytics");
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ error: mcpError }, null, 2) }],
          isError: true,
        };
      }
    },
  );
}

/**
 * Fetch and aggregate credential analytics
 */
async function fetchCredentialAnalytics(
  kratosClients: KratosClients,
  args: CredentialAnalyticsInput,
): Promise<CredentialAnalyticsOutput> {
  const analytics: CredentialAnalyticsOutput = {
    totalIdentities: 0,
    credentialDistribution: {},
    mfaAdoption: args.includeMfa !== false ? { enabled: 0, disabled: 0 } : undefined,
  };

  let pageToken: string | undefined;
  let pagesProcessed = 0;
  const maxPages = 100;

  do {
    const response = await kratosClients.identity.listIdentities({
      pageSize: 250,
      pageToken,
    });

    for (const identity of response.data) {
      processIdentityForCredentialAnalytics(identity, analytics);
    }

    pageToken = extractPageToken(response.headers?.link);
    pagesProcessed++;
  } while (pageToken && pagesProcessed < maxPages);

  return analytics;
}
