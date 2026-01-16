# Tasks: Ory Kratos MCP Server

**Input**: Design documents from `/specs/001-kratos-mcp-server/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Not explicitly requested in user input. Tests excluded per template guidelines. Mock-based testing strategy documented in spec.md for future implementation.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Initialize Bun project with package.json (name: mcp-ory-kratos, type: module)
- [x] T002 [P] Configure TypeScript strict mode in tsconfig.json
- [x] T003 [P] Configure Biome linting/formatting in biome.json
- [x] T004 [P] Create .gitignore for node_modules, dist, .env files
- [x] T005 Install dependencies: @modelcontextprotocol/sdk ^1.25.x, @ory/kratos-client, zod ^3.25.x
- [x] T006 Install dev dependencies: vitest, typescript, @biomejs/biome, @types/bun
- [x] T007 Create directory structure: src/tools/, src/resources/, src/kratos/, src/errors/, src/logging/

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T008 Implement configuration loading with Zod validation in src/config.ts (KRATOS_ADMIN_URL, KRATOS_AUTH_TYPE, KRATOS_API_KEY, KRATOS_CUSTOM_HEADERS, LOG_LEVEL)
- [x] T009 [P] Implement JSON logger using console.error in src/logging/logger.ts (levels: trace, debug, info, warn, error; correlation IDs; no sensitive data)
- [x] T010 [P] Copy tool schemas from specs/001-kratos-mcp-server/contracts/tools.ts to src/schemas/tools.ts
- [x] T011 [P] Copy resource schemas from specs/001-kratos-mcp-server/contracts/resources.ts to src/schemas/resources.ts
- [x] T012 Implement Kratos client factory in src/kratos/client.ts (configurable auth: none, api-key, custom-headers)
- [x] T013 [P] Re-export Kratos types from @ory/kratos-client in src/kratos/types.ts
- [x] T014 Implement error mapper (HTTP status to McpToolError) in src/errors/mapper.ts with actionable suggestions
- [x] T015 Create MCP server skeleton with stdio transport in src/index.ts
- [x] T016 Add package.json scripts: start (bun run src/index.ts), lint (biome check), lint:fix (biome check --write), format (biome format --write), test (vitest)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Business Analyst Views User Login Patterns (Priority: P1) 🎯 MVP

**Goal**: Enable business analysts to query session data for login patterns, authentication methods, and device/browser usage

**Independent Test**: Query session data for a set of users and receive aggregated statistics about login methods, devices, and browsers used

### Implementation for User Story 1

- [x] T017 [P] [US1] Implement kratos_list_sessions tool in src/tools/session.ts (pagination, active/inactive filter via active param, expand: identity/devices)
- [x] T018 [P] [US1] Implement kratos_get_session tool in src/tools/session.ts (by ID with expand options)
- [x] T019 [US1] Implement user-agent parsing helper for device/browser classification in src/tools/analytics.ts
- [x] T020 [US1] Implement kratos_session_analytics tool in src/tools/analytics.ts (aggregate by auth method, device type, browser, AAL)
- [x] T021 [US1] Register session tools (list_sessions, get_session) in src/index.ts
- [x] T022 [US1] Register session_analytics tool in src/index.ts

**Checkpoint**: User Story 1 complete - Business analysts can query session statistics

---

## Phase 4: User Story 2 - DevOps Investigates User Authentication Issues (Priority: P1)

**Goal**: Enable DevOps engineers to quickly find and analyze authentication errors for specific users to reduce MTTR

**Independent Test**: Search for a user's identity, retrieve their sessions, and examine courier messages to identify failed authentication attempts

### Implementation for User Story 2

- [x] T023 [P] [US2] Implement kratos_list_identities tool in src/tools/identity.ts (pagination, credentials_identifier filter)
- [x] T024 [P] [US2] Implement kratos_get_identity tool in src/tools/identity.ts (by ID with include_credentials option)
- [x] T025 [P] [US2] Implement kratos_get_identity_by_external_id tool in src/tools/identity.ts
- [x] T026 [US2] Implement kratos_list_identity_sessions tool in src/tools/session.ts (sessions for specific identity with active filter)
- [x] T027 [P] [US2] Implement kratos_list_courier_messages tool in src/tools/courier.ts (pagination, status filter, recipient filter)
- [x] T028 [P] [US2] Implement kratos_get_courier_message tool in src/tools/courier.ts (by ID)
- [x] T029 [US2] Register identity query tools (list, get, get_by_external_id) in src/index.ts
- [x] T030 [US2] Register courier tools (list, get) in src/index.ts

**Checkpoint**: User Story 2 complete - DevOps can investigate authentication issues

---

## Phase 5: User Story 3 - DevOps Manages User Sessions (Priority: P2)

**Goal**: Enable DevOps/CloudOps engineers to list, inspect, and revoke user sessions for security incidents or user support

**Independent Test**: List sessions for a user, view session details, and revoke a specific session

### Implementation for User Story 3

- [x] T031 [P] [US3] Implement kratos_disable_session tool in src/tools/session.ts (revoke single session)
- [x] T032 [P] [US3] Implement kratos_extend_session tool in src/tools/session.ts (extend expiration)
- [x] T033 [US3] Implement kratos_delete_identity_sessions tool in src/tools/session.ts (revoke all sessions for identity)
- [x] T034 [US3] Register session management tools (disable, extend, delete_all) in src/index.ts

**Checkpoint**: User Story 3 complete - DevOps can manage user sessions

---

## Phase 6: User Story 4 - DevOps Administers User Identities (Priority: P2)

**Goal**: Enable DevOps/CloudOps engineers to create, update, and delete user identities for onboarding, offboarding, and data correction

**Independent Test**: Create a test identity, update its traits, and then delete it

### Implementation for User Story 4

- [x] T035 [P] [US4] Implement kratos_create_identity tool in src/tools/identity.ts (schema_id, traits, state, metadata)
- [x] T036 [P] [US4] Implement kratos_update_identity tool in src/tools/identity.ts (full replacement)
- [x] T037 [P] [US4] Implement kratos_patch_identity tool in src/tools/identity.ts (JSON Patch operations)
- [x] T038 [P] [US4] Implement kratos_delete_identity tool in src/tools/identity.ts
- [x] T039 [US4] Implement kratos_delete_identity_credential tool in src/tools/identity.ts (delete by credential type)
- [x] T040 [US4] Register identity management tools (create, update, patch, delete, delete_credential) in src/index.ts

**Checkpoint**: User Story 4 complete - DevOps can administer user identities

---

## Phase 7: User Story 5 - Business Analyst Analyzes Authentication Method Adoption (Priority: P2)

**Goal**: Enable business analysts to see which authentication methods users prefer to guide product decisions

**Independent Test**: Query credential types across identities and receive distribution of authentication methods in use

### Implementation for User Story 5

- [x] T041 [US5] Implement kratos_credential_analytics tool in src/tools/analytics.ts (credential type distribution, MFA adoption stats)
- [x] T042 [US5] Register credential_analytics tool in src/index.ts

**Checkpoint**: User Story 5 complete - Business analysts can analyze auth method adoption

---

## Phase 8: User Story 6 - DevOps Generates Recovery Links for Users (Priority: P3)

**Goal**: Enable DevOps engineers to generate account recovery links or codes for users who cannot complete self-service recovery

**Independent Test**: Generate a recovery link for a test identity and verify the link format

### Implementation for User Story 6

- [x] T043 [P] [US6] Implement kratos_create_recovery_link tool in src/tools/recovery.ts (identity_id, expires_in)
- [x] T044 [P] [US6] Implement kratos_create_recovery_code tool in src/tools/recovery.ts (identity_id, expires_in)
- [x] T045 [US6] Register recovery tools (create_link, create_code) in src/index.ts

**Checkpoint**: User Story 6 complete - DevOps can generate recovery links

---

## Phase 9: User Story 7 - DevOps Monitors System Health (Priority: P3)

**Goal**: Enable DevOps engineers to check health and version of the Kratos instance

**Independent Test**: Call health endpoints and receive status responses

### Implementation for User Story 7

- [x] T046 [P] [US7] Implement kratos_health_alive tool in src/tools/health.ts
- [x] T047 [P] [US7] Implement kratos_health_ready tool in src/tools/health.ts
- [x] T048 [P] [US7] Implement kratos_version tool in src/tools/health.ts
- [x] T049 [US7] Register health tools (alive, ready, version) in src/index.ts

**Checkpoint**: User Story 7 complete - DevOps can monitor system health

---

## Phase 10: MCP Resources

**Purpose**: Implement MCP resources for identity schema discovery and configuration

- [x] T050 [P] Implement kratos://schemas resource handler in src/resources/schemas.ts (list all identity schemas)
- [x] T051 [P] Implement kratos://schemas/{schema_id} resource template handler in src/resources/schemas.ts (get schema by ID)
- [x] T052 Implement kratos://config/connection resource handler in src/resources/schemas.ts (non-sensitive connection info)
- [x] T053 Register all resources in src/index.ts

**Checkpoint**: All MCP resources available

---

## Phase 11: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and documentation

- [x] T054 Verify all 23 tools registered with proper AI-agent descriptions (from contracts/mcp-tools.md)
- [x] T055 Verify all 3 resources registered with proper descriptions (from contracts/mcp-resources.md)
- [x] T056 Verify error mapper covers all error codes from contracts/mcp-tools.md
- [x] T057 Verify logging excludes sensitive data (credentials, tokens, PII traits)
- [x] T057a Verify request/response tracing with correlation IDs is implemented per FR-018
- [x] T058 Run quickstart.md validation (Claude Desktop integration test)
- [x] T059 Update quickstart.md if any configuration changes discovered

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phases 3-9)**: All depend on Foundational phase completion
  - US1 and US2 are both P1 and can proceed in parallel
  - US3, US4, US5 are P2 and can proceed in parallel after Foundational
  - US6, US7 are P3 and can proceed in parallel after Foundational
- **Resources (Phase 10)**: Depends on Foundational (Phase 2)
- **Polish (Phase 11)**: Depends on all user stories and resources being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational - No dependencies on other stories
- **User Story 3 (P2)**: Can start after Foundational - Shares session.ts with US1 but different functions
- **User Story 4 (P2)**: Can start after Foundational - Shares identity.ts with US2 but different functions
- **User Story 5 (P2)**: Can start after Foundational - Uses analytics.ts, independent of US1
- **User Story 6 (P3)**: Can start after Foundational - Independent recovery.ts module
- **User Story 7 (P3)**: Can start after Foundational - Independent health.ts module

### Within Each User Story

- Tool implementations can run in parallel (different functions in same file)
- Registration in src/index.ts should happen after tool implementation
- All tools must include proper error handling via error mapper

### Parallel Opportunities

- T002, T003, T004 (Setup config files) can run in parallel
- T009, T010, T011, T013 (Foundational independent modules) can run in parallel
- T017, T018 (US1 session tools) can run in parallel
- T023, T024, T025 (US2 identity query tools) can run in parallel
- T027, T028 (US2 courier tools) can run in parallel
- T031, T032 (US3 session management tools) can run in parallel
- T035, T036, T037, T038 (US4 identity CRUD tools) can run in parallel
- T043, T044 (US6 recovery tools) can run in parallel
- T046, T047, T048 (US7 health tools) can run in parallel
- T050, T051 (Resources schema handlers) can run in parallel

---

## Parallel Example: User Story 2

```bash
# Launch all identity query tools together:
Task: "Implement kratos_list_identities tool in src/tools/identity.ts"
Task: "Implement kratos_get_identity tool in src/tools/identity.ts"
Task: "Implement kratos_get_identity_by_external_id tool in src/tools/identity.ts"

