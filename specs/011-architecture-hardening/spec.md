# Feature Specification: Architecture Hardening & Operator Safety

**Feature Branch**: `011-architecture-hardening`
**Created**: 2026-09-05
**Status**: Draft
**Input**: User description: "Investigate architectural improvement solutions and whether there is a new Kratos release we need to build towards; finalize the quick wins, tool-registration refactor, pagination fixes, hidden Kratos parameters, safety controls, and test/CI improvements."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Operator Pages Through Large Result Sets (Priority: P1)

As a support operator (or the AI agent acting for me), I want every list tool to tell me how to fetch the next page so that I can work through more than one page of identities, sessions, or courier messages instead of being silently limited to the first page.

**Why this priority**: Today the list tools accept a page cursor but never return one, and the filtered session listing only ever inspects the first page while claiming to filter the whole collection. Both defects produce silently incomplete answers, which is the worst failure mode for an AI-driven admin tool.

**Independent Test**: Can be fully tested by listing identities with a page size smaller than the total, observing a next-page cursor in the response, and passing it back to receive different items.

**Acceptance Scenarios**:

1. **Given** more items exist than the requested page size, **When** the operator invokes any list tool, **Then** the response includes a next-page cursor and the item count for that page.
2. **Given** a next-page cursor from a previous response, **When** the operator passes it back, **Then** the next page of items is returned and the cursor is absent on the last page.
3. **Given** a session filter (authentication method, provider, or time range), **When** the operator lists sessions, **Then** the tool scans successive full-size upstream pages up to a page cap, returns all matches found up to the requested page size, reports how many pages were scanned and whether the cap was hit, and returns a resume cursor whenever more pages remain.
4. **Given** an analytics tool scanning many pages, **When** the page cap is reached before the end of the collection, **Then** the result is marked as truncated and includes a cursor to resume from.

---

### User Story 2 - Operator Is Protected From Accidental Destructive Actions (Priority: P1)

As an operator, I want the server to tell clients which tools are read-only and which are destructive, to let me expose only a read-only subset, and to ask for confirmation before running a destructive tool, so that an AI agent cannot delete or suspend accounts without a human in the loop.

**Why this priority**: The server currently exposes delete/disable/update tools with no metadata, no gating, and no confirmation. For a tool that acts on a production identity store, this is the highest-risk gap.

**Independent Test**: Can be fully tested by starting the server in read-only mode and confirming destructive tools are absent from the tool list; and by invoking a destructive tool from a client that supports confirmation prompts, declining, and observing that no change was made.

**Acceptance Scenarios**:

1. **Given** any client, **When** it lists tools, **Then** every tool carries a title and explicit read-only / destructive / idempotent hints.
2. **Given** the server is configured read-only, **When** a client lists tools, **Then** only read-only tools are present and calls to hidden tools are rejected with a protocol error as if the tool did not exist.
3. **Given** the server is configured with a subset of toolsets, **When** a client lists tools, **Then** only tools in those toolsets are present.
4. **Given** a client that supports confirmation prompts, **When** a destructive tool is invoked, **Then** the client is asked to confirm; declining returns a cancelled result and makes no upstream call.
5. **Given** a client that does not support confirmation prompts, or confirmation is disabled by configuration, **When** a destructive tool is invoked, **Then** it proceeds without prompting (the destructive hint still lets such clients gate on their own).

---

### User Story 3 - Operator Inspects Credentials Without Leaking Secrets (Priority: P1)

As an operator, I want to see which credentials an identity has (and, for OIDC, which providers are linked) without password hashes, OIDC tokens, TOTP secrets, or recovery codes being returned to the AI agent, unless I have explicitly opted in.

**Why this priority**: The current `includeCredentials` flag returns every credential type including secret-bearing configuration with no guardrail. Exposure to an LLM context is a security incident waiting to happen (Constitution IV: no sensitive data leakage).

**Independent Test**: Can be fully tested by fetching an identity with credentials included and verifying secret-bearing configuration is replaced by a redaction marker, while identifiers and types remain visible; then enabling the opt-in and verifying the raw configuration is returned.

