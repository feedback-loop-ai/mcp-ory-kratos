---

description: "Task list for architecture hardening & operator safety (retrospective)"
---

# Tasks: Architecture Hardening & Operator Safety

**Input**: Design documents from `/specs/011-architecture-hardening/`
**Prerequisites**: plan.md (D1–D15), spec.md (US1–US6, FR-001…FR-034, SC-001…SC-010), research.md (R1–R10), data-model.md, contracts/, quickstart.md

**Tests**: REQUIRED by the specification (FR-028 coverage thresholds, FR-029 CI integration + stdio e2e, FR-030 one MCP-client-driven unit test per tool, FR-031 lint/typecheck over tests). One task per test file under `tests/unit/` plus `tests/api/mcp-e2e.test.ts`.

**Retrospective note**: This task list was generated after the implementation landed. Every task that is complete is marked `[x]` with the commit that delivered it: `976cd06` (main refactor), `e9bfcd0` (registration-level confirmation enforcement), `c55ff77` (spec/data-model/quickstart sync), `bb7e40c` (version bump to 0.3.0), `88ca6ec` (constitution PATCH 1.1.1). Items left `[ ]` are listed again under "Open follow-ups".

**Organization**: Tasks are grouped by user story. US6 (registration contract) is the technical foundation for US1–US5, so the `defineTool` / `createServer` / config work lives in Phase 2 (Foundational) and the US6 phase holds the verification and cleanup tasks that prove the contract holds across the codebase.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1…US6)
- Include exact file paths in descriptions

## Path Conventions

