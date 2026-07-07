# Feature Specification: Passkey and Code Credential Types

**Feature Branch**: `009-passkey-code-credentials`
**Created**: 2026-07-07
**Status**: Draft
**Input**: User description: "Support passkey and code credential types in tools and analytics"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Delete Passkey or Code Credentials (Priority: P1)

An identity administrator needs to remove a compromised or stale passkey (or a one-time-code
credential) from a user's account via the `kratos_delete_identity_credential` tool, the same way
they already remove TOTP or WebAuthn credentials.

**Why this priority**: This is the only operation that is currently *blocked* — the tool rejects
`passkey` and `code` outright even though the Kratos Admin API accepts them. Administrators of
Kratos deployments using passkey-first or code-based login have no way to remediate credential
issues through this MCP server.

**Independent Test**: Can be fully tested by invoking `kratos_delete_identity_credential` with
`type: "passkey"` (or `"code"`) against an identity and verifying the request is validated,
forwarded to the Kratos Admin API, and the success/error response is returned.

**Acceptance Scenarios**:

1. **Given** an identity with a passkey credential, **When** an agent calls
   `kratos_delete_identity_credential` with `type: "passkey"`, **Then** the input passes schema
   validation and the deletion request is sent to Kratos for the `passkey` credential type.
2. **Given** an identity with a code credential, **When** an agent calls
   `kratos_delete_identity_credential` with `type: "code"`, **Then** the input passes schema
   validation and the deletion request is sent to Kratos for the `code` credential type.
3. **Given** any identity, **When** an agent calls `kratos_delete_identity_credential` with an
   unsupported type (e.g., `"profile"` or a typo), **Then** the tool returns a structured
   validation error listing the supported credential types.

---

### User Story 2 - View Passkey and Code Credentials on an Identity (Priority: P2)

An identity administrator retrieves an identity with `includeCredentials: true` and expects to
see *all* credential types configured on that identity, including passkeys and one-time-code
credentials, not just the legacy five types.

**Why this priority**: Without this, `kratos_get_identity` silently omits passkey/code credential
details, giving administrators an incomplete (and therefore misleading) picture of an identity's
authentication setup. It is P2 because the credential *names* still appear in the identity object;
only the expanded credential detail is missing.

**Independent Test**: Can be tested by calling `kratos_get_identity` with
`includeCredentials: true` and verifying the request to Kratos asks for `passkey` and `code`
credential expansion in addition to the existing five types.

**Acceptance Scenarios**:

1. **Given** an identity with a passkey credential, **When** an agent calls `kratos_get_identity`
   with `includeCredentials: true`, **Then** the request to Kratos includes `passkey` and `code`
   in the credential types to expand.
2. **Given** an identity with only a password credential, **When** the same call is made,
   **Then** behavior is unchanged (the response simply contains the password credential).

---

### User Story 3 - Passwordless and MFA Adoption Analytics (Priority: P3)

A business analyst runs `kratos_credential_analytics` on a deployment that uses passkeys and
one-time-code login. They expect passkey adoption to be visible as a *passwordless* metric, and
they expect MFA adoption numbers to remain trustworthy (not inflated by first-factor passkey
logins).

**Why this priority**: Analytics already count passkey/code in the raw `credentialDistribution`
today (it is derived from credential keys dynamically), so data is not lost — but there is no
adoption metric for passwordless authentication, and the semantics of MFA counting must be
explicitly defined for the new types. P3 because it is an enhancement to reporting, not a blocked
operation.

**Independent Test**: Can be tested by feeding identities with passkey/code credentials through
the credential-analytics aggregation and verifying the passwordless bucket counts passkey holders
while MFA counts remain based on second-factor types only.

**Acceptance Scenarios**:

1. **Given** identities where some have a `passkey` credential, **When** credential analytics run,
   **Then** the output contains a `passwordlessAdoption` bucket where `enabled` equals the number
   of identities holding a passkey credential and `disabled` equals the rest.
2. **Given** an identity whose only second factor is a passkey (no totp/webauthn/lookup_secret),
   **When** credential analytics run, **Then** that identity is NOT counted as MFA-enabled.
3. **Given** an identity with a `code` credential only, **When** credential analytics run,
   **Then** the identity appears in `credentialDistribution.code` but is counted in neither the
   MFA-enabled nor the passwordless-enabled bucket.
4. **Given** an existing consumer of the analytics output, **When** the new output is produced,
   **Then** all previously existing fields (`totalIdentities`, `credentialDistribution`,
   `mfaAdoption`) keep their names, types, and semantics (additive change only).

---

### Edge Cases

- What happens when an agent requests deletion of a credential type Kratos knows but this server
  intentionally excludes (e.g., `profile`, `saml`, `link_recovery`, `code_recovery`)? → Schema
  validation rejects it with a structured error listing supported types; these types are either
  not deletable account credentials (`profile`) or out of scope for this feature.
- What happens when analytics encounter an identity with no `credentials` object at all? →
  Counted as disabled in both `mfaAdoption` and `passwordlessAdoption` (unchanged behavior for
  MFA, mirrored for passwordless).
- What happens when analytics encounter an unknown/future credential type key? → It still appears
  in `credentialDistribution` (dynamic keys), and does not affect MFA/passwordless buckets.
