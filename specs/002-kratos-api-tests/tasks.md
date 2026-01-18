# Tasks: Kratos API Compatibility Test Suite

**Input**: Design documents from `/specs/002-kratos-api-tests/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Tests**: This feature IS a test suite. Tasks involve implementing the test infrastructure and test cases.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Test suite**: `tests/` at repository root
- **Configuration**: `tests/setup/` for shared test infrastructure

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and test suite structure

- [X] T001 Create test directory structure per plan.md in tests/
- [X] T002 Add .env.test.local to .gitignore for test credentials
- [X] T003 Create Vitest configuration in tests/vitest.config.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core test infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 Implement test configuration loader in tests/setup/config.ts (based on contracts/test-config.ts)
- [X] T005 Implement custom error classes in tests/setup/errors.ts (based on contracts/test-errors.ts)
- [X] T006 Implement test context and cleanup utilities in tests/setup/context.ts (based on contracts/test-context.ts)
- [X] T007 Implement test fixtures factory in tests/setup/fixtures.ts (based on contracts/test-fixtures.ts)
- [X] T008 Implement global setup with fail-fast validation in tests/setup/global-setup.ts

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Configure Test Target Endpoint (Priority: P1) 🎯 MVP

**Goal**: Enable developers to configure which Kratos instance to test against

**Independent Test**: Configure an endpoint URL and verify the test suite uses it; verify clear errors for missing/invalid config

### Implementation for User Story 1

- [X] T009 [US1] Implement environment variable parsing in tests/setup/config.ts (KRATOS_ADMIN_URL, KRATOS_AUTH_TYPE, etc.)
- [X] T010 [US1] Add URL validation with clear error messages for invalid endpoints
- [X] T011 [US1] Implement authentication header injection (none, api-key, custom-headers)
- [X] T012 [US1] Add connection test in global setup (fail-fast on unreachable endpoint)
- [X] T013 [US1] Add version check in global setup (fail-fast on version mismatch)
- [X] T014 [US1] Create .env.test.local.example template file with documented variables

**Checkpoint**: At this point, User Story 1 should be fully functional - configuration works, fail-fast behavior verified

---

## Phase 4: User Story 2 - Run Identity Management Tests (Priority: P1)

**Goal**: Verify all identity CRUD operations work correctly against configured Kratos instance

**Independent Test**: Run `bun test tests/api/identity.test.ts` and verify all operations pass

### Implementation for User Story 2

- [X] T015 [US2] Create identity test file structure in tests/api/identity.test.ts
- [X] T016 [P] [US2] Implement test: list identities returns paginated results
- [X] T017 [P] [US2] Implement test: get identity by ID returns correct data
- [X] T018 [P] [US2] Implement test: get identity by external ID works correctly
- [X] T019 [P] [US2] Implement test: create identity succeeds with valid traits
- [X] T020 [P] [US2] Implement test: update identity modifies all fields correctly
- [X] T021 [P] [US2] Implement test: patch identity applies JSON patch operations
- [X] T022 [P] [US2] Implement test: delete identity removes identity successfully
- [X] T023 [US2] Implement test: get identity credentials returns credential info
- [X] T024 [US2] Implement test: delete identity credential removes specific credential type
- [X] T025 [US2] Add cleanup logic for identity tests in afterAll hook

**Checkpoint**: Identity test suite complete and passing independently

---

## Phase 5: User Story 3 - Run Session Management Tests (Priority: P1)

**Goal**: Verify all session operations work correctly against configured Kratos instance

**Independent Test**: Run `bun test tests/api/session.test.ts` and verify all operations pass

### Implementation for User Story 3

- [X] T026 [US3] Create session test file structure in tests/api/session.test.ts
- [X] T027 [P] [US3] Implement test: list all sessions returns session data
- [X] T028 [P] [US3] Implement test: get session by ID returns complete details
- [X] T029 [P] [US3] Implement test: list sessions by identity returns filtered results
- [X] T030 [P] [US3] Implement test: extend session successfully extends expiry
- [X] T031 [P] [US3] Implement test: disable session invalidates session
- [X] T032 [US3] Implement test: delete all sessions for identity clears all sessions
- [X] T033 [US3] Add test identity creation setup for session tests

**Checkpoint**: Session test suite complete and passing independently

---

## Phase 6: User Story 4 - Run Recovery Flow Tests (Priority: P2)

**Goal**: Verify account recovery operations work correctly

**Independent Test**: Run `bun test tests/api/recovery.test.ts` and verify link/code generation works

### Implementation for User Story 4

- [X] T034 [US4] Create recovery test file structure in tests/api/recovery.test.ts
- [X] T035 [P] [US4] Implement test: create recovery link generates valid link
- [X] T036 [P] [US4] Implement test: create recovery code generates valid code
- [X] T037 [US4] Add test identity creation setup for recovery tests
- [X] T038 [US4] Add cleanup logic for recovery tests in afterAll hook

**Checkpoint**: Recovery test suite complete and passing independently

---

## Phase 7: User Story 5 - Run Courier Message Tests (Priority: P2)

**Goal**: Verify courier message operations work correctly

**Independent Test**: Run `bun test tests/api/courier.test.ts` and verify message operations work

### Implementation for User Story 5

- [X] T039 [US5] Create courier test file structure in tests/api/courier.test.ts
- [X] T040 [P] [US5] Implement test: list courier messages returns paginated results
- [X] T041 [P] [US5] Implement test: get courier message by ID returns message details
- [X] T042 [US5] Implement test: filter messages by status works correctly

**Checkpoint**: Courier test suite complete and passing independently

---

## Phase 8: User Story 6 - Run Health Check Tests (Priority: P3)

**Goal**: Verify health and version endpoints respond correctly

**Independent Test**: Run `bun test tests/api/health.test.ts` and verify all endpoints respond

### Implementation for User Story 6

- [X] T043 [US6] Create health test file structure in tests/api/health.test.ts
- [X] T044 [P] [US6] Implement test: alive endpoint returns status ok
- [X] T045 [P] [US6] Implement test: ready endpoint returns status ok
- [X] T046 [P] [US6] Implement test: version endpoint returns version string

**Checkpoint**: Health test suite complete and passing independently

---

## Phase 9: User Story 7 - View Test Results Report (Priority: P2)

**Goal**: Provide clear test result summaries with pass/fail details

**Independent Test**: Run full test suite and verify output shows summary, pass/fail counts, and failure details

### Implementation for User Story 7

- [X] T047 [US7] Configure Vitest reporter for clear summary output in tests/vitest.config.ts
- [X] T048 [US7] Add custom reporter or hooks for compatibility percentage display
- [X] T049 [US7] Ensure failure messages include expected vs actual values
- [X] T050 [US7] Add npm script for running tests with verbose output in package.json

**Checkpoint**: Test reporting complete - results clearly show pass/fail status

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Final improvements and documentation

- [X] T051 [P] Add bun test script to package.json if not present
- [X] T052 [P] Update quickstart.md with final verified instructions
- [X] T053 Verify full test suite runs under 2 minutes (SC-005) - Completed in 569ms
- [X] T054 Verify 100% cleanup success (SC-006) - Cleanup logs show successful deletion
- [X] T055 Run full test suite against known-compatible Kratos version and verify 100% pass (SC-007) - 65/65 tests pass against Kratos v1.3.1

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational - Configuration is prerequisite for all tests
- **User Stories 2-6 (Phases 4-8)**: Depend on US1 (configuration must work first)
  - US2, US3, US4, US5, US6 can then proceed in parallel
- **User Story 7 (Phase 9)**: Can proceed after US1, benefits from having some tests to report on
- **Polish (Phase 10)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Foundational prerequisite - MUST complete first
- **User Story 2 (P1)**: Depends on US1 (needs configured endpoint)
- **User Story 3 (P1)**: Depends on US1 (needs configured endpoint)
- **User Story 4 (P2)**: Depends on US1 (needs configured endpoint)
- **User Story 5 (P2)**: Depends on US1 (needs configured endpoint)
- **User Story 6 (P3)**: Depends on US1 (needs configured endpoint)
- **User Story 7 (P2)**: Depends on US1 (needs tests to report on)

### Within Each User Story

- Setup test file structure before individual tests
- Individual tests marked [P] can run in parallel
- Cleanup/afterAll hooks after all tests in the story

### Parallel Opportunities

Within Phase 4 (Identity tests):
```bash
# These can run in parallel:
Task T016: list identities test
Task T017: get identity test
Task T018: get by external ID test
Task T019: create identity test
Task T020: update identity test
Task T021: patch identity test
Task T022: delete identity test
```

Within Phase 5 (Session tests):
```bash
# These can run in parallel:
Task T027: list sessions test
Task T028: get session test
Task T029: list by identity test
Task T030: extend session test
Task T031: disable session test
```

Across Phases 4-8 (after US1 is complete):
```bash
# Different test suites can be developed in parallel:
Developer A: Phase 4 (Identity tests)
Developer B: Phase 5 (Session tests)
Developer C: Phase 6-8 (Recovery, Courier, Health tests)
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1 (Configuration)
4. Complete Phase 4: User Story 2 (Identity tests)
5. **STOP and VALIDATE**: Run identity tests against real Kratos
6. MVP delivers: Configurable test suite + Identity API validation

### Incremental Delivery

1. Complete Setup + Foundational + US1 → Configuration works
2. Add US2 (Identity) → Core API tests working
3. Add US3 (Session) → Session tests working
4. Add US4, US5, US6 → Full API coverage
5. Add US7 → Professional reporting
6. Polish → Production-ready test suite

### Critical Path

```
Setup → Foundational → US1 (Config) → US2 (Identity) → US3 (Session) → Complete
                                   ↘ US4 (Recovery) ↗
                                   ↘ US5 (Courier) ↗
                                   ↘ US6 (Health) ↗
                                   ↘ US7 (Reporting) ↗
```

---

## Notes

- All test tasks create real resources in Kratos and MUST clean up
- Configuration (US1) is prerequisite for all other stories
- [P] tasks = different files, no dependencies on each other
- Each test file should be runnable independently
- Verify fail-fast behavior works before implementing test cases
- Commit after each task or logical group
