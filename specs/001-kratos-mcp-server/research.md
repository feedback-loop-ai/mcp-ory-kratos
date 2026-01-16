# Research: Ory Kratos MCP Server

**Date**: 2026-01-14
**Feature**: 001-kratos-mcp-server

## Research Tasks Completed

### 1. MCP SDK for TypeScript

**Decision**: Use `@modelcontextprotocol/sdk` ^1.25.x with Zod for schema validation

**Rationale**:
- Official Anthropic-maintained SDK for Model Context Protocol
- TypeScript-first with strong typing
- Zod integration for runtime validation and schema generation
- Supports stdio transport (required for Claude Desktop integration)
- Well-documented with examples

**Alternatives Considered**:
- Raw JSON-RPC implementation: Rejected due to significant boilerplate and lack of MCP protocol compliance
- Python SDK: Rejected as TypeScript aligns better with Ory SDK ecosystem

**Key Patterns**:
- Tools defined with `setRequestHandler(CallToolRequestSchema, ...)`
- Resources defined with `setRequestHandler(ReadResourceRequestSchema, ...)`
- Use `console.error()` for logging (stdout reserved for MCP protocol)
- Zod schemas for input validation with `.describe()` annotations

### 2. Ory Kratos TypeScript SDK

**Decision**: Use `@ory/kratos-client` (auto-generated from OpenAPI spec)

**Rationale**:
- Official Ory-maintained SDK
- TypeScript definitions included
- Auto-generated from OpenAPI ensures API parity
- Provides typed API classes: IdentityApi, FrontendApi (Admin via configuration)

**Alternatives Considered**:
- Direct HTTP calls with fetch: Rejected due to loss of typing and manual response parsing
- @ory/client (unified): Could work but kratos-client is more focused

**Key Patterns**:
- Configure base URL for Admin API (default port 4434)
- Use axios interceptors for custom headers/auth
- Identity, Session, and Courier operations via typed methods

### 3. Authentication Strategy

**Decision**: Support three authentication modes via configuration

| Mode | Use Case | Implementation |
|------|----------|----------------|
| None | Self-hosted with network security | No auth headers |
| API Key | Ory Network | `Authorization: Bearer {key}` header |
| Custom Headers | Enterprise proxies | Configurable header name/value |

**Rationale**: Clarification session confirmed both self-hosted and Ory Network must be supported equally.

**Implementation**:
```typescript
interface KratosConfig {
  baseUrl: string;
  auth:
    | { type: 'none' }
    | { type: 'api-key'; key: string }
    | { type: 'custom-headers'; headers: Record<string, string> };
}
```

### 4. Structured Logging

**Decision**: Use console.error with JSON formatting (Bun-native approach)

**Rationale**:
- Zero dependencies (aligns with Constitution V: Simplicity)
- Bun's console is highly optimized
- Output to stderr (required for MCP stdio servers)
- Configurable log levels (debug, info, warn, error)
- Request/response correlation via correlation IDs

**Alternatives Considered**:
- pino: Adds dependency, over-engineering for v1
- winston: Heavier, more features than needed
- bunyan: Less active maintenance

**Key Patterns**:
```typescript
interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  correlationId: string;
  tool?: string;
  kratosEndpoint?: string;
  durationMs?: number;
  message: string;
}

class Logger {
  log(entry: LogEntry) {
    console.error(JSON.stringify(entry));
  }
}
```

**Sensitive Data Protection**: Never log request/response bodies containing credentials, tokens, or PII traits.

### 5. Testing Strategy

**Decision**: Vitest for unit and integration tests

**Rationale**:
- Native ESM support (matches MCP SDK)
- Fast execution with watch mode
- Jest-compatible API
- Built-in mocking

**Test Categories**:
| Category | Purpose | Mocking |
|----------|---------|---------|
| Unit | Tool handlers, config parsing | Mock Kratos client |
| Integration | Full tool execution | Mock HTTP responses |
| Contract | Verify MCP protocol compliance | MCP test utilities |

### 6. Kratos Admin API Endpoints Mapping

Based on OpenAPI research, here's the endpoint-to-tool mapping:

