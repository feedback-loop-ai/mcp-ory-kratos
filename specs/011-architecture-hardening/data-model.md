# Data Model: Architecture Hardening & Operator Safety

**Feature**: 011-architecture-hardening | **Date**: 2026-09-05
**Source of truth**: `src/schemas/tools.ts`, `src/config.ts`, `src/tools/define.ts`, `src/kratos/types.ts`

The server is a stateless proxy; every entity below is either a configuration value, a wire contract, or a transient per-call structure. Nothing is persisted.

## Configuration (`Config`)

| Field | Env var | Type | Default | Validation |
|---|---|---|---|---|
| `kratosAdminUrl` | `KRATOS_ADMIN_URL` | URL | — (required) | valid URL; trailing `/` and `/admin` stripped for the SDK base path |
| `auth` | `KRATOS_AUTH_TYPE` (+`KRATOS_API_KEY` / `KRATOS_CUSTOM_HEADERS`) | discriminated union `none` / `api-key` / `custom-headers` | `none` | custom headers must be a JSON object of strings |
| `logLevel` | `LOG_LEVEL` | enum trace…error | `info` | |
| `timeoutMs` | `KRATOS_TIMEOUT_MS` | int | 30000 | 1000–300000 |
| `toolsets` | `KRATOS_TOOLSETS` | `Toolset[]` | all six | comma list; `all` = all; unknown name → startup error listing valid names |
| `readOnly` | `KRATOS_READ_ONLY` | bool | false | `1/true/yes/on` |
| `confirmDestructive` | `KRATOS_CONFIRM_DESTRUCTIVE` | bool | true | |
| `allowCredentialExposure` | `KRATOS_ALLOW_CREDENTIAL_EXPOSURE` | bool | false | |
| `maxScanPages` | `KRATOS_MAX_SCAN_PAGES` | int | 20 | 1–1000 |

`Toolset` ∈ {`identities`, `sessions`, `courier`, `recovery`, `health`, `analytics`}.

## Tool Definition (`ToolDefinition<I, O>`)

| Field | Type | Notes |
|---|---|---|
| `name` | `kratos_*` string | unique |
| `title` | string | human-readable |
| `description` | string | agent-facing; destructive tools state irreversibility; scanning tools state the page cap |
| `toolset` | `Toolset` | exposure gating |
| `inputSchema` | `ZodObject` | full object (not `.shape`) so `.passthrough()` survives JSON-Schema conversion |
| `outputSchema` | `ZodObject` (optional) | when present the result is also emitted as `structuredContent` and validated by the SDK |
| `annotations` | `ToolAnnotations` | one of the presets below; `openWorldHint: false` always added |
| `run(args, { log, confirm })` | async | returns plain data; throws upstream errors |

**Annotation presets**

| Preset | readOnly | destructive | idempotent | Used by |
|---|---|---|---|---|
| `READ_ONLY` | true | — | true | all list/get/health/version/analytics/schema tools (14) |
| `CREATE` | false | false | false | create_identity, batch_patch_identities, create_recovery_link/code |
| `UPDATE_IDEMPOTENT` | false | true | true | update_identity, set_identity_state |
| `UPDATE` | false | true | false | patch_identity, extend_session |
| `DESTRUCTIVE` | false | true | true | delete_identity, delete_identity_credential, delete_identity_sessions, disable_session |

**Visibility rule**: a tool is disabled (hidden from `tools/list`, rejected on call) iff `toolset ∉ config.toolsets` OR (`config.readOnly` AND `readOnlyHint !== true`).

**Confirmation rule**: `confirm(message)` resolves `true` immediately unless `config.confirmDestructive` AND `annotations.destructiveHint === true` AND the client advertises `elicitation`; then it issues an elicitation with a boolean `confirm` field and resolves `true` only on `accept` with `confirm === true`.

## Wire structures

### Tool result envelope

```
success:  { content: [{type:"text", text: JSON}], structuredContent?: data }
cancelled: same envelope with data = { cancelled: true, message }
error:    { content: [{type:"text", text: JSON {error: McpToolError}}], isError: true }   // no structuredContent
```

`McpToolError` = `{ code, message, kratosStatus?, kratosCode?, suggestion? }` (unchanged from feature 001).

### Pagination