**Acceptance Scenarios**:

1. **Given** default configuration, **When** an identity is fetched with credential types requested, **Then** secret-bearing credential configuration is redacted while type, identifiers, and version metadata are preserved.
2. **Given** the operator has explicitly enabled credential exposure, **When** the same request is made, **Then** the raw credential configuration is returned.
3. **Given** an operator wants only a subset (e.g. OIDC links), **When** they request specific credential types, **Then** only those types are fetched and returned.

---

### User Story 4 - Operator Uses Admin Capabilities the Server Previously Hid (Priority: P2)

As an operator, I want to search identities by partial identifier, by a set of IDs, or by organization; unlink one specific OIDC provider; import identities with existing password hashes or provider links; suspend/unsuspend an account in one step; and read identity schemas as tools, so that common support and migration jobs can be completed without leaving the MCP client.

**Why this priority**: These are direct pass-throughs of Kratos Admin API parameters that the server already targets; they unlock high-value workflows cheaply but are secondary to correctness and safety.

**Independent Test**: Can be fully tested per capability: a fuzzy identifier search returns matching identities; unlinking with a provider identifier removes exactly that link; an identity created with a hashed password can authenticate; setting state to inactive suspends the account; a schema tool returns the same document as the schema resource.

**Acceptance Scenarios**:

1. **Given** identities whose emails share a prefix, **When** the operator searches with the partial identifier, **Then** all matching identities are returned.
2. **Given** an identity linked to two OIDC providers, **When** the operator unlinks one by its provider identifier, **Then** only that link is removed.
3. **Given** a migration payload with a pre-hashed password and provider link, **When** the operator creates the identity (singly or in a batch), **Then** the credentials are imported.
4. **Given** an active identity, **When** the operator sets its state to inactive with session revocation, **Then** the identity is inactive and has no sessions.
5. **Given** a client that cannot read resources, **When** the operator lists or fetches identity schemas via tools, **Then** the schema documents are returned.
6. **Given** a recovery link/code request with a return URL or flow type, **When** the operator supplies them, **Then** they are forwarded upstream; malformed expiry durations are rejected before any upstream call.

---

### User Story 5 - Maintainer Trusts the Quality Gates (Priority: P2)

As a maintainer, I want unit coverage to be measured truthfully, integration tests to run against a real Kratos in CI, tests to be linted and type-checked, dependencies to be audited automatically, and every tool to be exercised end-to-end through a real MCP client, so that regressions like the silent pagination bug cannot ship again.

**Why this priority**: The coverage gate has been reporting an unknown value on every CI run, 16 of 24 tools had no unit tests, and integration tests exercised the upstream SDK rather than this server. Without trustworthy gates the other stories cannot be kept correct.

**Independent Test**: Can be fully tested by running the unit suite with coverage and observing a real percentage above the threshold; and by running the integration job locally against a containerised Kratos and observing the MCP end-to-end tests pass.

**Acceptance Scenarios**:

1. **Given** the unit test suite, **When** it runs in CI, **Then** a real line/branch coverage percentage is reported and the build fails below the configured threshold.
2. **Given** a pull request, **When** CI runs, **Then** a Kratos instance at the supported version is started in a container and the integration suite (including an MCP stdio end-to-end test) passes against it.
3. **Given** the test sources, **When** lint and type-check run, **Then** tests are included and violations fail the build.
4. **Given** a dependency with a known high-severity vulnerability, **When** CI runs, **Then** the audit step fails.
5. **Given** every registered tool, **When** the unit suite runs, **Then** each tool has at least one test driving it through a real MCP client connection (not a stubbed registration).

---

### User Story 6 - Maintainer Adds a Tool in Minutes (Priority: P3)

As a maintainer, I want a single, small registration contract for tools so that adding or changing a tool touches one place and automatically receives logging, error mapping, structured output, annotations, gating, and confirmation.

