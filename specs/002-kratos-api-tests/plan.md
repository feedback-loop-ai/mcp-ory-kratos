# Implementation Plan: Kratos API Compatibility Test Suite

**Branch**: `002-kratos-api-tests` | **Date**: 2026-01-18 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-kratos-api-tests/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Implement a comprehensive API test suite that validates 100% compatibility between the MCP Ory Kratos server and a target Kratos Admin API instance. The test suite uses Vitest with configurable endpoint targeting, fail-fast error handling, and clean test data management.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**: Vitest ^4.0.x, @ory/kratos-client ^25.4.x, Zod ^3.25.x
**Storage**: N/A (test suite only, no persistent storage)
**Testing**: Vitest (aligned with Constitution, already in devDependencies)
**Target Platform**: Linux server, macOS (development), any Bun 1.x-compatible environment
**Project Type**: Single project (test suite addition to existing MCP server)
**Performance Goals**: Full test suite execution under 2 minutes against healthy Kratos instance
**Constraints**: Tests must clean up all created data; fail-fast on auth/connection errors
**Scale/Scope**: ~30-40 test cases covering all Admin API endpoints exposed by MCP server

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Requirement | Status | Notes |
|-----------|-------------|--------|-------|
| I. AI-Native Development | Tests must have clear, structured outputs | ✅ PASS | Vitest provides structured JSON reports; test failures include expected vs actual |
| II. Spec-Driven Development | Feature has spec before implementation | ✅ PASS | spec.md complete with clarifications, user stories, and acceptance criteria |
| III. Contract-First API Design | N/A for test suite | ✅ N/A | Tests validate existing contracts, don't define new ones |
| IV. Operational Excellence | Tests must handle errors gracefully | ✅ PASS | Fail-fast on connection/auth errors; clear error messages per spec |
| V. Simplicity & YAGNI | No over-engineering | ✅ PASS | Direct API testing without invented abstractions |
| VI. Fast Feedback Loops | Test suite under 5 seconds for unit tests | ✅ PASS | Spec allows 2min for full integration suite; unit tests separate |
| VII. Type Safety & Validation | TypeScript strict mode, Zod schemas | ✅ PASS | Aligned with existing codebase patterns |

**Gate Status**: ✅ PASS - All applicable principles satisfied

## Project Structure

### Documentation (this feature)

```text
specs/002-kratos-api-tests/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
# Existing MCP server structure
src/
├── config.ts            # Server configuration (reference for test config)
├── errors/              # Error mapping (test validation patterns)
├── kratos/              # Kratos client (test target reference)
├── tools/               # MCP tools (API operations to test)
│   ├── identity.ts      # Identity CRUD operations
│   ├── session.ts       # Session management operations
│   ├── recovery.ts      # Recovery flow operations
│   ├── courier.ts       # Courier message operations
│   └── health.ts        # Health check operations
└── schemas/             # Zod schemas (input validation reference)

# New test structure (this feature)
tests/
├── setup/
│   ├── config.ts        # Test configuration loader
│   └── helpers.ts       # Test utilities and cleanup
├── api/
│   ├── identity.test.ts # Identity API tests
│   ├── session.test.ts  # Session API tests
│   ├── recovery.test.ts # Recovery API tests
│   ├── courier.test.ts  # Courier API tests
│   └── health.test.ts   # Health check tests
└── vitest.config.ts     # Vitest configuration for API tests

# Configuration (gitignored)
.env.test.local          # Test endpoint and credentials (gitignored)
```

**Structure Decision**: Single project extension - add `tests/` directory at repo root with API test suites organized by domain (identity, session, recovery, courier, health). Test configuration uses environment variables via a `.env.test.local` file (gitignored for security).

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

*No violations - Constitution Check passed. Test suite follows existing patterns and uses locked stack technologies.*

---

## Post-Design Constitution Re-Check

*Evaluated after Phase 1 design completion*

| Principle | Post-Design Status | Validation |
|-----------|-------------------|------------|
| I. AI-Native Development | ✅ PASS | Contracts define typed interfaces; test errors are structured with codes and suggestions |
| II. Spec-Driven Development | ✅ PASS | All design artifacts (research.md, data-model.md, contracts/, quickstart.md) completed |
| III. Contract-First API Design | ✅ PASS | Test configuration and context contracts defined in contracts/ before implementation |
| IV. Operational Excellence | ✅ PASS | Custom error classes (ConnectionError, AuthenticationError, VersionMismatchError) provide clear diagnostics |
| V. Simplicity & YAGNI | ✅ PASS | Design uses existing Kratos client; no new abstractions over Kratos API |
| VI. Fast Feedback Loops | ✅ PASS | Test structure supports running individual suites; Vitest config optimized for speed |
| VII. Type Safety & Validation | ✅ PASS | Zod schemas defined for TestConfig; TypeScript interfaces for all contracts |

**Post-Design Gate Status**: ✅ PASS - Design complies with all Constitution principles

## Generated Artifacts

| Artifact | Path | Description |
|----------|------|-------------|
| Research | `specs/002-kratos-api-tests/research.md` | Decision log for all technical choices |
| Data Model | `specs/002-kratos-api-tests/data-model.md` | Entity definitions and relationships |
| Contracts | `specs/002-kratos-api-tests/contracts/` | Type-safe interfaces for test infrastructure |
| Quickstart | `specs/002-kratos-api-tests/quickstart.md` | Developer setup and usage guide |
