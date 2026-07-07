# Tasks: Passkey and Code Credential Types

**Input**: Design documents from `/specs/009-passkey-code-credentials/`
**Prerequisites**: plan.md (required), spec.md (required for user stories)

**Tests**: Unit tests are explicitly required by the spec (SC-005) and are included.

**Organization**: Tasks are grouped by user story to enable independent implementation and
testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

## Path Conventions

Single project: `src/`, `tests/` at repository root (per plan.md).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Enable CI-safe unit testing (first unit tests in this repo)

- [X] T001 Make `tests/setup/global-setup.ts` skip Kratos connectivity/auth/version preflight
      when Vitest is invoked with `--dir tests/unit` (unit-only run)
- [X] T002 Make `tests/setup/test-setup.ts` skip Kratos test-context initialization for test
      files located under `tests/unit/` (use `expect.getState().testPath`)

**Checkpoint**: `bun x vitest run --config tests/vitest.config.ts --dir tests/unit` can run
without a live Kratos (will report no tests until Phase 3+ adds them).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Single source of truth for credential types, used by all user stories

- [X] T003 Add `CREDENTIAL_TYPES` const tuple (`password`, `oidc`, `totp`, `webauthn`,
      `lookup_secret`, `passkey`, `code`) to `src/kratos/types.ts` and derive `CredentialType`
      from it (FR-004, FR-005)
- [X] T004 [P] Unit test in `tests/unit/credential-types.test.ts`: `CREDENTIAL_TYPES` is a
      subset of the SDK's runtime `DeleteIdentityCredentialsTypeEnum` values and includes
      `passkey` and `code` (FR-005)

**Checkpoint**: Foundation ready — user story implementation can begin.

---

## Phase 3: User Story 1 - Delete Passkey or Code Credentials (Priority: P1) 🎯 MVP

**Goal**: `kratos_delete_identity_credential` accepts `passkey` and `code`.

**Independent Test**: Schema-validate `{ type: "passkey" }` / `{ type: "code" }` inputs and
verify the mapped credential type passed to the Kratos client.

- [X] T005 [US1] Update `DeleteIdentityCredentialInputSchema` in `src/schemas/tools.ts` to use
      `z.enum(CREDENTIAL_TYPES)` from `src/kratos/types.ts` (FR-001, FR-004)
- [X] T006 [US1] Update `src/tools/identity.ts`: derive `CREDENTIAL_TYPE_MAP` from
      `CREDENTIAL_TYPES`, type the delete request with the SDK's
      `DeleteIdentityCredentialsTypeEnum`, and update the `INVALID_CREDENTIAL_TYPE` suggestion
      and tool description to list all supported types (FR-001, FR-002, FR-009)
- [X] T007 [P] [US1] Unit tests in `tests/unit/schemas.test.ts`: schema accepts `passkey` and
      `code`, still accepts the legacy five, and rejects `profile`/`saml`/unknown types
      (FR-001, FR-002)

**Checkpoint**: US1 fully functional — passkey/code deletable, invalid types rejected.

---

## Phase 4: User Story 2 - View Passkey and Code Credentials (Priority: P2)

**Goal**: `kratos_get_identity` with `includeCredentials: true` expands passkey/code.

**Independent Test**: The `includeCredential` list sent to the Kratos client contains all seven
supported types.

- [X] T008 [US2] Update `kratos_get_identity` in `src/tools/identity.ts` to pass
      `CREDENTIAL_TYPES` as the `includeCredential` list (FR-003)
- [X] T009 [P] [US2] Unit test in `tests/unit/credential-types.test.ts`: `CREDENTIAL_TYPES` is
      also a subset of the SDK's `GetIdentityIncludeCredentialEnum` values (FR-003, FR-005)

**Checkpoint**: US1 and US2 both work independently.

---

## Phase 5: User Story 3 - Passwordless and MFA Adoption Analytics (Priority: P3)

**Goal**: Additive `passwordlessAdoption` metric; MFA semantics unchanged; `code` in neither
bucket.

**Independent Test**: Feed synthetic identities through the exported aggregation function and
assert bucket counts.

- [X] T010 [US3] Add optional `passwordlessAdoption` to `CredentialAnalyticsOutputSchema` in
      `src/schemas/tools.ts` (contract-first, additive) (FR-006, FR-008)
- [X] T011 [US3] Update `src/tools/analytics.ts`: introduce `MFA_CREDENTIAL_TYPES` /
      `PASSWORDLESS_CREDENTIAL_TYPES` constants, populate `passwordlessAdoption` in
      `processIdentityForCredentialAnalytics` and `fetchCredentialAnalytics` (gated by
      `includeMfa`), export `processIdentityForCredentialAnalytics` for testing, and update the
      `kratos_credential_analytics` tool description (FR-006, FR-007, FR-008, FR-009)
- [X] T012 [P] [US3] Unit tests in `tests/unit/analytics.test.ts`: passkey-only identity →
      passwordless enabled + MFA disabled; code-only identity → neither bucket; totp identity →
      MFA enabled; no-credentials identity → disabled in both; `includeMfa: false` → both
      buckets omitted; distribution keys still counted (spec US3 acceptance scenarios)

**Checkpoint**: All user stories independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T013 Run `bun run lint`, `bun x tsc --noEmit`, and
      `bun x vitest run --config tests/vitest.config.ts --dir tests/unit` — all green
      (Quality Gates)

---

## Dependencies & Execution Order

- **Phase 1 (Setup)**: No dependencies — required before any unit test can run in CI
- **Phase 2 (Foundational)**: Blocks all user stories (shared constant)
- **US1 (Phase 3)**: Depends on T003; independent of US2/US3
- **US2 (Phase 4)**: Depends on T003; independent of US1/US3
- **US3 (Phase 5)**: Depends on T003 (constant) only for consistency; schema task T010 before
  implementation task T011; tests T012 after T011 exports the function
- **Phase 6 (Polish)**: After all stories

### Parallel Opportunities

- T004 with T005/T006 (different files)
- T007, T009, T012 in parallel once their story implementation lands
- US1, US2, US3 can proceed in parallel after Phase 2