Single project: `src/`, `tests/` at repository root (per plan.md). CI lives in `.github/`, container setup in `docker-compose.yml` + `tests/kratos/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Dependency line, tooling scope and package metadata that everything else builds on (D13, D15; FR-031, FR-032, FR-033)

- [x] T001 Bump `@modelcontextprotocol/sdk` to `^1.30.0` in `package.json` (closes GHSA-345p-7cg4-v4c7), add the `overrides` block (axios, hono, @hono/node-server, body-parser, path-to-regexp, qs, ajv, fast-uri, nanoid, vite, rollup, picomatch, postcss) and refresh `bun.lock`; keep zod 3.x, typescript ^5.9, vitest ^4 (FR-032, SC-008) (commit 976cd06)
- [x] T002 [P] Set `engines.node >=20.0.0`, `packageManager: bun@1.3.3`, `prepublishOnly: bun run build`, and add scripts `typecheck` (`tsc --noEmit && tsc -p tsconfig.test.json`), `test:unit` (`--dir tests/unit --coverage.enabled`), `test:api` in `package.json` (FR-033, FR-028) (commit 976cd06)
- [x] T003 [P] Create `tsconfig.test.json` (extends `tsconfig.json`, includes `tests/**`, adds `vitest/globals` + `bun-types`, relaxes unused-symbol/unchecked-index rules) so type-check covers test sources (FR-031, D15) (commit 976cd06)
- [x] T004 [P] Extend `biome.json#files.includes` with `tests/**/*.ts` and add the test-only rule override (non-null assertions, string concatenation, cognitive complexity) so lint covers test sources (FR-031, D15) (commit 976cd06)
- [x] T005 [P] Fix lint/type violations surfaced once tests entered scope in `tests/setup/compatibility-reporter.ts`, `tests/setup/config.ts`, `tests/setup/context.ts`, `tests/setup/errors.ts`, `tests/setup/fixtures.ts`, `tests/setup/schema-generator.ts` (FR-031) (commit 976cd06)

**Checkpoint**: `bun install`, `bun run lint`, `bun run typecheck` all green with tests in scope; `bun audit --audit-level=high` reports 0 findings

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The single registration contract, the server factory, runtime configuration, pagination and error primitives that every user story depends on (D1, D2, D3, D4, D6, D7, D9, D10, D11)

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T006 Extend `Config` in `src/config.ts`: `TOOLSETS`/`Toolset`, `toolsets`, `readOnly`, `confirmDestructive` (default true), `allowCredentialExposure`, `maxScanPages` (default 20, max 1000); `parseToolsets` fails fast listing valid names; `KRATOS_CUSTOM_HEADERS` must be a JSON object of strings; `loadConfig(env = process.env)` injectable, single `ConfigSchema.parse` (FR-007, FR-008, FR-009, FR-010, FR-003, FR-027, D10) (commit 976cd06)
- [x] T007 [P] Create `src/kratos/pagination.ts`: `extractPageToken`/`nextPageTokenOf` (parse `rel="next"` `page_token` from the Axios `link` header), `scanPages(fetchPage, {maxPages, startToken})` returning `{items, pagesScanned, truncated, nextPageToken}` with strictly sequential fetches and no throttling, and `inTimeRange` (FR-001, FR-002, FR-003, FR-004a, D6) (commit 976cd06)
- [x] T008 [P] Add `KratosHttpError` and `fetch` + `AbortSignal.timeout(config.timeoutMs)` on the raw HTTP path in `src/kratos/client.ts` (timeout → `code: "ETIMEDOUT"`), and teach `src/errors/mapper.ts` to map the `KratosHttpError` shape (status 0 + ETIMEDOUT → `TIMEOUT`) so raw-HTTP errors use the same codes as SDK errors (FR-026, D9) (commit 976cd06)
- [x] T009 [P] Add `LogSink`, `Logger.addSink()` and `Logger.setLevel()` to `src/logging/logger.ts` so warn/error entries can be bridged to MCP logging and the level adjusted at runtime (FR-024) (commit 976cd06)
- [x] T010 [P] Add `CREDENTIAL_TYPES`, `ALL_CREDENTIAL_TYPES`, `SENSITIVE_CREDENTIAL_TYPES` and `redactCredentials(identity, allowExposure)` (replaces `config` of sensitive types with `[redacted: set KRATOS_ALLOW_CREDENTIAL_EXPOSURE=1]`, keeps type/identifiers/version/timestamps, leaves absent `config` absent) in `src/kratos/types.ts` (FR-010, D5) (commit 976cd06)
- [x] T011 Add shared schema building blocks to `src/schemas/tools.ts`: `PaginationInputSchema` (`pageSize`/`pageToken`), `PaginatedOutputSchema` (`items`, `count`, `nextPageToken?`), `ScanSummary` (`pagesScanned`, `truncated`, `nextPageToken?`), `MaxPagesSchema`, `PassthroughObjectSchema`, and an output schema for every tool (FR-001, FR-003, FR-021) (commit 976cd06)
- [x] T012 Create `src/tools/define.ts`: `ToolContext`, `ToolDefinition` (name, title, description, toolset, inputSchema, outputSchema, annotations, `confirmMessage?`, `run`), `defineTool` over `McpServer.registerTool` passing full Zod objects (not `.shape`), adding `openWorldHint:false`, correlated start/`Tool completed`/`Tool failed` logging with `correlationId` + `durationMs` + mapped error code, `mapError` → `isError:true` envelope without `structuredContent`, `structuredContent` when an output schema exists; annotation presets `READ_ONLY`, `CREATE`, `UPDATE_IDEMPOTENT`, `UPDATE`, `DESTRUCTIVE` (FR-006, FR-021, FR-024a, FR-032, D1, D2) (commit 976cd06)
- [x] T013 Add register-then-`disable()` gating in `src/tools/define.ts`: hide when `toolset ∉ config.toolsets` or (`config.readOnly` and `readOnlyHint !== true`) so hidden tools are absent from `tools/list` and calls fail with the SDK's InvalidParams protocol error (FR-007, FR-008, SC-003, D3) (commit 976cd06)
- [x] T014 Add elicitation-based confirmation in `src/tools/define.ts`: `CANCELLED = {cancelled:true, message}`, `withCancellation(schema)` output widening, `confirmViaElicitation` (only when `destructiveHint`, `config.confirmDestructive` and the client advertises `elicitation`; only `accept` + `confirm===true` proceeds; decline returns `CANCELLED` as a success result with no upstream call; no elicitation support → proceed) (FR-009, SC-004, D4) (commit 976cd06)
- [x] T015 Enforce confirmation at registration in `src/tools/define.ts`: `defineTool` throws when `annotations.destructiveHint === true` and no `confirmMessage` is supplied (replaces the per-tool `confirm: true` opt-in from the first cut); add `confirmMessage` to every destructive tool in `src/tools/identity.ts` and `src/tools/session.ts` (FR-009) (commit e9bfcd0)
- [x] T016 Create `src/server.ts` with `createServer(config, clients) → {server, logger}`: `McpServer` name/version read from `package.json`, capabilities `{tools:{listChanged:true}, resources:{}, logging:{}}`, operator `instructions` (IDs, pagination, destructive hints, redaction), logger sink forwarding warn/error via `sendLoggingMessage` (`warn→warning`) only while connected, `logging/setLevel` handler, registration of all six toolsets + resources (FR-022, FR-024, FR-025, FR-030, D7) (commit 976cd06)
- [x] T017 Reduce `src/index.ts` to CLI glue only: `loadConfig`, `createKratosClients`, `createServer`, `StdioServerTransport`; add `redactUrl` so the startup log never contains URL userinfo (FR-012, FR-025, D7) (commit 976cd06)
- [x] T018 [P] Create `tests/unit/harness.ts`: `startHarness(overrides, {elicitation})` boots the real `createServer` with Proxy-backed `vi.fn()` `KratosClients`, links an SDK `Client` over `InMemoryTransport.createLinkedPair()`, installs an optional `ElicitRequestSchema` handler, returns `callTool` with parsed JSON (FR-030, SC-006, D11) (commit 976cd06)
- [x] T019 [P] Unit tests for the foundation in `tests/unit/config.test.ts` (toolset parsing + fail-fast, boolean flags, custom-headers validation, env injection), `tests/unit/pagination.test.ts` (Link-header parsing, `scanPages` cap/end-of-collection/resume semantics, `inTimeRange`), `tests/unit/client.test.ts` (`KratosHttpError`, raw-HTTP timeout → `ETIMEDOUT`) (FR-027, FR-001, FR-002, FR-003, FR-026, FR-028) (commit 976cd06)

**Checkpoint**: A trivial tool defined through `defineTool` appears in `tools/list` with annotations, returns `structuredContent`, maps errors, is hidden under `KRATOS_READ_ONLY`/`KRATOS_TOOLSETS`, and prompts before running when destructive — with no per-tool code. `tests/unit/server.test.ts` (T025) is the executable proof.

---

## Phase 3: User Story 1 - Operator Pages Through Large Result Sets (Priority: P1) 🎯 MVP

**Goal**: Every list tool returns `nextPageToken` + `count`; filtered session listing and analytics scan multiple pages under a cap and report `pagesScanned`/`truncated`/resume cursor

**Independent Test**: List identities with `pageSize` smaller than the total, observe `nextPageToken`, pass it back and receive different items; list sessions with a filter spanning several upstream pages and receive matches from all of them

### Tests for User Story 1

- [x] T020 [P] [US1] Unit tests in `tests/unit/session-tools.test.ts` via the harness: `kratos_list_sessions` plain page returns `items/count/nextPageToken`; filtered scan walks 100-item upstream pages independent of `pageSize`, stops at `pageSize` matches with a resume cursor, reports `truncated:true` only when `maxPages` stopped the scan; `kratos_list_identity_sessions` cursor; `pageSize`/`pageToken` replace `limit` (FR-001, FR-002, FR-004a, FR-005, SC-001, SC-002) (commit 976cd06)
- [x] T021 [P] [US1] Unit tests in `tests/unit/analytics-tools.test.ts` and `tests/unit/analytics.test.ts`: `maxPages` default from config and per-call override, `pagesScanned`/`truncated`/`nextPageToken` in output, device expansion omitted when `includeDevices:false`, pure aggregation helpers (FR-003, FR-004, FR-004a) (commit 976cd06)
- [x] T022 [P] [US1] Unit tests in `tests/unit/courier-tools.test.ts`: `kratos_list_courier_messages` returns `nextPageToken` from the Link header and `count`; `kratos_get_courier_message` structured output (FR-001) (commit 976cd06)

### Implementation for User Story 1

- [x] T023 [US1] Rewrite `src/tools/session.ts` via `defineTool`: `pageSize`/`pageToken` on `kratos_list_sessions` (drop `limit`, breaking change) and `kratos_list_identity_sessions`, `nextPageTokenOf` on plain pages, `scanFilteredSessions` at `SDK_MAX_PAGE_SIZE=100` with `maxPages ?? config.maxScanPages`, `pagesScanned`, `truncated` (cap-only), resume `nextPageToken` whenever more upstream pages remain; description tells the agent to raise `maxPages` or resume (FR-001, FR-002, FR-004a, FR-005, SC-001, SC-002) (commit 976cd06)
- [x] T024 [P] [US1] Rewrite `src/tools/analytics.ts` via `defineTool` + `scanPages` (250/page): `maxPages` input, `ScanSummary` in output, `expand:["devices"]` only when `includeDevices`, `inTimeRange` filtering (FR-003, FR-004, FR-004a) (commit 976cd06)
- [x] T025 [P] [US1] Rewrite `src/tools/courier.ts` via `defineTool` with `PaginatedOutputSchema` and `nextPageTokenOf` for `kratos_list_courier_messages` (FR-001) (commit 976cd06)
- [x] T026 [US1] Add `nextPageToken`/`count` to `kratos_list_identities` and `kratos_list_identity_schemas` in `src/tools/identity.ts` (the schema tool itself is US4 T042) and document the pagination convention in the server `instructions` in `src/server.ts` (FR-001, FR-022, SC-001) (commit 976cd06)

**Checkpoint**: All five list tools return a cursor; a filtered session query over N pages returns matches from all N pages (SC-002)

---

## Phase 4: User Story 2 - Operator Is Protected From Accidental Destructive Actions (Priority: P1)

**Goal**: Every tool carries a title + MCP annotations; toolset and read-only gating hide tools indistinguishably from absent ones; destructive tools confirm via elicitation and return `{cancelled:true}` on decline without touching Kratos

**Independent Test**: Start the server with `KRATOS_READ_ONLY=1` and confirm no non-read-only tool is listed and a call to one fails with InvalidParams; connect an elicitation-capable client, decline a `kratos_delete_identity` prompt, observe `{cancelled:true}` and zero upstream calls

### Tests for User Story 2

- [x] T027 [P] [US2] Unit tests in `tests/unit/server.test.ts` via the harness: every listed tool has `title` + `readOnlyHint`/`destructiveHint`/`idempotentHint`/`openWorldHint`; `KRATOS_TOOLSETS` subset and `KRATOS_READ_ONLY` hide tools from `tools/list` and calls return the InvalidParams protocol error; elicitation accept proceeds, decline returns `cancelled` with no Kratos call, missing elicitation capability skips the prompt, `KRATOS_CONFIRM_DESTRUCTIVE=0` skips the prompt, read-only tools never prompt; registering a destructive tool without `confirmMessage` throws; warn/error entries forwarded via MCP logging and `logging/setLevel` honoured; server version equals `package.json` version (FR-006, FR-007, FR-008, FR-009, FR-024, FR-025, SC-003, SC-004) (commits 976cd06, e9bfcd0)

### Implementation for User Story 2

- [x] T028 [US2] Apply the clarified annotation matrix in `src/tools/identity.ts`, `src/tools/session.ts`, `src/tools/courier.ts`, `src/tools/recovery.ts`, `src/tools/health.ts`, `src/tools/analytics.ts`: `READ_ONLY` for get/list/health/analytics; `CREATE` (non-read-only, non-destructive) for create identity, batch create, recovery link/code; `DESTRUCTIVE`/`UPDATE`/`UPDATE_IDEMPOTENT` for update, patch, set-state, extend session, disable session, delete identity, delete credential, delete identity sessions; every tool gets a `title` (FR-006, D1) (commit 976cd06)
- [x] T029 [US2] Assign each tool file's `toolset` (`identities`, `sessions`, `courier`, `recovery`, `health`, `analytics`) so `defineTool` gating (T013) and the `kratos://config/connection` resource report the same boundary (FR-007, FR-008) (commit 976cd06)
- [x] T030 [US2] Write action-specific `confirmMessage` prompts for all eight destructive tools (e.g. `Set identity ${id} to ${state} and revoke all its sessions?`, credential target `type (identifier)`) in `src/tools/identity.ts` and `src/tools/session.ts`; document confirmation, `KRATOS_CONFIRM_DESTRUCTIVE`, and `KRATOS_READ_ONLY` in the server `instructions` in `src/server.ts` (FR-009, FR-022) (commits 976cd06, e9bfcd0)
- [x] T031 [P] [US2] Report `toolsets` and `readOnly` and strip URL userinfo in the `kratos://config/connection` resource in `src/resources/schemas.ts` (FR-012, FR-007) (commit 976cd06)