**Why this priority**: Roughly 70% of each tool file is duplicated scaffolding; every cross-cutting fix currently requires 24 identical edits. This is a maintainability multiplier for all other stories but delivers no direct operator value.

**Independent Test**: Can be fully tested by adding a trivial tool through the contract and observing it appears in the tool list with annotations, returns structured output, and maps upstream errors — without writing any of that logic.

**Acceptance Scenarios**:

1. **Given** a tool definition (name, title, description, toolset, input/output schema, annotations, handler), **When** it is registered, **Then** all cross-cutting behaviour is applied without per-tool code.
2. **Given** the registration contract, **When** the codebase is measured, **Then** no tool file contains hand-written logging, try/catch, or result-envelope code.

---

### Edge Cases

- What happens when the client's confirmation prompt errors or times out? The tool call fails with a structured error; no upstream call is made.
- What happens when a filtered session scan hits the page cap with fewer matches than requested? The partial matches are returned with `truncated: true` and a resume cursor; the description tells the agent to raise the cap or resume.
- What happens when a page cursor from another Kratos instance or an older run is supplied? Kratos rejects it; the upstream error is mapped to the standard structured error.
- What happens when both the deprecated boolean `includeCredentials` flag and the `includeCredential` list are supplied? The explicit list wins.
- What happens when a filtered session scan collects `pageSize` matches before the collection ends? The matches are returned with `truncated: false` and a `nextPageToken` pointing at the next unscanned upstream page.
- What happens when a client calls a tool hidden by toolset or read-only configuration? The call fails with an MCP protocol error, exactly as if the tool did not exist; no upstream call is made.
- What happens when credential exposure is enabled but no credential types are requested? Nothing is fetched; exposure only affects what is already requested.
- What happens when a batch of identities all fail? The per-item report is returned as data (unchanged from feature 010) and a warning is logged.
- What happens when a toolset name in configuration is unknown? Startup fails with a message listing valid toolsets.
- What happens when the `/version` request to Kratos exceeds the configured timeout? A structured `TIMEOUT` error is returned (previously an unmapped generic error).
- What happens when an operator embeds credentials in the Kratos URL? They are stripped before the URL is logged or reported by the connection resource.
- What happens when analytics is asked for device breakdowns it does not need? Device expansion is skipped to reduce upstream load.

## Requirements *(mandatory)*

### Functional Requirements

**Pagination & scanning**

- **FR-001**: Every list tool (identities, identity sessions, sessions, courier messages, identity schemas) MUST return a next-page cursor when more results exist, and the count of items in the current page.
- **FR-002**: `kratos_list_sessions` with a filter MUST scan successive upstream pages (each at the maximum upstream page size, independent of the requested `pageSize`) until `pageSize` matches are collected, the collection ends, or the page cap is reached; it MUST report pages scanned, `truncated` (true only when the cap stopped the scan), and a resume cursor whenever more upstream pages remain.
- **FR-003**: Analytics tools MUST accept an optional page cap, default to a configurable server-wide cap, and report pages scanned, truncation, and a resume cursor.
- **FR-004**: `kratos_session_analytics` MUST NOT request device expansion when device breakdowns are not requested.
- **FR-005**: `kratos_list_sessions` MUST use the same page-size/page-cursor parameter names as the other list tools (replacing its former `limit` parameter). This is a breaking change to that tool's input contract and MUST be documented.

**Safety & exposure controls**

