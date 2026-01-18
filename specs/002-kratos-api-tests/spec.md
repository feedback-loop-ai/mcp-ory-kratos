# Feature Specification: Kratos API Compatibility Test Suite

**Feature Branch**: `002-kratos-api-tests`
**Created**: 2026-01-18
**Status**: Draft
**Input**: User description: "Add a comprehensive test suite with API tests validating 100% compatibility against Ory Kratos API. Use a configurable endpoint for the API endpoint to validate against."

## Clarifications

### Session 2026-01-18

- Q: How should authentication credentials be provided to the test suite? → A: Configuration file with `.gitignore` protection
- Q: How should the test suite behave when the Kratos endpoint is unreachable? → A: Fail fast - abort all tests immediately with connection error
- Q: Which test framework should be used for the API compatibility tests? → A: Vitest (already in project stack)
- Q: How should the test suite handle Kratos version differences? → A: Strict - fail if version doesn't match expected
- Q: How should the test suite handle authentication failures (401/403 errors)? → A: Fail fast - abort immediately with clear auth error message

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Configure Test Target Endpoint (Priority: P1)

A developer setting up the test suite needs to specify which Kratos instance to validate against. This allows testing against local development instances, staging environments, or production systems without modifying test code.

**Why this priority**: Without endpoint configuration, no tests can run. This is the foundational capability that enables all other testing functionality.

**Independent Test**: Can be fully tested by configuring an endpoint URL and verifying the test suite recognizes and uses that endpoint for subsequent test runs.

**Acceptance Scenarios**:

1. **Given** a developer has the test suite installed, **When** they provide a Kratos API endpoint URL via configuration, **Then** all tests use that endpoint for validation.
2. **Given** a developer has not configured an endpoint, **When** they attempt to run tests, **Then** the system provides a clear error message indicating configuration is required.
3. **Given** a developer provides an invalid endpoint URL, **When** they run tests, **Then** the system validates the URL format and reports configuration errors before test execution begins.

---

### User Story 2 - Run Identity Management Tests (Priority: P1)

A developer needs to verify that all identity management operations work correctly against the configured Kratos instance. This includes creating, reading, updating, and deleting identities.

**Why this priority**: Identity management is the core functionality of Kratos. Validating these operations ensures fundamental compatibility.

**Independent Test**: Can be fully tested by running the identity test suite against a Kratos instance and verifying all CRUD operations succeed with expected responses.

**Acceptance Scenarios**:

1. **Given** a valid Kratos endpoint is configured, **When** the developer runs identity management tests, **Then** all identity listing operations are validated for correct response structure.
2. **Given** a valid Kratos endpoint is configured, **When** the developer runs identity management tests, **Then** identity creation operations are validated with proper data handling.
3. **Given** a valid Kratos endpoint is configured, **When** the developer runs identity management tests, **Then** identity retrieval by ID returns expected identity data.
4. **Given** a valid Kratos endpoint is configured, **When** the developer runs identity management tests, **Then** identity update operations correctly modify identity data.
5. **Given** a valid Kratos endpoint is configured, **When** the developer runs identity management tests, **Then** identity deletion operations successfully remove identities.

---

### User Story 3 - Run Session Management Tests (Priority: P1)

A developer needs to verify that all session management operations work correctly. This includes listing, retrieving, extending, and revoking sessions.

**Why this priority**: Session management is critical for authentication flows. Validating these operations ensures the MCP server correctly proxies session-related requests.

**Independent Test**: Can be fully tested by running the session test suite and verifying all session operations produce expected results.

**Acceptance Scenarios**:

1. **Given** a valid Kratos endpoint is configured, **When** the developer runs session tests, **Then** session listing operations return properly formatted session data.
2. **Given** a valid Kratos endpoint is configured, **When** the developer runs session tests, **Then** individual session retrieval returns complete session details.
3. **Given** a valid Kratos endpoint is configured, **When** the developer runs session tests, **Then** session extension operations successfully extend session lifetime.
4. **Given** a valid Kratos endpoint is configured, **When** the developer runs session tests, **Then** session revocation operations successfully invalidate sessions.

