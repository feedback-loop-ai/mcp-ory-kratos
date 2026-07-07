# Feature Specification: Native External-ID Identity Lookup

**Feature Branch**: `008-native-external-id`
**Created**: 2026-07-07
**Status**: Draft
**Input**: User description: "Use native get-identity-by-external-id Admin API endpoint"

## Problem Statement

The `kratos_get_identity_by_external_id` tool currently emulates external-ID lookup by
calling the identity *list* endpoint with a `credentials_identifier` filter and a page
size of 1. This is semantically wrong:

- **What it does today**: `credentials_identifier` matches *credential identifiers* —
  the email address, username, or phone number a person signs in with. It has no
  relationship to the identity's `external_id` field.
- **What it should do**: Kratos 25.4.0 introduced a first-class `external_id` field on
  identities (used to link an identity to a record in an external system) together with
  a native Admin API endpoint, `GET /admin/identities/by/external/{externalId}`, that
  resolves an identity by that field.

Consequences of the current emulation:

1. **Wrong results**: If the supplied value happens to match someone's sign-in
   identifier (e.g., an email), the tool silently returns that identity even though its
   `external_id` may be unset or different — a correctness and potential security issue
   for AI agents acting on the result.
2. **False negatives**: An identity whose `external_id` is set but whose credential
   identifiers don't match the value is never found.
3. **Truncation**: `pageSize: 1` arbitrarily picks the first of possibly several
   partial matches (the list filter also performs partial matching on identifiers).

This feature replaces the emulation with the native endpoint so the tool's behavior
matches its name, description, and the Kratos data model.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Correct Lookup by External ID (Priority: P1)

An AI agent (or operator driving one) integrates Kratos with an external system (CRM,
legacy user store, billing platform) that has its own user IDs. Identities in Kratos
carry that foreign ID in their `external_id` field. The agent calls
`kratos_get_identity_by_external_id` with the external system's ID and receives exactly
the identity whose `external_id` equals that value.

**Why this priority**: This is the tool's sole purpose. Today it returns wrong or
missing results, which can mislead downstream automation (e.g., deleting or patching
the wrong identity).

**Independent Test**: Can be fully tested by invoking the tool with a known external ID
against a mocked (unit) or real (integration) Kratos and asserting that the identity
returned is the one whose `external_id` matches — not one matched by email/username.

**Acceptance Scenarios**:

1. **Given** an identity exists in Kratos with `external_id` = "crm-42", **When** the
   tool is called with `externalId` = "crm-42", **Then** that identity is returned as
   pretty-printed JSON.
2. **Given** an identity exists whose *email* is "user@example.com" but whose
   `external_id` is unset, **When** the tool is called with `externalId` =
   "user@example.com", **Then** the tool reports not-found instead of returning that
   identity (the old emulation would have wrongly returned it).

---

### User Story 2 - Actionable Not-Found Error (Priority: P2)

An agent looks up an external ID that does not correspond to any identity. It receives
a structured, machine-parseable error identifying the failure as a not-found condition
with a remediation suggestion, so it can branch (e.g., create the identity) instead of
misinterpreting the response.

**Why this priority**: Structured errors are required by Constitution Principle I
(AI-Native Development) and IV (Operational Excellence). Not-found is the most common
non-success outcome of a lookup.

**Independent Test**: Call the tool with an unknown external ID against a Kratos (or
mock) that returns HTTP 404 and assert the error payload has `isError: true`, code
`NOT_FOUND`, `kratosStatus: 404`, and a suggestion.

**Acceptance Scenarios**:

1. **Given** no identity has `external_id` = "missing-id", **When** the tool is called
   with `externalId` = "missing-id", **Then** the response has `isError: true` and a
   structured error with code `NOT_FOUND` and HTTP status 404.
2. **Given** Kratos is unreachable, **When** the tool is called, **Then** the response
   is a structured connection error (e.g., `CONNECTION_REFUSED`) with a suggestion —
   not a crash.

---

### User Story 3 - Stable Tool Contract (Priority: P3)

Existing MCP clients already invoke `kratos_get_identity_by_external_id` with an
`externalId` input. After the fix, those clients continue to work without any
configuration or schema change — only the semantics are corrected and the tool
description now tells agents precisely what the tool matches on.

**Why this priority**: Constitution Principle III (Contract-First) requires stable tool
contracts; this is a behavior fix, not an interface change.

**Independent Test**: Assert the tool is still registered under the same name with the
same required `externalId` string input, and that its description references the
identity's `external_id` field rather than generic "external identifier" phrasing.

**Acceptance Scenarios**:

1. **Given** an MCP client configured before this fix, **When** it calls the tool with
   `externalId`, **Then** the call validates and executes without schema errors.
2. **Given** an AI agent reads the tool description, **When** it decides which lookup
   tool to use, **Then** the description makes clear this matches the identity's
   `external_id` field (Kratos >= 25.4), not emails/usernames.

---

### Edge Cases