- **FR-006**: Every tool MUST declare a title and read-only, destructive, idempotent, and open-world hints per the MCP tool annotation vocabulary. Tools that change or remove existing data (update, patch, set state, extend session, disable session, delete identity, delete credential, delete identity sessions) MUST carry the destructive hint; tools that only create new records (create identity, batch create, recovery link/code) MUST be marked non-read-only but not destructive.
- **FR-007**: The server MUST support a configurable list of enabled toolsets (identities, sessions, courier, recovery, health, analytics); tools outside enabled toolsets MUST be hidden from listing and a call to one MUST be rejected with an MCP protocol error (invalid params), indistinguishable in kind from calling a non-existent tool — never a successful result carrying the structured error envelope.
- **FR-008**: The server MUST support a read-only mode in which only tools annotated read-only are exposed; hidden tools are rejected on call exactly as in FR-007.
- **FR-009**: Tools annotated destructive MUST request confirmation from the client via MCP elicitation before performing the action, when the client advertises elicitation support and confirmation is enabled (default). A declined confirmation MUST return a cancelled result (not an error) and MUST NOT call Kratos. Confirmation MUST be applied by the shared registration contract (US6) rather than by each tool, so that a destructive tool cannot omit it; registration of a destructive tool without a confirmation prompt MUST fail.
- **FR-010**: Credential configuration for secret-bearing types (password, OIDC, SAML, TOTP, lookup secrets, WebAuthn, passkey) MUST be replaced by the Redaction Marker in tool output unless credential exposure is explicitly enabled by configuration. Credential type, identifiers, version, and timestamps MUST remain visible.
- **FR-011**: `kratos_get_identity` and `kratos_list_identities` MUST accept `includeCredential`, a list of credential types to include; the former boolean `includeCredentials` flag on `kratos_get_identity` MUST remain accepted as a deprecated alias meaning "all types".
- **FR-012**: The server MUST strip user-info (credentials) from the Kratos URL before logging it or exposing it via the connection resource.
- **FR-013**: Recovery link and code tools MUST describe their output as account-takeover-equivalent secrets and MUST validate the expiry duration format before calling Kratos.

**Kratos capability pass-through**

- **FR-014**: `kratos_list_identities` MUST expose the Kratos filters: exact identifier, similar (fuzzy) identifier, ID list, organization, credential types to include, and read consistency.
- **FR-015**: `kratos_delete_identity_credential` MUST accept every credential type Kratos accepts for deletion and an optional provider identifier for OIDC/SAML unlinking.
- **FR-016**: `kratos_create_identity`, `kratos_update_identity`, and each item of `kratos_batch_patch_identities` MUST accept credential import (password / hashed password, OIDC providers, SAML providers), external ID, organization ID, verifiable addresses, and recovery addresses. This supersedes the "importing identities with credentials" exclusion in feature 010.
- **FR-017**: The server MUST provide `kratos_set_identity_state` to set an identity active/inactive with an option to revoke all of its sessions.
- **FR-018**: The server MUST provide `kratos_list_identity_schemas` and `kratos_get_identity_schema` tools mirroring the existing schema resources.
- **FR-019**: `kratos_create_recovery_link` MUST accept a return-to URL; `kratos_create_recovery_code` MUST accept a flow type.
- **FR-020**: `kratos_update_identity` description MUST state that omitted metadata is cleared (full replacement semantics).

**Structured output & protocol surface**

- **FR-021**: Every tool MUST declare an output schema and return structured content alongside the text rendering; error results MUST keep the existing structured error envelope with the error flag set.
- **FR-022**: The server MUST declare capabilities (tools with list-changed, resources, logging) and provide operator-facing instructions describing ID conventions, pagination, destructive tools, and redaction.
- **FR-023**: The schema-by-ID resource MUST be registered as a URI template with listing and argument completion; resource read failures MUST surface as protocol errors, not as successful reads with an error body.
- **FR-024**: Warning and error log entries MUST be forwarded to the connected client via the MCP logging capability, and the client MUST be able to adjust the server's log level.
- **FR-025**: The server version reported over MCP MUST be the package version.

**Robustness**

- **FR-026**: The direct HTTP path (used for `/version`) MUST honour the configured request timeout and produce errors that map to the same structured error codes as SDK errors.
- **FR-027**: Configuration MUST fail fast with an actionable message on unknown toolset names or malformed custom headers.

**Quality gates & tooling**