**Checkpoint**: Read-only mode lists zero non-read-only tools; declined confirmation makes zero upstream calls (SC-003, SC-004)

---

## Phase 5: User Story 3 - Operator Inspects Credentials Without Leaking Secrets (Priority: P1)

**Goal**: Secret-bearing credential `config` is replaced by the Redaction Marker unless `KRATOS_ALLOW_CREDENTIAL_EXPOSURE` is set; `includeCredential` scopes which types are fetched

**Independent Test**: Fetch an identity with `includeCredential:["password"]` under default config and see `config` replaced by `[redacted: set KRATOS_ALLOW_CREDENTIAL_EXPOSURE=1]` while `type`/`identifiers`/`version` remain; enable the flag and see the raw config

### Tests for User Story 3

- [x] T032 [P] [US3] Unit tests in `tests/unit/credential-types.test.ts` for `redactCredentials`: sensitive types redacted with the exact marker, non-sensitive left intact, `type`/`identifiers`/`version`/timestamps preserved, absent `config` stays absent, exposure flag returns raw config (FR-010, SC-005) (commit 976cd06)
- [x] T033 [P] [US3] Unit tests in `tests/unit/identity-tools.test.ts` via the harness: `kratos_get_identity` with `includeCredential` list forwards the list and redacts; deprecated `includeCredentials:true` maps to all types; explicit list wins when both are given; `kratos_list_identities` and `kratos_get_identity_by_external_id` redact per item; `KRATOS_ALLOW_CREDENTIAL_EXPOSURE=1` returns raw config (FR-010, FR-011, SC-005) (commit 976cd06)

