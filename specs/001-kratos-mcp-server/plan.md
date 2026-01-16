# Implementation Plan: Ory Kratos MCP Server

**Branch**: `001-kratos-mcp-server` | **Date**: 2026-01-14 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-kratos-mcp-server/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Build an MCP (Model Context Protocol) server that exposes Ory Kratos Admin API operations as tools for AI agents. The server targets two personas: Business Analysts (user behavior analytics, session statistics) and DevOps/CloudOps (identity administration, error investigation, RCA/MTTR). Technical approach uses Bun runtime with TypeScript, @modelcontextprotocol/sdk for MCP protocol, @ory/kratos-client for API communication, and Zod for schema validation.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Runtime**: Bun 1.x (native TypeScript, all-in-one toolchain)
**Primary Dependencies**: @modelcontextprotocol/sdk ^1.25.x, @ory/kratos-client, zod ^3.25.x
**Storage**: N/A (stateless proxy to Kratos Admin API)
**Testing**: Vitest (fast, TypeScript-native, Bun-compatible)
**Linting/Formatting**: Biome (100x faster than ESLint+Prettier)
**Target Platform**: Any platform supporting Bun (Linux, macOS, Windows via WSL)
**Project Type**: Single project (CLI/library MCP server)
**Performance Goals**: Health check <1s, session analytics <5s for 10k sessions, session revocation <2s
**Constraints**: Fail fast on errors (no retries), structured JSON logging, no sensitive data in logs
**Scale/Scope**: Single Kratos instance, 23 MCP tools covering identity/session/courier/health operations

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Evidence |
|-----------|--------|----------|
| I. AI-Native Development | ✅ PASS | MCP tools with Zod schemas, structured errors, stateless proxy design |
| II. Spec-Driven Development | ✅ PASS | spec.md defines WHAT, plan.md defines HOW, tasks.md will define implementation |
| III. Contract-First API Design | ✅ PASS | Contracts defined in `contracts/` before implementation, Zod schemas for all tools |
| IV. Operational Excellence | ✅ PASS | Structured JSON logging (FR-018), health checks (FR-007), graceful error handling |
| V. Simplicity & YAGNI | ✅ PASS | Direct Kratos API mapping, no invented abstractions, single-identity operations only |
| VI. Fast Feedback Loops | ✅ PASS | Bun runtime, Vitest, Biome - all optimized for instant feedback |
| VII. Type Safety & Validation | ✅ PASS | TypeScript strict mode, Zod validation at boundaries, mock-based testing |

**Initial Gate Status**: PASS - All principles satisfied. Proceed to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/001-kratos-mcp-server/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   ├── tools.ts         # MCP tool schemas (Zod definitions)
│   └── resources.ts     # MCP resource schemas (Zod definitions)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── index.ts             # MCP server entry point
├── config.ts            # Configuration loading and validation
├── tools/               # MCP tool implementations (grouped by domain)
│   ├── identity.ts      # Identity CRUD tools
│   ├── session.ts       # Session management tools
│   ├── courier.ts       # Courier message tools
│   ├── recovery.ts      # Recovery link/code tools
│   ├── health.ts        # Health check tools
│   └── analytics.ts     # Session statistics aggregation tools
├── resources/           # MCP resource implementations
│   └── schemas.ts       # Identity schema resources
├── kratos/              # Kratos API client wrapper
│   ├── client.ts        # Configured Kratos client factory
│   └── types.ts         # Type definitions for Kratos responses
├── errors/              # Error handling
│   └── mapper.ts        # Kratos error to MCP error mapping
└── logging/             # Structured logging
    └── logger.ts        # JSON logger with request tracing

tests/
├── unit/                # Unit tests (mocked dependencies)
│   ├── tools/           # Tool handler tests
│   └── errors/          # Error mapper tests
└── integration/         # Integration tests (mocked Kratos API)
    └── server.test.ts   # Full server integration tests
```

**Structure Decision**: Single project structure selected. MCP server is a standalone CLI/library with no frontend or separate backend. Tools are organized by Kratos domain (identity, session, courier, etc.) for clear separation of concerns.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations identified. All design decisions align with Constitution principles:
- Single project structure (Simplicity)
- Direct Kratos API mapping (YAGNI)
- Bun + Vitest + Biome toolchain (Fast Feedback Loops)

## Post-Design Constitution Re-Check

*Re-evaluated after Phase 1 design artifacts completed.*

| Principle | Status | Post-Design Evidence |
|-----------|--------|---------------------|
| I. AI-Native Development | ✅ PASS | 22 MCP tools with Zod schemas (contracts/tools.ts), 3 resources (contracts/resources.ts), structured McpToolError type |
| II. Spec-Driven Development | ✅ PASS | spec.md → plan.md → data-model.md → contracts/ → tasks.md (next) |
| III. Contract-First API Design | ✅ PASS | TypeScript Zod schemas in contracts/ precede implementation, mcp-tools.md documents all tool contracts |
| IV. Operational Excellence | ✅ PASS | Logger design in research.md, error mapping strategy defined, health tools specified |
| V. Simplicity & YAGNI | ✅ PASS | No custom abstractions beyond direct Kratos API mapping, console.error logging (no pino dependency) |
| VI. Fast Feedback Loops | ✅ PASS | Bun runtime for native TypeScript, Vitest for fast tests, Biome for instant linting |
| VII. Type Safety & Validation | ✅ PASS | All schemas use Zod with TypeScript inference, strict mode, validation at boundaries |

**Post-Design Gate Status**: PASS - Ready for Phase 2 (task generation via `/speckit.tasks`).

## Generated Artifacts Summary

| Artifact | Path | Status |
|----------|------|--------|
| Implementation Plan | specs/001-kratos-mcp-server/plan.md | ✅ Complete |
| Research | specs/001-kratos-mcp-server/research.md | ✅ Complete |
| Data Model | specs/001-kratos-mcp-server/data-model.md | ✅ Complete |
| Tool Contracts (MD) | specs/001-kratos-mcp-server/contracts/mcp-tools.md | ✅ Complete |
| Tool Contracts (TS) | specs/001-kratos-mcp-server/contracts/tools.ts | ✅ Complete |
| Resource Contracts (MD) | specs/001-kratos-mcp-server/contracts/mcp-resources.md | ✅ Complete |
| Resource Contracts (TS) | specs/001-kratos-mcp-server/contracts/resources.ts | ✅ Complete |
| Quickstart | specs/001-kratos-mcp-server/quickstart.md | ✅ Complete |
| Tasks | specs/001-kratos-mcp-server/tasks.md | ⏳ Next (/speckit.tasks) |
