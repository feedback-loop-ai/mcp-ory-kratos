# Research: Architecture Hardening & Operator Safety

**Feature**: 011-architecture-hardening | **Date**: 2026-09-05
**Purpose**: Phase 0 output — resolve every technical unknown in plan.md before design.

## R1: Is there a newer Kratos release to build towards?

**Decision**: No. Target remains Kratos **v26.2.0** and `@ory/kratos-client` **26.2.0**.

**Rationale**: GitHub releases/tags for `ory/kratos` end at v26.2.0 (2026-03-20); npm `@ory/kratos-client` versions end at 26.2.0 (2026-03-24). Nothing newer is published. `master` carries ~5 months of unreleased work (repo is now an Ory monorepo).

**Unreleased deltas (diff of `spec/api.json` v26.2.0 → master), recorded for a future feature**:

| Area | Change | Impact on this server |
|---|---|---|
| `POST /admin/sessions` (`manageSessions`) | Bulk disable/delete by identities/sessions, wildcard, ≤500 IDs | Future `kratos_manage_sessions` tool |
| Credential type enum | adds `deviceauthn`, `identifier_first` | Extend `ALL_CREDENTIAL_TYPES` when SDK ships |
| `identityWithCredentials` | adds `totp`, `webauthn`, `passkey`, `lookup_secret` import | Extend create/batch import schema |
| Model fields | `identity.region`, `session.authentication_methods[].upstream_acr/amr`, courier templates `verifiable_address_changed`, `authenticator_key_added` | Passthrough; no action |
| Recovery `expires_in` | regex relaxed to `^([0-9]+([.][0-9]+)?(ns|us|µs|ms|s|m|h))+$` | Adopted now (compatible with v26.2.0) |
| Pagination tokens | AEAD-sealed, instance-bound | Confirms cursors must be treated as opaque |
| Test login flows | `POST /admin/test-login-flows` | Out of scope |

**Housekeeping found**: `.env.test.local.example` and integration tests still targeted `v1.3.0/v1.3.1` while the SDK was 26.2 — fixed as part of this feature.

**Alternatives considered**: Pin to a `master` snapshot of the SDK — rejected; no published package, and the monorepo restructuring (commit b86338d) may change npm packaging.

## R2: MCP SDK version and API surface

**Decision**: Upgrade `@modelcontextprotocol/sdk` from 1.25.2 to **^1.30.0**; adopt `registerTool` / `registerResource` / `ResourceTemplate` / tool annotations / `outputSchema` + `structuredContent` / `elicitInput` / `sendLoggingMessage`; defer v2 (`@modelcontextprotocol/server@2.0.0`).

**Rationale**: 1.26.0 fixes GHSA-345p-7cg4-v4c7 (cross-client response leak); 1.30.0 adds Zod 3.25 method-literal support and better Zod issue formatting. Peer range stays `zod ^3.25 || ^4`. `server.tool()` / `server.resource()` are `@deprecated` in 1.25+ and removed in v2. Everything adopted here is exactly what v2 requires, so the later migration reduces to the official codemod (`npx @modelcontextprotocol/codemod v1-to-v2`).

**Finding during implementation**: passing `.shape` (raw Zod shape) to `registerTool` drops `.passthrough()` during JSON-Schema conversion, so structured output containing extra Kratos fields fails the SDK's `additionalProperties` validation. Full Zod objects must be passed. (Caught by the MCP stdio e2e test, not by unit tests — justification for FR-029.)

**Alternatives considered**: Jump to SDK v2 now — rejected: package split + import path changes + Zod 4 preference is a separate migration with no operator value; Zod 4 broke 40+ call sites on a trial upgrade.

## R3: Comparable admin-API MCP servers — exposure control patterns

**Decision**: Adopt the GitHub MCP server toolset pattern (`KRATOS_TOOLSETS`, `KRATOS_READ_ONLY`) implemented via `RegisteredTool.disable()`, and the Okta MCP server pattern of elicitation-based confirmation for destructive operations with graceful fallback.

**Rationale**: Register-then-disable (rather than skip registration) keeps `tools/list_changed` semantics and leaves room for a future dynamic `enable_toolset` meta-tool. Okta's approach — confirm via elicitation when the client supports it, otherwise rely on annotations — is the only option that works across today's clients.

**Alternatives considered**: Refuse destructive calls when elicitation is unsupported — rejected (unusable from most clients; read-only mode covers hard enforcement). Separate "read" and "admin" server binaries — rejected (YAGNI; env flags achieve the same).

## R4: Pagination — how Kratos returns cursors

**Decision**: Parse the `Link` response header (`<…?page_token=X>; rel="next"`) via a shared helper; return `nextPageToken`; multi-page scans use a shared `scanPages` walker with a cap.

