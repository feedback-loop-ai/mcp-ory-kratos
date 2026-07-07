# Feature Specification: Batch Identity Operations MCP Tool

**Feature Branch**: `010-batch-patch-identities`
**Created**: 2026-07-07
**Status**: Draft
**Input**: User description: "Add batch identity operations MCP tool"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - DevOps Bulk-Creates Identities During Migration (Priority: P1)

As a DevOps/CloudOps engineer, I want to create many identities in a single operation so that I can migrate users from a legacy system or provision a batch of accounts without issuing one request per user.

**Why this priority**: Bulk provisioning is the primary reason the Kratos batch endpoint exists. Creating identities one-by-one through `kratos_create_identity` is slow and chatty for migrations, and each call is a separate round trip through the MCP client.

**Independent Test**: Can be fully tested by submitting a batch of 2+ identity definitions and verifying that each item in the response reports a created identity ID.

**Acceptance Scenarios**:

1. **Given** an MCP client connected to the server, **When** the operator submits a batch of valid identity definitions, **Then** the system returns one result per submitted item, each containing the action taken and the new identity ID.
2. **Given** a batch where each item includes a client-supplied patch ID, **When** the batch is processed, **Then** each result echoes the corresponding patch ID so results can be correlated with request items.
3. **Given** a batch of N items, **When** the batch completes, **Then** the response includes a summary with total, succeeded, and failed counts.

---

### User Story 2 - DevOps Diagnoses Partial Batch Failures (Priority: P1)

As a DevOps engineer, I want per-item success/failure detail when a batch partially fails so that I can retry or fix only the failed items instead of guessing which users were created.

**Why this priority**: Batch operations are not atomic in Kratos — some items may succeed while others fail (e.g., duplicate email, schema violation). Without faithful per-item error reporting the tool is unsafe for real migrations. Kratos v26.2.0 specifically improved per-item error propagation for this endpoint, and the tool must surface it.

**Independent Test**: Can be fully tested by submitting a batch where one item conflicts with an existing identity and verifying the response marks exactly that item as failed with the Kratos error detail, while other items report success.

**Acceptance Scenarios**:

1. **Given** a batch containing one item that duplicates an existing identity, **When** the batch is processed, **Then** the response marks that item with action `error` and includes the Kratos error payload for it, while all other items report action `create` with their identity IDs.
2. **Given** a partially failed batch, **When** the operator inspects the response, **Then** failed items are identifiable by position (index) and, if provided, by patch ID.
3. **Given** the entire request is rejected by Kratos (e.g., authentication failure), **When** the batch is submitted, **Then** the system returns a structured, actionable error consistent with all other tools.

---

### User Story 3 - Operator Is Protected From Oversized or Empty Batches (Priority: P2)

As an operator (or the AI agent acting on my behalf), I want the tool to reject empty or oversized batches before contacting Kratos so that I get immediate, actionable feedback instead of a confusing upstream failure.

**Why this priority**: Guardrails prevent wasted round trips and protect Kratos from oversized payloads, but they are secondary to the core create/report capability.

**Independent Test**: Can be fully tested by submitting an empty batch and a batch exceeding the cap, and verifying both are rejected with validation errors that state the allowed range.

**Acceptance Scenarios**:

1. **Given** a batch with zero items, **When** the tool is invoked, **Then** input validation rejects the request with a message stating at least one identity is required.
2. **Given** a batch with more than 100 items, **When** the tool is invoked, **Then** input validation rejects the request with a message stating the maximum batch size.
3. **Given** a batch item missing required fields (schema ID or traits), **When** the tool is invoked, **Then** input validation rejects the request identifying the invalid item.

---

### Edge Cases

- What happens when every item in the batch fails? The response reports action `error` for all items with per-item error details and a summary of 0 succeeded; the tool still returns a structured per-item report (the batch request itself succeeded).
- What happens when Kratos is unreachable or authentication fails? The tool returns the standard structured error (`CONNECTION_REFUSED`, `UNAUTHORIZED`, etc.) with actionable suggestions, consistent with all other tools.
- What happens when the caller omits patch IDs? Results are still correlated by array position; the response preserves Kratos's response ordering, which matches request ordering.
- What happens when a caller supplies a non-UUID patch ID? Input validation rejects it (Kratos requires patch IDs to be UUIDs).
- What happens when Kratos enforces its own (smaller) server-side batch limit? The upstream error is mapped and returned in the standard structured error format.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide an MCP tool `kratos_batch_patch_identities` that maps to the Kratos Admin batch identity endpoint (`PATCH /admin/identities`).
- **FR-002**: Each batch item MUST accept the same identity definition fields as `kratos_create_identity` (schema ID, traits, optional state, optional public/admin metadata).
- **FR-003**: Each batch item MUST accept an optional client-supplied patch ID (UUID) that is echoed back in the corresponding result for correlation.
- **FR-004**: System MUST return one result per submitted item, faithfully surfacing the per-item `action` (`create` or `error`), created identity ID, patch ID, and error payload exactly as reported by Kratos.
- **FR-005**: System MUST include a summary (total, succeeded, failed counts) alongside the per-item results.
- **FR-006**: System MUST reject batches with zero items via input validation before contacting Kratos.
- **FR-007**: System MUST reject batches with more than 100 items via input validation before contacting Kratos.
- **FR-008**: System MUST map request-level Kratos failures (network, auth, validation) to the standard structured MCP error format used by all other tools.
- **FR-009**: The tool description MUST state that this is a bulk write (state-changing) operation, that items succeed or fail independently (non-atomic), and MUST document the batch size cap.
- **FR-010**: System MUST log batch operations with the standard structured logging (tool name, duration, batch size) without logging identity traits or other sensitive data.

