# Tasks: Comprehensive README with MCP Integration

**Input**: Design documents from `/specs/004-readme-mcp-integration/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, quickstart.md

**Tests**: No tests requested - documentation-only feature.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different sections, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single file**: `README.md` at repository root

---

## Phase 1: Setup (Document Structure)

**Purpose**: Create README.md skeleton with proper structure and navigation

- [X] T001 Create README.md skeleton with title, badges, and table of contents in README.md
- [X] T002 Add introduction paragraph (≤50 words) stating purpose, target users, and primary capability in README.md

---

## Phase 2: Foundational (Prerequisites & Configuration Sections)

**Purpose**: Core sections that ALL user stories depend on - must complete before MCP client-specific content

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T003 Write Prerequisites section with Kratos requirements, Node.js/Bun versions in README.md
- [X] T004 [P] Write Environment Variables table with KRATOS_ADMIN_URL, KRATOS_AUTH_TYPE, KRATOS_API_KEY, KRATOS_CUSTOM_HEADERS, KRATOS_TIMEOUT_MS, LOG_LEVEL in README.md
- [X] T005 [P] Write Installation section with npm/bun package installation commands in README.md
- [X] T006 Add note about MCP server coexistence with other MCP servers in README.md

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - New User Discovers and Configures MCP Server (Priority: P1) 🎯 MVP

**Goal**: Developer landing on repo understands what it does, how to install, and how to configure

**Independent Test**: New developer with no prior knowledge can set up MCP server using only README

### Implementation for User Story 1

- [X] T007 [US1] Add Quick Start section header and overview in README.md
- [X] T008 [US1] Write step-by-step quick start guide (from quickstart.md content) in README.md
- [X] T009 [US1] Add "Try Your First Command" example in README.md
- [X] T010 [US1] Validate introduction paragraph is ≤50 words and states purpose/users/capability

**Checkpoint**: User Story 1 complete - new users can understand and install the MCP server

---

## Phase 4: User Story 2 - Claude Code User Configures MCP Server (Priority: P1)

**Goal**: Claude Code user can add MCP server to their settings and invoke Kratos tools

**Independent Test**: Claude Code user follows configuration example and successfully invokes a tool

### Implementation for User Story 2

- [X] T011 [US2] Write Claude Code Configuration section with complete JSON snippet in README.md
- [X] T012 [US2] Add ~/.claude.json file location and description in README.md
- [X] T013 [US2] Add .mcp.json project-scoped configuration option in README.md
- [X] T014 [US2] Add Claude Code minimum version requirement (1.0+) in Prerequisites section of README.md

**Checkpoint**: User Story 2 complete - Claude Code users can configure and use the MCP server

---

## Phase 5: User Story 3 - GitHub Copilot User Configures MCP Server (Priority: P2)

**Goal**: GitHub Copilot user can configure MCP server in VS Code and access Kratos tools

**Independent Test**: Copilot user follows configuration example and verifies tool availability

### Implementation for User Story 3

- [X] T015 [US3] Write GitHub Copilot Configuration section with .vscode/mcp.json example in README.md
- [X] T016 [US3] Add VS Code input variables example for secrets handling in README.md
- [X] T017 [US3] Add VS Code minimum version requirement (1.99+, GA in 1.102+) in Prerequisites section of README.md

**Checkpoint**: User Story 3 complete - GitHub Copilot users can configure and use the MCP server

---

## Phase 6: User Story 4 - Gemini CLI User Configures MCP Server (Priority: P2)

**Goal**: Gemini CLI user can integrate MCP server for identity management tasks

**Independent Test**: Gemini CLI user follows configuration example and lists available tools

### Implementation for User Story 4

- [X] T018 [US4] Write Gemini CLI Configuration section with ~/.gemini/settings.json example in README.md
- [X] T019 [US4] Add project-scoped .gemini/settings.json configuration option in README.md
- [X] T020 [US4] Add Gemini CLI minimum version requirement (0.1+) in Prerequisites section of README.md

**Checkpoint**: User Story 4 complete - Gemini CLI users can configure and use the MCP server

---

## Phase 7: User Story 5 - Developer Explores Available Tools (Priority: P2)

**Goal**: Developer understands all MCP server capabilities before integrating

**Independent Test**: Reading tools reference section provides complete understanding of each tool

### Implementation for User Story 5

- [X] T021 [US5] Write Tool Reference section header with category overview in README.md
- [X] T022 [P] [US5] Document Identity Tools (8 tools) with descriptions and parameters in README.md
- [X] T023 [P] [US5] Document Session Tools (6 tools) with descriptions and parameters in README.md
- [X] T024 [P] [US5] Document Courier Tools (2 tools) with descriptions and parameters in README.md
- [X] T025 [P] [US5] Document Recovery Tools (2 tools) with descriptions and parameters in README.md
- [X] T026 [P] [US5] Document Analytics Tools (2 tools) with descriptions and parameters in README.md
- [X] T027 [P] [US5] Document Health Tools (3 tools) with descriptions and parameters in README.md
- [X] T028 [US5] Add usage examples section with at least one example per tool category in README.md

**Checkpoint**: User Story 5 complete - developers can discover and understand all 23 tools

---

## Phase 8: User Story 6 - Developer Troubleshoots Configuration Issues (Priority: P3)

**Goal**: Developer encountering issues can resolve common problems using README

**Independent Test**: Simulating common error scenarios and verifying troubleshooting section addresses them

### Implementation for User Story 6

- [X] T029 [US6] Write Troubleshooting section header in README.md
- [X] T030 [P] [US6] Document "Connection refused" troubleshooting steps in README.md
- [X] T031 [P] [US6] Document "401 Unauthorized" troubleshooting steps in README.md
- [X] T032 [P] [US6] Document "Tool not found" troubleshooting steps in README.md
- [X] T033 [P] [US6] Document "Timeout errors" troubleshooting steps in README.md

**Checkpoint**: User Story 6 complete - developers can self-diagnose common issues

---

## Phase 9: User Story 7 - Contributor Understands How to Contribute (Priority: P3)

**Goal**: Potential contributor can set up development environment and understand contribution process

**Independent Test**: New contributor follows development setup and successfully runs tests

### Implementation for User Story 7

- [X] T034 [US7] Write Development section with local setup instructions in README.md
- [X] T035 [US7] Add build commands (lint, typecheck, test) in README.md
- [X] T036 [US7] Write Contributing section with contribution guidelines in README.md
- [X] T037 [US7] Add License section with link to LICENSE file in README.md

**Checkpoint**: User Story 7 complete - contributors can set up environment and submit changes

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and cross-cutting improvements

- [X] T038 Validate all code examples are syntactically valid JSON in README.md
- [X] T039 Verify proper heading hierarchy (h1 → h2 → h3) for accessibility in README.md
- [X] T040 [Final Check] Re-verify introduction paragraph is ≤50 words in README.md (confirms T010)
- [X] T041 Verify all 23 MCP tools are documented in README.md
- [X] T042 Verify table of contents links to all major sections in README.md
- [X] T043 Add "Kratos deployment is out of scope" note with link to Ory Kratos documentation for deployment specifics in README.md
- [X] T044 Run quickstart.md validation - verify quick start steps align with installation commands and configuration examples in research.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-9)**: All depend on Foundational phase completion
  - US1 and US2 are P1 - complete these first
  - US3, US4, US5 are P2 - can proceed after P1 stories
  - US6, US7 are P3 - complete after P2 stories
- **Polish (Phase 10)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 3 (P2)**: Can start after Foundational (Phase 2) - Independently testable
- **User Story 4 (P2)**: Can start after Foundational (Phase 2) - Independently testable
- **User Story 5 (P2)**: Can start after Foundational (Phase 2) - Independently testable
- **User Story 6 (P3)**: Can start after Foundational (Phase 2) - Independently testable
- **User Story 7 (P3)**: Can start after Foundational (Phase 2) - Independently testable

### Within Each User Story

- Core sections before examples
- Examples validate documentation accuracy
- Story complete before moving to next priority

### Parallel Opportunities

- T004 and T005 can run in parallel (different sections)
- T022-T027 can run in parallel (different tool categories)
- T030-T033 can run in parallel (different troubleshooting scenarios)
- All P1 stories can be worked on in parallel after Foundational
- All P2 stories can be worked on in parallel after Foundational
- All P3 stories can be worked on in parallel after Foundational

---

## Parallel Example: User Story 5

```bash
# Launch all tool category documentation tasks together:
Task: "Document Identity Tools (8 tools) with descriptions and parameters in README.md"
Task: "Document Session Tools (6 tools) with descriptions and parameters in README.md"
Task: "Document Courier Tools (2 tools) with descriptions and parameters in README.md"
Task: "Document Recovery Tools (2 tools) with descriptions and parameters in README.md"
Task: "Document Analytics Tools (2 tools) with descriptions and parameters in README.md"
Task: "Document Health Tools (3 tools) with descriptions and parameters in README.md"
```

---

## Implementation Strategy

### MVP First (User Stories 1-2 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (New user discovers and configures)
4. Complete Phase 4: User Story 2 (Claude Code configuration)
5. **STOP and VALIDATE**: Test with a new user attempting setup
6. Deploy/demo if ready - Claude Code users can use the MCP server

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 + 2 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 3 (Copilot) → Test independently → Deploy/Demo
4. Add User Story 4 (Gemini) → Test independently → Deploy/Demo
5. Add User Story 5 (Tool Reference) → Test independently → Deploy/Demo
6. Add User Story 6 (Troubleshooting) → Test independently → Deploy/Demo
7. Add User Story 7 (Contributing) → Test independently → Deploy/Demo
8. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (Quick Start)
   - Developer B: User Story 2 (Claude Code)
3. After P1 stories complete:
   - Developer A: User Story 3 (Copilot)
   - Developer B: User Story 4 (Gemini)
   - Developer C: User Story 5 (Tool Reference)
4. Stories complete and integrate independently

---

## Notes

- [P] tasks = different sections, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- All configuration examples come from research.md - verified formats
- All tool inventory from research.md - 23 tools across 6 categories
- Avoid: vague tasks, section conflicts, cross-story dependencies that break independence
