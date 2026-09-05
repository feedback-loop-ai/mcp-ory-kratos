# Quickstart: Architecture Hardening & Operator Safety

**Feature**: 011-architecture-hardening | **Date**: 2026-09-05

## Run the server with the new safety controls

```bash
# Read-only support desk: only read tools, no destructive surface at all
KRATOS_ADMIN_URL=http://localhost:4434 KRATOS_READ_ONLY=1 bun run start

# Identity + session admin only, ask before destructive actions (default), redact secrets (default)
KRATOS_ADMIN_URL=http://localhost:4434 KRATOS_TOOLSETS=identities,sessions bun run start

# Headless automation: no confirmation prompts, raw credential config allowed
KRATOS_ADMIN_URL=http://localhost:4434 \
KRATOS_CONFIRM_DESTRUCTIVE=0 KRATOS_ALLOW_CREDENTIAL_EXPOSURE=1 bun run start
```

Claude Code registration (`.mcp.json`):

```json
{
  "mcpServers": {
    "kratos": {
      "command": "npx",
      "args": ["-y", "mcp-ory-kratos"],
      "env": { "KRATOS_ADMIN_URL": "http://localhost:4434", "KRATOS_READ_ONLY": "1" }
    }
  }
}
```

## Walk a large collection (US1)

```
kratos_list_identities { "pageSize": 100 }
→ { "items": [...], "count": 100, "nextPageToken": "eyJ..." }

kratos_list_identities { "pageSize": 100, "pageToken": "eyJ..." }
→ { "items": [...], "count": 37 }          // no nextPageToken: last page
```

Filtered sessions scan multiple pages and say so:

```
kratos_list_sessions { "pageSize": 20, "filter": { "authMethod": "oidc", "provider": "google" }, "maxPages": 5 }
→ { "items": [...], "count": 20, "pagesScanned": 5, "truncated": true, "nextPageToken": "..." }
```

Analytics obey the same cap (`KRATOS_MAX_SCAN_PAGES`, default 20):

```
kratos_session_analytics { "includeDevices": false, "maxPages": 50 }
→ { "totalSessions": 12000, ..., "pagesScanned": 48, "truncated": false }

kratos_credential_analytics { "maxPages": 10 }
→ { ..., "pagesScanned": 10, "truncated": true, "nextPageToken": "eyJ..." }
kratos_credential_analytics { "maxPages": 10, "pageToken": "eyJ..." }   // resumes from page 11
```

## Destructive confirmation (US2)

From a client with elicitation (Claude Code, VS Code):

```
kratos_delete_identity { "id": "9f8d…" }
  ⇒ client shows "Permanently delete identity 9f8d…? [Confirm]"
  ⇒ decline → { "cancelled": true, "message": "Cancelled by user" }   (no Kratos call)
  ⇒ accept  → { "success": true, "message": "Identity 9f8d… deleted" }

kratos_delete_identity_sessions { "identityId": "9f8d…" }
  ⇒ client shows "Delete all sessions for identity 9f8d…? The user will be logged out everywhere. [Confirm]"
  ⇒ accept, no sessions → { "success": true, "sessionsExisted": false, "message": "… had no active sessions" }

kratos_set_identity_state { "id": "9f8d…", "state": "inactive", "revokeSessions": true }
  ⇒ accept → { "id": "9f8d…", "state": "inactive", "sessionsRevoked": true }
```

Clients without elicitation proceed directly; they see `destructiveHint: true` on the tool and may gate themselves.

## Credentials without secrets (US3)

```
kratos_get_identity { "id": "9f8d…", "includeCredential": ["oidc", "password"] }
→ credentials.password.config = "[redacted: set KRATOS_ALLOW_CREDENTIAL_EXPOSURE=1]"
  credentials.oidc.identifiers = ["google:1093…"]        // still visible → usable below

kratos_delete_identity_credential { "id": "9f8d…", "type": "oidc", "identifier": "google:1093…" }
```

## Support & migration jobs (US4)

```
kratos_list_identities { "previewCredentialsIdentifierSimilar": "alice@" }
kratos_set_identity_state { "id": "9f8d…", "state": "inactive", "revokeSessions": true }
kratos_create_identity {
  "schemaId": "default", "traits": { "email": "bob@example.com" },
  "externalId": "crm-42",
  "credentials": { "password": { "config": { "hashed_password": "$2a$10$…" } },
                   "oidc": { "config": { "providers": [{ "provider": "google", "subject": "1093…" }] } } },
  "verifiableAddresses": [{ "value": "bob@example.com", "via": "email", "verified": true }]
}
kratos_get_identity_schema { "id": "default" }
kratos_create_recovery_link { "identityId": "9f8d…", "expiresIn": "1h30m", "returnTo": "https://app.example.com/" }
```

## Quality gates (US5)

```bash
bun run lint            # src + tests
bun run typecheck       # src + tests (tsconfig.test.json)
bun run test:unit       # 16 files / 224 tests; baseline 89.75% stmts / 78.91% branches / 89.36% funcs / 90.82% lines; thresholds 80/70/80/80 enforced; < 1 s
bun run audit           # fails on high/critical

docker compose up -d --wait && bun run test:api   # Kratos v26.2.0, 68 tests incl. MCP stdio e2e
docker compose down
```

CI runs all of the above on every PR (`.github/workflows/ci.yml`: lint, typecheck, audit, unit, integration).

## Adding a tool (US6)

```ts
// src/tools/courier.ts
defineTool(ctx, {
  name: "kratos_get_courier_message",
  title: "Get courier message",
  description: '… Example: {"id": "<message uuid>"}.',   // every description ends with an example (FR-006a)
  toolset: "courier",
  inputSchema: GetCourierMessageInputSchema,
  outputSchema: PassthroughObjectSchema,
  annotations: READ_ONLY,
  run: async (args) => passthrough((await ctx.clients.courier.getCourierMessage({ id: args.id })).data),
});
```

Destructive tools only add a prompt builder — confirmation itself is applied by the registration layer:

```ts
annotations: DESTRUCTIVE,
confirmMessage: (args) => `Permanently delete identity ${args.id}? This cannot be undone.`,
```

Then a harness test:

```ts
const h = await startHarness();
h.stubs.courier.getCourierMessage.mockResolvedValue({ data: { id: "m1" } });
const res = await h.callTool("kratos_get_courier_message", { id: "<uuid>" });
expect(res.structuredContent?.id).toBe("m1");
```

## Breaking changes in this feature

| Before | After |
|---|---|
| `kratos_list_sessions { limit }` | `{ pageSize, pageToken }` |
| `kratos_get_identity { includeCredentials: true }` returns raw config | redacted unless `KRATOS_ALLOW_CREDENTIAL_EXPOSURE=1`; prefer `includeCredential: [...]` |
| Batch results `{ index, identityId }` | `{ action, identity, patchId, error }` + `summary.total` |
| Destructive tools always return their result | may return `{ cancelled: true, message: "Cancelled by user" }` when confirmation is declined |
| Server version `0.1.0` | package version |

The same table, with migration guidance, lives in `README.md` § "Breaking changes in 0.3.0".