- What happens when the external ID contains URL-reserved characters (`/`, spaces,
  `%`)? The Kratos client URL-encodes the path parameter; the value is passed through
  verbatim and matched exactly.
- What happens when the external ID is an empty string? Input validation rejects it
  before any API call (`min(1)` constraint, unchanged).
- How does the system handle a Kratos older than 25.4.0 that lacks the endpoint? The
  request returns 404/405 from Kratos and is surfaced as a structured HTTP error with
  the mapped suggestion; no silent fallback to the wrong list-filter emulation.
- What happens on auth failure (401/403)? Mapped to structured `UNAUTHORIZED` /
  `FORBIDDEN` errors by the shared error mapper, same as every other tool.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The `kratos_get_identity_by_external_id` tool MUST resolve identities via
  the native Kratos Admin API get-identity-by-external-ID operation
  (`GET /admin/identities/by/external/{externalId}`), matching solely on the identity's
  `external_id` field.
- **FR-002**: The tool MUST NOT use the identity list endpoint's
  `credentials_identifier` filter (or any other emulation) for external-ID lookup —
  neither as primary path nor as fallback.
- **FR-003**: The tool name (`kratos_get_identity_by_external_id`) and input schema
  (required non-empty string `externalId`) MUST remain unchanged.
- **FR-004**: When no identity matches, the tool MUST return a structured error via the
  shared error mapper with `isError: true`, code `NOT_FOUND`, and `kratosStatus: 404`
  (consistent with `kratos_get_identity`).
- **FR-005**: All other Kratos/network failures MUST pass through the shared error
  mapper, producing structured, actionable errors with the context
  `get_identity_by_external_id`.
- **FR-006**: The tool description MUST state that lookup matches the identity's
  `external_id` field and that the field requires Kratos 25.4.0 or newer, so AI agents
  can select the correct tool.
- **FR-007**: On success, the tool MUST return the full identity object as
  pretty-printed JSON (same output shape as `kratos_get_identity`).
- **FR-008**: The tool MUST log start, success, and failure with the tool name and
  duration, without logging sensitive data (unchanged logging contract).

### Key Entities

- **Identity**: A Kratos identity record; relevant attribute is `external_id`, an
  optional string linking the identity to an external system, unique across all
  identities when set.
- **External ID**: The foreign system's identifier stored on the identity; distinct
  from credential identifiers (email, username, phone) used for sign-in.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A lookup for a value that matches an identity's email but not any
  `external_id` returns not-found (0% false-positive rate for credential-identifier
  collisions, previously 100% in that scenario).
- **SC-002**: A lookup for a set `external_id` returns the matching identity in a
  single API round-trip.
- **SC-003**: 100% of failure modes (404, 401/403, network) produce structured errors
  with a `code`, `message`, and `suggestion` field.
- **SC-004**: Existing MCP client configurations require zero changes after upgrade.
- **SC-005**: Unit tests covering success, not-found, and error mapping pass in CI
  without any live Kratos instance.

## Assumptions

- The deployed `@ory/kratos-client` (^25.4.0) exposes the native operation
  (`IdentityApi.getIdentityByExternalID`) — verified in the installed package typings.
- Target Kratos deployments are 25.4.0+ (the version the project's client and
  integration suite are pinned to); older servers surface a structured HTTP error
  rather than a silent fallback.
- Credential inclusion (`include_credential`) is out of scope: the current tool input
  has no such option, and adding one would be contract creep (Principle V, YAGNI).

## Clarifications

### Session 2026-07-07

No stakeholder was available; ambiguities were resolved as follows, with rationale:

- Q: What should happen on 404 (no identity with that external ID)? → A: Return the
  shared error mapper's structured `NOT_FOUND` error (`kratosStatus: 404`), exactly
  like `kratos_get_identity`. Rationale: consistency across tools (Principle III) and
  actionable structured errors (Principle I); no bespoke error shape needed.
- Q: Keep the old `credentials_identifier` list-filter as a fallback when the native
  endpoint 404s? → A: No fallback. Rationale: the emulation is semantically wrong (it
  matches sign-in identifiers, not `external_id`) and a fallback would reintroduce the
  wrong-identity bug in exactly the cases the fix targets.
- Q: Should the input schema gain an `includeCredential` option now that the native
  endpoint supports it? → A: No. Rationale: contract stability (FR-003) and YAGNI; it
  can be added later as a backward-compatible optional field if a spec requires it.
- Q: How should pre-25.4 Kratos servers be handled? → A: Surface the mapped HTTP error
  (404/405) as-is. Rationale: the project pins client and tests to 25.4.x; silent
  degradation would hide misconfiguration (fail-fast, Principle IV).
- Q: How do unit tests run in CI when `tests/unit/` doesn't exist yet and the shared
  Vitest config performs live-Kratos pre-flight checks? → A: The Vitest config skips
  Kratos-dependent global setup when the run is scoped to `tests/unit` (the exact CI
  invocation), keeping unit tests hermetic per the CI pipeline design (003).