### Implementation for User Story 3

- [x] T034 [US3] Add `includeCredential: CredentialType[]` to `GetIdentityInputSchema` and `ListIdentitiesInputSchema` and keep boolean `includeCredentials` on `kratos_get_identity` as a deprecated alias in `src/schemas/tools.ts` (FR-011) (commit 976cd06)
- [x] T035 [US3] Apply `redactCredentials(identity, config.allowCredentialExposure)` in `src/tools/identity.ts` to `kratos_get_identity`, `kratos_get_identity_by_external_id` and every `kratos_list_identities` item; resolve `includeCredential ?? (includeCredentials ? ALL_CREDENTIAL_TYPES : undefined)`; document redaction in tool descriptions and server `instructions` (FR-010, FR-011, FR-022, SC-005, D5) (commit 976cd06)

**Checkpoint**: With default configuration zero secret-bearing `config` values appear in any tool output (SC-005)

---

## Phase 6: User Story 4 - Operator Uses Admin Capabilities the Server Previously Hid (Priority: P2)

**Goal**: Identifier/ID/organization filters, credential import, provider-specific unlink, set-state, schema tools, recovery `returnTo`/`flowType` with validated expiry

**Independent Test**: Fuzzy identifier search returns matching identities; unlinking `oidc` with `identifier` removes one link; an identity created with `hashed_password` is accepted by Kratos; set-state inactive with `revokeSessions` leaves no sessions; `kratos_get_identity_schema` returns the same document as the resource; a malformed `expiresIn` is rejected before any upstream call

### Tests for User Story 4

- [x] T036 [P] [US4] Unit tests in `tests/unit/identity-tools.test.ts`: `kratos_list_identities` forwards `credentialsIdentifier`, `previewCredentialsIdentifierSimilar`, `ids`, `organizationId`, `consistency`; `kratos_create_identity`/`kratos_update_identity` map credential import, `external_id`, `organization_id`, `verifiable_addresses` (status default), `recovery_addresses`; `kratos_delete_identity_credential` accepts all deletable types and forwards `identifier`; `kratos_set_identity_state` calls `patchIdentity` then `deleteIdentitySessions` when `revokeSessions`; `kratos_list_identity_schemas`/`kratos_get_identity_schema`; `kratos_update_identity` description states omitted metadata is cleared (FR-014, FR-015, FR-016, FR-017, FR-018, FR-020, FR-020a) (commit 976cd06)
- [x] T037 [P] [US4] Unit tests in `tests/unit/batch-patch-identities.test.ts` (ported to the harness): each batch item accepts the full identity import body; results use SDK field names (`action`, `identity`, `patchId`, `error`) with `summary`; all-items-failed batch logs a warning via the injected `log` (FR-016, FR-020a, FR-024a) (commit 976cd06)
- [x] T038 [P] [US4] Unit tests in `tests/unit/identity-external-id.test.ts` (ported to the harness): `kratos_get_identity_by_external_id` structured output, NOT_FOUND envelope, redaction (FR-010, FR-021) (commit 976cd06)
- [x] T039 [P] [US4] Unit tests in `tests/unit/recovery-tools.test.ts`: `returnTo` and `flowType` forwarded; `expiresIn` Go-duration validation rejects `"1 hour"` before any Kratos call; descriptions warn that outputs are account-takeover-equivalent secrets (FR-013, FR-019) (commit 976cd06)
- [x] T040 [P] [US4] Unit tests in `tests/unit/health-tools.test.ts`: alive/ready/version via the harness; `/version` timeout maps to structured `TIMEOUT` (FR-026, FR-030) (commit 976cd06)
- [x] T041 [P] [US4] Unit tests in `tests/unit/schemas.test.ts` for the new/changed Zod schemas: identifier filters, `IdentityCredentialsImportSchema` (password/hashed_password/oidc/saml), `SetIdentityStateInputSchema`, `GoDurationSchema`, `DeleteIdentityCredential` type enum + `identifier` (FR-013, FR-014, FR-015, FR-016, FR-017) (commit 976cd06)

