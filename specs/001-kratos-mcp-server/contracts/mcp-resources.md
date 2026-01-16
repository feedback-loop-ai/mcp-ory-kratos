# MCP Resources Contract: Ory Kratos MCP Server

**Date**: 2026-01-14
**Feature**: 001-kratos-mcp-server

This document defines the MCP resources exposed by the server. Resources provide read-only data access following the MCP protocol specification.

---

## Schema Resources

### kratos://schemas

List all available identity schemas.

**URI Pattern**: `kratos://schemas`

**MIME Type**: `application/json`

**Content**:
```json
{
  "schemas": [
    {
      "id": "default",
      "url": "file://path/to/schema.json"
    },
    {
      "id": "employee",
      "url": "file://path/to/employee.json"
    }
  ]
}
```

**Use Case**: Discover available identity schemas before creating identities.

---

### kratos://schemas/{schema_id}

Get a specific identity schema definition.

**URI Pattern**: `kratos://schemas/{schema_id}`

**Parameters**:
- `schema_id` (string): Schema identifier

**MIME Type**: `application/json`

**Content**: JSON Schema document defining identity traits structure

**Example**:
```json
{
  "$id": "https://example.com/schemas/default.json",
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Default Identity Schema",
  "type": "object",
  "properties": {
    "traits": {
      "type": "object",
      "properties": {
        "email": {
          "type": "string",
          "format": "email",
          "title": "Email"
        },
        "name": {
          "type": "object",
          "properties": {
            "first": { "type": "string" },
            "last": { "type": "string" }
          }
        }
      },
      "required": ["email"]
    }
  }
}
```

**Use Case**: Understand trait structure before creating/updating identities.

---

## Configuration Resources

### kratos://config/connection

Get current Kratos connection configuration (non-sensitive).

**URI Pattern**: `kratos://config/connection`

**MIME Type**: `application/json`

**Content**:
```json
{
  "base_url": "http://localhost:4434",
  "auth_type": "api-key",
  "timeout_ms": 30000,
  "connected": true,
  "kratos_version": "v1.2.0"
}
```

**Note**: API keys and sensitive headers are NOT exposed.

**Use Case**: Verify MCP server configuration and connectivity.

---

## Resource Discovery

The server implements the MCP `resources/list` method to enumerate all available resources:

```json
{
  "resources": [
    {
      "uri": "kratos://schemas",
      "name": "Identity Schemas",
      "description": "List all available identity schemas",
      "mimeType": "application/json"
    },
    {
      "uri": "kratos://schemas/{schema_id}",
      "name": "Identity Schema",
      "description": "Get specific identity schema by ID",
      "mimeType": "application/json",
      "uriTemplate": true
    },
    {
      "uri": "kratos://config/connection",
      "name": "Connection Config",
      "description": "Current Kratos connection configuration",
      "mimeType": "application/json"
    }
  ]
}
```

---

## Error Handling

Resources return errors in the MCP error format:

| Error | Description |
|-------|-------------|
| `resource_not_found` | URI does not match any resource |
| `schema_not_found` | Requested schema ID does not exist |
| `kratos_connection_error` | Cannot connect to Kratos |
