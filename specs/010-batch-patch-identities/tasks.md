---

description: "Task list for kratos_batch_patch_identities implementation"
---

# Tasks: Batch Identity Operations MCP Tool

**Input**: Design documents from `/specs/010-batch-patch-identities/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/batch-patch-identities.md

**Tests**: Unit tests are REQUIRED by this feature (Constitution VII; CI test job from feature 003 runs `tests/unit/`). Integration tests against a live Kratos are out of scope.

**Organization**: Tasks are grouped by user story. US1 (batch create) and US2 (per-item failure reporting) share one handler, so US2 builds directly on US1's implementation with additional behavior and tests.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

## Path Conventions

Single project: `src/`, `tests/` at repository root (per plan.md).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Make the repository able to run CI-safe unit tests at all (D4 in plan.md)

- [X] T001 Update `tests/vitest.config.ts` to detect a unit-only invocation (`--dir` targeting `tests/unit`) and skip Kratos `globalSetup`/`setupFiles` (and the API-run `outputFile`) for that mode only; `tests/api/` runs keep existing behavior
- [X] T002 Create `tests/unit/` directory with the first test file scaffold (see T004/T007) and verify `bun x vitest run --config tests/vitest.config.ts --dir tests/unit` executes without a live Kratos

**Checkpoint**: Unit test runner works offline — CI test job (feature 003) will activate and must stay green

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Contract-first schema shared by all user stories (Constitution III)

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T003 Add `BatchIdentityPatchSchema` and `BatchPatchIdentitiesInputSchema` (with `.min(1)`/`.max(100)` bounds, UUID `patchId`, nested `create` mirroring `CreateIdentityInputSchema`) plus `BatchIdentityPatch`/`BatchPatchIdentitiesInput` type exports in `src/schemas/tools.ts`, per `contracts/batch-patch-identities.md`

**Checkpoint**: Input contract exists and typechecks — handler and tests can now be written

---

## Phase 3: User Story 1 - Bulk-Create Identities (Priority: P1) 🎯 MVP

**Goal**: `kratos_batch_patch_identities` tool that submits a batch and returns per-item results with identity IDs, patch IDs, and a summary

**Independent Test**: Invoke the registered handler with 2 valid items against a mocked `batchPatchIdentities` returning two `create` results; verify results array (index, action, identityId, patchId) and summary counts

### Tests for User Story 1

- [X] T004 [US1] Unit test scaffold in `tests/unit/batch-patch-identities.test.ts`: stub `McpServer.tool()` to capture the registered handler, mock `kratosClients.identity.batchPatchIdentities` and the logger; assert tool name, description content (cap + non-atomic wording, FR-009), and the happy-path response mapping (SDK `identity`/`patch_id` → `identityId`/`patchId`, `index`, `summary`)

### Implementation for User Story 1

- [X] T005 [US1] Implement `kratos_batch_patch_identities` handler in `src/tools/identity.ts` inside `registerIdentityManagementTools`: map input to `PatchIdentitiesBody` (camelCase → snake_case), call `kratosClients.identity.batchPatchIdentities`, build results + summary per contract, structured logging with batch size (no traits logged, FR-010)

**Checkpoint**: Happy-path batch create fully functional and unit-tested

---

## Phase 4: User Story 2 - Per-Item Failure Reporting (Priority: P1)

**Goal**: Partial and total per-item failures surfaced verbatim; request-level failures mapped to standard structured errors

**Independent Test**: Mocked responses with mixed `create`/`error` actions produce correct per-item `error` passthrough and summary; a rejected promise produces `isError: true` with `mapError` output

### Tests for User Story 2

- [X] T006 [P] [US2] Unit tests in `tests/unit/batch-patch-identities.test.ts` for: mixed success/failure batch (error payload passed through untouched, summary counts correct, `isError` not set), all-items-failed batch, empty/missing `identities` in Kratos response, and request-level failure (mocked Axios-like 401/409 rejection → `isError: true` with `McpToolError` shape, FR-008)

### Implementation for User Story 2

- [X] T007 [US2] Ensure handler error path in `src/tools/identity.ts` routes request-level failures through `mapError(error, "batch_patch_identities")` and logs failure with duration; verify per-item `error` values are serialized verbatim (no reformatting)

**Checkpoint**: All failure modes covered and unit-tested

---

## Phase 5: User Story 3 - Batch Guardrails (Priority: P2)

**Goal**: Empty, oversized, and malformed batches rejected by schema validation before any Kratos call

**Independent Test**: `BatchPatchIdentitiesInputSchema.safeParse` rejects 0 items, 101 items, non-UUID patchId, and items missing schemaId/traits with the contract's messages; accepts 1 and 100 items

### Tests for User Story 3

- [X] T008 [P] [US3] Schema validation unit tests in `tests/unit/batch-patch-identities.test.ts`: boundary cases (0, 1, 100, 101 items), non-UUID `patchId`, missing `create.schemaId`/`create.traits`, `state` default applied

### Implementation for User Story 3

- [X] T009 [US3] Confirm bounds and messages in `src/schemas/tools.ts` match the contract (min/max custom messages); no handler changes expected — validation happens via the MCP SDK before the handler runs

**Checkpoint**: All user stories independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T010 [P] Add `kratos_batch_patch_identities` row to the Identity Management table in `README.md`
- [X] T011 Run full verification: `bun run lint`, `bun x tsc --noEmit`, `bun x vitest run --config tests/vitest.config.ts --dir tests/unit` — all green
- [X] T012 Update agent context via `.specify/scripts/bash/update-agent-context.sh claude`

---

## Dependencies & Execution Order

- **Phase 1 (Setup)**: No dependencies — T001 → T002
- **Phase 2 (Foundational)**: T003 blocks all user stories
- **US1 (Phase 3)**: T004 (test first, fails) → T005
- **US2 (Phase 4)**: Depends on T005 (shares the handler); T006 can be written in parallel with T007
- **US3 (Phase 5)**: Depends only on T003; T008 parallel with US1/US2 test work
- **Polish (Phase 6)**: T010 parallel; T011/T012 last

### Parallel Opportunities

- T006 and T008 touch the same test file as T004 — parallelize only if split across files; otherwise sequential within the file
- T010 (README) is independent of all code tasks

## Notes

- Tests are written before their implementation task and must fail first (US1/US2)
- Commit after each logical group; single feature commit acceptable given the small surface