- What happens when `includeMfa: false` is passed to credential analytics? → Both `mfaAdoption`
  and `passwordlessAdoption` are omitted (the flag governs all adoption statistics).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: `kratos_delete_identity_credential` MUST accept `passkey` and `code` as credential
  types, in addition to the existing `password`, `oidc`, `totp`, `webauthn`, `lookup_secret`.
- **FR-002**: `kratos_delete_identity_credential` MUST continue to reject unsupported credential
  types with a structured error that enumerates the supported types (including the new ones).
- **FR-003**: `kratos_get_identity` with `includeCredentials: true` MUST request expansion of
  `passkey` and `code` credentials alongside the existing five types.
- **FR-004**: The server's shared `CredentialType` definition MUST include `passkey` and `code`,
  and there MUST be a single source of truth for the supported credential-type list used by
  schemas and tools (no drifting duplicated literals).
- **FR-005**: The supported credential-type list MUST be a subset of the credential types accepted
  by the installed `@ory/kratos-client` SDK's `DeleteIdentityCredentialsTypeEnum` (verified:
  the SDK accepts `password`, `oidc`, `totp`, `lookup_secret`, `webauthn`, `code`, `passkey`,
  `profile`, `saml`, `link_recovery`, `code_recovery`).
- **FR-006**: `kratos_credential_analytics` MUST report a `passwordlessAdoption` metric counting
  identities that hold a `passkey` credential as enabled and all other identities as disabled.
- **FR-007**: `kratos_credential_analytics` MUST NOT count `passkey` or `code` toward
  `mfaAdoption.enabled`; MFA adoption remains defined by `totp`, `webauthn`, `lookup_secret`.
- **FR-008**: The credential-analytics output change MUST be additive: existing fields keep their
  shape and meaning; `passwordlessAdoption` is a new optional field governed by the existing
  `includeMfa` input flag (no new input parameters).
- **FR-009**: Tool descriptions and error suggestions MUST be updated to mention the new
  credential types so AI agents can discover them (Constitution Principle I).

### Key Entities

- **Credential Type**: The kind of authentication credential attached to an identity. Supported
  set for this server after this feature: `password`, `oidc`, `totp`, `webauthn`,
  `lookup_secret`, `passkey`, `code`.
- **MFA Adoption**: Count of identities holding at least one second-factor credential
  (`totp`, `webauthn`, `lookup_secret`). Unchanged by this feature.
- **Passwordless Adoption**: New metric — count of identities holding at least one first-factor
  passwordless credential (`passkey`).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of credential types deletable via the Kratos Admin API that represent account
  login credentials (`password`, `oidc`, `totp`, `webauthn`, `lookup_secret`, `passkey`, `code`)
  are deletable through `kratos_delete_identity_credential`.
- **SC-002**: `kratos_get_identity` with credentials included requests passkey and code credential
  details for identities that have them (0 silently-omitted credential types from the supported
  set).
- **SC-003**: Credential analytics distinguish passwordless (passkey) adoption from MFA adoption;
  an identity with only password+passkey never increments `mfaAdoption.enabled`.
- **SC-004**: Existing consumers of `kratos_credential_analytics` output parse the new output
  without changes (verified by the unchanged output schema for pre-existing fields).
- **SC-005**: All changes covered by unit tests that run without a live Kratos instance and pass
  in CI.

## Assumptions

- Kratos deployments targeted are 25.x/26.x, matching the installed `@ory/kratos-client`
  (^25.4.0) whose delete/include enums already contain `passkey` and `code`.
- `profile`, `saml`, `link_recovery`, and `code_recovery` credential types remain out of scope:
  `profile` is not a login credential, `saml` is an Ory Network feature, and the recovery types
  are flow markers rather than stored credentials.
- The `credentialDistribution` map already surfaces any credential key dynamically; no change is
  required there.

## Clarifications

### Session 2026-07-07

- Q: Should `passkey` count toward MFA adoption in `kratos_credential_analytics`? → A: No.
  A passkey is a first-factor passwordless method in Kratos (its own `passkey` strategy), not a
  second factor. Counting it as MFA would inflate MFA adoption on passkey-first deployments.
  Instead, passkey adoption is reported in a new, separate `passwordlessAdoption` bucket.
- Q: Should `code` count toward MFA adoption or passwordless adoption? → A: Neither. The Kratos
  `code` strategy can act as a first factor (passwordless email/SMS code login) or as a second
  factor (code MFA), and the stored credential alone does not reveal which mode is configured.
  To keep both metrics honest, `code` is reported only in `credentialDistribution`. This is
  documented in the tool description so analysts know where code-based auth shows up.
- Q: Should the analytics output change be gated by a new input flag? → A: No new input. The
  existing `includeMfa` flag governs adoption statistics as a group (`mfaAdoption` and
  `passwordlessAdoption`), keeping the input contract stable and the output change additive.
- Q: Should `profile`, `saml`, `link_recovery`, `code_recovery` (also present in the SDK delete
  enum) be added too? → A: No. Out of scope per feature description; they are not account login
  credentials (see Assumptions). The list stays a deliberate subset of the SDK enum.