### Implementation for User Story 4

- [x] T042 [US4] Extend `src/schemas/tools.ts`: `ListIdentitiesInputSchema` filters (`credentialsIdentifier`, `previewCredentialsIdentifierSimilar`, `ids`, `organizationId`, `consistency`); `IdentityCredentialsImportSchema` (password/hashed_password, oidc/saml providers with organization); `IdentityBodySchema` with `externalId`, `organizationId`, `credentials`, `verifiableAddresses`, `recoveryAddresses`, reused by create, update and each batch item; `DeleteIdentityCredentialInputSchema` with all deletable types + `identifier`; `SetIdentityStateInputSchema` (`state`, `revokeSessions`); schema list/get schemas; `GoDurationSchema`, `returnTo`, `flowType` on recovery inputs; update-identity metadata descriptions state clearing semantics (FR-013, FR-014, FR-015, FR-016, FR-017, FR-018, FR-019, FR-020) (commit 976cd06)
- [x] T043 [US4] Rewrite `src/tools/identity.ts` via `defineTool`: `toCreateIdentityBody`/`toUpdateIdentityBody` mapping the import body; filters forwarded on `listIdentities`; `identifier` forwarded on `deleteIdentityCredentials`; new `kratos_set_identity_state` (patch `state`, optional `deleteIdentitySessions`); new `kratos_list_identity_schemas` and `kratos_get_identity_schema`; batch results use SDK field names; last-write-wins (no read-before-write, JSON Patch `test` forwarded unchanged); `kratos_update_identity` description warns that omitted metadata is cleared (FR-014, FR-015, FR-016, FR-017, FR-018, FR-020, FR-020a) (commit 976cd06)
- [x] T044 [P] [US4] Rewrite `src/tools/recovery.ts` via `defineTool`: forward `returnTo` (link) and `flow_type` (code); descriptions state the output is account-takeover-equivalent and must be delivered only to the verified owner (FR-013, FR-019) (commit 976cd06)
- [x] T045 [P] [US4] Rewrite `src/tools/health.ts` via `defineTool`; `kratos_version` uses the raw HTTP client with timeout so failures map to `TIMEOUT`/HTTP-status codes (FR-026) (commit 976cd06)
- [x] T046 [P] [US4] Rewrite `src/resources/schemas.ts` with `registerResource`, `ResourceTemplate(kratos://schemas/{schema_id}, {list, complete})`, throw-on-error via `mapError` so read failures are JSON-RPC errors; delete `src/schemas/resources.ts` (URIs move next to their registration; error-body schemas obsolete) (FR-023, FR-032, D8) (commit 976cd06)

**Checkpoint**: Each hidden capability is reachable from an MCP client and unit-tested through the harness

---

## Phase 7: User Story 5 - Maintainer Trusts the Quality Gates (Priority: P2)

**Goal**: Real coverage figure with enforced thresholds, containerised Kratos integration job with stdio e2e, lint/typecheck over tests, dependency audit and Dependabot

**Independent Test**: `bun run test:unit` prints a real coverage percentage ≥ 80% lines and fails below threshold; `docker compose up -d --wait && bun run test:api` passes locally including `mcp-e2e.test.ts`

### Tests for User Story 5

- [x] T047 [P] [US5] Create `tests/api/mcp-e2e.test.ts`: spawn the built server over `StdioClientTransport`, assert `tools/list` annotations + `instructions`, `kratos_version`, create → get (redacted credentials) → list with `pageSize:1` + cursor → delete against a real Kratos, and `kratos://schemas/{schema_id}` resource template listing/reading (FR-029, SC-007) (commit 976cd06)
- [x] T048 [P] [US5] Relax `tests/api/courier.test.ts`, `tests/api/health.test.ts`, `tests/api/identity.test.ts`, `tests/api/recovery.test.ts`, `tests/api/session.test.ts` for Kratos v26.2.0 drift (R10: `DELETE …/sessions` with no sessions → 400, `log.level: warning`) and make fixtures serial-safe (FR-029, FR-034) (commit 976cd06)

### Implementation for User Story 5

- [x] T049 [US5] Fix coverage measurement in `tests/vitest.config.ts`: `allowExternal: true`, `include: ["**/src/**/*.ts"]`, `exclude` `src/index.ts` + `node_modules`, `reportOnFailure: true`, thresholds `lines 80 / functions 80 / branches 70 / statements 80`; keep the unit-run detection that skips Kratos global setup (FR-028, SC-006, SC-010, D14) (commit 976cd06)
- [x] T050 [US5] Set `fileParallelism: false` for integration runs in `tests/vitest.config.ts` and change `tests/setup/global-setup.ts` so `.env.test.local` only fills keys whose real environment variable is `undefined` (FR-034, D12) (commit 976cd06)
- [x] T051 [P] [US5] Create `docker-compose.yml` (`oryd/kratos:${KRATOS_VERSION:-v26.2.0}`, `serve --dev --watch-courier`, healthcheck on `/health/ready`) plus `tests/kratos/kratos.yml` (`dsn: memory`, password/code/link, recovery, courier) and `tests/kratos/identity.schema.json`; update `tests/setup/config.ts` expected-version wording (FR-029, SC-007, D12) (commit 976cd06)
- [x] T052 [US5] Update `.github/workflows/ci.yml`: `typecheck` runs `bun run typecheck` (src + tests), new `audit` job (`bun audit --audit-level=high`), unit job always runs with coverage enabled, new `integration` job (`needs: [lint, typecheck]`, `docker compose up -d --wait --wait-timeout 90`, `bun run test:api` with `KRATOS_ADMIN_URL`/`KRATOS_EXPECTED_VERSION`/`KRATOS_AUTH_TYPE`, Kratos logs on failure, compat JSON artifact) (FR-028, FR-029, FR-031, SC-006, SC-007, SC-008) (commit 976cd06)
- [x] T053 [P] [US5] Update `.github/workflows/release.yml`: `bun.lock` cache key, `bun run typecheck`, `bun audit --audit-level=high` step before publish (FR-031, FR-033) (commit 976cd06)
- [x] T054 [P] [US5] Create `.github/dependabot.yml`: weekly `bun` (grouped production/development) and weekly `github-actions` (FR-031) (commit 976cd06)
- [x] T055 [P] [US5] Add `.gitignore` entries for coverage output and integration artefacts (`coverage/`, `tests/test-results.json`) (FR-028) (commit 976cd06)