- **FR-028**: Unit test coverage MUST be measured over the server sources and enforced at a minimum of 80% lines / 80% functions / 70% branches.
- **FR-029**: CI MUST run an integration job that starts Kratos at the supported version in a container and runs the integration suite, including an end-to-end test that drives the server over stdio through a real MCP client.
- **FR-030**: Every registered tool MUST have unit tests that exercise it through a real MCP client connected in-memory to the real server factory.
- **FR-031**: Lint and type-check MUST cover test sources; CI MUST include a dependency audit failing on high severity; automated dependency update proposals MUST be enabled.
- **FR-032**: The MCP SDK dependency MUST be upgraded to the latest 1.x line (resolving the cross-client response leak advisory) and all deprecated registration APIs (`server.tool`, `server.resource`) MUST be replaced.
- **FR-033**: The package MUST require Node 20+, build before publish, and pin the package manager version.
- **FR-034**: Integration test files MUST run serially against the shared Kratos instance; real environment variables MUST take precedence over the local env file.

### Key Entities

- **Tool Definition**: name, title, description, toolset, input schema, output schema, annotations, handler. The single registration contract.
- **Toolset**: named group of tools (`identities`, `sessions`, `courier`, `recovery`, `health`, `analytics`) used for exposure control.
- **Page Cursor**: opaque, instance-bound continuation token returned as `nextPageToken`, accepted as `pageToken`.
- **Scan Summary**: `pagesScanned`, `truncated`, optional resume `nextPageToken` — attached to any multi-page result.
- **Cancelled Result**: `{ cancelled: true, message }` returned when confirmation is declined.
- **Redaction Marker**: the fixed string `[redacted: set KRATOS_ALLOW_CREDENTIAL_EXPOSURE=1]` replacing secret-bearing credential `config` when exposure is disabled; it names the switch so an agent can tell the operator how to proceed. Absent `config` stays absent.
- **Runtime Flags**: toolsets, read-only, confirm-destructive, allow-credential-exposure, max-scan-pages.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of list tools return a next-page cursor when more results exist; an agent can walk an arbitrarily large collection with no tool other than the list tool itself.
- **SC-002**: A filtered session query over N pages returns every match across all N pages (up to the requested size) — previously only page 1.
- **SC-003**: In read-only mode, zero tools with a non-read-only hint appear in the tool list; with a toolset subset, zero tools outside it appear.
- **SC-004**: With confirmation supported and declined, zero upstream calls are made for destructive tools.
- **SC-005**: With default configuration, zero secret-bearing credential configuration values appear in any tool output.
- **SC-006**: CI reports a real coverage figure ≥ 80% lines (was "Unknown"), and every tool is covered by at least one MCP-client-driven unit test.
- **SC-007**: The integration job passes against Kratos v26.2.0 in CI on every pull request; the run is reproducible locally with a single compose command.
- **SC-008**: `bun audit` reports zero high or critical vulnerabilities.
- **SC-009**: Total source size decreases despite adding three tools and new capabilities (duplication removed).
- **SC-010**: Unit suite completes in under 5 seconds (Constitution VI).

## Assumptions

- Kratos v26.2.0 and `@ory/kratos-client` 26.2.0 remain the ceiling; no newer release exists as of 2026-09-05. Unreleased upstream changes (bulk session management, `deviceauthn` / `identifier_first` credential types, expanded credential import) are explicitly deferred to a future feature.
- The MCP TypeScript SDK 1.30.x supports tool annotations, output schemas, elicitation, resource templates, and the logging capability without a major-version migration; SDK v2 is deferred.
- Clients that do not support elicitation are trusted to honour the destructive hint on their own; the server cannot enforce confirmation for them.
- Kratos keyset page cursors are opaque and bound to the issuing instance; the server never inspects or constructs them.
- Zod remains on the 3.x line (SDK peer range permits 3.25 or 4; Zod 4 is deferred as it requires a separate migration).
- The fail-fast/no-retry decision from feature 001 stands; this feature adds timeouts and error mapping but no retries.

## Clarifications

### Session 2026-09-05