| Structure | Fields |
|---|---|
| `PaginationInput` | `pageSize` int 1–100 (default 20), `pageToken?` string |
| `PaginatedOutput<T>` | `items: T[]`, `count` int, `nextPageToken?` string |
| `ScanSummary` | `pagesScanned` int, `truncated` bool, `nextPageToken?` string |
| `MaxPagesInput` | `maxPages?` int 1–1000 (default = `config.maxScanPages`) |

`nextPageToken` is parsed from the Kratos `Link: <…page_token=X…>; rel="next"` response header; absent on the last page. Cursors are opaque and instance-bound.

### Credential types

| Constant | Members |
|---|---|
| `CREDENTIAL_TYPES` (login types, analytics default) | password, oidc, totp, webauthn, lookup_secret, passkey, code |
| `ALL_CREDENTIAL_TYPES` (include/delete) | `CREDENTIAL_TYPES` + profile, saml, link_recovery, code_recovery |
| `SENSITIVE_CREDENTIAL_TYPES` (redacted) | password, oidc, saml, totp, lookup_secret, webauthn, passkey |

**Redaction**: for each credential whose type is sensitive, `config` is replaced by the string `"[redacted: set KRATOS_ALLOW_CREDENTIAL_EXPOSURE=1]"` (omitted if `config` was absent); all other fields (`type`, `identifiers`, `version`, `created_at`, `updated_at`) pass through. Applied to `kratos_get_identity`, `kratos_get_identity_by_external_id` (when credentials requested) and each item of `kratos_list_identities`.

### Identity import body (camelCase input → Kratos snake_case)

| Input | Kratos field | Notes |
|---|---|---|
| `schemaId` | `schema_id` | required |
| `traits` | `traits` | required |
| `state` | `state` | default `active` |
| `metadataPublic` / `metadataAdmin` | `metadata_public` / `metadata_admin` | omitted on update ⇒ cleared |
| `externalId` | `external_id` | |
| `organizationId` | `organization_id` | UUID |
| `credentials.password.config.{password, hashed_password, use_password_migration_hook}` | same | |
| `credentials.oidc.config.providers[{provider, subject, organization?, use_auto_link?}]` | same | |
| `credentials.saml.config.providers[{provider, subject, organization?}]` | same | |
| `verifiableAddresses[{value, via, verified?, status?}]` | `verifiable_addresses` | `status` defaults to `completed` when verified else `pending` |
| `recoveryAddresses[{value, via}]` | `recovery_addresses` | |

Shared by `kratos_create_identity`, `kratos_update_identity` (subset), and each `create` item of `kratos_batch_patch_identities`.

### Session summary (`formatSession`)

`{ id, session_id, authenticated_at, expires_at, active, auth_methods[], identity_id, email?, name? }` — passthrough of extra Kratos fields allowed. `id` was added because `SessionSummarySchema` requires it; `session_id` retained for backward compatibility.

### Recovery outputs

| Tool | Output |
|---|---|
| `kratos_create_recovery_link` | `{ identityId, recoveryLink, expiresAt?, warning }` |
| `kratos_create_recovery_code` | `{ identityId, recoveryCode, recoveryLink?, expiresAt?, warning }` |

`warning` is a fixed sentence stating the value grants account access and must be treated as a secret. `expiresIn` validated as a Go duration `^([0-9]+([.][0-9]+)?(ns|us|µs|ms|s|m|h))+$`.

## Resources

| Name | URI | Kind | Metadata |
|---|---|---|---|
| `identity-schemas` | `kratos://schemas` | static | JSON list `{ schemas: [{id, schema}] }` |
| `identity-schema` | `kratos://schemas/{schema_id}` | template | `list` enumerates schema IDs; `complete.schema_id` prefix-matches |
| `connection-config` | `kratos://config/connection` | static | `{ baseUrl (userinfo stripped), authType, timeoutMs, toolsets, readOnly, connected, kratosVersion? }` |

Read failures throw (→ JSON-RPC error), never return an error body as content.

## Logging

`LogEntry = { timestamp, level, message, correlationId?, tool?, resource?, durationMs?, error?: {code?, message?}, ...context }` written as JSON lines to stderr. A sink forwards `warn`/`error` entries to the client via `logging/message`; `logging/setLevel` adjusts the minimum level. No traits, credentials, or tokens are ever logged.

## State transitions

None persisted. Per-call: `invoked → (confirm?) → upstream call → completed | failed | cancelled`.
