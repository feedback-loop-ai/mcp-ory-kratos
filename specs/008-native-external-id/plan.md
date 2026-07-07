# Implementation Plan: Native External-ID Identity Lookup

**Branch**: `008-native-external-id` | **Date**: 2026-07-07 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/008-native-external-id/spec.md`

## Summary

Replace the semantically wrong external-ID lookup emulation in
`kratos_get_identity_by_external_id` (currently `IdentityApi.listIdentities` with a
`credentialsIdentifier` filter and `pageSize: 1`) with the native Kratos Admin API
operation `IdentityApi.getIdentityByExternalID` (`GET
/admin/identities/by/external/{externalId}`, Kratos 25.4.0+). Errors — including 404
not-found — flow through the existing shared error mapper (`src/errors/mapper.ts`),
identical to `kratos_get_identity`. The tool name and input schema stay unchanged; the
tool and schema descriptions are corrected to state the true matching semantics. Unit
tests (mocked Kratos client) are added under `tests/unit/`, and the shared Vitest
config is adjusted to skip live-Kratos pre-flight setup when a run is scoped to
`tests/unit` so the existing CI command works without a Kratos instance.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode) on Bun 1.x
**Primary Dependencies**: @modelcontextprotocol/sdk ^1.25.x, @ory/kratos-client ^25.4.0 (exposes `getIdentityByExternalID`), zod ^3.25.x
**Storage**: N/A (stateless proxy to Kratos Admin API)
**Testing**: Vitest ^4.0.x — new hermetic unit tests in `tests/unit/` (mocked `KratosClients`), existing integration tests in `tests/api/` untouched
**Target Platform**: Linux/macOS server (MCP stdio server), Kratos 25.4.0+
**Project Type**: Single project (`src/`, `tests/` at repo root)
**Performance Goals**: Single API round-trip per lookup (SC-002); no added latency vs. the list emulation
**Constraints**: Tool contract (name + input schema) must remain byte-compatible (FR-003); unit tests must run in CI with no external dependencies (SC-005); unit suite under 5s (Constitution VI)
**Scale/Scope**: One tool handler in `src/tools/identity.ts`, one schema description in `src/schemas/tools.ts`, one Vitest config adjustment, one new unit test file

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. AI-Native Development | ✅ PASS | Fix makes tool behavior match its schema/description; corrected descriptions improve agent tool selection; structured errors preserved |
| II. Spec-Driven Development | ✅ PASS | Following SDD workflow (spec → plan → tasks → implement) |
| III. Contract-First API Design | ✅ PASS | Tool maps 1:1 to a native Kratos Admin API operation (removes an invented abstraction); name + input schema unchanged; contract documented in contracts/ |
| IV. Operational Excellence | ✅ PASS | All failures mapped via shared error mapper; logging contract unchanged; no silent fallback masking misconfiguration |
| V. Simplicity & YAGNI | ✅ PASS | Deletes emulation code; no fallback path; no new input options (`includeCredential` deferred) |
| VI. Fast Feedback Loops | ✅ PASS | Unit tests are hermetic and millisecond-fast; CI-safe without Kratos |
| VII. Type Safety & Validation | ✅ PASS | SDK request types (`IdentityApiGetIdentityByExternalIDRequest`) used directly; zod input validation unchanged; tests cover 404/network edge cases |

**Technology Stack Compliance**:
- ✅ @ory/kratos-client 25.4.0 native method (no raw HTTP, no invented abstraction)
- ✅ Vitest unit tests, Biome lint, tsc strict — all existing gates apply

## Project Structure

### Documentation (this feature)

```text
specs/008-native-external-id/
├── plan.md              # This file
├── research.md          # Phase 0 output (SDK method verification, current-bug analysis)
├── contracts/           # Phase 1 output
│   └── kratos_get_identity_by_external_id.md   # Tool contract (unchanged interface, corrected semantics)
├── quickstart.md        # Phase 1 output (how to verify the fix)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

`data-model.md` is intentionally omitted: the only entity (Identity with its
`external_id` attribute) is owned by Kratos and documented in the spec's Key Entities —
this feature introduces no data structures of its own.

### Source Code (repository root)

```text
# Files to MODIFY:
src/
├── tools/
│   └── identity.ts          # MODIFY - kratos_get_identity_by_external_id handler:
│                            #   listIdentities emulation → getIdentityByExternalID
└── schemas/
    └── tools.ts             # MODIFY - GetIdentityByExternalIdInputSchema description
                             #   (semantics only; shape unchanged)

tests/
├── vitest.config.ts         # MODIFY - skip Kratos globalSetup/setupFiles for
│                            #   unit-scoped runs (--dir tests/unit)
└── unit/                    # NEW - first hermetic unit tests (CI job already
    └── identity-external-id.test.ts   #   expects this directory)
```

**Structure Decision**: Existing single-project layout. The only new directory is
`tests/unit/`, which the CI pipeline (feature 003) already probes for and runs with
`bun x vitest run --config tests/vitest.config.ts --dir tests/unit`.

## Implementation Approach

### Handler change (src/tools/identity.ts)

1. Replace the `listIdentities({ credentialsIdentifier, pageSize: 1 })` call and the
   manual empty-result branch with:
   ```ts
   const response = await kratosClients.identity.getIdentityByExternalID({
     externalID: args.externalId,
   });
   ```
   Note the SDK request property is `externalID` (capital "ID") per
   `IdentityApiGetIdentityByExternalIDRequest`; the MCP input stays `externalId`.
2. Success path returns `response.data` pretty-printed (same as `kratos_get_identity`).
3. The `catch` block already routes through `mapError(error, "get_identity_by_external_id")`;
   a Kratos 404 now surfaces as `NOT_FOUND` with `kratosStatus: 404` (FR-004). The
   bespoke `IDENTITY_NOT_FOUND` empty-list branch is deleted along with the emulation.
4. Tool description updated to state it matches the identity's `external_id` field
   (Kratos 25.4.0+), not sign-in identifiers (FR-006).

### Schema description (src/schemas/tools.ts)

`GetIdentityByExternalIdInputSchema.externalId` keeps `z.string().min(1)`; only its
`.describe()` text changes to name the `external_id` field explicitly.

### Unit test enablement (tests/vitest.config.ts)

The shared config wires `globalSetup`/`setupFiles` that fail fast without a live
Kratos. The config detects a unit-scoped invocation (CLI `--dir` pointing at
`tests/unit`, exactly what CI runs) and omits those Kratos-dependent hooks plus the
integration-oriented reporter/bail settings for that mode. Integration runs
(`bun run test`) are unaffected.

### Unit tests (tests/unit/identity-external-id.test.ts)

Mock `KratosClients` (plain object with a vi.fn `getIdentityByExternalID`) and a
minimal `McpServer` stub capturing `server.tool()` registrations; invoke the captured
handler directly. Cases:

- success: resolves identity, passes `externalID: <input>`, returns pretty-printed JSON
- wrong-emulation guard: `listIdentities` is never called
- 404: `isError: true`, code `NOT_FOUND`, `kratosStatus: 404`, suggestion present
- network error (`ECONNREFUSED`): structured `CONNECTION_REFUSED` error
- contract: tool registered under unchanged name with required `externalId` input

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations. All principles pass.

---

## Constitution Check (Post-Design)

Re-checked after design: still ✅ PASS on all seven principles. The design removes
code (emulation + bespoke error branch) rather than adding abstractions; the only
infrastructure touch (Vitest unit-mode detection) directly serves Principle VI and the
CI contract from feature 003.