- Q: When a filtered session scan reaches the page cap before collecting the requested number of matches, should it fail, return silently, or return partial with a signal? → A: Return partial results with `truncated: true` and a resume cursor, and instruct the agent in the description to raise `maxPages` or resume. Failing would discard useful work; silence recreates the original bug.
- Q: Should destructive confirmation be enforced for clients without elicitation (i.e. refuse the call)? → A: No. Proceed and rely on the `destructiveHint` annotation, which such clients use for their own prompting. Refusing would make the server unusable from most current clients; `KRATOS_READ_ONLY` exists for environments that need hard enforcement.
- Q: Should credential redaction be per-type configurable or a single switch? → A: A single switch (`KRATOS_ALLOW_CREDENTIAL_EXPOSURE`). Operators either trust the client context with secrets or not; per-type granularity is YAGNI (Constitution V) and the per-request `includeCredential` list already limits scope.
- Q: Should the `limit` parameter of `kratos_list_sessions` be kept as an alias to avoid a breaking change? → A: No. Rename to `pageSize`/`pageToken` for consistency (Constitution III: consistent contracts); document as a breaking change and release as a minor version bump while the package is pre-1.0.
- Q: Should a declined confirmation be an error result or a success result? → A: A success result with `{ cancelled: true }`. Declining is the operator's intended outcome, not a failure; error results would trigger agent retry behaviour.
- Q: Should analytics default page cap be per-tool or server-wide? → A: Server-wide default (`KRATOS_MAX_SCAN_PAGES`, 20) overridable per call via `maxPages`; one knob is simpler and the per-call override covers ad-hoc deep scans.
- Q: Should the scan cap apply to all pages or only to filtered scans? → A: Only to tools that walk multiple pages (filtered session listing, both analytics). Plain list tools fetch exactly one page and hand back the cursor.
- Q: Should the SDK v2 (`@modelcontextprotocol/server`) be adopted now? → A: No. Bump to 1.30.x now (security fix, non-breaking) and adopt the APIs v2 requires (`registerTool`, full Zod objects) so the later hop is mechanical.
- Q: Which tools carry the destructive hint (and therefore trigger confirmation)? → A: Every tool that changes or removes existing data: update, patch, set-state, extend-session, disable-session, delete-identity, delete-credential, delete-identity-sessions. Create tools (create identity, batch create, recovery link/code) are non-read-only but not destructive, so they are hidden in read-only mode yet never prompt.
- Q: How is a call to a hidden tool (disabled toolset or read-only mode) rejected? → A: As an MCP protocol error (invalid params, "tool disabled"), identical in kind to calling a tool that does not exist — not as a successful result carrying the structured error envelope. Hidden tools must be indistinguishable from absent ones.
- Q: In a filtered session scan, what is a "page" and when is the resume cursor returned? → A: Each scanned page is fetched at the maximum upstream page size (100), independent of the requested `pageSize`, which counts matches to return. `nextPageToken` is returned whenever more upstream pages remain (also when `pageSize` matches were collected before the collection ended); `truncated` is true only when the page cap stopped the scan.
- Q: What replaces redacted credential configuration? → A: A fixed, self-describing string that names the configuration switch to enable exposure (`[redacted: set KRATOS_ALLOW_CREDENTIAL_EXPOSURE=1]`), so an agent can tell the operator how to proceed. Not null, not an empty object.
- Q: What is the canonical name of the credential-type list parameter? → A: `includeCredential` (singular, mirroring the Kratos `include_credential` query parameter) on both `kratos_get_identity` and `kratos_list_identities`; the deprecated boolean `includeCredentials` remains only on `kratos_get_identity`.

## Out of Scope

- Streamable HTTP transport and multi-session hosting (stdio remains the only transport).
- MCP prompts.
- Retry/backoff for transient upstream errors (feature 001 fail-fast decision).
- Dockerfile / container image publishing.
- Migration to `@modelcontextprotocol/server` v2 or Zod 4.
- release-please / changelog automation and npm Trusted Publishing enablement (tracked in feature 006).
- Tools for unreleased Kratos capabilities (bulk session management, new credential types, TOTP/WebAuthn/passkey import).
- Per-credential-type exposure policy.
