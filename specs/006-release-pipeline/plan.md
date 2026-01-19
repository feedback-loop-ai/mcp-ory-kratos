# Implementation Plan: Release Pipeline

**Branch**: `006-release-pipeline` | **Date**: 2026-01-19 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/006-release-pipeline/spec.md`

## Summary

Build and release pipeline enabling standalone npm distribution of the MCP Ory Kratos server. Uses Bun's bundler to create a single distributable JavaScript file that runs on both Node.js 18+ and Bun 1.x. GitHub Actions workflow triggers on version tags to automatically build, validate, and publish to npm with auto-generated release notes.

## Technical Context

**Language/Version**: TypeScript 5.x compiled via Bun 1.x bundler
**Primary Dependencies**: Bun bundler (build), GitHub Actions (CI/CD), npm registry (distribution)
**Storage**: N/A (CI/CD configuration files only)
**Testing**: Existing Vitest unit tests + integration validation in CI
**Target Platform**: npm package consumable on Node.js 18+ and Bun 1.x runtimes
**Project Type**: Single project (CI/CD extension to existing MCP server)
**Performance Goals**: Package install under 2 minutes (SC-001), release within 10 minutes of tag (SC-002)
**Constraints**: Package size under 5MB (SC-004), zero manual steps for release (SC-006)
**Scale/Scope**: Single npm package, single GitHub Actions release workflow

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. AI-Native Development | ✅ PASS | N/A - CI/CD config, not MCP tools |
| II. Spec-Driven Development | ✅ PASS | Following SDD workflow (spec → plan → tasks) |
| III. Contract-First API Design | ✅ PASS | N/A - No new MCP tools being added |
| IV. Operational Excellence | ✅ PASS | Release workflow includes validation gates |
| V. Simplicity & YAGNI | ✅ PASS | Minimal workflow: single build, single publish, auto-generated notes |
| VI. Fast Feedback Loops | ✅ PASS | Bun bundler for fast builds, existing CI for validation |
| VII. Type Safety & Validation | ✅ PASS | TypeScript type-check required before release |

**Technology Stack Compliance**:
- ✅ Bun 1.x for bundling (per Constitution stack)
- ✅ Biome linting enforced pre-release
- ✅ Vitest tests as quality gate

## Project Structure

### Documentation (this feature)

```text
specs/006-release-pipeline/
├── plan.md              # This file
├── research.md          # Phase 0 output (Bun bundling, npm publishing, GitHub Actions)
├── data-model.md        # Phase 1 output (Package entity definition)
├── quickstart.md        # Phase 1 output (Release workflow guide)
├── contracts/           # Phase 1 output (N/A for CI/CD - no API contracts)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
# Files to CREATE/MODIFY for this feature:
.github/
├── workflows/
│   ├── ci.yml              # EXISTING - preserve for PR validation (FR-010)
│   └── release.yml         # NEW - release workflow on version tags
│
package.json                # MODIFY - add build script, update bin entry
bun.build.ts                # NEW - Bun bundler configuration
dist/                       # GENERATED - build output (gitignored)
└── index.js               # Bundled distributable
```

**Structure Decision**: CI/CD extension to existing single project. No changes to src/ structure. New release workflow alongside existing CI workflow. Build configuration at repo root for Bun bundler.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations. All principles pass.

---

## Constitution Check (Post-Design)

*Re-evaluated after Phase 1 design completion.*

| Principle | Status | Post-Design Notes |
|-----------|--------|-------------------|
| I. AI-Native Development | ✅ PASS | CI/CD config only; MCP tools unchanged |
| II. Spec-Driven Development | ✅ PASS | Complete artifacts: spec → research → data-model → quickstart |
| III. Contract-First API Design | ✅ PASS | No new APIs; existing contracts preserved |
| IV. Operational Excellence | ✅ PASS | Validation gates (lint, typecheck, test) before publish |
| V. Simplicity & YAGNI | ✅ PASS | Minimal files: 1 workflow, 1 build config, package.json updates |
| VI. Fast Feedback Loops | ✅ PASS | Bun bundler ~100ms build time; parallel CI jobs |
| VII. Type Safety & Validation | ✅ PASS | TypeScript strict mode enforced; validation before release |

**Design Decisions Validated**:
- ✅ External dependencies (not bundled) - keeps package small, allows user version control
- ✅ Single output file with shebang - works with both Node.js and Bun
- ✅ GitHub's auto-generated release notes - no additional tooling needed
- ✅ npm dist-tags for pre-releases - standard pattern, user opt-in required

---

## Generated Artifacts

| Artifact | Path | Status |
|----------|------|--------|
| Research | `specs/006-release-pipeline/research.md` | ✅ Complete |
| Data Model | `specs/006-release-pipeline/data-model.md` | ✅ Complete |
| Contracts | `specs/006-release-pipeline/contracts/` | ✅ N/A (CI/CD feature) |
| Quickstart | `specs/006-release-pipeline/quickstart.md` | ✅ Complete |
| Tasks | `specs/006-release-pipeline/tasks.md` | ✅ Complete |
