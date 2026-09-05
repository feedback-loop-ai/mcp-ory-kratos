# Implementation Plan: Architecture Hardening & Operator Safety

**Branch**: `011-architecture-hardening` | **Date**: 2026-09-05 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/011-architecture-hardening/spec.md`

## Summary

Fix the two silent-correctness defects (list tools never return a cursor; filtered session listing inspects only page 1), add operator safety controls (tool annotations, toolset/read-only gating, elicitation-based destructive confirmation, credential redaction), expose hidden Kratos Admin API parameters (identifier search, credential import, provider-specific unlink, set-state, schema tools), and make the quality gates truthful (real coverage, containerised Kratos integration job, MCP stdio e2e, lint/typecheck over tests, audit). The technical approach is a single registration contract (`defineTool` over `McpServer.registerTool`) that applies logging, error mapping, structured output, annotations, gating and confirmation once; a `createServer` factory separated from the CLI entry so a real MCP `Client` can drive the server in-memory in unit tests; a shared `Link`-header pagination helper with a capped `scanPages` walker; the MCP SDK upgraded to 1.30.x (security fix, `registerTool`/`registerResource`/`ResourceTemplate`/elicitation/logging); and a `docker-compose.yml` Kratos v26.2.0 used identically by CI and locally. Net effect: 27 tools, 3 resources, source shrinks by ~490 lines despite three new tools (SC-009).

## Technical Context

**Language/Version**: TypeScript 5.9 (strict mode) on Bun 1.3.x (`packageManager: bun@1.3.3`); published bundle targets Node ≥ 20 (`engines.node >=20.0.0`, `#!/usr/bin/env node`)
**Primary Dependencies**: @modelcontextprotocol/sdk ^1.30.0, @ory/kratos-client ^26.2.0, zod ^3.25.x, axios ^1.20 (override); dev: vitest ^4, @vitest/coverage-v8 ^4, @biomejs/biome ^2.5, typescript ^5.9, ajv ^8 (test-only: validates each tool's description example against its JSON-Schema input, FR-006a)
**Storage**: N/A (stateless proxy to Kratos Admin API; no per-call state survives the request)
**Testing**: Unit — Vitest via an in-memory MCP harness (`tests/unit/harness.ts`: real `createServer` + `InMemoryTransport` + Proxy-backed `vi.fn()` Kratos stubs + captured log entries), 16 files / 224 tests. Integration — `tests/api/` against `docker compose` Kratos v26.2.0 (`dsn: memory`), files serial, includes `mcp-e2e.test.ts` driving the server over stdio through a real `Client`
**Target Platform**: Linux/macOS server-side; stdio MCP transport only (Claude Code, VS Code, any MCP client)
**Project Type**: Single project (`src/`, `tests/` at repository root)
**Performance Goals**: Unit suite < 5 s (Constitution VI; actual ≈ 0.3 s + coverage); plain list tools = exactly one upstream call; scanning tools ≤ `maxPages` upstream calls (default `KRATOS_MAX_SCAN_PAGES=20`, hard max 1000); no additional latency on the non-destructive path (confirmation only adds one client round-trip for destructive tools when elicitation is supported)
**Constraints**: Stateless; no retries (feature 001 fail-fast decision stands, FR-026 adds timeouts only); page cursors opaque and never constructed by the server (R1/R4); secret-bearing credential `config` redacted by default (FR-010); every tool registered through `defineTool` — no direct `server.tool`/`registerTool` calls in tool files (FR-009, FR-032); hidden tools indistinguishable from absent tools (FR-007/008)
**Scale/Scope**: 27 tools across 6 toolsets, 3 resources; `src/` ≈ 3.1k LOC (was ≈ 3.5k on `main`); 19 `src/` files touched (4 new — `server.ts`, `tools/define.ts`, `kratos/pagination.ts`, `kratos/sessions.ts` — 1 deleted); 33 test files touched; CI adds `audit` and `integration` jobs

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle / Section | Check | Status |
|---|---|---|
| I. AI-Native Development | Every tool has Zod input + output schema, `structuredContent`, title, annotations, action-oriented description ending in a usage example (FR-006a; enforced by a unit assertion that each example satisfies the tool's own input schema) `Example: {...}` (FR-006a; destructive tools state irreversibility; scanners state the cap and page size). Destructive tools declare their real output shape (`{success, message}`, `sessionsExisted`, `sessionsRevoked`) rather than a generic passthrough (FR-021). Server `instructions` explain IDs, cursors, redaction, destructive hints (FR-021, FR-022). Errors keep the structured `McpToolError` envelope. Stateless: nothing survives a call | PASS |
| II. Spec-Driven Development | spec.md (37 clarifications across three clarify rounds) → research.md (R1–R10) → data-model.md / contracts/ / quickstart.md → this plan → tasks.md. Roles distinct in artifacts | PASS |
| III. Contract-First API Design | contracts/ hold one file per toolset generated from live `tools/list` plus resources.md; every tool maps 1:1 to an `IdentityApi`/`CourierApi`/`MetadataApi` operation or a documented multi-page scan. Breaking changes (`limit`→`pageSize`, batch result shape) are versioned and documented (§ Breaking changes). Error codes unchanged across SDK and raw-HTTP paths (FR-026) | PASS |
| III (retrospective deviation) | The contracts under `contracts/` were generated from the live server *after* implementation, because this feature was specified retrospectively (tasks.md "Retrospective note"). Justification: the contracts are derived from the same Zod objects in `src/schemas/tools.ts` that the server validates inputs and `structuredContent` against, so they cannot drift from the shipped behaviour; regenerating them is part of T061. Going forward, contracts precede code (Phase 1 before Phase 2) as the constitution requires | PASS (documented exception) |
| IV. Operational Excellence | Structured JSON logs with correlation IDs; warn/error forwarded via MCP `logging`, level adjustable (FR-024); every Kratos error incl. raw-HTTP timeout mapped (`KratosHttpError` → `mapError`); health/ready/version tools; URL userinfo stripped before logging (FR-012); credential redaction default-on (FR-010); no traits/tokens logged | PASS |
| V. Simplicity & YAGNI | One registration path replaces ~70 % duplicated scaffolding (SC-009). Every non-thin-proxy piece cites an FR (§ Complexity Tracking). No retries, no per-type redaction policy, no HTTP transport, no SDK v2, no prompts | PASS |
| VI. Fast Feedback Loops | Unit run hermetic, ≈ 0.3 s test time (SC-010); Bun for install/run/build; Biome single tool for lint + format; vitest unit mode skips Kratos pre-flight; `docker compose up -d --wait` is the single local integration command (SC-007) | PASS |
| VII. Type Safety & Validation | `tsc --noEmit` over `src/` and `tests/` (`tsconfig.test.json`); zero explicit `any` in `src/` (the `defineTool` callback is widened via `unknown as ToolCallback<I>`, not `any`); Zod validates all inputs incl. Go-duration `expiresIn`, toolset names, custom headers (FR-013, FR-027); SDK validates `structuredContent` against `outputSchema`; config parsed once at startup and fails fast; unit tests cover malformed inputs and upstream error shapes | PASS |
| Technology Stack lock | Bun 1.x, TS 5.x strict, @ory/kratos-client, Zod 3.25, Vitest, Biome — all as pinned. **Deviation**: table pins `@modelcontextprotocol/sdk ^1.25.x`; repo is on `^1.30.0` (still 1.x, required by FR-032 to close GHSA-345p-7cg4-v4c7). Table names `bun.lockb`; the repo commits the text `bun.lock` (Bun ≥ 1.2 default; CI cache key already hashes `bun.lock`). Both are non-semantic drifts; **resolved by constitution PATCH 1.1.0 → 1.1.1** (`.specify/memory/constitution.md`, 2026-09-05) which updates the stack table | PASS |
| Quality Gates | Lint (src + tests), typecheck (src + tests), unit tests with enforced coverage thresholds 80/80/70/80, integration against Kratos v26.2.0, `bun audit --audit-level=high` — all mandatory in CI; Dependabot weekly for bun + GitHub Actions (FR-031) | PASS |

**Post-design re-check**: PASS — design adds no persistent state, no new runtime dependency beyond the SDK minor bump and the `axios` override, and no abstraction that is not traced to an FR in § Complexity Tracking. The stack-table deviation above was closed by constitution PATCH 1.1.1; nothing carries forward.

## Project Structure

### Documentation (this feature)

```text
specs/011-architecture-hardening/
├── plan.md              # This file
├── spec.md              # 6 user stories, FR-001…FR-034, SC-001…SC-010, 37 clarifications
├── research.md          # Phase 0 — R1 Kratos release check … R10 v26.2.0 drift
├── data-model.md        # Phase 1 — Config, ToolDefinition, presets, wire structures, resources
├── quickstart.md        # Phase 1 — operator flows per user story, breaking-change table
├── contracts/           # Phase 1 — generated from live tools/list + resources/list
│   ├── README.md        #   index: 27 tools × 6 toolsets, kind/idempotency, resources
│   ├── identities.md    #   12 tools
│   ├── sessions.md      #   6 tools
│   ├── courier.md       #   2 tools
│   ├── recovery.md      #   2 tools
│   ├── health.md        #   3 tools
│   ├── analytics.md     #   2 tools
│   └── resources.md     #   kratos://schemas, kratos://schemas/{schema_id}, kratos://config/connection
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── index.ts                    # MODIFIED: CLI entry only — loadConfig, createKratosClients, createServer, stdio; redactUrl for the startup log
├── server.ts                   # NEW: createServer(config, clients) factory — capabilities, instructions, version from package.json, logging bridge, setLevel, registers all toolsets + resources
├── config.ts                   # MODIFIED: TOOLSETS/Toolset, readOnly, confirmDestructive, allowCredentialExposure, maxScanPages; parseToolsets fails fast with valid names; loadConfig(env) injectable
├── errors/mapper.ts            # MODIFIED: handles KratosHttpError shape (status 0 + ETIMEDOUT → TIMEOUT)
├── kratos/
│   ├── client.ts               # MODIFIED: KratosHttpError; raw GET honours AbortSignal.timeout(config.timeoutMs)
│   ├── pagination.ts           # NEW: extractPageToken / nextPageTokenOf (Link header), scanPages (capped walker), inTimeRange
│   ├── sessions.ts             # NEW: revokeAllSessions — deleteIdentitySessions treating 404 (v1.x) / 400 (v26.x) "no sessions" as success, returns whether sessions existed (FR-017a)
│   └── types.ts                # MODIFIED: CREDENTIAL_TYPES, ALL_CREDENTIAL_TYPES, SENSITIVE_CREDENTIAL_TYPES, redactCredentials()
├── logging/logger.ts           # MODIFIED: addSink() + setLevel() for the MCP logging bridge
├── resources/schemas.ts        # MODIFIED: registerResource; ResourceTemplate with list + complete; throw on error; connection resource strips userinfo, reports toolsets/readOnly
├── schemas/
│   ├── tools.ts                # MODIFIED: PaginationInput/PaginatedOutput/ScanSummary/MaxPagesInput (maxPages + pageToken resume); includeCredential lists; identity import body; set-state, schema tools; recovery returnTo/flowType + Go-duration regex; all output schemas incl. MutationResult, SetIdentityStateOutput, DeleteIdentitySessionsOutput
│   └── resources.ts            # DELETED: URIs moved to resources/schemas.ts; resources no longer return error bodies
└── tools/
    ├── define.ts               # NEW: ToolContext, ToolDefinition, defineTool, annotation presets, CANCELLED, withCancellation
    ├── identity.ts             # MODIFIED: 12 tools via defineTool (+ set_identity_state, list/get_identity_schema); redaction; filters; import body
    ├── session.ts              # MODIFIED: 6 tools; pageSize/pageToken; scanFilteredSessions at 100/page with cap + resume cursor
    ├── courier.ts              # MODIFIED: 2 tools; nextPageToken
    ├── recovery.ts             # MODIFIED: 2 tools; secret warning; returnTo / flowType
    ├── health.ts               # MODIFIED: 3 tools; /version via raw HTTP with timeout
    └── analytics.ts            # MODIFIED: 2 tools via scanPages; maxPages; devices expansion only when requested

tests/
├── vitest.config.ts            # MODIFIED: coverage include "**/src/**/*.ts" + allowExternal + thresholds; fileParallelism:false for integration
├── kratos/
│   ├── kratos.yml              # NEW: Kratos v26.2.0 config (dsn: memory, password/code/link, recovery, courier)
│   └── identity.schema.json    # NEW: default identity schema for tests
├── setup/
│   ├── config.ts               # MODIFIED: expected-version wording, v26 examples
│   ├── global-setup.ts         # MODIFIED: real env vars win over .env.test.local (FR-034)
│   ├── context.ts, errors.ts, fixtures.ts, compatibility-reporter.ts, schema-generator.ts   # MODIFIED: lint/typecheck clean (now in scope)
├── api/
│   ├── mcp-e2e.test.ts         # NEW: stdio e2e — tools/list annotations, list+cursor, create/get/redaction, set-state, schemas, resources, error envelope
│   └── courier/health/identity/recovery/session.test.ts   # MODIFIED: v26.2.0 status drift (R10), serial-safe fixtures
└── unit/
    ├── harness.ts              # NEW: startHarness(config overrides, {elicitation}) → real server + InMemoryTransport + stubs + captured log entries
    ├── identity-tools.test.ts, session-tools.test.ts, courier-tools.test.ts,
    │   recovery-tools.test.ts, health-tools.test.ts, analytics-tools.test.ts   # NEW: one file per toolset, every tool via client.callTool
    ├── server.test.ts          # NEW: gating (toolsets/read-only → hidden + invalid-params), elicitation accept/decline/absent, logging bridge, resources, invocation trace (FR-024a) + no-secrets-in-logs (FR-012a)
    ├── config.test.ts, client.test.ts, pagination.test.ts, sessions-helper.test.ts   # NEW (sessions-helper: revokeAllSessions 404/400/other)
    ├── batch-patch-identities.test.ts, identity-external-id.test.ts, analytics.test.ts,
    │   credential-types.test.ts, schemas.test.ts   # MODIFIED: ported from server.tool() stubs to the harness / pure helpers

.github/
├── workflows/ci.yml            # MODIFIED: typecheck src+tests, audit job, unit job always runs, integration job (compose --wait, logs on failure)
├── workflows/release.yml       # MODIFIED: bun.lock cache key, `bun run typecheck`, audit step
└── dependabot.yml              # NEW: weekly bun + github-actions, grouped prod/dev
docker-compose.yml              # NEW: oryd/kratos:${KRATOS_VERSION:-v26.2.0}, healthcheck on /health/ready
package.json                    # MODIFIED: sdk ^1.30, axios override, overrides block, engines node>=20, packageManager, scripts typecheck/test:unit/test:api/audit, prepublishOnly build
bun.lock                        # MODIFIED
tsconfig.test.json              # NEW: extends tsconfig, includes tests/, relaxed unused-checks
biome.json                      # MODIFIED: includes tests/**; test-only rule overrides
.gitignore, CLAUDE.md, README.md   # MODIFIED
```

**Structure Decision**: Single-project layout from feature 001 retained. The only structural additions are `src/server.ts` (factory) and `src/tools/define.ts` (registration contract); tool files keep their toolset-per-file split, which now doubles as the `Toolset` gating boundary. `src/schemas/resources.ts` is removed because resource URIs are declared where they are registered and error-body schemas are obsolete under throw-on-error (FR-023).

## Design Decisions

### D1: `defineTool` — single registration path with enforced confirmation (US6, FR-009, FR-021, FR-006)

`src/tools/define.ts` wraps `McpServer.registerTool`. A `ToolDefinition` supplies name, title, description, toolset, `inputSchema`, optional `outputSchema`, `annotations`, optional `confirmMessage(args)` and `run(args, {log})`. The wrapper adds: `openWorldHint:false`, correlated logging with duration, `mapError` on throw (error result has `isError:true` and **no** `structuredContent`, because the SDK validates structured output against the schema), `structuredContent` when an output schema exists, gating (D3) and confirmation (D4). Registration **throws** when `destructiveHint === true` and no `confirmMessage` is given — a destructive tool cannot opt out (spec clarification; commit e9bfcd0). Because a destructive tool may return `CANCELLED` instead of its declared output, its advertised `outputSchema` is `withCancellation(schema)` = declared fields made optional + `cancelled`/`message` + passthrough (tool output schemas must be objects, so a Zod union is not usable). Destructive tools nevertheless declare their real shape before widening (`MutationResultSchema`, `DeleteIdentitySessionsOutputSchema` with `sessionsExisted`, `SetIdentityStateOutputSchema` with `sessionsRevoked`, `SessionSummarySchema` for extend) — a generic passthrough would tell the agent nothing (FR-021). The SDK's callback type is satisfied by widening through `unknown as ToolCallback<I>`; `define.ts` carries no explicit `any` (Constitution VII). Five annotation presets (`READ_ONLY`, `CREATE`, `UPDATE_IDEMPOTENT`, `UPDATE`, `DESTRUCTIVE`) encode the clarified hint matrix.
*Alternatives*: per-tool `confirm: true` flag (rejected — a forgotten flag silently drops the human-in-the-loop; the first cut of 976cd06 did this and was replaced); a base class/decorator (rejected — one function is enough, YAGNI).

### D2: Full Zod objects, not `.shape`, passed to the SDK (FR-021, R2)

`registerTool` accepts either a raw shape or a `ZodObject`. Passing `.shape` drops `.passthrough()` in JSON-Schema conversion, so structured output carrying extra Kratos fields fails `additionalProperties` validation. Found only by the stdio e2e test (justifies FR-029). Full objects are also what SDK v2 requires, keeping the later hop mechanical.
*Alternatives*: strip unknown fields before returning (rejected — lossy for an admin tool; Constitution III "no invented abstractions").

### D3: Register-then-disable gating (FR-007, FR-008, SC-003)

Every tool is registered, then `registered.disable()` when `toolset ∉ config.toolsets` or (`readOnly` and `readOnlyHint !== true`). The SDK omits disabled tools from `tools/list` and rejects calls with `InvalidParams` — the same protocol error as a non-existent tool, satisfying the clarification that hidden tools be indistinguishable from absent ones.
*Alternatives*: skip registration (rejected — loses `listChanged` semantics and a future `enable_toolset` meta-tool, R3); return a structured error result (rejected — leaks tool existence and reads as a tool failure to agents).

### D4: Elicitation-based confirmation with graceful fallback (FR-009, SC-004)

Before `run`, if destructive AND `config.confirmDestructive` AND `server.server.getClientCapabilities()?.elicitation`, the server sends `elicitInput` with a boolean `confirm` field built from `confirmMessage(args)`. Only `action:"accept"` with `confirm === true` proceeds; anything else returns `CANCELLED` (`{cancelled:true, message}`) as a **success** result and never touches Kratos. Without elicitation support the call proceeds — the `destructiveHint` lets such clients gate themselves; `KRATOS_READ_ONLY` is the hard-enforcement path (clarification; R3).
*Alternatives*: refuse when unsupported (rejected — unusable from most clients today); error result on decline (rejected — triggers agent retry loops).

### D5: Redaction as a `types.ts` helper applied in tools, one switch (FR-010, FR-011, SC-005, R5)

`redactCredentials(identity, allowExposure)` replaces `config` of `SENSITIVE_CREDENTIAL_TYPES` with the fixed marker `[redacted: set KRATOS_ALLOW_CREDENTIAL_EXPOSURE=1]`, keeps `type`/`identifiers`/`version`/timestamps, and leaves absent `config` absent. Applied in `identity.ts` to get-by-id and each list item — the only two tools that accept `includeCredential`; get-by-external-id never requests credentials, so nothing to redact. A single `allowCredentialExposure` flag; `includeCredential: string[]` (mirrors Kratos `include_credential`) is the canonical scope control, with boolean `includeCredentials` kept on `kratos_get_identity` as a deprecated "all types" alias (explicit list wins when both are given).
*Alternatives*: redact inside `defineTool` generically (rejected — would need output-shape introspection; only two tools carry credentials, FR-010a); per-type policy (rejected — clarification: YAGNI).

### D6: `Link`-header pagination helper, `scanPages`, cap semantics (FR-001…FR-005, SC-001, SC-002, R4)

`src/kratos/pagination.ts`: `nextPageTokenOf(response)` parses `rel="next"` `page_token` from the Axios `link` header — the SDK exposes no body field. Plain list tools make one call and return `{items, count, nextPageToken?}`. Multi-page tools use `scanPages(fetchPage, {maxPages, startToken})`, which stops early when the collection ends (no `Link` or empty page → `truncated:false`) and reports `truncated:true` with a resume `nextPageToken` only when the cap was hit with more remaining. `kratos_list_sessions` with a filter walks upstream pages of **100** (Kratos list maximum) independent of `pageSize`, which counts matches to return; a `nextPageToken` is returned whenever more upstream pages remain, `truncated` only when the cap stopped it (clarification). Analytics walk pages of 250 (Kratos allows larger pages on these endpoints; kept from the pre-existing code), accept `pageToken` (passed to `scanPages` as `startToken`) so a truncated aggregate can be resumed (FR-003), and skip `expand:["devices"]` unless `includeDevices` (FR-004). `maxPages` per call defaults to `config.maxScanPages` (`KRATOS_MAX_SCAN_PAGES`, 20).
*Alternatives*: offset pagination (deprecated in Kratos); unbounded scan (rejected — unbounded upstream load; clarification chose cap + resume).

### D7: `createServer` factory vs CLI entry (FR-022, FR-024, FR-025, FR-030)

`src/server.ts` exports `createServer(config, clients) → {server, logger}` and does everything except transport: `McpServer` with `name`/`version` read from `package.json` (`with {type:"json"}` import), capabilities `{tools:{listChanged}, resources, logging}`, operator `instructions`, a logger sink that forwards `warn`/`error` entries via `sendLoggingMessage` (mapped `warn→warning`) only while connected, a `logging/setLevel` handler, and registration of six toolsets + resources. `src/index.ts` only loads config, builds clients, logs a userinfo-stripped endpoint, and connects `StdioServerTransport`. This split is what makes the in-memory harness (D11) possible and keeps `index.ts` excluded from coverage honestly.
*Alternatives*: keep everything in `index.ts` and test via subprocess only (rejected — slow, no stubbing, violates VI).

### D8: `ResourceTemplate` with list/complete and throw-on-error (FR-023)

`kratos://schemas/{schema_id}` is registered with `new ResourceTemplate(uri, {list, complete})`, so clients can enumerate schema resources and complete `schema_id` by prefix. All resource handlers throw an `Error` built from `mapError` (`CODE: message (suggestion)`) so the SDK returns a JSON-RPC error; the previous "successful read with `{error}` body" contract and its schema file are removed. `kratos://config/connection` strips userinfo and adds `toolsets`/`readOnly`.
*Alternatives*: static resources per schema (rejected — schema set is dynamic); keep error bodies (rejected — clients cannot distinguish failure from content).

### D9: `KratosHttpError` + `AbortSignal.timeout` on the raw HTTP path (FR-026)

The `/version` path bypasses the SDK (proxy path mismatch, feature 001). It now uses `fetch` with `AbortSignal.timeout(config.timeoutMs)` and throws `KratosHttpError` shaped like an Axios error (`response.status/data`, `code`), with a `TimeoutError` translated to `code:"ETIMEDOUT"` so `mapError` yields the same `TIMEOUT` / HTTP-status codes as SDK calls. No retries.
*Alternatives*: route `/version` through `MetadataApi` (rejected — the documented proxy-path problem remains); a second error mapper (rejected — Constitution III consistency).

### D10: Config — one Zod parse, env precedence, fail-fast (FR-027, FR-012)

`loadConfig(env = process.env)` builds a plain object from env (`parseToolsets`, `parseBool`, `parseAuth`) and runs a single `ConfigSchema.parse`, so every default and bound lives in one schema and unit tests can inject an env. Unknown toolset names throw listing the valid set; malformed `KRATOS_CUSTOM_HEADERS` JSON or non-string values throw before any client is built. `all`/empty = all toolsets. Boolean flags accept `1/true/yes/on`. Userinfo stripping is done at the log/resource boundary (`redactUrl` in `index.ts`, URL rewrite in the connection resource), never mutating `kratosAdminUrl` itself (the SDK may need it).
*Alternatives*: `z.preprocess` chains per field (rejected — harder error messages); reading `process.env` inside the schema (rejected — untestable).

### D11: In-memory MCP test harness (FR-030, SC-006, R7)

`tests/unit/harness.ts::startHarness(overrides, {elicitation})` boots the **real** `createServer` with `KratosClients` replaced by Proxy objects that lazily create a `vi.fn()` per SDK method, links an SDK `Client` over `InMemoryTransport.createLinkedPair()`, optionally installs an `ElicitRequestSchema` handler (default accepts; tests override `elicit.handler`), and returns `callTool` with parsed JSON. Tests therefore exercise `tools/list` annotations, input validation, `structuredContent`, gating, elicitation and the error envelope. The former approach — stubbing `server.tool()` to capture handlers — was dropped because it could not detect mis-registration, missing annotations, invalid structured output or gating, which is where three of the audited defects lived.
*Alternatives*: mock `McpServer` (rejected — tests the mock); spawn the binary (kept for the e2e integration test only).

### D12: CI integration job (FR-029, FR-034, SC-007, R6, R10)

`docker-compose.yml` runs `oryd/kratos:${KRATOS_VERSION:-v26.2.0}` with `serve --dev --watch-courier`, `dsn: memory` (auto-migrates, no migrate container), config + schema mounted from `tests/kratos/`, healthcheck on `/health/ready`. CI: `docker compose up -d --wait --wait-timeout 90`, then `bun run test:api` with `KRATOS_ADMIN_URL`, `KRATOS_EXPECTED_VERSION`, `KRATOS_AUTH_TYPE` set, Kratos logs dumped on failure, compat JSON uploaded. `fileParallelism:false` because SQLite is single-writer ("concurrent update" failures in ~1 of 3 parallel runs). `global-setup.ts` now only sets a key from `.env.test.local` when the real env var is undefined (previously the file overwrote CI's variables). Where v26.2.0 differs from v1.x: `DELETE …/sessions` on an identity with no sessions returns 400 (was 404) — the *server* absorbs both statuses in `src/kratos/sessions.ts::revokeAllSessions` and reports success with `sessionsRevoked` / `sessionsExisted` (FR-017a), so the integration suite no longer has to tolerate either status itself (it originally did, R10); `log.level: warning`. The job `needs: [lint, typecheck]` so a broken build does not spend container minutes.
*Alternatives*: GitHub `services:` container (rejected — config must be mounted before start; compose is identical locally); Postgres sidecar (rejected — slower, unnecessary for a serial suite).

### D13: Dependency overrides and pins (FR-031, FR-032, SC-008, R8)

`@modelcontextprotocol/sdk` → `^1.30.0` (closes GHSA-345p-7cg4-v4c7; adds Zod 3.25 literal support). `package.json#overrides` bumps transitives the parents have not (axios under kratos-client; hono, @hono/node-server, body-parser, path-to-regexp, qs, ajv, fast-uri, nanoid under the SDK; vite, rollup, picomatch, postcss under vitest) — result: `bun audit` 99 → 0 findings. `bun update --latest` pulled TypeScript 7, Zod 4 and vitest 5; all reverted: Zod 4 broke 40+ call sites and is a separate migration (spec Out of Scope), TS 7 is an unreviewed major, vitest 5 is outside the constitution's tested combination. Pinned: `typescript ^5.9`, `vitest ^4`, `@vitest/coverage-v8 ^4`, `packageManager bun@1.3.3`, `engines.node >=20`. `prepublishOnly: bun run build` (FR-033). Dependabot weekly, grouped prod/dev.

### D14: Coverage measurement fix and thresholds (FR-028, SC-006, R9)

`tests/vitest.config.ts` has `root: "./tests"`, so the old `src/**` include matched nothing and CI printed `Unknown%`. Fixed with `allowExternal: true` + `include: ["**/src/**/*.ts"]`, `exclude` for `src/index.ts` (CLI glue, covered by e2e) and `node_modules`; `reportOnFailure: true`; thresholds lines 80 / functions 80 / branches 70 / statements 80 enforced by `test:unit` (`--coverage.enabled`). Baseline after this feature (`bun run test:unit`, "All files" row, 16 files / 224 tests): 89.75 % statements, 78.91 % branches, 89.36 % functions, 90.82 % lines — every metric above its threshold. CI's "check for unit tests" conditional was removed — the unit job always runs.

### D15: Biome and TypeScript scope extended to tests (FR-031)

`biome.json#files.includes` adds `tests/**/*.ts` with a test-only override (allow non-null assertions and template-free concatenation, drop cognitive-complexity warnings). `tsconfig.test.json` extends the main config, includes `tests/**`, adds `vitest/globals` + `bun-types`, and relaxes unused-symbol and unchecked-index rules that are noise in test code; `bun run typecheck` runs both configs. Seven files under `tests/setup/` needed lint/type fixes once in scope.

## Phase Outline

### Phase 0 — Research (`research.md`, complete)

R1 Kratos release ceiling (v26.2.0; unreleased deltas recorded), R2 SDK 1.30 surface + `.shape` finding, R3 exposure-control patterns, R4 `Link`-header cursors, R5 credential exposure, R6 CI Kratos in a container, R7 unit-test strategy, R8 vulnerabilities, R9 coverage defect, R10 v26.2.0 behavioural drift. No `NEEDS CLARIFICATION` remains; the 37 spec clarifications are encoded in D1–D6 and D12 (session revocation), with the observability and description-example ones landing in D1.

### Phase 1 — Design & contracts (complete)

`data-model.md` (Config, ToolDefinition, presets, visibility/confirmation rules, wire structures, resources, logging), `contracts/` (index + 6 toolset files + resources.md, generated from the live server so they cannot drift from `src/schemas/tools.ts`), `quickstart.md` (per-story operator flows, breaking-change table). Agent context (`CLAUDE.md`) updated with the 011 stack line.

### Phase 2 — Tasks

See `tasks.md` (`/speckit.tasks`). Story → decision map used to order it:

| Story | Delivered by | Verified by |
|---|---|---|
| US1 Pagination | D6, D2 (schemas), D7 (instructions) | `pagination.test.ts`, `session-tools.test.ts`, `analytics-tools.test.ts`, e2e list+cursor |
| US2 Safety | D1, D3, D4, D10 | `server.test.ts` (gating, elicit accept/decline/absent, invocation trace FR-024a, no secrets in logs FR-012a), e2e annotations |
| US4 Session revocation idempotency | D12 (`revokeAllSessions`, FR-017a) | `sessions-helper.test.ts`, `identity-tools.test.ts`, `session-tools.test.ts`, e2e set-state with `revokeSessions` |
| US3 Redaction | D5, D10 | `identity-tools.test.ts`, e2e create → get redacted |
| US4 Hidden capabilities | D6 (filters), D5 (`includeCredential`), D9, schemas in `tools.ts` | `identity-tools.test.ts`, `recovery-tools.test.ts`, e2e set-state / schema tools |
| US5 Quality gates | D11, D12, D13, D14, D15 | CI jobs lint / typecheck / audit / test / integration |
| US6 Registration contract | D1, D2, D7 | `grep`-level: zero `try/catch`, `log.info/error` or `content:[` in `src/tools/*.ts` other than `define.ts` (the single `log.warn` in `identity.ts` is the spec-required batch-failure warning, via the injected `RunContext.log`); quickstart "Adding a tool" |

## Complexity Tracking

> Places where the server knowingly does more than forward one request to Kratos.

| Beyond thin proxy | Why needed (requirement) | Simpler alternative rejected because |
|---|---|---|
| Client-side session filtering over a multi-page scan (`scanFilteredSessions`, 100/page, cap, resume cursor) | FR-002, SC-002: Kratos has no server-side filter by auth method/provider/time; the old single-page filter returned silently incomplete data | Drop the filter (loses a documented feature); single page (recreates the bug); unbounded scan (unbounded upstream load) |
| Analytics aggregation across pages (`scanPages`, counts, MFA/passwordless rates, UA parsing) | FR-003, FR-004; pre-existing analytics contract from feature 001 now made honest with `pagesScanned`/`truncated` | Remove analytics (breaks existing users); leave unbounded/unreported (the original defect class) |
| `withCancellation` output-schema widening for destructive tools | FR-009 + FR-021: a tool must both advertise an output schema and be able to return `{cancelled}`; SDK validates structured output and requires object schemas | Omit `outputSchema` on destructive tools (loses structured output); error result on decline (clarification rejected) |
| Register-then-`disable()` instead of conditional registration | FR-007/FR-008 "indistinguishable from absent" + `listChanged` capability | Skip registration — simpler but forecloses dynamic toolsets and diverges from the SDK's own visibility model |
| `redactCredentials` post-processing of upstream payloads | FR-010, SC-005, Constitution IV | Pass through raw (security incident); never fetch config (blocks legitimate migration/support use) |
| `KratosHttpError` adapter class | FR-026: one error vocabulary across SDK and raw-HTTP paths | Second mapper (duplicated codes); route `/version` through the SDK (proxy path mismatch from feature 001) |
| Proxy-backed stub `KratosClients` in the harness | FR-030: every SDK method mockable without enumerating ~40 methods per API class | Hand-written stub objects (drift with SDK upgrades) |

## Breaking Changes & Versioning

| Contract | Before (0.2.0) | After | Reference |
|---|---|---|---|
| `kratos_list_sessions` input | `limit` | `pageSize` (1–100, default 20) + `pageToken`; `maxPages` when `filter` set | FR-005, clarification "no alias" |
| `kratos_get_identity` credentials | `includeCredentials: true` returns raw `config` | `includeCredential: [...]` canonical; boolean kept as deprecated alias; `config` of sensitive types redacted unless `KRATOS_ALLOW_CREDENTIAL_EXPOSURE=1` | FR-010, FR-011 |
| `kratos_list_identities` | no credential option | `includeCredential`, plus `previewCredentialsIdentifier`, `…Similar`, `ids`, `organizationId`, `consistency` | FR-014 |
| `kratos_batch_patch_identities` result | `{results:[{index, identityId, …}], summary}` | `{results:[{action, identity, patchId, error}], summary:{total, succeeded, failed}}` (SDK field names) | FR-016a, README "Breaking changes in 0.3.0", quickstart table |
| `kratos_delete_identity_credential` | login types only | all Kratos deletable types + optional `identifier` for oidc/saml | FR-015 |
| Every list tool output | items only | `{items, count, nextPageToken?}` (additive) | FR-001 |
| Every tool | no annotations / output schema | title + hints + `structuredContent` (additive); destructive tools may return `{cancelled:true}`; `kratos_delete_identity_sessions` adds `sessionsExisted`, `kratos_set_identity_state` returns `sessionsRevoked` | FR-006, FR-009, FR-017a, FR-021 |
| Resources | error body in a successful read | JSON-RPC error | FR-023 |
| Server version | hard-coded `0.1.0` | `package.json` version | FR-025 |
| Runtime | Node ≥ 18 | Node ≥ 20 | FR-033 |
| Env vars (new, all optional) | — | `KRATOS_TOOLSETS`, `KRATOS_READ_ONLY`, `KRATOS_CONFIRM_DESTRUCTIVE`, `KRATOS_ALLOW_CREDENTIAL_EXPOSURE`, `KRATOS_MAX_SCAN_PAGES` | data-model.md |

**Release target**: `0.3.0` — a minor bump while pre-1.0, per spec clarification; the breaking rows above are recorded in `README.md` § "Breaking changes in 0.3.0" (FR-005, FR-016a) and go in the release notes. Tag via the feature 006 release workflow after merge.

## Follow-ups / Deferred

- Spec **Out of Scope** in full: Streamable HTTP transport, MCP prompts, retries/backoff, Dockerfile, SDK v2 / Zod 4 migration, release-please + Trusted Publishing (feature 006), per-credential-type exposure policy.
- **R1 unreleased Kratos deltas** (next feature once a release ships): `POST /admin/sessions` bulk manage → `kratos_manage_sessions`; `deviceauthn` / `identifier_first` credential types → extend `ALL_CREDENTIAL_TYPES`; TOTP/WebAuthn/passkey/lookup-secret import → extend the identity import body; `POST /admin/test-login-flows` (out of scope).
- **Constitution PATCH**: done — 1.1.1 (2026-09-05).
- `.env.test.local.example` still references old version examples in some strings (`tests/setup/config.ts` hints) — cosmetic.
- Analytics page size (250) vs session-scan page size (100) are documented separately in tool descriptions; unify only if Kratos changes its per-endpoint maxima.
