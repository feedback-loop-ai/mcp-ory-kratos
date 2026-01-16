# Feature Specification: Ory Kratos MCP Server

**Feature Branch**: `001-kratos-mcp-server`
**Created**: 2026-01-14
**Status**: Draft
**Input**: User description: "Create an MCP server for Ory Kratos Admin API supporting business analysts (user behavior analytics) and DevOps/CloudOps personas (administration, error tracking, RCA/MTTR)"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Business Analyst Views User Login Patterns (Priority: P1)

As a business analyst, I want to query user session data to understand login patterns, preferred authentication methods, and device/browser usage so that I can make data-driven decisions about user experience improvements.

**Why this priority**: Understanding user behavior is the primary analytical use case. Session data provides immediate value for business intelligence without requiring deep technical knowledge.

**Independent Test**: Can be fully tested by querying session data for a set of users and receiving aggregated statistics about login methods, devices, and browsers used.

**Acceptance Scenarios**:

1. **Given** an MCP client connected to the server, **When** the analyst requests session statistics for a time period, **Then** the system returns aggregated data showing login counts, authentication methods distribution, and device/browser breakdown.
2. **Given** multiple active sessions exist in Kratos, **When** the analyst queries for active sessions, **Then** the system returns session count with expandable device information.
3. **Given** the analyst wants to understand user retention, **When** they query session durations and frequencies, **Then** the system provides session lifecycle metrics.

---

### User Story 2 - DevOps Investigates User Authentication Issues (Priority: P1)

As a DevOps engineer, I want to quickly find and analyze authentication errors for specific users within a timeline so that I can reduce mean time to resolution (MTTR) when users report login problems.

**Why this priority**: Error investigation is critical for operational excellence and directly impacts user satisfaction. Quick RCA capability is essential for production support.

**Independent Test**: Can be fully tested by searching for a user's identity, retrieving their sessions, and examining courier messages (email/SMS delivery) to identify failed authentication attempts.

**Acceptance Scenarios**:

1. **Given** a user reports login issues, **When** the operator searches by email or external ID, **Then** the system returns the user's identity with recent session activity.
2. **Given** an identity ID is known, **When** the operator queries sessions with error filters, **Then** the system returns sessions including any that were terminated or failed.
3. **Given** authentication involves email/SMS verification, **When** the operator queries courier messages for a user, **Then** the system shows message delivery status and any failures.

---

### User Story 3 - DevOps Manages User Sessions (Priority: P2)

As a DevOps/CloudOps engineer, I want to list, inspect, and revoke user sessions so that I can respond to security incidents or assist users who are locked out.

**Why this priority**: Session management is a core administrative capability that enables security response and user support operations.

**Independent Test**: Can be fully tested by listing sessions for a user, viewing session details, and revoking a specific session.

**Acceptance Scenarios**:

1. **Given** a security incident requires session termination, **When** the operator revokes all sessions for an identity, **Then** all sessions for that user are invalidated and the user must re-authenticate.
2. **Given** a user requests to be logged out of all devices, **When** the operator triggers session revocation, **Then** the system confirms the number of sessions revoked.
3. **Given** an operator needs to extend a session, **When** they request session extension, **Then** the session expiration is updated.

---

### User Story 4 - DevOps Administers User Identities (Priority: P2)

As a DevOps/CloudOps engineer, I want to create, update, and delete user identities so that I can manage user accounts during onboarding, offboarding, or data correction scenarios.

**Why this priority**: Identity lifecycle management is essential for user administration but secondary to analytics and troubleshooting capabilities.

**Independent Test**: Can be fully tested by creating a test identity, updating its traits, and then deleting it.

**Acceptance Scenarios**:

1. **Given** a new employee needs system access, **When** the operator creates an identity with required traits, **Then** the system returns the new identity with a unique ID.
2. **Given** user information needs correction, **When** the operator updates identity traits, **Then** the changes are persisted and reflected in subsequent queries.
3. **Given** an employee leaves the organization, **When** the operator deletes the identity, **Then** the identity and all associated sessions are permanently removed.

---

### User Story 5 - Business Analyst Analyzes Authentication Method Adoption (Priority: P2)

As a business analyst, I want to see which authentication methods (password, social login, passkeys, MFA) users prefer so that I can guide product decisions about authentication options.

**Why this priority**: Authentication method analytics helps optimize the login experience and inform security policy decisions.

**Independent Test**: Can be fully tested by querying credential types across identities and receiving a distribution of authentication methods in use.

**Acceptance Scenarios**:

1. **Given** the organization supports multiple auth methods, **When** the analyst queries credential type distribution, **Then** the system returns counts of password, OIDC, passkey, and other credential types.
2. **Given** MFA adoption is a security goal, **When** the analyst queries for identities with MFA enabled, **Then** the system returns the count and percentage of users with second factors.

---

### User Story 6 - DevOps Generates Recovery Links for Users (Priority: P3)

As a DevOps engineer, I want to generate account recovery links or codes for users who cannot complete self-service recovery so that I can assist them without compromising security.

**Why this priority**: Manual recovery is a fallback capability used less frequently but essential for edge cases where self-service fails.

**Independent Test**: Can be fully tested by generating a recovery link for a test identity and verifying the link format.

**Acceptance Scenarios**:

1. **Given** a user cannot receive recovery emails, **When** the operator generates a recovery link, **Then** the system returns a valid recovery URL that can be communicated through alternative channels.
2. **Given** a recovery code is preferred, **When** the operator generates a recovery code, **Then** the system returns a code that the user can enter manually.

---

### User Story 7 - DevOps Monitors System Health (Priority: P3)