**Checkpoint**: CI reports a real coverage figure (baseline 90.8% lines), audit is clean, integration job passes against Kratos v26.2.0 (SC-006, SC-007, SC-008)

---

## Phase 8: User Story 6 - Maintainer Adds a Tool in Minutes (Priority: P3)

**Goal**: Prove the registration contract built in Phase 2 holds across the whole codebase — no tool file carries hand-written logging, try/catch, or result-envelope code — and document how to add a tool

**Independent Test**: `grep -n "try {" src/tools/*.ts` matches only `define.ts`; `grep -n "log\.\(info\|error\)" src/tools/*.ts` matches only `define.ts`; `grep -n "content: \[" src/tools/*.ts` matches only `define.ts`; source size is smaller than on `main` despite three new tools

### Verification for User Story 6

- [x] T056 [US6] Verify zero `try/catch`, `log.info`/`log.error`, `content:[`, `server.tool`/`registerTool` in `src/tools/identity.ts`, `src/tools/session.ts`, `src/tools/courier.ts`, `src/tools/recovery.ts`, `src/tools/health.ts`, `src/tools/analytics.ts` (the single `log.warn` for an all-failed batch in `identity.ts` is the spec-required warning via the injected `RunContext.log`) — measured on the branch: `try {` count is 0 in every tool file except `define.ts` (FR-024a, FR-032, US6 acceptance 2) (commit 976cd06)
- [x] T057 [US6] Verify SC-009: `src/` total 3007 lines on the branch vs 3.5k on `main` (tool files 1343 lines vs 2220 for the same six files + `index.ts` on `main`) while adding `kratos_set_identity_state`, `kratos_list_identity_schemas`, `kratos_get_identity_schema` (SC-009) (commit 976cd06)
- [x] T058 [P] [US6] Document "Adding a tool" (one `defineTool` call: name, title, description, toolset, schemas, annotation preset, `confirmMessage` if destructive, `run`) in `specs/011-architecture-hardening/quickstart.md` and record `ToolDefinition`, presets, visibility and confirmation rules in `specs/011-architecture-hardening/data-model.md` (US6 acceptance 1) (commits 976cd06, c55ff77)

**Checkpoint**: All six user stories are independently functional; adding a tool touches exactly one `defineTool` call

---

## Phase 9: Polish & Cross-Cutting Concerns

