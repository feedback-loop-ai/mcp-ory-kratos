# Tasks: Release Pipeline

**Input**: Design documents from `/specs/006-release-pipeline/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: Not explicitly requested in the feature specification. No test tasks included.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Prerequisites (Before Implementation)

These items MUST be completed before User Story 2 tasks can succeed:

- [x] PRE-001 For initial v0.1.0 release ONLY: Configure NPM_TOKEN secret (Settings → Secrets → Actions)
- [x] PRE-002 After initial publish: Configure Trusted Publisher on npmjs.com (org: feedback-loop-ai, repo: mcp-ory-kratos, workflow: release.yml) — done 2026-09-06 (workflow: npm ≥ 11.5.1 on the publish runner, `--provenance`; npmjs.com trusted publisher added). First OIDC publish will be the next `v*` tag; the identical setup was verified on mcp-scaleway@0.4.1 (SLSA provenance attestation bound to release.yml)
- [x] PRE-003 After Trusted Publishing configured: Remove NPM_TOKEN secret from repository — done 2026-09-06 (secret deleted; `NODE_AUTH_TOKEN` env removed from release.yml)

**Note**: Prerequisites are manual configuration steps, not code tasks. OIDC Trusted Publishing (PRE-002) is the recommended approach but requires the package to exist first. See quickstart.md for detailed instructions.

---

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Project build configuration and base infrastructure

- [x] T001 Create Bun build configuration in bun.build.ts
- [x] T002 Add dist/ directory to .gitignore (already present)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Package configuration that MUST be complete before ANY user story can be implemented

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 Update package.json with name, version, type, main, and engines fields
- [x] T004 Add bin entry and files array to package.json
- [x] T005 Add build script to package.json scripts section

**Checkpoint**: Foundation ready - package can be built locally with `bun run build`

---

## Phase 3: User Story 1 - Install from Package Registry (Priority: P1) MVP

**Goal**: Enable users to install the MCP server from npm and run it as a CLI tool

**Independent Test**: Run `bun run build`, then test with `node dist/index.js --help` and `bun dist/index.js --help`

### Implementation for User Story 1

- [x] T006 [US1] Verify bun.build.ts generates shebang (#!/usr/bin/env node) in dist/index.js
- [x] T007 [US1] Validate build output runs on Node.js 18+ (node dist/index.js)
- [x] T008 [US1] Validate build output runs on Bun 1.x (bun dist/index.js)
- [x] T009 [US1] Verify package size is under 5MB (68KB)

**Checkpoint**: User Story 1 complete - package is buildable and runnable locally on both runtimes

---

## Phase 4: User Story 2 - Automated Version Release (Priority: P2)

**Goal**: Automate building, testing, and publishing on version tag push

**Independent Test**: Create test tag v0.0.0-test.0, verify workflow triggers and all validation steps pass (without actual npm publish)

### Implementation for User Story 2

- [x] T010 [US2] Create release workflow file in .github/workflows/release.yml
- [x] T011 [US2] Add tag trigger pattern for semantic versions (v*.*.*)
- [x] T012 [US2] Add validation job with lint, typecheck, and test steps
- [x] T013 [US2] Add build job that runs bun build and validates output
- [x] T014 [US2] Add publish job with npm publish command and NPM_TOKEN auth
- [x] T015 [US2] Add retry logic (max 2 attempts) for npm publish step
- [x] T016 [US2] Add GitHub Release creation step with auto-generated notes

**Checkpoint**: User Story 2 complete - stable version tags trigger full release workflow

**Note**: Duplicate version tags are rejected by npm registry (HTTP 403). No additional handling needed—maintainer must increment version.

---

## Phase 5: User Story 3 - Pre-release Testing (Priority: P3)

**Goal**: Support alpha, beta, and rc releases with appropriate npm dist-tags

**Independent Test**: Create test tag v0.0.0-beta.0, verify workflow uses `beta` dist-tag for npm publish

### Implementation for User Story 3

- [x] T017 [US3] Add tag trigger patterns for alpha, beta, and rc versions in release.yml
- [x] T018 [US3] Add dist-tag detection step (alpha/beta/rc/latest) based on tag name
- [x] T019 [US3] Update npm publish step to use dynamic dist-tag
- [x] T020 [US3] Add prerelease flag to GitHub Release creation for pre-release versions

**Checkpoint**: User Story 3 complete - pre-release tags publish with correct dist-tags

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and documentation

- [x] T021 Run quickstart.md verification checklist locally (build verified, runs on Node.js 18+ and Bun 1.x)
- [x] T022 Verify existing CI workflow (ci.yml) is preserved and unchanged (FR-010)
- [ ] T023 Document SC-001 validation: measure fresh install time with `time npm install -g mcp-ory-kratos` (target: < 2 minutes; note: user network conditions vary, this is observational not CI-enforced) - POST-RELEASE
- [x] T024 Document SC-002 validation: observe workflow duration from tag push to npm availability (target: < 10 minutes; typical: 2-4 minutes; GitHub Actions default timeout applies) - POST-RELEASE — v0.3.0 (2026-09-05): validate 10s + build ~20s + publish ~15s ≈ 1 min tag-to-npm on the successful attempt

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories must proceed sequentially: US1 -> US2 -> US3
  - US2 (release workflow) depends on US1 (buildable package)
  - US3 (pre-release) extends US2 (release workflow)
- **Polish (Final Phase)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Depends on US1 completion (needs buildable package to publish)
- **User Story 3 (P3)**: Depends on US2 completion (extends release workflow)

### Within Each Phase

- T001-T002: Can run in parallel (different files)
- T003-T005: Sequential (all modify package.json)
- T010-T016: Sequential within release.yml (building up workflow)
- T017-T020: Sequential (extending release.yml)

### Parallel Opportunities

- Phase 1: T001 and T002 can run in parallel
- Phase 2: All tasks modify package.json - sequential required
- Phase 3: Validation tasks T007, T008, T009 can run in parallel after T006
- Phase 4-5: Tasks build on each other - sequential within each phase
- Phase 6: T021 and T022 can run in parallel

---

## Parallel Example: Phase 1

```bash
# Launch both setup tasks together:
Task: "Create Bun build configuration in bun.build.ts"
Task: "Add dist/ directory to .gitignore"
```

## Parallel Example: User Story 1 Validation

```bash
# Launch validation tasks together after T006:
Task: "Validate build output runs on Node.js 18+"
Task: "Validate build output runs on Bun 1.x"
Task: "Verify package size is under 5MB"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Build locally, run on Node.js and Bun
5. Package can be manually published if needed

### Incremental Delivery

1. Complete Setup + Foundational -> Local build works
2. Add User Story 1 -> Test locally -> Package ready for manual publish (MVP!)
3. Add User Story 2 -> Automated stable releases
4. Add User Story 3 -> Pre-release channel support
5. Each story adds automation without breaking previous functionality

### File Summary

| Task | File | Action |
|------|------|--------|
| T001 | bun.build.ts | CREATE |
| T002 | .gitignore | MODIFY (add dist/) |
| T003-T005 | package.json | MODIFY |
| T006-T009 | (validation) | N/A |
| T010-T020 | .github/workflows/release.yml | CREATE |
| T021-T022 | (validation) | N/A |

---

## Notes

- No test tasks included (not explicitly requested in spec)
- User stories have dependencies: US1 -> US2 -> US3 (not parallelizable)
- Total: 24 tasks (plus 3 manual prerequisites)
- Initial publish requires NPM_TOKEN; subsequent releases use OIDC Trusted Publishing (no secrets)
- Existing ci.yml workflow must remain unchanged (FR-010)