---

### User Story 4 - Run Recovery Flow Tests (Priority: P2)

A developer needs to verify that account recovery operations work correctly, including generating recovery links and codes.

**Why this priority**: Recovery flows are important for user self-service but are used less frequently than identity and session management.

**Independent Test**: Can be fully tested by running recovery tests and verifying link and code generation produces valid, usable recovery artifacts.

**Acceptance Scenarios**:

1. **Given** a valid Kratos endpoint and an existing identity, **When** the developer runs recovery tests, **Then** recovery link generation produces a valid link.
2. **Given** a valid Kratos endpoint and an existing identity, **When** the developer runs recovery tests, **Then** recovery code generation produces a valid code.

---

### User Story 5 - Run Courier Message Tests (Priority: P2)

A developer needs to verify that courier message operations work correctly, including listing and retrieving messages.

**Why this priority**: Courier operations are important for debugging email/SMS delivery but are secondary to core identity management.

**Independent Test**: Can be fully tested by running courier tests and verifying message listing and retrieval return properly structured data.

**Acceptance Scenarios**:

1. **Given** a valid Kratos endpoint is configured, **When** the developer runs courier tests, **Then** message listing returns properly formatted message data.
2. **Given** a valid Kratos endpoint is configured, **When** the developer runs courier tests, **Then** individual message retrieval returns complete message details.

---

### User Story 6 - Run Health Check Tests (Priority: P3)

A developer needs to verify that Kratos health and version endpoints work correctly.

**Why this priority**: Health checks are utility operations that are useful but not core to the MCP server's primary functionality.

**Independent Test**: Can be fully tested by running health tests and verifying alive, ready, and version endpoints respond correctly.

**Acceptance Scenarios**:

1. **Given** a valid Kratos endpoint is configured, **When** the developer runs health tests, **Then** the alive endpoint returns expected status.
2. **Given** a valid Kratos endpoint is configured, **When** the developer runs health tests, **Then** the ready endpoint returns expected status.
3. **Given** a valid Kratos endpoint is configured, **When** the developer runs health tests, **Then** the version endpoint returns version information.

---

### User Story 7 - View Test Results Report (Priority: P2)

A developer needs to see a clear summary of test results after running the test suite, including which tests passed, which failed, and why.

**Why this priority**: Clear reporting is essential for developers to understand compatibility status and diagnose issues.

**Independent Test**: Can be fully tested by running any subset of tests and verifying the results report clearly shows pass/fail status with details for failures.

**Acceptance Scenarios**:

1. **Given** tests have been executed, **When** the test run completes, **Then** a summary shows total tests, passed count, and failed count.
2. **Given** some tests have failed, **When** viewing the results report, **Then** each failure includes the test name, expected result, and actual result.
3. **Given** all tests have passed, **When** viewing the results report, **Then** a clear success message confirms 100% compatibility.

---

### Edge Cases

