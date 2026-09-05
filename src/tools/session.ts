/**
 * Session management tools for Kratos MCP Server
 *
 * Implements tools for listing, viewing, and managing user sessions
 * @module tools/session
 */

import type { Session } from "@ory/kratos-client";
import type { z } from "zod";
import { inTimeRange, nextPageTokenOf } from "../kratos/pagination.js";
import { revokeAllSessions } from "../kratos/sessions.js";
import {
  DeleteIdentitySessionsInputSchema,
  DeleteIdentitySessionsOutputSchema,
  DisableSessionInputSchema,
  ExtendSessionInputSchema,
  GetSessionInputSchema,
  ListIdentitySessionsInputSchema,
  ListIdentitySessionsOutputSchema,
  ListSessionsInputSchema,
  ListSessionsOutputSchema,
  MutationResultSchema,
  PassthroughObjectSchema,
  type SessionFilter,
  SessionSummarySchema,
} from "../schemas/tools.js";
import { DESTRUCTIVE, defineTool, READ_ONLY, type ToolContext, UPDATE } from "./define.js";

type Passthrough = z.infer<typeof PassthroughObjectSchema>;

/** Kratos caps list endpoints at 100 items per page */
const SDK_MAX_PAGE_SIZE = 100;

/** Check if any authentication method of a session matches the filter */
function authMethodMatchesFilter(
  authMethods: Session["authentication_methods"],
  authMethod: string,
  provider?: string,
): boolean {
  if (!authMethods) return false;
  return authMethods.some((am) => {
    if (am.method !== authMethod) return false;
    if (provider && authMethod === "oidc") return am.provider === provider;
    return true;
  });
}

/** Check whether a session matches the client-side filter criteria */
export function matchesFilter(session: Session, filter?: SessionFilter): boolean {
  if (!filter) return true;

  if (
    filter.authMethod &&
    !authMethodMatchesFilter(session.authentication_methods, filter.authMethod, filter.provider)
  ) {
    return false;
  }

  return inTimeRange(
    session.authenticated_at,
    filter.authenticatedAfter,
    filter.authenticatedBefore,
  );
}

/** Compact session representation returned by list tools */
export interface FormattedSession extends Passthrough {
  id: string;
  session_id: string;
  authenticated_at: string;
  expires_at: string;
  active: boolean;
  auth_methods: Array<{ method: string; provider?: string }>;
  identity_id: string;
  email?: string;
  name?: string;
}

/** Extract a compact session summary from the API response */
export function formatSession(session: Session): FormattedSession {
  const identity = session.identity;
  const traits = identity?.traits as
    | { email?: string; name?: { first?: string; last?: string } }
    | undefined;
  const name = traits?.name
    ? `${traits.name.first ?? ""} ${traits.name.last ?? ""}`.trim()
    : undefined;

  return {
    id: session.id,
    session_id: session.id,
    authenticated_at: session.authenticated_at ?? "",
    expires_at: session.expires_at ?? "",
    active: session.active ?? false,
    auth_methods: (session.authentication_methods ?? []).map((am) => ({
      method: am.method ?? "",
      provider: am.provider,
    })),
    identity_id: identity?.id ?? "",
    email: traits?.email,
    name: name || undefined,
  };
}

/** Ensure `identity` is expanded so traits are available for formatting */
function withIdentityExpanded(
  expand: Array<"identity" | "devices"> | undefined,
): Array<"identity" | "devices"> {
  return expand?.includes("identity") ? expand : ["identity", ...(expand ?? [])];
}

/** Append formatted matching sessions to `into` until `limit` is reached */
function collectMatching(
  sessions: Session[],
  filter: SessionFilter | undefined,
  into: FormattedSession[],
  limit: number,
): void {
  for (const session of sessions) {
    if (into.length >= limit) return;
    if (matchesFilter(session, filter)) into.push(formatSession(session));
  }
}

/** Scan up to maxPages pages, keeping sessions that match the client-side filter */
async function scanFilteredSessions(
  ctx: ToolContext,
  args: z.infer<typeof ListSessionsInputSchema>,
): Promise<z.infer<typeof ListSessionsOutputSchema>> {
  const maxPages = args.maxPages ?? ctx.config.maxScanPages;
  const expand = withIdentityExpanded(args.expand);

  const items: FormattedSession[] = [];
  let pageToken = args.pageToken;
  let pagesScanned = 0;

  while (pagesScanned < maxPages && items.length < args.pageSize) {
    const response = await ctx.clients.identity.listSessions({
      pageSize: SDK_MAX_PAGE_SIZE,
      pageToken,
      active: args.active,
      expand,
    });
    pagesScanned++;

    collectMatching(response.data, args.filter, items, args.pageSize);

    pageToken = nextPageTokenOf(response);
    if (!pageToken || response.data.length === 0) break;
  }

  return {
    items,
    count: items.length,
    nextPageToken: pageToken,
    pagesScanned,
    truncated: pagesScanned >= maxPages && pageToken !== undefined,
  };
}