- [x] T059 [P] Update `README.md`: new env vars (`KRATOS_TOOLSETS`, `KRATOS_READ_ONLY`, `KRATOS_CONFIRM_DESTRUCTIVE`, `KRATOS_ALLOW_CREDENTIAL_EXPOSURE`, `KRATOS_MAX_SCAN_PAGES`), 27-tool table with Kind column and the three new tools, Behaviour section (confirmation, redaction, pagination/scan cap), Breaking changes for 0.3.0 (`limit` → `pageSize`, batch result shape, Node ≥ 20), local integration via `docker compose up -d --wait` (FR-005, FR-022, FR-033, SC-007) (commit 976cd06)
- [x] T060 [P] Update `CLAUDE.md` (Active Technologies line for 011, `bun run typecheck` / `test:unit` / `test:api` commands) via `.specify/scripts/bash/update-agent-context.sh claude` (commit 976cd06)
- [x] T061 [P] Generate `specs/011-architecture-hardening/contracts/README.md`, `identities.md`, `sessions.md`, `courier.md`, `recovery.md`, `health.md`, `analytics.md`, `resources.md` from the live `tools/list` + `resources/list` so the contracts cannot drift from `src/schemas/tools.ts` (Constitution III; FR-006, FR-021) (commit e9bfcd0)
- [x] T062 Sync `specs/011-architecture-hardening/spec.md`, `data-model.md`, `quickstart.md` with registration-level confirmation enforcement (FR-009 wording: "registration of a destructive tool without a confirmation prompt MUST fail") (commit c55ff77)
- [x] T063 Bump `package.json` version `0.2.0` → `0.3.0` so the MCP-reported version (read from `package.json` in `src/server.ts`) and the future release tag match (FR-025) (commit bb7e40c)
- [x] T064 Constitution PATCH 1.1.0 → 1.1.1 in `.specify/memory/constitution.md`: stack table tracks `@modelcontextprotocol/sdk ^1.30.x`, lockfile `bun.lock`, Kratos ^26.2.x (plan Constitution Check deviation) (commit 88ca6ec)
- [x] T065 Run full verification: `bun run lint`, `bun run typecheck`, `bun run test:unit` (coverage ≥ thresholds, suite < 5 s), `bun audit --audit-level=high` (0 findings), `docker compose up -d --wait && bun run test:api` (FR-028, FR-031, SC-006, SC-008, SC-010) (commit 976cd06)
- [ ] T066 After merge, tag `v0.3.0` through the feature 006 release workflow (`.github/workflows/release.yml`) so package version, MCP-reported version and git tag all read `0.3.0` (FR-025)
- [x] T067 [P] Extend `tests/api/mcp-e2e.test.ts` to drive `kratos_set_identity_state` (with `revokeSessions`) and `kratos_list_identity_schemas` / `kratos_get_identity_schema` over stdio against real Kratos, as plan.md § Project Structure claims for the e2e file; these paths are currently covered only by the in-memory harness (`tests/unit/identity-tools.test.ts`) (FR-029, US4 acceptance 4–5) (commit 4981def)
- [x] T068 Add `src/kratos/sessions.ts` `revokeAllSessions` so `kratos_set_identity_state` (revokeSessions) and `kratos_delete_identity_sessions` treat Kratos "no sessions" (404 v1.x / 400 v26.x) as success; `sessionsRevoked` reports whether sessions existed; unit tests in `tests/unit/sessions-helper.test.ts` (FR-017, US4 acceptance 4; found by T067) (commit 4981def)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — T001 first (lockfile), T002–T005 in parallel afterwards
- **Foundational (Phase 2)**: Depends on Phase 1. T006 (config) → T012 (`defineTool`) → T013/T014 (gating, confirmation) → T015 (enforcement) → T016 (`createServer`) → T017 (`index.ts`). T007, T008, T009, T010 parallel with T006. T011 before T012. T018 (harness) after T016; T019 parallel with T018. **BLOCKS all user stories**
- **US1 (Phase 3)**: Depends on T007, T011, T012. Tests T020–T022 parallel; T023 → T026; T024, T025 parallel with T023
- **US2 (Phase 4)**: Depends on T012–T016, T018. T027 parallel with T028–T031; T028 → T029 → T030; T031 parallel
- **US3 (Phase 5)**: Depends on T006, T010, T012. T032/T033 parallel; T034 → T035
- **US4 (Phase 6)**: Depends on T008, T012. T036–T041 parallel; T042 → T043; T044, T045, T046 parallel with T043
- **US5 (Phase 7)**: Depends on T003, T004, T018 and all tool phases (the e2e test exercises the finished server). T047, T048 parallel; T049 → T050; T051–T055 parallel; T052 after T051
- **US6 (Phase 8)**: Verification only — depends on every tool file being rewritten (T023–T025, T043–T045). T056, T057 sequential reads; T058 parallel
- **Polish (Phase 9)**: T059–T062, T064 parallel; T063 after T062; T065 last of the done items; T066 after merge; T067 independent

### User Story Dependencies

- **US1 (P1)**: Independent after Phase 2
- **US2 (P1)**: Independent after Phase 2 (gating and confirmation live in `define.ts`; story tasks only apply presets and prompts)
- **US3 (P1)**: Independent after Phase 2; shares `src/tools/identity.ts` with US4 (sequential edits within the file)
- **US4 (P2)**: Independent after Phase 2; shares `src/schemas/tools.ts` with US1/US3 (T011 → T034 → T042 in that order within the file)
- **US5 (P2)**: Its e2e test depends on US1–US4 being complete; its tooling tasks (T049–T055) depend only on Phase 1
- **US6 (P3)**: Verification of the foundation; can run as soon as the last tool file is rewritten

### Parallel Opportunities

- Phase 1: T002, T003, T004, T005 (different files)
- Phase 2: T007, T008, T009, T010 (kratos/, errors/, logging/) while T006 lands; T018 and T019 together
- Every test task within a story ([P]) — they are one file per toolset by design (D11)
- T024/T025 with T023; T044/T045/T046 with T043; T051/T053/T054/T055 with T052

## Parallel Example: User Story 4

```bash
# Tests (different files):
Task: "T036 tests/unit/identity-tools.test.ts"
Task: "T039 tests/unit/recovery-tools.test.ts"
Task: "T040 tests/unit/health-tools.test.ts"
Task: "T041 tests/unit/schemas.test.ts"

# Implementation after T042 (schemas):
Task: "T043 src/tools/identity.ts"
Task: "T044 src/tools/recovery.ts"
Task: "T045 src/tools/health.ts"
Task: "T046 src/resources/schemas.ts"
```

## Implementation Strategy

### MVP First (US1 only)

1. Phase 1 (deps + tooling) → Phase 2 (`defineTool`, `createServer`, config, pagination, harness)
2. Phase 3: rewrite session/analytics/courier tools with cursors — the two silent-correctness bugs are fixed
3. Validate with `tests/unit/session-tools.test.ts` and a manual `pageSize:1` walk

### Incremental Delivery (as shipped)

In practice the whole feature landed as one refactor commit (976cd06) because every tool file had to move onto `defineTool` at once; e9bfcd0 then hardened the confirmation contract, c55ff77 synced the artifacts, bb7e40c bumped the version, and 88ca6ec closed the constitution deviation.

---

## Requirement → Task Traceability

