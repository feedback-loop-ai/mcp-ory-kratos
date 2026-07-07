# Research: Upgrade @ory/kratos-client to 26.2.0

**Feature**: 007-kratos-client-26 | **Date**: 2026-07-07

## R1: API surface compatibility between 25.4.0 and 26.2.0

**Decision**: Treat the upgrade as a drop-in dependency bump requiring no code migration.

**Rationale**: The `@ory/kratos-client` package is generated from the Kratos OpenAPI specification. A comparison of the generated TypeScript API surface of 25.4.0 and 26.2.0 shows they are identical:

- Same 56 methods across the four API classes used by this project: `CourierApi`, `FrontendApi`, `IdentityApi`, `MetadataApi`
- Identical model types (identity, session, courier message, recovery, etc.)
- Only addition: an optional `awsv4` property on the `Configuration` class (AWS Signature v4 signing support). This project constructs `Configuration` with `basePath` (and optional API key) only, so the addition is irrelevant here.

**Alternatives considered**:
- *Pin exact version `26.2.0`*: Rejected — the project's existing convention is caret ranges (`^25.4.0`, `^1.25.x`, `^3.25.x`), and the lockfile already provides reproducibility.
- *Skip the upgrade until a code change forces it*: Rejected — version skew between the client and current Kratos releases accumulates risk; a zero-migration window is the cheapest possible time to upgrade.
- *Upgrade with code-level adaptation layer*: Rejected — nothing to adapt; YAGNI (Principle V).

## R2: Verification strategy

**Decision**: Use the existing CI gates as the full verification suite: `bun install`, `bun run lint`, `bun x tsc --noEmit`, `bun x vitest run --config tests/vitest.config.ts --dir tests/unit`.

**Rationale**: The type-checker compiles every call site against the new client's declarations, which is the strongest automated signal for a generated-client bump. Unit tests cover tool schemas and behavior. Integration tests (tests/api/) require a live Kratos and are excluded from the merge gate by established CI policy; they remain available for local validation against a Kratos v26.2.0 deployment.

**Alternatives considered**:
- *Stand up Kratos v26.2.0 in CI for this PR*: Rejected — changes CI policy for a change with an identical API surface; disproportionate (Principle V).

## R3: Documentation update mechanism

**Decision**: Update CLAUDE.md's Active Technologies via `.specify/scripts/bash/update-agent-context.sh claude`; leave README.md and historical specs untouched.

**Rationale**: The spec-kit script is the sanctioned way to record a feature's stack in the agent context file and avoids hand-editing unrelated lines (which would create needless conflicts with sibling feature branches 008–010 currently in flight). README.md was grepped and contains no `25.4` client references. Specs 001–006 mention `^25.4.x` as historical records of those features' contexts and must not be rewritten (FR-005).
