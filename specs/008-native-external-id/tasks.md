---

description: "Task list for native external-ID identity lookup"
---

# Tasks: Native External-ID Identity Lookup

**Input**: Design documents from `/specs/008-native-external-id/`
**Prerequisites**: plan.md, spec.md, research.md, contracts/kratos_get_identity_by_external_id.md

**Tests**: Unit tests are explicitly required by the spec (SC-005, US1/US2/US3 independent tests).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Single project: `src/`, `tests/` at repository root.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Fresh worktree bootstrap

- [X] T001 Install dependencies with `bun install` and verify `@ory/kratos-client` 25.4.0 exposes `IdentityApi.getIdentityByExternalID` with request property `externalID` in `node_modules/@ory/kratos-client/dist/api.d.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Make hermetic unit tests runnable with the exact CI command before any test is written

**⚠️ CRITICAL**: The CI job runs `bun x vitest run --config tests/vitest.config.ts --dir tests/unit` once `tests/unit/` exists; without this phase the shared config's live-Kratos globalSetup would fail every unit run.

- [X] T002 Modify `tests/vitest.config.ts` to detect a unit-scoped invocation (CLI `--dir` targeting `tests/unit`) and, in that mode, omit the Kratos-dependent `globalSetup`/`setupFiles`, the compatibility reporter, `bail`, and the 30s/60s timeouts; integration runs (`bun run test`) keep current behavior

**Checkpoint**: `bun x vitest run --config tests/vitest.config.ts --dir tests/unit` runs (green or "no tests") with no Kratos reachable

---

## Phase 3: User Story 1 - Correct Lookup by External ID (Priority: P1) 🎯 MVP

**Goal**: The tool resolves identities via the native by-external-ID endpoint, matching only `external_id`

**Independent Test**: Unit test invokes the registered handler with a mocked client and asserts `getIdentityByExternalID({ externalID })` is called, the identity is returned, and `listIdentities` is never touched

### Tests for User Story 1

> Write these tests FIRST, ensure they FAIL against the current emulation before implementing

- [X] T003 [US1] Create `tests/unit/identity-external-id.test.ts` with an `McpServer` capture stub, a mocked `KratosClients`, and a no-op logger; add failing tests: success path calls `getIdentityByExternalID` with `{ externalID: "crm-42" }` and returns the identity JSON; `listIdentities` is never called (FR-001, FR-002, SC-001, SC-002)

### Implementation for User Story 1

- [X] T004 [US1] In `src/tools/identity.ts`, replace the `listIdentities({ credentialsIdentifier, pageSize: 1 })` emulation and the empty-list branch in the `kratos_get_identity_by_external_id` handler with `kratosClients.identity.getIdentityByExternalID({ externalID: args.externalId })`, returning `response.data` pretty-printed (FR-001, FR-002, FR-007, FR-008)

**Checkpoint**: US1 unit tests pass; lookup is a single native API call

---

## Phase 4: User Story 2 - Actionable Not-Found Error (Priority: P2)

**Goal**: 404 and other failures surface as structured errors via the shared mapper

**Independent Test**: Unit tests reject the mocked call with Axios-style 404 / ECONNREFUSED errors and assert the structured payload

### Tests for User Story 2

- [X] T005 [US2] Extend `tests/unit/identity-external-id.test.ts`: mocked 404 rejection yields `isError: true` with `error.code === "NOT_FOUND"`, `kratosStatus === 404`, and a `suggestion`; mocked `ECONNREFUSED` yields `error.code === "CONNECTION_REFUSED"` (FR-004, FR-005, SC-003)

### Implementation for User Story 2

- [X] T006 [US2] Verify the handler's catch block in `src/tools/identity.ts` routes through `mapError(error, "get_identity_by_external_id")` (no bespoke `IDENTITY_NOT_FOUND` branch remains) — behavior comes from Phase 3's rewrite plus the existing mapper in `src/errors/mapper.ts`; adjust only if tests reveal gaps

**Checkpoint**: US1 + US2 tests pass without any live Kratos

---

## Phase 5: User Story 3 - Stable Tool Contract (Priority: P3)

**Goal**: Same tool name and input schema; descriptions state true semantics

**Independent Test**: Unit test inspects the captured registration (name, schema shape, description text)

### Tests for User Story 3

- [X] T007 [US3] Extend `tests/unit/identity-external-id.test.ts`: tool is registered as `kratos_get_identity_by_external_id` with required non-empty string `externalId`; empty string fails schema validation; description mentions `external_id` and does not claim email/username matching (FR-003, FR-006, SC-004)

### Implementation for User Story 3

- [X] T008 [P] [US3] Update the `kratos_get_identity_by_external_id` tool description in `src/tools/identity.ts` to state it matches the identity's `external_id` field (exact match, Kratos 25.4.0+), distinct from credential identifiers (FR-006)
- [X] T009 [P] [US3] Update `GetIdentityByExternalIdInputSchema.externalId` `.describe()` text in `src/schemas/tools.ts` (shape unchanged: `z.string().min(1)`) (FR-003, FR-006)

**Checkpoint**: All user stories independently verified by the unit suite

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Quality gates and consistency

- [X] T010 Run `bun run lint` (fix with `bun run lint:fix` if needed) — zero Biome violations
- [X] T011 Run `bun x tsc --noEmit` — zero type errors
- [X] T012 Run `bun x vitest run --config tests/vitest.config.ts --dir tests/unit` — all unit tests green in under 5s (Constitution VI, SC-005)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on T001 — BLOCKS all test-writing (unit runner must work)
- **User Stories (Phases 3-5)**: Depend on Phase 2; ordered P1 → P2 → P3 because they share `src/tools/identity.ts` and one test file
- **Polish (Phase 6)**: After all stories

### Within Each User Story

- Tests written and observed failing before implementation (T003 → T004)
- T005 exercises behavior delivered by T004's rewrite; T006 is a verification task
- T008 and T009 are [P] (different files)

### Parallel Opportunities

- T008 (`src/tools/identity.ts`) and T009 (`src/schemas/tools.ts`) may run in parallel once T004 is merged into the working tree
- T010/T011/T012 can run concurrently as independent read-only checks

---

## Implementation Strategy

MVP is Phase 1-3 (native call wired and unit-proven). Phases 4-5 harden errors and
descriptions; all phases land in a single PR because the change set is one handler,
one schema description, one config, and one test file.

## Notes

- Do NOT run `bun run test` (integration; requires live Kratos) as part of this feature
- No fallback to the old list-filter emulation under any failure mode (Clarifications)