| Requirement | Tasks |
|---|---|
| FR-001 next-page cursor + count on every list tool | T007, T011, T019, T020, T022, T023, T025, T026 |
| FR-002 filtered session scan (100/page, cap, `truncated`, resume) | T007, T019, T020, T023 |
| FR-003 analytics `maxPages`, server-wide default, scan summary | T006, T007, T011, T019, T021, T024 |
| FR-004 no device expansion unless requested | T021, T024 |
| FR-004a strictly sequential scans, no throttling | T007, T020, T021, T023, T024 |
| FR-005 `kratos_list_sessions` `limit` → `pageSize`/`pageToken` (breaking, 0.3.0) | T020, T023, T059 |
| FR-006 title + annotation hints on every tool | T012, T027, T028, T061 |
| FR-007 toolset gating, hidden = protocol error | T006, T013, T027, T029, T031 |
| FR-008 read-only mode | T006, T013, T027, T029 |
| FR-009 elicitation confirmation, cancelled result, enforced at registration | T006, T014, T015, T027, T030, T062 |
| FR-010 redaction marker for secret-bearing credential config | T006, T010, T032, T033, T035, T038 |
| FR-011 `includeCredential` list + deprecated `includeCredentials` alias | T033, T034, T035 |
| FR-012 strip URL userinfo from logs and connection resource | T017, T031 |
| FR-013 recovery secret warning + expiry validation | T039, T041, T042, T044 |
| FR-014 identity list filters | T036, T041, T042, T043 |
| FR-015 all deletable credential types + provider `identifier` | T036, T041, T042, T043 |
| FR-016 credential import body on create/update/batch | T036, T037, T041, T042, T043 |
| FR-017 `kratos_set_identity_state` with session revocation | T036, T041, T042, T043 |
| FR-018 schema list/get tools | T036, T042, T043 |
| FR-019 recovery `returnTo` / `flowType` | T039, T042, T044 |
| FR-020 update description states metadata clearing | T036, T042, T043 |
| FR-020a last-write-wins, JSON Patch `test` only guard | T036, T037, T043 |
| FR-021 output schemas + `structuredContent`, error envelope kept | T011, T012, T038, T061 |
| FR-022 capabilities + operator instructions | T016, T026, T030, T035, T059 |
| FR-023 schema resource template with list/complete, throw-on-error | T046 |
| FR-024 warn/error forwarded via MCP logging, `setLevel` | T009, T016, T027 |
| FR-024a one start + one completion log entry with correlationId/durationMs/error code | T012, T037, T056 |
| FR-025 MCP version = package version = tag (0.3.0) | T016, T017, T027, T063, T066 |
| FR-026 raw HTTP timeout + shared error codes | T008, T019, T040, T045 |
| FR-027 fail-fast on unknown toolsets / malformed headers | T006, T019 |
| FR-028 coverage over server sources, 80/80/70/80 | T002, T019, T049, T052, T055, T065 |
| FR-029 CI integration job with containerised Kratos + stdio e2e | T047, T048, T051, T052, T067, T068 |
| FR-030 every tool unit-tested through a real MCP client | T016, T018, T020, T021, T022, T027, T033, T036–T040 |
| FR-031 lint/typecheck over tests, audit job, Dependabot | T001, T003, T004, T005, T052, T053, T054, T065 |
| FR-032 SDK ^1.30, no deprecated `server.tool`/`server.resource` | T001, T012, T046, T056 |
| FR-033 Node ≥ 20, `prepublishOnly` build, pinned package manager | T002, T053, T059 |
| FR-034 serial integration files, real env wins over `.env.test.local` | T048, T050 |
| SC-001 100% of list tools return a cursor | T020, T022, T023, T026 |
| SC-002 filtered session query returns matches across all N pages | T020, T023 |
| SC-003 read-only / toolset subset lists zero hidden tools | T013, T027 |
| SC-004 declined confirmation makes zero upstream calls | T014, T027 |
| SC-005 zero secret config values in output by default | T032, T033, T035 |
| SC-006 real coverage ≥ 80% lines; every tool MCP-client-tested | T018, T049, T052, T065 |
| SC-007 integration job passes on Kratos v26.2.0; single compose command locally | T047, T051, T052, T059 |
| SC-008 `bun audit` zero high/critical | T001, T052, T065 |
| SC-009 source size decreases despite three new tools | T057 |
| SC-010 unit suite < 5 s | T049, T065 |

Every FR (FR-001…FR-034 incl. FR-004a, FR-020a, FR-024a) and every SC maps to at least one task; every task cites at least one FR/SC or story acceptance criterion.

---

## Open follow-ups

- **T066** — tag `v0.3.0` via the release workflow after merge (FR-025 requires package version, MCP version and git tag to match; the first two are already `0.3.0`, the tag does not exist until release).
- **T067** — closed (commit 4981def): e2e now drives set-state and both schema tools over stdio. Doing so exposed that Kratos v26.2.0 answers 400 when revoking sessions of an identity that has none, which made `revokeSessions: true` fail — fixed in T068.
- The plan's constitution PATCH follow-up is **closed** (commit 88ca6ec, constitution 1.1.1) and is recorded as done in T064.

## Notes

- Retrospective: `[x]` marks are backed by the cited commits; verification points were re-checked on the branch — `tests/vitest.config.ts` thresholds 80/80/70/80 and `fileParallelism:false`; `.github/dependabot.yml` present and `ci.yml` has an `audit` job (`bun audit --audit-level=high`); `package.json` has `engines.node >=20.0.0`, `packageManager bun@1.3.3`, `prepublishOnly`, version `0.3.0`; `tests/setup/global-setup.ts` only sets a key when `process.env[key] === undefined`.
- Test files listed in FR-030 tasks: `identity-tools`, `session-tools`, `courier-tools`, `recovery-tools`, `health-tools`, `analytics-tools`, `server`, `config`, `client`, `pagination`, `batch-patch-identities`, `identity-external-id`, `analytics`, `credential-types`, `schemas` (15 unit files) plus `tests/api/mcp-e2e.test.ts`.
