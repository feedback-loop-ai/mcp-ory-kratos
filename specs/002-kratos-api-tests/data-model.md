# Data Model: Kratos API Compatibility Test Suite

**Feature Branch**: `002-kratos-api-tests`
**Date**: 2026-01-18
**Phase**: 1 - Design

## Entity Overview

This test suite does not introduce persistent data models. Instead, it defines:
1. **Test Configuration** - Settings for test execution
2. **Test Context** - Runtime state for resource tracking
3. **Test Result** - Output structure (provided by Vitest)

## Entities

### TestConfig

**Purpose**: Configuration for test suite execution, loaded from environment variables.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `kratosAdminUrl` | `string` (URL) | Yes | Target Kratos Admin API endpoint |
| `authType` | `"none" \| "api-key" \| "custom-headers"` | Yes | Authentication method |
| `apiKey` | `string` | Conditional | Required when authType is "api-key" |
| `customHeaders` | `Record<string, string>` | Conditional | Required when authType is "custom-headers" |
| `expectedVersion` | `string` | Yes | Expected Kratos version (strict match) |
| `timeoutMs` | `number` | No | Request timeout (default: 30000) |
| `testSchemaId` | `string` | No | Schema ID for test data generation (default: first available) |

**Validation Rules**:
- `kratosAdminUrl` must be a valid URL
- `expectedVersion` must be non-empty
- `apiKey` required if `authType === "api-key"`
- `customHeaders` required if `authType === "custom-headers"`

**Zod Schema**:
```typescript
const TestConfigSchema = z.object({
  kratosAdminUrl: z.string().url(),
  authType: z.enum(["none", "api-key", "custom-headers"]),
  apiKey: z.string().optional(),
  customHeaders: z.record(z.string()).optional(),
  expectedVersion: z.string().min(1),
  timeoutMs: z.number().int().min(1000).default(30000),
}).refine(
  (data) => data.authType !== "api-key" || data.apiKey,
  { message: "apiKey required when authType is api-key" }
).refine(
  (data) => data.authType !== "custom-headers" || data.customHeaders,
  { message: "customHeaders required when authType is custom-headers" }
);
```

### TestContext

**Purpose**: Runtime tracking of created resources, schema management, and cleanup.

| Field | Type | Description |
|-------|------|-------------|
| `identityIds` | `string[]` | IDs of identities created during test run |
| `kratosClient` | `KratosClients` | Initialized Kratos client instance |
| `schemas` | `Map<string, object>` | Cached identity schemas from Kratos |
| `defaultSchemaId` | `string` | Default schema ID for test data generation |

**Methods**:
| Method | Returns | Description |
|--------|---------|-------------|
| `trackIdentity(id)` | `void` | Track an identity for cleanup |
| `cleanup()` | `Promise<CleanupResult>` | Clean up all tracked resources |
| `getSchema(schemaId?)` | `object` | Get a schema by ID or the default |
| `getDefaultSchemaId()` | `string` | Get the default schema ID |

**Lifecycle**:
1. Initialized in `beforeAll` global setup with schema discovery
2. Updated in individual tests when resources created
3. Used in `afterAll` for cleanup

### CachedSchema

**Purpose**: Cached identity schema from Kratos for dynamic test data generation.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Schema identifier |
| `schema` | `object` | JSON Schema definition for identity traits |

### TestFixtures

**Purpose**: Schema-aware test data factories that dynamically generate valid traits.

#### IdentityFixture

| Field | Type | Description |
|-------|------|-------------|
| `schemaId` | `string` | Identity schema ID (from TestContext) |
| `traits` | `object` | Identity traits (dynamically generated from schema) |
| `state` | `"active" \| "inactive"` | Initial identity state |

**Schema-Aware Generation**:
Test fixtures dynamically generate valid traits based on the JSON Schema:
- Parses schema to identify required fields and types
- Generates appropriate values for each field type (string, number, boolean, object)
- Handles format constraints (email, uri, uuid, date)
- Respects required fields and nested object structures

**Example**:
```typescript
// Get schema from context
const schema = ctx.getSchema();
const schemaId = ctx.getDefaultSchemaId();

// Create identity with dynamically generated traits
const testIdentity = createTestIdentityInput(schema, schemaId);
// Result includes all required fields with valid values based on schema
```

## State Transitions

### Test Execution Flow

```
[Config Load] → [Connectivity Check] → [Version Check] → [Auth Check] → [Schema Discovery] → [Run Tests] → [Cleanup]
     │                  │                    │               │                  │                 │            │
     ↓                  ↓                    ↓               ↓                  ↓                 ↓            ↓
  FAIL: Missing     FAIL: Network       FAIL: Version    FAIL: 401/403   FAIL: Cannot       PASS/FAIL   Always runs
  env vars          unreachable         mismatch         auth error      fetch schemas      results
```

### Resource Lifecycle

```
[Test Start] → [Create Identity] → [Perform Operations] → [Record in Context] → [Cleanup]
                     │                                            │
                     └──────────── identityIds.push(id) ──────────┘
```

## Relationships

```
TestConfig ──────────── 1:1 ────────────► KratosClients
    │                                           │
    │                                           │
TestContext ◄──────────────────────────────────┘
    │
    └── identityIds[] ─── References ───► Kratos Identity Resources
        (Sessions auto-deleted with parent identity)
```

## API Response Structures (Reference)

These are the expected response structures from Kratos API, used for test assertions.

### Identity Response
```typescript
interface Identity {
  id: string;
  schema_id: string;
  schema_url: string;
  traits: Record<string, unknown>;
  state: "active" | "inactive";
  state_changed_at?: string;
  created_at: string;
  updated_at: string;
  metadata_public?: Record<string, unknown>;
  metadata_admin?: Record<string, unknown>;
}
```

### Session Response
```typescript
interface Session {
  id: string;
  active: boolean;
  expires_at: string;
  authenticated_at: string;
  authenticator_assurance_level: string;
  authentication_methods?: AuthenticationMethod[];
  identity?: Identity;
  devices?: Device[];
}
```

### Health Response
```typescript
interface HealthStatus {
  status: "ok";
}

interface VersionInfo {
  version: string;
}
```

## Notes

- No database or persistent storage is used by the test suite
- All test data is created in the target Kratos instance and cleaned up after tests
- Test isolation is achieved through unique identifiers (timestamps/UUIDs) in test data
- Identity schemas are discovered at startup and cached for dynamic trait generation
- Test fixtures are schema-agnostic - they work with any Kratos identity schema configuration