| Tool Name | Kratos Endpoint | FR |
|-----------|-----------------|-----|
| `kratos_list_identities` | GET /admin/identities | FR-001 |
| `kratos_get_identity` | GET /admin/identities/{id} | FR-001 |
| `kratos_get_identity_by_external_id` | GET /admin/identities/by/external/{id} | FR-001 |
| `kratos_create_identity` | POST /admin/identities | FR-002 |
| `kratos_update_identity` | PUT /admin/identities/{id} | FR-002 |
| `kratos_patch_identity` | PATCH /admin/identities/{id} | FR-002 |
| `kratos_delete_identity` | DELETE /admin/identities/{id} | FR-002 |
| `kratos_delete_identity_credential` | DELETE /admin/identities/{id}/credentials/{type} | FR-015 |
| `kratos_list_sessions` | GET /admin/sessions | FR-003 |
| `kratos_list_identity_sessions` | GET /admin/identities/{id}/sessions | FR-003 |
| `kratos_get_session` | GET /admin/sessions/{id} | FR-003 |
| `kratos_disable_session` | DELETE /admin/sessions/{id} | FR-004 |
| `kratos_extend_session` | PATCH /admin/sessions/{id}/extend | FR-004 |
| `kratos_delete_identity_sessions` | DELETE /admin/identities/{id}/sessions | FR-004 |
| `kratos_list_courier_messages` | GET /admin/courier/messages | FR-005 |
| `kratos_get_courier_message` | GET /admin/courier/messages/{id} | FR-005 |
| `kratos_create_recovery_link` | POST /admin/recovery/link | FR-006 |
| `kratos_create_recovery_code` | POST /admin/recovery/code | FR-006 |
| `kratos_health_alive` | GET /health/alive | FR-007 |
| `kratos_health_ready` | GET /health/ready | FR-007 |
| `kratos_version` | GET /version | FR-007 |
| `kratos_list_schemas` | GET /schemas | FR-016 |
| `kratos_get_schema` | GET /schemas/{id} | FR-016 |
| `kratos_session_analytics` | Custom aggregation | FR-013 |

### 7. Pagination Pattern

**Decision**: Cursor-based pagination with `pageToken` and `pageSize` parameters

**Rationale**: Aligns with Kratos API pagination model

**Implementation**:
```typescript
interface PaginationParams {
  pageSize?: number;  // Default 20, max 100
  pageToken?: string; // Cursor for next page
}

interface PaginatedResponse<T> {
  items: T[];
  nextPageToken?: string;
  totalCount?: number; // When available
}
```

### 8. Session Statistics Aggregation

**Decision**: Server-side aggregation with in-memory processing of paginated session data

**Rationale**: FR-013 requires server-side aggregation. Kratos Admin API does not provide built-in aggregation endpoints.

**Implementation**:
```typescript
interface SessionStats {
  totalSessions: number;
  activeSessions: number;
  byAuthMethod: Record<string, number>;
  byDeviceType: Record<string, number>;
  byBrowser: Record<string, number>;
}

// Fetch sessions with pagination, aggregate in memory
// For 10k sessions at 250/page = 40 API calls
// At ~100ms/call = ~4s total, within SC-001 target (<5s)
```

**Alternatives Considered**:
- Client-side aggregation: Rejected per FR-013 requirement
- Database direct access: Rejected - violates stateless proxy principle

### 9. Error Handling Strategy

**Decision**: Structured error mapping with categories and actionable suggestions

**Rationale**: FR-010 requires human-readable, actionable error messages. Constitution I requires structured, actionable responses for AI agents.

**Implementation**:
```typescript
interface McpError {
  code: string;           // e.g., 'IDENTITY_NOT_FOUND'
  message: string;        // Human-readable description
  kratosStatus?: number;  // Original HTTP status
  suggestion?: string;    // Actionable guidance
}

const errorMap = {
  404: { code: 'NOT_FOUND', suggestion: 'Verify the ID is correct and the resource exists' },
  401: { code: 'UNAUTHORIZED', suggestion: 'Check KRATOS_API_KEY configuration' },
  409: { code: 'CONFLICT', suggestion: 'Resource may already exist or have conflicting state' }
};
```

### 10. MCP Tool Registration Pattern

**Decision**: Use `server.registerTool()` with Zod schema objects from MCP SDK v1.25.x

**Rationale**: Official pattern from MCP TypeScript SDK with full TypeScript inference.

**Key Pattern**:
```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as z from 'zod';

const server = new McpServer({ name: 'kratos-mcp', version: '1.0.0' });

server.registerTool(
  'get-identity',
  {
    title: 'Get Identity',
    description: 'Retrieve an identity by ID from Kratos Admin API',
    inputSchema: {
      identityId: z.string().uuid().describe('The UUID of the identity')
    },
    outputSchema: {
      id: z.string(),
      traits: z.record(z.unknown())
    }
  },
  async ({ identityId }) => {
    const result = await kratosClient.getIdentity(identityId);
    return {
      content: [{ type: 'text', text: JSON.stringify(result) }],
      structuredContent: result
    };
  }
);
```

## References

- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [MCP SDK NPM](https://www.npmjs.com/package/@modelcontextprotocol/sdk)
- [Ory Kratos SDK Overview](https://www.ory.com/docs/kratos/sdk/overview)
- [Ory Kratos Admin API](https://www.ory.com/docs/kratos/reference/api)
- [Bun Runtime](https://bun.sh/)
- [Vitest](https://vitest.dev/)
- [Biome](https://biomejs.dev/)

## Unresolved Items

None. All technical decisions resolved through research.
