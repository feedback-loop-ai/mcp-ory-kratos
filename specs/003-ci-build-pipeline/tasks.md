# Tasks: CI Build Pipeline for Validation

**Input**: Design documents from `/specs/003-ci-build-pipeline/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: No tests requested in the feature specification. This is a CI infrastructure feature.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization for CI pipeline - no new project structure needed (CI adds to existing repo)

- [X] T001 Install coverage dependency: `bun add -d @vitest/coverage-v8`
- [X] T002 Create GitHub workflows directory: `.github/workflows/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core configuration that MUST be complete before user story workflows can function

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T003 Update Vitest coverage configuration in `tests/vitest.config.ts` per `contracts/vitest-coverage.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Automated Code Validation on Push (Priority: P1) 🎯 MVP

**Goal**: Code changes are automatically validated when pushed to any branch, providing immediate feedback on quality standards.

**Independent Test**: Push a commit to any branch and verify that validation runs automatically, providing pass/fail feedback within 10 minutes.

### Implementation for User Story 1

- [X] T004 [US1] Create CI workflow file `.github/workflows/ci.yml` with workflow name, triggers, and concurrency per `contracts/ci-workflow.yml`
- [X] T005 [US1] Add lint job to `.github/workflows/ci.yml` with Bun setup, caching, and Biome lint step
- [X] T006 [US1] Add typecheck job to `.github/workflows/ci.yml` with Bun setup, caching, and TypeScript check step
- [X] T007 [US1] Add test job to `.github/workflows/ci.yml` with Bun setup, caching, unit tests, and coverage reporting steps
- [ ] T008 [US1] Push workflow to branch and verify all three jobs (lint, typecheck, test) run in parallel on GitHub Actions

**Checkpoint**: At this point, User Story 1 should be fully functional - any push triggers validation with pass/fail feedback

---

## Phase 4: User Story 2 - Pull Request Validation Gate (Priority: P2)

**Goal**: Pull requests are blocked from merging until all validation checks pass, protecting the main branch.

**Independent Test**: Create a PR with failing checks and verify merge is blocked; fix issues and verify merge is allowed.

### Implementation for User Story 2

- [ ] T009 [US2] Verify CI workflow reports commit status checks for all jobs (lint, typecheck, test) by creating a test PR
- [ ] T010 [US2] Document branch protection configuration steps in `specs/003-ci-build-pipeline/quickstart.md` (already exists - verify accuracy)
- [ ] T011 [US2] Configure branch protection rules on `001-kratos-mcp-server` branch via GitHub Settings (manual step):
  - Enable "Require status checks to pass before merging"
  - Select required checks: `Lint`, `Type Check`, `Test`
  - Enable "Require branches to be up to date before merging"

**Checkpoint**: At this point, User Stories 1 AND 2 work - PRs cannot be merged with failing checks

---

## Phase 5: User Story 3 - Validation Results Visibility (Priority: P3)

**Goal**: Developers can easily view detailed validation results to quickly diagnose and fix issues.

**Independent Test**: Trigger a validation run with known issues and verify detailed logs and coverage results are accessible and actionable.

### Implementation for User Story 3

- [ ] T012 [US3] Verify coverage summary appears in GitHub Job Summary after test job completion
- [ ] T013 [US3] Verify coverage artifacts are uploaded and downloadable from GitHub Actions UI
- [ ] T014 [US3] Add build status badge to `README.md`: `![CI](https://github.com/feedback-loop-ai/mcp-ory-kratos/actions/workflows/ci.yml/badge.svg?branch=001-kratos-mcp-server)`
- [ ] T015 [US3] Verify badge displays current workflow status on README

**Checkpoint**: All user stories should now be independently functional - validation runs, merge gates work, results are visible

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and cleanup

- [ ] T016 Run full validation checklist from `specs/003-ci-build-pipeline/quickstart.md`
- [ ] T017 [P] Verify edge case: force-push cancels in-progress runs (push rapidly twice, verify first run cancelled)
- [ ] T018 [P] Verify edge case: simultaneous branch pushes run independently
- [ ] T019 [P] Verify pipeline completes within 10-minute target (FR-006)
- [ ] T021 [P] Verify edge case: GitHub Actions outage behavior - document expected developer workflow when CI is unavailable (check https://www.githubstatus.com, manual local validation steps)
- [ ] T022 [P] Verify edge case: job timeout behavior - confirm workflow shows clear timeout message when job exceeds `timeout-minutes` setting
- [ ] T020 Update `CLAUDE.md` with CI-related commands and practices

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on T001 completion - BLOCKS user stories (coverage config needed for test job)
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - US1 must complete before US2 (workflow must exist for status checks)
  - US2 depends on US1 (branch protection requires working checks)
  - US3 can partially run in parallel with US2 (badge doesn't depend on branch protection)
- **Polish (Final Phase)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - Core workflow creation
- **User Story 2 (P2)**: Depends on US1 completion - Branch protection references US1 status checks
- **User Story 3 (P3)**: Partially depends on US1 - Badge and visibility require working workflow

### Within Each User Story

- T004 → T005, T006, T007 (workflow file must exist before adding jobs)
- T005, T006, T007 can be done in parallel (different job definitions in same file)
- T008 depends on T005, T006, T007 (all jobs must exist to verify)
- T009 depends on T008 (workflow must run successfully first)
- T011 depends on T009 (checks must work before making them required)

### Parallel Opportunities

- T001 and T002 can run in parallel (different operations)
- T005, T006, T007 can be written in parallel (different job blocks in same file)
- T012, T013, T014 can run in parallel (different verification tasks)
- T017, T018, T019 can run in parallel (different edge case verifications)

---

## Parallel Example: User Story 1

```bash
# After T004 creates the workflow file, these jobs can be added in parallel:
Task: "Add lint job to .github/workflows/ci.yml"
Task: "Add typecheck job to .github/workflows/ci.yml"
Task: "Add test job to .github/workflows/ci.yml"
```

## Parallel Example: User Story 3

```bash
# These verification tasks can run in parallel:
Task: "Verify coverage summary appears in GitHub Job Summary"
Task: "Verify coverage artifacts are uploaded and downloadable"
Task: "Add build status badge to README.md"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T002)
2. Complete Phase 2: Foundational (T003)
3. Complete Phase 3: User Story 1 (T004-T008)
4. **STOP and VALIDATE**: Push to branch, verify CI runs with all three checks
5. Demo: Any push now triggers validation

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test by pushing → **MVP: CI validates on push!**
3. Add User Story 2 → Configure branch protection → PRs now gated
4. Add User Story 3 → Add badge, verify visibility → Full visibility
5. Polish → Edge cases verified → Production-ready CI

### Single Developer Strategy

With one developer (typical for this infrastructure task):

1. Complete Setup + Foundational sequentially
2. Complete User Story 1 → verify workflow runs
3. Complete User Story 2 → verify merge protection
4. Complete User Story 3 → verify badge and visibility
5. Polish phase for edge cases

---

## Notes

- [P] tasks = different files or independent verifications
- [Story] label maps task to specific user story for traceability
- Each user story can be validated independently after completion
- Manual GitHub UI steps (T011) are documented in quickstart.md
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- CI workflow file is YAML - careful with indentation
