# Feature Specification: Upgrade @ory/kratos-client to 26.2.0

**Feature Branch**: `007-kratos-client-26`
**Created**: 2026-07-07
**Status**: Draft
**Input**: User description: "Upgrade @ory/kratos-client dependency to 26.2.0"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Compatibility with Ory Kratos v26.2.0 (Priority: P1)

An operator runs the MCP Ory Kratos server against a Kratos deployment that has been upgraded to v26.2.0 (released 2026-03-20). The MCP server's bundled client library matches the deployed Kratos version, so all identity, session, courier, and metadata tools continue to work without version-skew surprises.

**Why this priority**: This is the entire feature. Keeping the client library in lockstep with the current Kratos release avoids subtle API drift, keeps the project on a supported dependency line, and gives users confidence that the server targets the Kratos version they actually run.

**Independent Test**: Can be fully tested by installing dependencies with the upgraded client, then running the project's lint, type-check, and unit test gates — all must pass with zero code changes required.

**Acceptance Scenarios**:

1. **Given** the repository with the dependency set to `@ory/kratos-client ^26.2.0`, **When** `bun install` runs, **Then** installation succeeds and the lockfile records the 26.2.x client
2. **Given** the upgraded dependency is installed, **When** `bun x tsc --noEmit` runs, **Then** it completes with zero TypeScript errors
3. **Given** the upgraded dependency is installed, **When** `bun run lint` runs, **Then** it completes with zero Biome violations
4. **Given** the upgraded dependency is installed, **When** the unit test suite runs, **Then** all tests pass

---

### User Story 2 - Accurate Project Documentation (Priority: P2)

A contributor (human or AI agent) reads the project's agent guidance (CLAUDE.md) to understand the active technology stack. The documented client version reflects the actual installed version, so they do not write code or tests against a stale API assumption.

**Why this priority**: Stale version references mislead future development, but they do not affect runtime behavior. Secondary to the dependency bump itself.

**Independent Test**: Can be tested by inspecting living documentation (CLAUDE.md Active Technologies, README.md) after the upgrade — the current stack must reference the 26.2.x client (historical spec artifacts under `specs/001–006` are records of past features and are intentionally untouched).

**Acceptance Scenarios**:

1. **Given** the upgrade is complete, **When** CLAUDE.md's Active Technologies section is inspected, **Then** it lists `@ory/kratos-client ^26.2.x` for this feature (updated via the spec-kit agent-context script)
2. **Given** the upgrade is complete, **When** README.md is inspected, **Then** it contains no stale `25.4.x` client version references

---

### Edge Cases

- What happens if the new client version introduces breaking TypeScript API changes? (Verified beforehand: the generated API surface of 25.4.0 and 26.2.0 is identical — the same 56 methods across CourierApi/FrontendApi/IdentityApi/MetadataApi with identical models. The only addition is an optional `awsv4` property on `Configuration`, which this project does not use. The type-check gate is the safety net if this assessment is wrong.)
- What happens if `bun install` cannot resolve `^26.2.0`? (The version is published on npm; if resolution fails, the upgrade is aborted and no partial state is committed.)
- What about integration tests against a live Kratos? (Out of scope for the merge gate — they require a running Kratos instance and are excluded from CI by design. They remain runnable locally against a Kratos v26.2.0 deployment.)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The project MUST declare `@ory/kratos-client` at `^26.2.0` in package.json
- **FR-002**: The committed lockfile MUST be refreshed so installs resolve a 26.2.x client
- **FR-003**: All existing MCP tools MUST continue to compile and pass unit tests with the upgraded client, with no source changes unless the type-checker demands them
- **FR-004**: Project documentation describing the active stack (CLAUDE.md Active Technologies) MUST reflect the new client version, updated via the spec-kit agent-context script rather than hand-editing unrelated lines
- **FR-005**: Historical spec artifacts (specs/001–006) MUST NOT be rewritten to hide the previous version

### Key Entities

- **Dependency declaration**: The `@ory/kratos-client` entry in package.json (`dependencies`) plus its resolved entry in the Bun lockfile
- **Client API surface**: The generated TypeScript classes (CourierApi, FrontendApi, IdentityApi, MetadataApi) and models the MCP tools call — unchanged between 25.4.0 and 26.2.0

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: `bun install` completes successfully with `@ory/kratos-client` resolved to a 26.2.x version
- **SC-002**: `bun run lint` reports zero violations
- **SC-003**: `bun x tsc --noEmit` reports zero errors
- **SC-004**: Unit test suite (tests/unit/) passes with 100% of tests green
- **SC-005**: Zero source-code (src/) changes are required — the upgrade is a pure dependency bump

## Assumptions

- Ory Kratos v26.2.0 and its matching client were released 2026-03-20; `@ory/kratos-client@26.2.0` is available on npm
- The generated client API surface is identical between 25.4.0 and 26.2.0 (verified prior to this spec), so no code migration is needed
- Caret range `^26.2.0` is consistent with the project's existing dependency style (`^25.4.0`)
- Integration tests (tests/api/) are excluded from the merge gate per existing CI policy; unit tests are the automated validation for this change

## Clarifications

### Session 2026-07-07

- Q: Should the upgrade pin an exact version or keep a caret range? → A: Keep caret (`^26.2.0`) — matches the existing `^25.4.0` style and the project's convention for all runtime dependencies
- Q: Do historical specs (001–006) referencing `^25.4.x` need updating? → A: No — they are immutable records of past features; only living documentation (CLAUDE.md Active Technologies, README.md if applicable) must reflect the current stack. README.md was checked and contains no client version references
- Q: Must integration tests run against a live Kratos v26.2.0 before merge? → A: No — CI policy already excludes integration tests (they require external infrastructure). Lint, type-check, and unit tests are the merge gate; the identical API surface makes runtime regressions from this bump implausible
- Q: How should CLAUDE.md be updated? → A: Via `.specify/scripts/bash/update-agent-context.sh claude` during the plan phase, per the spec-kit workflow — no hand-editing of unrelated lines
- Q: What does "unit tests pass" mean if `tests/unit/` does not yet exist in the repository? → A: The CI test job (`.github/workflows/ci.yml`) detects the absence of `tests/unit/` and skips the run as a documented pass (per feature 003 FR-002). SC-004 is therefore satisfied by CI's green test job; the binding automated gates for this change are lint and type-check
