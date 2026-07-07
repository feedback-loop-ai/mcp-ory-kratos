# Tasks: Upgrade @ory/kratos-client to 26.2.0

**Input**: Design documents from `/specs/007-kratos-client-26/`
**Prerequisites**: plan.md, spec.md, research.md, quickstart.md

**Tests**: No new tests — the existing lint / type-check / unit-test gates are the validation (spec SC-002..SC-004). No test tasks were requested.

**Organization**: Tasks are grouped by user story. This is a small dependency-maintenance feature; phases are short by design (Principle V).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2)

## Phase 1: Setup

**Purpose**: Confirm preconditions for the upgrade

- [X] T001 Verify `@ory/kratos-client@26.2.0` resolves from the npm registry and confirm current declaration is `^25.4.0` in `package.json`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: None required — no shared infrastructure changes for a dependency bump

*(No tasks — proceed directly to user stories.)*

---

## Phase 3: User Story 1 - Compatibility with Ory Kratos v26.2.0 (Priority: P1) 🎯 MVP

**Goal**: Project depends on and installs `@ory/kratos-client` 26.2.x with all quality gates green

**Independent Test**: `bun install` succeeds, then `bun run lint`, `bun x tsc --noEmit`, and unit tests all pass with zero src/ changes

### Implementation for User Story 1

- [X] T002 [US1] Update `@ory/kratos-client` from `^25.4.0` to `^26.2.0` in `package.json`
- [X] T003 [US1] Refresh lockfile with `bun install` (depends on T002); confirm resolved version is 26.2.x in `bun.lock`
- [X] T004 [US1] Run `bun run lint` — zero Biome violations (depends on T003)
- [X] T005 [US1] Run `bun x tsc --noEmit` — zero TypeScript errors (depends on T003)
- [X] T006 [US1] Run `bun x vitest run --config tests/vitest.config.ts --dir tests/unit` — all unit tests pass (depends on T003). *Outcome: `tests/unit/` does not exist in the repo; CI's test job detects this and skips with a documented pass (ci.yml "Check for unit tests" step), so the gate is satisfied*
- [X] T007 [US1] Confirm `git status` shows no changes under `src/` or `tests/` (SC-005)

**Checkpoint**: Upgrade functionally complete and verified — MVP delivered

---

## Phase 4: User Story 2 - Accurate Project Documentation (Priority: P2)

**Goal**: Living documentation reflects the 26.2.x client

**Independent Test**: CLAUDE.md Active Technologies lists `@ory/kratos-client ^26.2.0` for feature 007; README.md has no stale 25.4.x client references

### Implementation for User Story 2

- [X] T008 [US2] Run `.specify/scripts/bash/update-agent-context.sh claude` to record the 007 stack (with the upgraded client) in `CLAUDE.md`
- [X] T009 [P] [US2] Verify `README.md` contains no `@ory/kratos-client` 25.4.x references (checked — none exist; no edit needed)
- [X] T010 [P] [US2] Verify historical specs `specs/001-*` … `specs/006-*` are untouched (FR-005)

**Checkpoint**: Documentation consistent with installed dependency

---

## Phase 5: Polish & Cross-Cutting Concerns

- [X] T011 Run quickstart.md verification sequence end-to-end one final time before commit

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **User Story 1 (Phase 3)**: Depends on T001; T002 → T003 → {T004, T005, T006 in parallel} → T007
- **User Story 2 (Phase 4)**: T008 can run any time on this branch; T009/T010 are independent checks ([P])
- **Polish (Phase 5)**: After all stories

### Parallel Opportunities

- T004, T005, T006 (independent read-only verification commands) can run in parallel after T003
- T009 and T010 can run in parallel with each other and with Phase 3 verification

---

## Implementation Strategy

Single-PR delivery: US1 is the MVP (the bump itself); US2 is a documentation follow-through in the same PR. Total expected diff outside `specs/007-kratos-client-26/`: `package.json`, `bun.lock`, `CLAUDE.md`.
