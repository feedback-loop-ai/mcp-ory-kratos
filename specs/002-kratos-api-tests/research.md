# Research: Kratos API Compatibility Test Suite

**Feature Branch**: `002-kratos-api-tests`
**Date**: 2026-01-18
**Phase**: 0 - Research

## Research Questions

### RQ-1: What API operations need to be tested?

**Decision**: Test all 19 MCP tool operations mapped from Kratos Admin API

**Findings**: Analysis of `src/tools/*.ts` revealed the following operations:

| Category | Operation | MCP Tool Name | Kratos API |
|----------|-----------|---------------|------------|
| Identity | List | `kratos_list_identities` | `GET /admin/identities` |
| Identity | Get | `kratos_get_identity` | `GET /admin/identities/{id}` |
| Identity | Get by External ID | `kratos_get_identity_by_external_id` | `GET /admin/identities` (filtered) |
| Identity | Create | `kratos_create_identity` | `POST /admin/identities` |
| Identity | Update | `kratos_update_identity` | `PUT /admin/identities/{id}` |
| Identity | Patch | `kratos_patch_identity` | `PATCH /admin/identities/{id}` |
| Identity | Delete | `kratos_delete_identity` | `DELETE /admin/identities/{id}` |
| Identity | Delete Credential | `kratos_delete_identity_credential` | `DELETE /admin/identities/{id}/credentials/{type}` |
| Session | List | `kratos_list_sessions` | `GET /admin/sessions` |
| Session | Get | `kratos_get_session` | `GET /admin/sessions/{id}` |
| Session | List by Identity | `kratos_list_identity_sessions` | `GET /admin/identities/{id}/sessions` |
| Session | Disable | `kratos_disable_session` | `DELETE /admin/sessions/{id}` |
| Session | Extend | `kratos_extend_session` | `PATCH /admin/sessions/{id}/extend` |
| Session | Delete by Identity | `kratos_delete_identity_sessions` | `DELETE /admin/identities/{id}/sessions` |
| Recovery | Create Link | `kratos_create_recovery_link` | `POST /admin/recovery/link` |
| Recovery | Create Code | `kratos_create_recovery_code` | `POST /admin/recovery/code` |
| Courier | List Messages | `kratos_list_courier_messages` | `GET /admin/courier/messages` |
| Courier | Get Message | `kratos_get_courier_message` | `GET /admin/courier/messages/{id}` |
| Health | Alive | `kratos_health_alive` | `GET /health/alive` |
| Health | Ready | `kratos_health_ready` | `GET /health/ready` |
| Health | Version | `kratos_version` | `GET /version` |

**Rationale**: Comprehensive coverage of all MCP tools ensures 100% API compatibility validation per spec requirement SC-001.

### RQ-2: How should test configuration be managed?

**Decision**: Use environment variables loaded from `.env.test.local` file

**Findings**:
- Existing server config (`src/config.ts`) uses environment variables with Zod validation
- Vitest supports `.env` files via `dotenv` or Bun's built-in env loading
- `.gitignore` already exists in project root
- Test config should mirror server config structure for consistency

**Configuration Variables**:
```
KRATOS_ADMIN_URL=http://localhost:4434    # Target Kratos Admin API endpoint
KRATOS_AUTH_TYPE=none|api-key|custom-headers
KRATOS_API_KEY=<key>                      # If auth type is api-key
KRATOS_CUSTOM_HEADERS=<json>              # If auth type is custom-headers
KRATOS_EXPECTED_VERSION=v1.x.x            # Expected Kratos version (strict match)
```

**Rationale**: Reusing server config pattern (FR-001) provides consistency and leverages existing Zod schemas for validation.

### RQ-3: How should fail-fast behavior be implemented?

**Decision**: Use Vitest's `bail` option and custom setup hooks

