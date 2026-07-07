# Implementation Plan: Batch Identity Operations MCP Tool

**Branch**: `010-batch-patch-identities` | **Date**: 2026-07-07 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/010-batch-patch-identities/spec.md`

## Summary

Add a new MCP tool `kratos_batch_patch_identities` that exposes the Kratos Admin batch identity endpoint (`IdentityApi.batchPatchIdentities`, `PATCH /admin/identities`) for bulk identity creation. The tool accepts up to 100 identity definitions per call (each mirroring the `kratos_create_identity` input, plus an optional correlation `patchId`), forwards them as a single `PatchIdentitiesBody`, and returns the per-item results (`action`, identity ID, patch ID, error) faithfully, augmented with an index and a total/succeeded/failed summary. Implementation follows the established tool pattern: Zod input schema in `src/schemas/tools.ts`, handler + registration in `src/tools/identity.ts`, request-level errors mapped via `src/errors/mapper.ts`, structured logging throughout. Unit tests (mock-based, CI-safe) are added under `tests/unit/`.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode) with Bun 1.x runtime
**Primary Dependencies**: @modelcontextprotocol/sdk ^1.25.x, @ory/kratos-client ^25.4.x, zod ^3.25.x
**Storage**: N/A (stateless proxy to Kratos Admin API)
**Testing**: Vitest ^4.0.x — unit tests in `tests/unit/` (mock-based, CI-safe); integration tests in `tests/api/` are out of scope for this feature
**Target Platform**: Any environment running Bun (server-side, stdio MCP transport)
**Project Type**: Single project (`src/`, `tests/` at repository root)
**Performance Goals**: Single upstream round trip per tool call; response serialization O(batch size), max 100 items
**Constraints**: Batch size 1–100 enforced client-side; per-item results must be surfaced verbatim (no lossy summarization of Kratos error payloads); no sensitive trait data in logs
**Scale/Scope**: One new tool, one new input schema, one new unit test file; no changes to server lifecycle or configuration

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Status |
|-----------|-------|--------|
| I. AI-Native Development | Tool has schema-validated input, explicit action-oriented description documenting the cap and non-atomic semantics, structured per-item output, structured errors | PASS |
| II. Spec-Driven Development | spec.md approved before this plan; tasks.md follows | PASS |
| III. Contract-First API Design | Zod contract defined in `contracts/batch-patch-identities.md` and `src/schemas/tools.ts` before handler code; tool maps 1:1 to `IdentityApi.batchPatchIdentities` — no invented abstractions (create-only, exactly what the SDK body supports) | PASS |
| IV. Operational Excellence | Structured logging (tool name, batch size, duration), request-level errors through `mapError`, no traits/credentials logged | PASS |
| V. Simplicity & YAGNI | No chunking, no retries, no auto-generated patch IDs, reuses existing registration/error/logging infrastructure | PASS |
| VI. Fast Feedback Loops | Unit tests are mock-based and run in milliseconds; a config guard lets `tests/unit/` run without a live Kratos | PASS |
| VII. Type Safety & Validation | Strict-mode TypeScript; Zod validates batch bounds, item fields, and patch ID format before any Kratos call | PASS |

**Post-design re-check**: PASS — design introduces no new dependencies, no state, and no deviation from the existing tool pattern.

## Project Structure

### Documentation (this feature)

```text
specs/010-batch-patch-identities/
├── plan.md              # This file
├── research.md          # Phase 0 output — SDK shape verification, cap decision
├── data-model.md        # Phase 1 output — batch request/response shapes
├── quickstart.md        # Phase 1 output — usage examples
├── contracts/
│   └── batch-patch-identities.md   # Tool contract (input/output schema)
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── schemas/
│   └── tools.ts         # MODIFIED: add BatchPatchIdentitiesInputSchema (+ item schema, type exports)
├── tools/
│   └── identity.ts      # MODIFIED: register kratos_batch_patch_identities in registerIdentityManagementTools
├── errors/
│   └── mapper.ts        # UNCHANGED: reused for request-level errors
└── index.ts             # UNCHANGED: tool ships via existing registerIdentityManagementTools call

tests/
├── vitest.config.ts     # MODIFIED: skip Kratos globalSetup/setupFiles for unit-only runs
└── unit/
    └── batch-patch-identities.test.ts   # NEW: schema + handler unit tests (mock-based)

README.md                # MODIFIED: add tool to Identity Management table
```

**Structure Decision**: Single-project layout already established by feature 001. The new tool lives alongside the other identity tools in `src/tools/identity.ts` (registered from the existing `registerIdentityManagementTools`, so `src/index.ts` needs no change). Unit tests introduce the `tests/unit/` directory that CI (feature 003) already expects and conditionally runs.

## Design Decisions

### D1: Registration point

Register the tool inside `registerIdentityManagementTools` in `src/tools/identity.ts`. It is an identity write operation (same family as create/update/delete), and this avoids touching `src/index.ts`. Simpler than a new registration function for one tool (Principle V).

### D2: Input schema shape

Each batch item nests the identity definition under `create`, mirroring the SDK's `IdentityPatch` shape (`{ create, patch_id }`), while the `create` object's fields mirror `CreateIdentityInputSchema` exactly (`schemaId`, `traits`, `state`, `metadataPublic`, `metadataAdmin`). This keeps a 1:1 mapping to the Kratos API (Principle III) and a familiar per-item contract for agents already using `kratos_create_identity`. Bounds: `.min(1)` and `.max(100)` on the array; `patchId` validated as UUID.

### D3: Output shape

```json
{
  "results": [
    { "index": 0, "action": "create", "identityId": "…", "patchId": "…" },
    { "index": 1, "action": "error", "patchId": "…", "error": { "…": "verbatim Kratos payload" } }
  ],
  "summary": { "total": 2, "succeeded": 1, "failed": 1 }
}
```

`action`, `identity` (surfaced as `identityId` for clarity), `patch_id`, and `error` are passed through from `BatchPatchIdentitiesResponse.identities[]` without modification; `index` and `summary` are computed. Partial failure is NOT a tool-level error (`isError` stays false); only request-level failures (network/auth/whole-request 4xx/5xx) return `isError: true` via `mapError`.

### D4: Unit tests without a live Kratos

`tests/vitest.config.ts` currently wires `globalSetup`/`setupFiles` that fail fast without a reachable Kratos (by design, for `tests/api/`). CI (feature 003) runs `vitest run --config tests/vitest.config.ts --dir tests/unit` once `tests/unit/` exists. The config is updated to detect a unit-only invocation (`--dir …tests/unit` in argv) and skip the Kratos pre-flight setup for that mode only; `tests/api/` behavior is unchanged. Unit tests stub the MCP server's `tool()` method to capture the handler and mock `kratosClients.identity.batchPatchIdentities`.

## Complexity Tracking

> No Constitution Check violations — table intentionally empty.
