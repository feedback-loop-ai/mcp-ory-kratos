# Implementation Plan: Upgrade @ory/kratos-client to 26.2.0

**Branch**: `007-kratos-client-26` | **Date**: 2026-07-07 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/007-kratos-client-26/spec.md`

## Summary

Drop-in dependency bump of `@ory/kratos-client` from `^25.4.0` to `^26.2.0`, tracking Ory Kratos v26.2.0 (released 2026-03-20). Pre-verified: the generated TypeScript API surface of both versions is identical (same 56 methods across CourierApi/FrontendApi/IdentityApi/MetadataApi, identical models; the only addition is an optional `awsv4` property on `Configuration`, unused by this project). No source-code changes expected. Approach: update package.json, refresh the Bun lockfile, update agent context documentation via the spec-kit script, and validate with the existing lint / type-check / unit-test gates.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode) on Bun 1.x runtime
**Primary Dependencies**: @ory/kratos-client ^26.2.0 (upgraded from ^25.4.0), @modelcontextprotocol/sdk ^1.25.x, zod ^3.25.x
**Storage**: N/A (stateless proxy to Kratos Admin API; this change touches dependency manifests only)
**Testing**: Vitest ^4.0.x — unit tests (tests/unit/) as the merge gate; integration tests (tests/api/) local-only per CI policy
**Target Platform**: Same as existing server (Node.js 18+ / Bun 1.x)
**Project Type**: Single project (dependency maintenance on the existing MCP server)
**Performance Goals**: N/A — no runtime behavior change
**Constraints**: Zero src/ changes (SC-005); historical specs untouched (FR-005)
**Scale/Scope**: 3 files expected to change: package.json, bun.lock, CLAUDE.md (via agent-context script)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. AI-Native Development | ✅ PASS | N/A - no MCP tool changes; tool contracts unchanged |
| II. Spec-Driven Development | ✅ PASS | Following SDD workflow (spec → plan → tasks → implement) |
| III. Contract-First API Design | ✅ PASS | No contract changes; client API surface verified identical |
| IV. Operational Excellence | ✅ PASS | Existing validation gates (lint, typecheck, unit tests) enforce safety |
| V. Simplicity & YAGNI | ✅ PASS | Minimal change: version bump + lockfile refresh, nothing else |
| VI. Fast Feedback Loops | ✅ PASS | bun install + existing fast gates; no new tooling |
| VII. Type Safety & Validation | ✅ PASS | `tsc --noEmit` is the primary safety net against API drift |

**Technology Stack Compliance**:
- ✅ Kratos Client remains the official `@ory/kratos-client` per the locked stack (Constitution does not pin a client version)
- ✅ bun package management with committed lockfile
- ✅ No new dependencies introduced

## Project Structure

### Documentation (this feature)

```text
specs/007-kratos-client-26/
├── plan.md              # This file
├── research.md          # Phase 0 output (version diff analysis)
├── quickstart.md        # Phase 1 output (upgrade & verification steps)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

**Proportionality note**: `data-model.md` and `contracts/` are intentionally omitted — this feature introduces no entities and no API contracts (Principle V: every artifact must cite a concrete requirement; none exists for them here).

### Source Code (repository root)

```text
# Files to MODIFY for this feature:
package.json                # MODIFY - "@ory/kratos-client": "^25.4.0" → "^26.2.0"
bun.lock                    # REGENERATE - via `bun install`
CLAUDE.md                   # MODIFY - Active Technologies entry via update-agent-context.sh

# Explicitly UNCHANGED:
src/                        # No source changes (SC-005)
tests/                      # No test changes
specs/001-*/ … specs/006-*/ # Historical artifacts preserved (FR-005)
```

**Structure Decision**: Dependency maintenance on the existing single project. No structural changes; only manifest, lockfile, and living agent documentation are touched.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations. All principles pass.

---

## Constitution Check (Post-Design)

*Re-evaluated after Phase 1 design completion.*

| Principle | Status | Post-Design Notes |
|-----------|--------|-------------------|
| I. AI-Native Development | ✅ PASS | Tool schemas and behavior identical after upgrade |
| II. Spec-Driven Development | ✅ PASS | Artifacts proportional to change: spec → research → quickstart |
| III. Contract-First API Design | ✅ PASS | research.md documents API-surface parity between versions |
| IV. Operational Excellence | ✅ PASS | Verification sequence codified in quickstart.md |
| V. Simplicity & YAGNI | ✅ PASS | No data-model/contracts artifacts fabricated for a version bump |
| VI. Fast Feedback Loops | ✅ PASS | Full verification loop under one minute locally |
| VII. Type Safety & Validation | ✅ PASS | tsc strict-mode pass required before commit |

**Design Decisions Validated**:
- ✅ Caret range `^26.2.0` retained — consistent with existing dependency style
- ✅ CLAUDE.md updated only via `update-agent-context.sh claude` (no hand-edits to unrelated lines)
- ✅ Historical specs left untouched
- ✅ Unit tests (not integration tests) as the merge gate, per existing CI policy

---

## Generated Artifacts

| Artifact | Path | Status |
|----------|------|--------|
| Research | `specs/007-kratos-client-26/research.md` | ✅ Complete |
| Data Model | — | ✅ N/A (no entities; dependency bump) |
| Contracts | — | ✅ N/A (no API changes) |
| Quickstart | `specs/007-kratos-client-26/quickstart.md` | ✅ Complete |
| Tasks | `specs/007-kratos-client-26/tasks.md` | ✅ Complete |