**Findings**:
- Vitest `bail` configuration stops on first failure: `bail: 1` in config
- `beforeAll` hook in setup file validates connectivity before any tests run
- Connection errors throw immediately with descriptive message per FR-015
- Auth errors (401/403) detected in beforeAll and abort with clear message per FR-016

**Implementation Pattern**:
```typescript
// tests/setup/globalSetup.ts
export async function setup() {
  // 1. Validate config (fail fast on missing env vars)
  // 2. Test connectivity (fail fast on network error)
  // 3. Validate version (fail fast on mismatch)
  // 4. Validate auth (fail fast on 401/403)
}
```

**Rationale**: Early validation prevents wasted test execution time and provides clear diagnostic messages.

### RQ-4: How should test data cleanup work?

**Decision**: Use test fixtures with cleanup in `afterEach`/`afterAll` hooks

**Findings**:
- Tests creating data (identities, sessions) need deterministic cleanup
- Cleanup should run even if tests fail (use `afterAll` with `finally`)
- Track created resources in test context for cleanup
- Use unique prefixes/suffixes for test data to avoid collision

**Implementation Pattern**:
```typescript
// Test context tracks created resources
const testContext = {
  identityIds: [] as string[],
  sessionIds: [] as string[],
};

afterAll(async () => {
  // Cleanup in reverse order of dependency
  for (const id of testContext.identityIds) {
    await kratosClient.identity.deleteIdentity({ id }).catch(() => {});
  }
});
```

**Rationale**: Reliable cleanup per FR-017 and SC-006 ensures tests don't pollute target instance.

### RQ-5: What Vitest patterns work best for API testing?

**Decision**: Use describe blocks per domain, async/await with proper timeouts

**Findings**:
- Vitest native async support with configurable timeouts
- `describe.sequential` ensures ordered execution where needed
- `expect.assertions(n)` validates async error paths
- Custom matchers for response structure validation

**Best Practices**:
1. **Organize by domain**: `describe("Identity API", ...)`, `describe("Session API", ...)`
2. **Test isolation**: Each test creates its own data, cleans up after
3. **Descriptive names**: "should return 404 for non-existent identity"
4. **Error path coverage**: Test both success and expected error cases
5. **Response validation**: Verify structure, not just status codes

**Rationale**: Follows Vitest best practices and aligns with project's existing conventions.

### RQ-6: How should version validation work?

**Decision**: Strict version match with clear error message

**Findings**:
- Spec requires failing immediately on version mismatch (FR-003)
- `kratos_version` tool returns version string
- Version format: `v1.x.x` or similar semver
- Compare full version string, not just major version

**Implementation**:
```typescript
const actualVersion = await getKratosVersion();
const expectedVersion = config.expectedVersion;

if (actualVersion !== expectedVersion) {
  throw new Error(
    `Kratos version mismatch: expected ${expectedVersion}, got ${actualVersion}`
  );
}
```

**Rationale**: Strict matching per spec ensures tests validate against known-compatible API version.

## Alternatives Considered

### Alt-1: Test Configuration via JSON File

**Rejected because**: Environment variables are already the project standard (see `src/config.ts`), and JSON files would introduce a second configuration pattern.

### Alt-2: Mock-based Testing

**Rejected because**: The spec explicitly requires testing against a real Kratos instance for API compatibility validation. Mocks would defeat the purpose.

### Alt-3: Retry Logic for Network Errors

**Rejected because**: Spec requires fail-fast behavior (FR-015). Retries would mask genuine connectivity issues.

### Alt-4: Version Range Matching

**Rejected because**: Spec requires strict version matching (FR-003). Range matching could miss breaking changes within minor versions.

## Dependencies Identified

| Dependency | Version | Purpose |
|------------|---------|---------|
| vitest | ^4.0.x | Test framework (already in devDependencies) |
| @ory/kratos-client | ^25.4.x | Kratos API client (already in dependencies) |
| zod | ^3.25.x | Configuration validation (already in dependencies) |

No new dependencies required - all needed packages already in project.

## Open Questions

*None - all research questions resolved.*