/**
 * Register session tools (list, get, list per identity, disable, extend, delete)
 */
export function registerSessionTools(ctx: ToolContext): void {
  defineTool(ctx, {
    name: "kratos_list_sessions",
    title: "List sessions",
    description:
      'List all sessions across all identities with optional filtering by active status. Use expand to include identity or device details. When `filter` is set (auth method, provider, time range) filtering is applied client-side over up to maxPages pages of 100 sessions until pageSize matches are collected; the response then includes pagesScanned, truncated and a nextPageToken to resume from. Example: {"active": true, "pageSize": 20}.',
    toolset: "sessions",
    inputSchema: ListSessionsInputSchema,
    outputSchema: ListSessionsOutputSchema,
    annotations: READ_ONLY,
    run: async (args) => {
      const hasFilter = args.filter !== undefined && Object.keys(args.filter).length > 0;

      if (!hasFilter) {
        const response = await ctx.clients.identity.listSessions({
          pageSize: args.pageSize,
          pageToken: args.pageToken,
          active: args.active,
          expand: args.expand,
        });
        return {
          items: response.data.map(formatSession),
          count: response.data.length,
          nextPageToken: nextPageTokenOf(response),
        };
      }

      return scanFilteredSessions(ctx, args);
    },
  });

  defineTool(ctx, {
    name: "kratos_get_session",
    title: "Get session",
    description:
      'Get detailed information about a specific session by its ID. Use expand to include identity or device details. Example: {"id": "3a1b2c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d", "expand": ["identity"]}.',
    toolset: "sessions",
    inputSchema: GetSessionInputSchema,
    outputSchema: PassthroughObjectSchema,
    annotations: READ_ONLY,
    run: async (args) => {
      const response = await ctx.clients.identity.getSession({ id: args.id, expand: args.expand });
      return response.data as unknown as Passthrough;
    },
  });

  defineTool(ctx, {
    name: "kratos_list_identity_sessions",
    title: "List identity sessions",
    description:
      'List all sessions for a specific identity. Useful for investigating a user\'s login history and active sessions. Returns nextPageToken for pagination. Example: {"identityId": "9f8d7c6b-5a49-4838-9271-605948372615"}.',
    toolset: "sessions",
    inputSchema: ListIdentitySessionsInputSchema,
    outputSchema: ListIdentitySessionsOutputSchema,
    annotations: READ_ONLY,
    run: async (args) => {
      const response = await ctx.clients.identity.listIdentitySessions({
        id: args.identityId,
        pageSize: args.pageSize,
        pageToken: args.pageToken,
        active: args.active,
      });
      return {
        identityId: args.identityId,
        items: response.data.map(formatSession),
        count: response.data.length,
        nextPageToken: nextPageTokenOf(response),
      };
    },
  });

  defineTool(ctx, {
    name: "kratos_disable_session",
    title: "Disable session",
    description:
      'Revoke/disable a specific session, effectively logging the user out from that session. Example: {"id": "3a1b2c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d"}.',
    toolset: "sessions",
    inputSchema: DisableSessionInputSchema,
    outputSchema: MutationResultSchema,
    annotations: DESTRUCTIVE,
    confirmMessage: (args) => `Disable session ${args.id}? The user will be logged out.`,
    run: async (args) => {
      await ctx.clients.identity.disableSession({ id: args.id });
      return { success: true as const, message: `Session ${args.id} has been disabled` };
    },
  });

  defineTool(ctx, {
    name: "kratos_extend_session",
    title: "Extend session",
    description:
      'Extend a session\'s expiration time, keeping the user logged in longer (this widens the user\'s access window). Example: {"id": "<session uuid>"}.',
    toolset: "sessions",
    inputSchema: ExtendSessionInputSchema,
    outputSchema: SessionSummarySchema,
    annotations: UPDATE,
    confirmMessage: (args) =>
      `Extend session ${args.id} beyond its current expiry? This widens the user's access window.`,
    run: async (args) => {
      const response = await ctx.clients.identity.extendSession({ id: args.id });
      return { ...(response.data as unknown as Passthrough), id: response.data.id };
    },
  });

  defineTool(ctx, {
    name: "kratos_delete_identity_sessions",
    title: "Delete identity sessions",
    description:
      'Delete all sessions for a specific identity, effectively logging the user out from all devices. Example: {"identityId": "9f8d7c6b-5a49-4838-9271-605948372615"}.',
    toolset: "sessions",
    inputSchema: DeleteIdentitySessionsInputSchema,
    outputSchema: DeleteIdentitySessionsOutputSchema,
    annotations: DESTRUCTIVE,
    confirmMessage: (args) =>
      `Delete all sessions for identity ${args.identityId}? The user will be logged out everywhere.`,
    run: async (args) => {
      const deleted = await revokeAllSessions(ctx.clients.identity, args.identityId);
      return {
        success: true as const,
        sessionsExisted: deleted,
        message: deleted
          ? `All sessions for identity ${args.identityId} have been deleted`
          : `Identity ${args.identityId} had no active sessions`,
      };
    },
  });
}
