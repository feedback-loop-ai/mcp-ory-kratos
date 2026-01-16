/**
 * Session management tools for Kratos MCP Server
 *
 * Implements tools for listing, viewing, and managing user sessions
 * @module tools/session
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { mapError } from "../errors/mapper.js";
import type { KratosClients } from "../kratos/client.js";
import type { CorrelatedLogger } from "../logging/logger.js";
import {
  DeleteIdentitySessionsInputSchema,
  DisableSessionInputSchema,
  ExtendSessionInputSchema,
  GetSessionInputSchema,
  ListIdentitySessionsInputSchema,
  ListSessionsInputSchema,
  type SessionFilter,
} from "../schemas/tools.js";

// Valid expand options for session APIs
type SessionExpandOption = "identity" | "devices";

// Convert expand array to API enum array
function formatExpandForList(expand?: string[]): Array<"identity" | "devices"> | undefined {
  if (!expand) return undefined;
  return expand.filter((e): e is SessionExpandOption => e === "identity" || e === "devices");
}

function formatExpandForGet(expand?: string[]): Array<"identity" | "devices"> | undefined {
  if (!expand) return undefined;
  return expand.filter((e): e is SessionExpandOption => e === "identity" || e === "devices");
}

/** Helper to check if a session matches the filter criteria */
function sessionMatchesFilter(
  session: { authenticated_at?: string; authentication_methods?: Array<{ method?: string }> },
  filter?: SessionFilter,
): boolean {
  if (!filter) return true;

  // Check auth method filter
  if (filter.authMethod) {
    const hasMethod = session.authentication_methods?.some((am) => {
      if (am.method !== filter.authMethod) return false;
      // If provider specified, also check provider (for OIDC)
      if (filter.provider && filter.authMethod === "oidc") {
        return (am as { provider?: string }).provider === filter.provider;
      }
      return true;
    });
    if (!hasMethod) return false;
  }

  // Check time range filters
  if (filter.authenticatedAfter && session.authenticated_at) {
    if (new Date(session.authenticated_at) < new Date(filter.authenticatedAfter)) return false;
  }
  if (filter.authenticatedBefore && session.authenticated_at) {
    if (new Date(session.authenticated_at) > new Date(filter.authenticatedBefore)) return false;
  }

  return true;
}

/**
 * Register session query tools (list_sessions, get_session)
 * Used in Phase 3 (US1) and Phase 4 (US2)
 */