# Launch courier tools in parallel:
Task: "Implement kratos_list_courier_messages tool in src/tools/courier.ts"
Task: "Implement kratos_get_courier_message tool in src/tools/courier.ts"

# Then register all tools:
Task: "Register identity query tools in src/index.ts"
Task: "Register courier tools in src/index.ts"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (Session Analytics for BA)
4. Complete Phase 4: User Story 2 (Error Investigation for DevOps)
5. **STOP and VALIDATE**: Test both P1 stories independently
6. Deploy/demo if ready - covers both primary personas (BA + DevOps)

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1 + US2 → Test independently → Deploy/Demo (MVP - both personas!)
3. Add US3 + US4 → Test independently → Deploy/Demo (Session + Identity Management)
4. Add US5 → Test independently → Deploy/Demo (Credential Analytics)
5. Add US6 + US7 → Test independently → Deploy/Demo (Recovery + Health)
6. Add Resources → Test independently → Deploy/Demo (Full Feature)
7. Each story adds value without breaking previous stories

### Tool Count Summary

| Phase | Tools | Resources | Cumulative Tools |
|-------|-------|-----------|------------------|
| Foundational | 0 (infrastructure) | 0 | 0 |
| US1 (Session Analytics) | 3 | 0 | 3 |
| US2 (Investigation) | 6 | 0 | 9 |
| US3 (Session Mgmt) | 3 | 0 | 12 |
| US4 (Identity Admin) | 5 | 0 | 17 |
| US5 (Credential Analytics) | 1 | 0 | 18 |
| US6 (Recovery) | 2 | 0 | 20 |
| US7 (Health) | 3 | 0 | 23 |
| Resources | 0 | 3 | 23 |
| **Total** | **23 tools** | **3 resources** | |

### Suggested MVP Scope

- **Minimum**: US1 + US2 (9 tools) - Covers both Business Analyst and DevOps personas
- **Recommended**: US1 + US2 + US3 + US7 (15 tools) - Adds session management and health monitoring

---

## Notes

- [P] tasks = different files or independent functions, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- All tools use Zod schemas from src/schemas/ for input validation
- Error handling uses McpToolError schema for consistent error responses
- Logging uses console.error (stderr) to avoid interfering with MCP stdio protocol
- No pino dependency - uses native console.error with JSON.stringify per research.md decision