### Key Entities

- **Identity Patch (request item)**: One unit of work in a batch — an identity definition to create (schema ID, traits, state, metadata) plus an optional correlation patch ID.
- **Identity Patch Result (response item)**: The outcome for one request item — action taken (`create` or `error`), the created identity's ID on success, the echoed patch ID, and the Kratos error payload on failure.
- **Batch Summary**: Aggregate counts (total, succeeded, failed) computed from the per-item results.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An operator can create up to 100 identities in a single tool invocation instead of up to 100 separate `kratos_create_identity` calls.
- **SC-002**: For any partially failed batch, the operator can identify 100% of failed items (by index and patch ID) and the reason for each failure from a single tool response, without follow-up queries.
- **SC-003**: Invalid batches (empty, oversized, malformed items) are rejected with actionable validation messages before any request reaches Kratos.
- **SC-004**: All failure scenarios produce structured, actionable error messages consistent with the existing tool suite.

## Assumptions

- The Kratos Admin API batch endpoint (`PATCH /admin/identities`) is available in the deployed Kratos version (per-item error propagation was improved in Kratos v26.2.0).
- The pinned client SDK (`@ory/kratos-client` 25.4.x) defines the batch request body as a list of patches where each patch supports identity **creation** only; batch deletion is not expressible through this SDK version (see Clarifications).
- Kratos preserves request ordering in the batch response, so index-based correlation is reliable; patch IDs provide explicit correlation when supplied.
- This feature supersedes the "Out of Scope: Batch identity operations" exclusion recorded in spec 001 — that exclusion scoped the initial MVP, not the product permanently.

## Clarifications

### Session 2026-07-07

- Q: Should the tool expose batch delete in addition to batch create? → A: Create-only. The pinned SDK's batch item type (`IdentityPatch` in `@ory/kratos-client` 25.4.0) supports only a `create` payload plus `patch_id`; there is no delete field, and the response action enum is `create | error`. Inventing a delete pass-through would violate Constitution Principle III (tools map cleanly to the SDK/API — no invented abstractions). Batch delete can be added when the SDK exposes it; the tool name mirrors the Kratos operation name (`batchPatchIdentities`) so no rename will be needed.
- Q: What client-side batch size cap should apply? → A: 100 items. Kratos enforces its own server-side batch cap, and 100 matches the maximum page size already used by this server's list tools, keeping limits consistent and responses within reasonable token budgets. The cap is validated client-side for fast, actionable feedback and documented in the tool description.
- Q: How should partial failures be represented — fail the whole tool call or report per item? → A: Report per item. The Kratos endpoint is non-atomic by design; the tool returns a successful result containing a per-item results array (action, identity ID, patch ID, error) plus a summary whenever the batch request itself succeeds, and reserves the tool-level error flag for request-level failures (network/auth/4xx-5xx on the whole request). This surfaces the v26.2.0 per-item error improvements faithfully.
- Q: Should patch IDs be generated automatically when omitted? → A: No. Patch IDs remain optional and caller-supplied (validated as UUIDs, matching Kratos requirements); results always include the item index, so correlation works with or without patch IDs. Auto-generating IDs would add hidden behavior for no gain (Principle V: YAGNI).

## Out of Scope

- Batch identity deletion or batch JSON-Patch updates — not expressible via `@ory/kratos-client` 25.4.x (`IdentityPatch` supports `create` only).
- Client-side chunking of batches larger than 100 items — callers split batches themselves; automatic chunking would hide partial-failure semantics.
- Retry logic for failed items — consistent with the project-wide fail-fast decision (spec 001 clarification).
- Importing identities with credentials (password hashes, OIDC config) — while the underlying `CreateIdentityBody` supports a `credentials` field, `kratos_create_identity` does not expose it, and batch items mirror that tool's input contract exactly.