export function registerSessionQueryTools(
  server: McpServer,
  kratosClients: KratosClients,
  getLogger: () => CorrelatedLogger,
): void {
  // kratos_list_sessions - List sessions with optional server-side filtering
  server.tool(
    "kratos_list_sessions",
    "List all sessions across all identities with optional filtering by active status. Use expand to include identity or device details. Use filter for server-side filtering by auth method, provider, or time range (reduces response size).",
    ListSessionsInputSchema.shape,
    async (args) => {
      const log = getLogger();
      const hasFilter = args.filter && Object.keys(args.filter).length > 0;

      log.info("Listing sessions", {
        tool: "kratos_list_sessions",
      });

      const startTime = Date.now();

      try {
        // If no filter, just return raw API results
        if (!hasFilter) {
          const response = await kratosClients.identity.listSessions({
            pageSize: args.limit ?? 20,
            active: args.active,
            expand: formatExpandForList(args.expand),
          });

          log.info("Sessions listed successfully", {
            tool: "kratos_list_sessions",
            durationMs: Date.now() - startTime,
          });

          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(
                  {
                    sessions: response.data,
                    count: response.data.length,
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        }

        // With filter: fetch, filter server-side, return compact results
        const limit = args.limit ?? 20;
        const matchingSessions: Array<{
          session_id: string;
          authenticated_at: string;
          expires_at: string;
          active: boolean;
          auth_methods: Array<{ method: string; provider?: string }>;
          identity_id: string;
          email?: string;
          name?: string;
        }> = [];

        const maxPagesToFetch = 10;
        let pagesFetched = 0;
        let pageToken: string | undefined;

        // Always expand identity when filtering to get user info
        const expandWithIdentity = args.expand?.includes("identity")
          ? formatExpandForList(args.expand)
          : ["identity" as const, ...(formatExpandForList(args.expand) ?? [])];

        while (matchingSessions.length < limit && pagesFetched < maxPagesToFetch) {
          const response = await kratosClients.identity.listSessions({
            pageSize: 100,
            pageToken,
            active: args.active,
            expand: expandWithIdentity,
          });

          pagesFetched++;

          for (const session of response.data) {
            if (!sessionMatchesFilter(session, args.filter)) continue;

            const identity = session.identity;
            const traits = identity?.traits as { email?: string; name?: { first?: string; last?: string } } | undefined;

            matchingSessions.push({
              session_id: session.id,
              authenticated_at: session.authenticated_at ?? "",
              expires_at: session.expires_at ?? "",
              active: session.active ?? false,
              auth_methods: (session.authentication_methods ?? []).map((am) => ({
                method: am.method ?? "",
                provider: (am as { provider?: string }).provider,
              })),
              identity_id: identity?.id ?? "",
              email: traits?.email,
              name: traits?.name ? `${traits.name.first ?? ""} ${traits.name.last ?? ""}`.trim() : undefined,
            });

            if (matchingSessions.length >= limit) break;
          }

          if (response.data.length < 100) break;
          // Note: For full pagination support, would need to extract page token from response headers
          break;
        }

        // Sort by authenticated_at descending (most recent first)
        matchingSessions.sort((a, b) =>
          new Date(b.authenticated_at).getTime() - new Date(a.authenticated_at).getTime()
        );

        log.info("Sessions listed with filter", {
          tool: "kratos_list_sessions",
          durationMs: Date.now() - startTime,
        });

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  sessions: matchingSessions.slice(0, limit),
                  count: matchingSessions.length,
                  filter: args.filter,
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (error) {
        log.error("Failed to list sessions", {
          tool: "kratos_list_sessions",
          durationMs: Date.now() - startTime,
          error: { message: error instanceof Error ? error.message : String(error) },
        });

        const mcpError = mapError(error, "list_sessions");
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

  // kratos_get_session - Get a single session by ID
  server.tool(
    "kratos_get_session",
    "Get detailed information about a specific session by its ID. Use expand to include identity or device details.",
    GetSessionInputSchema.shape,
    async (args) => {
      const log = getLogger();

      log.info("Getting session", {
        tool: "kratos_get_session",
      });

      const startTime = Date.now();

      try {
        const response = await kratosClients.identity.getSession({
          id: args.id,
          expand: formatExpandForGet(args.expand),
        });

        log.info("Session retrieved successfully", {
          tool: "kratos_get_session",
          durationMs: Date.now() - startTime,
        });

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(response.data, null, 2),
            },
          ],
        };
      } catch (error) {
        log.error("Failed to get session", {
          tool: "kratos_get_session",
          durationMs: Date.now() - startTime,
          error: { message: error instanceof Error ? error.message : String(error) },
        });

        const mcpError = mapError(error, "get_session");
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
 * Register session tools for a specific identity (US2)
 */
export function registerIdentitySessionTools(
  server: McpServer,
  kratosClients: KratosClients,
  getLogger: () => CorrelatedLogger,
): void {
  // kratos_list_identity_sessions - List sessions for a specific identity
  server.tool(
    "kratos_list_identity_sessions",
    "List all sessions for a specific identity. Useful for investigating a user's login history and active sessions.",
    ListIdentitySessionsInputSchema.shape,
    async (args) => {
      const log = getLogger();

      log.info("Listing identity sessions", {
        tool: "kratos_list_identity_sessions",
      });

      const startTime = Date.now();

      try {
        const response = await kratosClients.identity.listIdentitySessions({
          id: args.identityId,
          pageSize: args.pageSize ?? 20,
          pageToken: args.pageToken,
          active: args.active,
        });

        log.info("Identity sessions listed successfully", {
          tool: "kratos_list_identity_sessions",
          durationMs: Date.now() - startTime,
        });

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  sessions: response.data,
                  count: response.data.length,
                  identityId: args.identityId,
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (error) {
        log.error("Failed to list identity sessions", {
          tool: "kratos_list_identity_sessions",
          durationMs: Date.now() - startTime,
          error: { message: error instanceof Error ? error.message : String(error) },
        });

        const mcpError = mapError(error, "list_identity_sessions");
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
 * Register session management tools (disable, extend, delete)
 * Used in Phase 5 (US3)
 */
export function registerSessionManagementTools(
  server: McpServer,
  kratosClients: KratosClients,
  getLogger: () => CorrelatedLogger,
): void {
  // kratos_disable_session - Revoke a single session
  server.tool(
    "kratos_disable_session",
    "Revoke/disable a specific session, effectively logging the user out from that session.",
    DisableSessionInputSchema.shape,
    async (args) => {
      const log = getLogger();

      log.info("Disabling session", {
        tool: "kratos_disable_session",
      });

      const startTime = Date.now();

      try {
        await kratosClients.identity.disableSession({
          id: args.id,
        });

        log.info("Session disabled successfully", {
          tool: "kratos_disable_session",
          durationMs: Date.now() - startTime,
        });

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  success: true,
                  message: `Session ${args.id} has been disabled`,
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (error) {
        log.error("Failed to disable session", {
          tool: "kratos_disable_session",
          durationMs: Date.now() - startTime,
          error: { message: error instanceof Error ? error.message : String(error) },
        });

        const mcpError = mapError(error, "disable_session");
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

  // kratos_extend_session - Extend session expiration
  server.tool(
    "kratos_extend_session",
    "Extend a session's expiration time, keeping the user logged in longer.",
    ExtendSessionInputSchema.shape,
    async (args) => {
      const log = getLogger();

      log.info("Extending session", {
        tool: "kratos_extend_session",
      });

      const startTime = Date.now();

      try {
        const response = await kratosClients.identity.extendSession({
          id: args.id,
        });

        log.info("Session extended successfully", {
          tool: "kratos_extend_session",
          durationMs: Date.now() - startTime,
        });

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(response.data, null, 2),
            },
          ],
        };
      } catch (error) {
        log.error("Failed to extend session", {
          tool: "kratos_extend_session",
          durationMs: Date.now() - startTime,
          error: { message: error instanceof Error ? error.message : String(error) },
        });

        const mcpError = mapError(error, "extend_session");
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

  // kratos_delete_identity_sessions - Delete all sessions for an identity
  server.tool(
    "kratos_delete_identity_sessions",
    "Delete all sessions for a specific identity, effectively logging the user out from all devices.",
    DeleteIdentitySessionsInputSchema.shape,
    async (args) => {
      const log = getLogger();

      log.info("Deleting identity sessions", {
        tool: "kratos_delete_identity_sessions",
      });

      const startTime = Date.now();

      try {
        await kratosClients.identity.deleteIdentitySessions({
          id: args.identityId,
        });

        log.info("Identity sessions deleted successfully", {
          tool: "kratos_delete_identity_sessions",
          durationMs: Date.now() - startTime,
        });

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  success: true,
                  message: `All sessions for identity ${args.identityId} have been deleted`,
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (error) {
        log.error("Failed to delete identity sessions", {
          tool: "kratos_delete_identity_sessions",
          durationMs: Date.now() - startTime,
          error: { message: error instanceof Error ? error.message : String(error) },
        });

        const mcpError = mapError(error, "delete_identity_sessions");
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