As a DevOps engineer, I want to check the health and version of the Kratos instance so that I can verify the system is operational and running the expected version.

**Why this priority**: Health checks are foundational but typically automated; manual checks are infrequent.

**Independent Test**: Can be fully tested by calling health endpoints and receiving status responses.

**Acceptance Scenarios**:

1. **Given** the system should be operational, **When** the operator checks health status, **Then** the system returns alive and ready status.
2. **Given** version verification is needed, **When** the operator queries version, **Then** the system returns the running Kratos version.

---

### Edge Cases

- What happens when querying sessions for an identity that doesn't exist? System returns appropriate "not found" error.
- How does the system handle pagination for large result sets? Pagination tokens and page sizes are supported for all list operations.
- What happens when attempting to delete a currently active session? The session is invalidated; the user experiences immediate logout.
- How does the system handle Kratos connection failures? Fail fast with detailed error context (HTTP status, error type, endpoint); no automatic retries; client decides whether to retry.
- What happens when the Kratos Admin API requires authentication but credentials are invalid? Authentication error with guidance to check API key configuration.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide MCP tools for querying identity data (list, get by ID, get by external ID)
- **FR-002**: System MUST provide MCP tools for managing identity lifecycle (create, update, patch, delete)
- **FR-003**: System MUST provide MCP tools for listing and querying sessions (all sessions, sessions by identity)
- **FR-004**: System MUST provide MCP tools for session management (disable, extend, delete all for identity)
- **FR-005**: System MUST provide MCP tools for querying courier messages to support delivery troubleshooting
- **FR-006**: System MUST provide MCP tools for generating recovery links and codes
- **FR-007**: System MUST provide MCP tools for health checks and version information
- **FR-008**: System MUST support pagination for all list operations with configurable page size
- **FR-009**: System MUST support expanding session data to include device and identity information
- **FR-010**: System MUST provide human-readable error messages that help diagnose issues
- **FR-011**: System MUST support filtering sessions by active/inactive status
- **FR-012**: System MUST support filtering courier messages by status (queued, sent, failed)
- **FR-013**: System MUST provide server-side aggregation capabilities for session statistics (counts by auth method, device type, browser) returning summarized data ready for analysis
- **FR-014**: System MUST allow querying identities by traits (e.g., email) when supported by Kratos configuration
- **FR-015**: System MUST provide MCP tools for managing identity credentials (delete credential by type)
- **FR-016**: System MUST provide MCP resources for exposing identity schemas
- **FR-017**: System MUST support configurable authentication to Kratos Admin API (none, API key, or custom headers)
- **FR-018**: System MUST provide structured JSON logging with request/response tracing and configurable log levels

### Key Entities

- **Identity**: Represents a user in Kratos with unique ID, traits (profile data), credentials (auth methods), and metadata
- **Session**: Represents an authenticated user session with ID, identity reference, device information, authentication methods used, and expiration
- **Courier Message**: Represents an email or SMS message with recipient, template, status, and delivery timestamps
- **Identity Schema**: JSON schema defining the structure of identity traits for a given identity type
- **Credential**: Authentication credential associated with an identity (password, OIDC, passkey, etc.)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Business analysts can retrieve session analytics for a specified time period in under 5 seconds for up to 10,000 sessions
- **SC-002**: DevOps engineers can locate a user's identity and recent sessions within 3 interactions with the MCP server
- **SC-003**: Session revocation operations complete within 2 seconds
- **SC-004**: System provides clear, actionable error messages for 100% of failure scenarios
- **SC-005**: All list operations support pagination and return results within 3 seconds per page
- **SC-006**: DevOps can identify authentication failures for a user within 5 minutes of starting investigation
- **SC-007**: Business analysts can generate authentication method adoption reports without manual data aggregation
- **SC-008**: System health check responds within 1 second

## Assumptions

- Ory Kratos Admin API is accessible from the network where the MCP server runs
- The MCP server will run in a trusted environment where Admin API access is appropriate (as Kratos Admin API has no built-in authorization)
- Authentication to Kratos Admin API is configurable: no auth (self-hosted with network security), API key (Ory Network), or custom headers (enterprise proxies)
- Session expand parameters (device, identity) are enabled in the Kratos configuration
- The MCP client (e.g., Claude Desktop) handles credential management and secure storage of API keys
- Standard web/mobile app expectations apply for performance unless specified otherwise
- Testing strategy uses mock-based unit/integration tests with mocked Kratos API responses for fast, reliable CI without external dependencies

## Clarifications

### Session 2026-01-14

- Q: Which Kratos deployment scenario should the MCP server target? → A: Both equally (support configurable auth: none, API key, or custom headers)
- Q: What level of observability should be built in? → A: Structured logging (JSON logs with request/response tracing, configurable level)
- Q: Should the MCP server expose batch identity tools for bulk operations? → A: No, single-identity operations only (batch is out of scope)
- Q: Should session statistics aggregation happen server-side or client-side? → A: Server-side (MCP server aggregates and returns summarized statistics)
- Q: Should the MCP server implement retry logic for Kratos API failures? → A: Fail fast (return detailed error immediately, let client decide on retry)
- Q: What testing strategy should be prioritized for this MCP server? → A: Mock-based (unit/integration tests with mocked Kratos API responses)

## Out of Scope

- Frontend/public API endpoints (login, registration, settings flows) - focus is on Admin API only
- Real-time streaming of events or webhooks
- Custom dashboard or visualization UI - the MCP server provides data; visualization is client responsibility
- Multi-tenant Kratos deployments with isolated access - single Kratos instance assumed
- Audit logging within the MCP server itself - Kratos provides its own audit capabilities
- Batch identity operations (bulk create/patch) - single-identity operations only
