# Implementation Plan: Passkey and Code Credential Types

**Branch**: `009-passkey-code-credentials` | **Date**: 2026-07-07 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/009-passkey-code-credentials/spec.md`

## Summary

Extend the server's hardcoded credential-type support (`password`, `oidc`, `totp`, `webauthn`,
`lookup_secret`) with `passkey` and `code`, which the installed `@ory/kratos-client` SDK
(^25.4.0) already accepts in `DeleteIdentityCredentialsTypeEnum` and
`GetIdentityIncludeCredentialEnum`. Technical approach: introduce a single-source-of-truth
`CREDENTIAL_TYPES` constant tuple in `src/kratos/types.ts`, derive the `CredentialType` union and
the Zod enum from it, and use it in the identity tools (delete credential, get with credentials).
Extend credential analytics with an additive `passwordlessAdoption` bucket (passkey = enabled)
while keeping `mfaAdoption` semantics unchanged (`totp`/`webauthn`/`lookup_secret` only; `code`
counted in neither bucket — see spec Clarifications). Add the repository's first unit tests under
`tests/unit/` and make the shared Vitest setup skip live-Kratos preflight for unit-only runs so
the existing CI command (`vitest run --dir tests/unit`) passes without a Kratos instance.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode) on Bun 1.x
**Primary Dependencies**: @modelcontextprotocol/sdk ^1.25.x, @ory/kratos-client ^25.4.x, zod ^3.25.x
**Storage**: N/A (stateless proxy to Kratos Admin API)
**Testing**: Vitest ^4.0.x — new unit tests in `tests/unit/` (CI-safe, no Kratos required)
**Target Platform**: Node.js 18+ / Bun 1.x (MCP stdio server)
**Project Type**: Single project (`src/`, `tests/`)
**Performance Goals**: N/A (enum/aggregation change; no new I/O)
**Constraints**: Backward-compatible tool contracts — analytics output change must be additive
only; delete-credential enum must stay a subset of the SDK's `DeleteIdentityCredentialsTypeEnum`
**Scale/Scope**: 4 source files touched, ~3 new unit-test files, no new tools

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. AI-Native Development | PASS | Tool descriptions/error suggestions updated to enumerate the new types; errors stay structured and actionable (FR-002, FR-009). |
| II. Spec-Driven Development | PASS | spec.md → plan.md → tasks.md produced before implementation. |
| III. Contract-First API Design | PASS | Zod schema changes in `src/schemas/tools.ts` defined first; changes map 1:1 to Kratos Admin API enums (no invented abstractions); analytics output change is additive, non-breaking. |
| IV. Operational Excellence | PASS | No logging/error-handling paths removed; existing structured logging untouched. |
| V. Simplicity & YAGNI | PASS | Only `passkey`/`code` added (concrete requirement); `profile`/`saml`/recovery types deliberately excluded; one shared constant replaces four drifting literal lists. |
| VI. Fast Feedback Loops | PASS | Unit tests run without external services in well under 5s. |
| VII. Type Safety & Validation | PASS | `CredentialType` derived from a `const` tuple; Zod enum derived from the same tuple; a unit test asserts the tuple is a subset of the SDK runtime enum. |

**Post-Phase-1 re-check**: PASS — no new violations introduced by the design below.

## Project Structure

### Documentation (this feature)

```text
specs/009-passkey-code-credentials/
├── plan.md              # This file
├── spec.md              # Feature specification
└── tasks.md             # Task breakdown
```

(No separate `research.md`/`data-model.md`/`contracts/`: the research outcome — the SDK enum
verification — is captured below and in spec FR-005; the only data-shape change is the additive
`passwordlessAdoption` field defined contract-first in `src/schemas/tools.ts`.)

### Source Code (repository root)

```text
src/
├── kratos/
│   └── types.ts             # + CREDENTIAL_TYPES const tuple; CredentialType derived from it
├── schemas/
│   └── tools.ts             # DeleteIdentityCredentialInputSchema uses shared tuple;
│                            #   CredentialAnalyticsOutputSchema + passwordlessAdoption
└── tools/
    ├── identity.ts          # delete-credential map/union + includeCredential list + texts
    └── analytics.ts         # passwordless bucket; export aggregation fn for unit testing

tests/
├── setup/
│   ├── global-setup.ts      # skip Kratos preflight for unit-only runs
│   └── test-setup.ts        # skip Kratos context init for tests under tests/unit/
└── unit/                    # NEW — first CI-run unit tests
    ├── credential-types.test.ts   # tuple ↔ SDK enum subset, CredentialType coverage
    ├── schemas.test.ts            # Zod accept/reject for new types; additive output schema
    └── analytics.test.ts          # MFA vs passwordless bucketing rules
```

**Structure Decision**: Existing single-project layout retained. The only structural addition is
`tests/unit/`, which the CI pipeline (003-ci-build-pipeline) already anticipates
(`bun x vitest run --config tests/vitest.config.ts --dir tests/unit`).

## Design Notes

### Research: SDK enum verification (Phase 0)

Verified in `node_modules/@ory/kratos-client/dist/api.d.ts`:

- `DeleteIdentityCredentialsTypeEnum` = `password | oidc | totp | lookup_secret | webauthn |
  code | passkey | profile | saml | link_recovery | code_recovery` — so the delete endpoint
  accepts both new types.
- `GetIdentityIncludeCredentialEnum` has the identical value set — so credential expansion on
  read accepts both new types.
- Decision: support exactly `password, oidc, totp, webauthn, lookup_secret, passkey, code`
  (login credentials only; rationale in spec Assumptions/Clarifications).

### Single source of truth for credential types

`src/kratos/types.ts` gains:

```ts
export const CREDENTIAL_TYPES = [
  "password", "oidc", "totp", "webauthn", "lookup_secret", "passkey", "code",
] as const;
export type CredentialType = (typeof CREDENTIAL_TYPES)[number];
```

- `src/schemas/tools.ts`: `DeleteIdentityCredentialInputSchema.type = z.enum(CREDENTIAL_TYPES)`.
- `src/tools/identity.ts`: `CREDENTIAL_TYPE_MAP` and the `includeCredential` list are derived
  from `CREDENTIAL_TYPES`; the request cast uses the SDK's `DeleteIdentityCredentialsTypeEnum`
  type; error suggestion enumerates `CREDENTIAL_TYPES`.

### Analytics bucketing

- `MFA_CREDENTIAL_TYPES = ["totp", "webauthn", "lookup_secret"]` (unchanged semantics).
- `PASSWORDLESS_CREDENTIAL_TYPES = ["passkey"]` (new).
- `code` participates only in `credentialDistribution`.
- `passwordlessAdoption?: { enabled, disabled }` initialized alongside `mfaAdoption` when
  `includeMfa !== false`; identities without a `credentials` object count as disabled in both.
- `processIdentityForCredentialAnalytics` is exported for direct unit testing (pure function).

### Unit-test enablement (foundational)

`tests/vitest.config.ts` wires `globalSetup`/`setupFiles` that preflight a live Kratos. Unit runs
use the same config with `--dir tests/unit`, so:

- `global-setup.ts`: detect unit-only invocation (`--dir` argument pointing at `tests/unit` in
  `process.argv`) and skip connectivity/auth/version preflight with a log line.
- `test-setup.ts`: skip Kratos context initialization when the current test file lives under
  `tests/unit/` (via Vitest `expect.getState().testPath`).

Integration runs (`bun run test`) are unaffected. This is the minimal change that satisfies the
CI contract already defined by feature 003 without introducing a second Vitest config.

## Complexity Tracking

> No Constitution Check violations — table intentionally empty.