**Rationale**: `@ory/kratos-client` exposes the cursor only via the Axios `headers.link`; there is no body field. The existing analytics code already parsed it, but the list tools and the filtered session path did not (the session loop had an unconditional `break`). Cursors are opaque and instance-bound (R1), so the server must never construct them.

**Alternatives considered**: Offset pagination (`page`/`perPage`) — deprecated in Kratos, removed in future versions.

## R5: Credential exposure

**Decision**: Redact `config` of secret-bearing credential types (`password`, `oidc`, `saml`, `totp`, `lookup_secret`, `webauthn`, `passkey`) unless `KRATOS_ALLOW_CREDENTIAL_EXPOSURE` is set; keep `type`, `identifiers`, `version`, timestamps; replace the boolean `includeCredentials` with `includeCredential: string[]` (boolean kept as deprecated alias).

**Rationale**: Kratos returns password hashes, OIDC `initial_access_token`/`initial_refresh_token`, TOTP `totp_url`, and lookup codes inside `config`. Constitution IV forbids sensitive data leakage. Identifiers (e.g. `provider:subject`) are required by the new `identifier` parameter on credential deletion, so they must stay visible.

**Alternatives considered**: Per-type allow-list — rejected (Clarification: YAGNI). Never expose — rejected (support/migration cases legitimately need hashes).

## R6: Integration testing in CI

**Decision**: `docker-compose.yml` running `oryd/kratos:v26.2.0` with `dsn: memory`, `serve --dev --watch-courier`, config and identity schema under `tests/kratos/`; CI job uses `docker compose up -d --wait`; integration files run serially (`fileParallelism: false`).

**Rationale**: `dsn: memory` with `--dev` auto-migrates, avoiding a separate `migrate sql` container and shared volume. Serial execution was required: parallel test files produced "Unable to serialize access due to a concurrent update" (SQLite single-writer) failures in ~1 of 3 runs. Real env vars must override `.env.test.local` (the loader previously let the file win, which would have broken CI).

**Alternatives considered**: GitHub Actions `services:` container — rejected (needs config mounted before start; `docker compose` is simpler and identical locally). Postgres sidecar — rejected (slower startup; SQLite suffices for a serial suite).

## R7: Unit-test strategy for tools

**Decision**: An in-memory harness (`tests/unit/harness.ts`) that boots the real `createServer(config, stubs)` and connects an SDK `Client` over `InMemoryTransport`; Kratos clients are Proxy-backed `vi.fn()` stubs.

**Rationale**: The previous tests stubbed `server.tool()` and called handlers directly, so they could not detect mis-registered resources, missing annotations, broken `structuredContent`, gating, or elicitation. Driving the real protocol caught all of those during this feature.

**Alternatives considered**: Keep handler-level stubs — rejected (misses the protocol layer, which is where three of the audited defects lived).

## R8: Dependency vulnerabilities

**Decision**: `bun update` plus `overrides` in `package.json` for transitive packages the parents have not bumped (axios under `@ory/kratos-client`, hono/@hono/node-server/express deps under the MCP SDK, vite/rollup/picomatch under vitest); pin TypeScript to 5.x and vitest to 4.x.

**Rationale**: `bun audit` reported 99 vulnerabilities (1 critical, ~30 high). After the SDK bump and overrides: zero. `bun update --latest` pulled in TypeScript 7 and Zod 4 — both reverted (Zod 4 breaks the codebase; TS 7 is an unreviewed major).

## R9: Coverage measurement defect

**Decision**: `coverage.include: ["**/src/**/*.ts"]` with `allowExternal: true` and thresholds 80/80/70/80.

**Rationale**: `tests/vitest.config.ts` sets `root: "./tests"`, so the previous `src/**` glob resolved to `tests/src/**` (non-existent); CI printed `Unknown%` on every run. A `../src/**` form also failed to match; the `**/src/**` form works. Real baseline after this feature (`bun run test:unit`, "All files"): 89.75% statements / 78.91% branches / 89.36% functions / 90.82% lines (plan.md D14 is the single authoritative record).

## R10: Kratos v26.2.0 behavioural drift found by the integration suite

- `DELETE /admin/identities/{id}/sessions` for an identity with no sessions returns **400** on v26.2.0 (was 404 on v1.x). The initial fix relaxed the integration test to accept both; **superseded** by server-side idempotency (FR-017a): `src/kratos/sessions.ts::revokeAllSessions` treats 404 and 400 as "no sessions, desired state holds" and reports `sessionsRevoked` / `sessionsExisted`, so tools succeed on either Kratos line and tests assert the server's result rather than the raw status (unit: `tests/unit/sessions-helper.test.ts`; e2e: set-state with `revokeSessions`, T067/T068).
- Kratos `log.level` accepts `warning`, not `warn`.
- `GET /admin/identities/schemas` is not a valid path; schemas are at `/admin/schemas` (redirects to public `/schemas`). The SDK handles this.