- **Unreachable endpoint**: Test suite fails fast and aborts all tests immediately with a clear connection error message.
- **Authentication failure**: Test suite fails fast and aborts immediately on 401/403 errors with a clear authentication error message.
- **Version mismatch**: Test suite fails immediately if detected Kratos version doesn't match the expected version, displaying the version difference.
- **Partial API availability**: When some Kratos endpoints return errors (5xx) while others work, the test suite continues execution and reports individual endpoint failures in the final summary. Tests for unavailable endpoints are marked as failed with the specific error, not skipped.
- **Interrupted execution (SIGINT/SIGTERM)**: When tests are interrupted mid-execution, the cleanup hook still runs to delete any test data created before interruption. Partial results are displayed showing completed tests. No partial test results are reported for the interrupted test.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST accept a configurable Kratos API endpoint URL and optional authentication credentials via a configuration file (protected by `.gitignore`).
- **FR-002**: System MUST validate the endpoint URL format before running tests.
- **FR-003**: System MUST verify Kratos version matches expected version before running tests; fail immediately with version mismatch details if different.
- **FR-004**: System MUST test all identity management operations (list, get, create, update, patch, delete).
- **FR-005**: System MUST test all session management operations (list, get, extend, revoke, list by identity, delete by identity).
- **FR-006**: System MUST test all recovery flow operations (create recovery link, create recovery code).
- **FR-007**: System MUST test all courier message operations (list messages, get message).
- **FR-008**: System MUST test health check operations (alive, ready, version).
- **FR-009**: System MUST test credential operations (get identity credentials, delete credential).
- **FR-010**: System MUST report test results with clear pass/fail status for each test case.
- **FR-011**: System MUST provide detailed error information when tests fail, including expected vs actual results.
- **FR-012**: System MUST support running individual test categories (e.g., only identity tests) or all tests.
- **FR-013**: System MUST provide a summary report showing overall compatibility percentage.
- **FR-014**: System MUST handle network errors gracefully and report them distinctly from test failures.
- **FR-015**: System MUST fail fast and abort all tests immediately when the Kratos endpoint is unreachable, displaying a clear connection error.
- **FR-016**: System MUST fail fast and abort all tests immediately on authentication failures (401/403), displaying a clear authentication error message.
- **FR-017**: System MUST clean up any test data created during test execution to avoid polluting the target Kratos instance. Cleanup MUST delete all created identities. Sessions are automatically invalidated when their parent identity is deleted; explicit session cleanup is not required.

### Key Entities

- **Test Case**: Represents a single API compatibility test with name, category, expected behavior, and pass/fail status.
- **Test Suite**: A collection of related test cases grouped by API domain (identities, sessions, recovery, courier, health).
- **Test Configuration**: Settings for test execution stored in a configuration file (`.gitignore`-protected), including target endpoint URL and optional authentication credentials.
- **Test Result**: The outcome of a test case execution including status, duration, and error details if applicable.
- **Test Report**: Aggregated results from all executed test cases with summary statistics.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of Kratos Admin API endpoints exposed by the MCP server have corresponding test cases.
- **SC-002**: Developers can configure and run the full test suite in under 5 minutes on first setup.
- **SC-003**: Test results clearly indicate pass/fail status with zero ambiguity - each test either passes or fails with a specific reason.
- **SC-004**: Failed tests provide enough detail that a developer can diagnose the issue without additional debugging in 90% of cases.
- **SC-005**: Test suite execution completes within 2 minutes against a healthy Kratos instance.
- **SC-006**: Test data cleanup succeeds in 100% of test runs, leaving no orphan data in the target Kratos instance.
- **SC-007**: Running tests against a known-compatible Kratos version results in 100% pass rate.

## Technical Constraints

- Test framework: Vitest (aligned with existing project stack).
- Runtime: Bun 1.x.
- Language: TypeScript 5.x (strict mode).
- Expected Kratos version: Must be specified in configuration; tests fail if target instance version differs.

## Assumptions

- The target Kratos instance is running and accessible from where the tests are executed.
- The Kratos Admin API is available (not just the Public API).
- Test execution has sufficient permissions to perform all admin operations on the target Kratos instance.
- Network connectivity between the test runner and Kratos instance is stable.
- The Kratos instance has at least one identity schema configured and accessible via the schemas endpoint.
- The test suite dynamically discovers and adapts to the configured identity schema (no hardcoded trait requirements).

## Out of Scope

- Testing Kratos Public API endpoints (only Admin API is tested).
- Performance/load testing of the Kratos instance.
- Testing Kratos UI flows or browser-based interactions.
- Testing custom Kratos extensions or plugins.
- Automated deployment or provisioning of Kratos instances for testing.
