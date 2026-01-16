# MCP Tools Contract: Ory Kratos MCP Server

**Date**: 2026-01-14
**Feature**: 001-kratos-mcp-server

This document defines the MCP tools exposed by the server. Each tool follows the MCP protocol specification.

---

## Identity Tools

### kratos_list_identities

List identities with optional filtering and pagination.

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "page_size": {
      "type": "integer",
      "minimum": 1,
      "maximum": 100,
      "default": 20,
      "description": "Number of identities per page"
    },
    "page_token": {
      "type": "string",
      "description": "Cursor for pagination"
    },
    "credentials_identifier": {
      "type": "string",
      "description": "Filter by credential identifier (e.g., email)"
    }
  }
}
```

**Output**: List of Identity objects with pagination info

**Errors**:
- `kratos_connection_error`: Cannot reach Kratos API
- `kratos_auth_error`: Authentication failed

---

### kratos_get_identity

Get a single identity by ID.

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "format": "uuid",
      "description": "Identity UUID"
    },
    "include_credentials": {
      "type": "boolean",
      "default": false,
      "description": "Include credential information (admin only)"
    }
  },
  "required": ["id"]
}
```

**Output**: Single Identity object

**Errors**:
- `identity_not_found`: Identity with given ID does not exist

---

### kratos_get_identity_by_external_id

Get identity by external identifier.

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "external_id": {
      "type": "string",
      "description": "External identifier"
    }
  },
  "required": ["external_id"]
}
```

**Output**: Single Identity object

**Errors**:
- `identity_not_found`: No identity with given external ID

---

### kratos_create_identity

Create a new identity.

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "schema_id": {
      "type": "string",
      "description": "Identity schema to use"
    },
    "traits": {
      "type": "object",
      "description": "Identity traits (must match schema)"
    },
    "state": {
      "type": "string",
      "enum": ["active", "inactive"],
      "default": "active"
    },
    "metadata_public": {
      "type": "object",
      "description": "Public metadata"
    },
    "metadata_admin": {
      "type": "object",
      "description": "Admin-only metadata"
    }
  },
  "required": ["schema_id", "traits"]
}
```

**Output**: Created Identity object

**Errors**:
- `schema_not_found`: Invalid schema_id
- `validation_error`: Traits don't match schema
- `duplicate_identifier`: Identifier already in use

---

### kratos_update_identity

Full update of an identity (replaces all fields).

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "format": "uuid",
      "description": "Identity UUID"
    },
    "schema_id": {
      "type": "string",
      "description": "Identity schema"
    },
    "traits": {
      "type": "object",
      "description": "Updated traits"
    },
    "state": {
      "type": "string",
      "enum": ["active", "inactive"]
    },
    "metadata_public": {
      "type": "object"
    },
    "metadata_admin": {
      "type": "object"
    }
  },
  "required": ["id", "schema_id", "traits", "state"]
}
```

**Output**: Updated Identity object

---

### kratos_patch_identity

Partial update of an identity using JSON Patch.

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "format": "uuid",
      "description": "Identity UUID"
    },
    "patch": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "op": { "type": "string", "enum": ["add", "remove", "replace"] },
          "path": { "type": "string" },
          "value": {}
        },
        "required": ["op", "path"]
      },
      "description": "JSON Patch operations"
    }
  },
  "required": ["id", "patch"]
}
```

**Output**: Patched Identity object

---

### kratos_delete_identity

Permanently delete an identity and all associated data.

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "format": "uuid",
      "description": "Identity UUID"
    }
  },
  "required": ["id"]
}
```

**Output**: Confirmation message

**Errors**:
- `identity_not_found`: Identity does not exist

---

### kratos_delete_identity_credential

Delete a specific credential from an identity.

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "format": "uuid",
      "description": "Identity UUID"
    },
    "type": {
      "type": "string",
      "enum": ["password", "oidc", "totp", "webauthn", "lookup_secret"],
      "description": "Credential type to delete"
    }
  },
  "required": ["id", "type"]
}
```

**Output**: Confirmation message

---

## Session Tools

### kratos_list_sessions

List all sessions across all identities.

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "page_size": {
      "type": "integer",
      "minimum": 1,
      "maximum": 100,
      "default": 20
    },
    "page_token": {
      "type": "string"
    },
    "active": {
      "type": "boolean",
      "description": "Filter by active status"
    },
    "expand": {
      "type": "array",
      "items": {
        "type": "string",
        "enum": ["identity", "devices"]
      },
      "description": "Include related data"
    }
  }
}
```

**Output**: List of Session objects with pagination

---

### kratos_list_identity_sessions

List sessions for a specific identity.

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "identity_id": {
      "type": "string",
      "format": "uuid",
      "description": "Identity UUID"
    },
    "page_size": {
      "type": "integer",
      "minimum": 1,
      "maximum": 100,
      "default": 20
    },
    "page_token": {
      "type": "string"
    },
    "active": {
      "type": "boolean"
    }
  },
  "required": ["identity_id"]
}
```

**Output**: List of Session objects for identity

---

### kratos_get_session

Get details of a specific session.

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "format": "uuid",
      "description": "Session UUID"
    },
    "expand": {
      "type": "array",
      "items": {
        "type": "string",
        "enum": ["identity", "devices"]
      }
    }
  },
  "required": ["id"]
}
```

**Output**: Single Session object

---

### kratos_disable_session

Revoke/disable a session (user logged out).

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "format": "uuid",
      "description": "Session UUID"
    }
  },
  "required": ["id"]
}
```

**Output**: Confirmation message

---

### kratos_extend_session

Extend session expiration time.

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "format": "uuid",
      "description": "Session UUID"
    }
  },
  "required": ["id"]
}
```

**Output**: Updated Session object with new expiration

---

### kratos_delete_identity_sessions

Delete all sessions for an identity (force logout).

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "identity_id": {
      "type": "string",
      "format": "uuid",
      "description": "Identity UUID"
    }
  },
  "required": ["identity_id"]
}
```

**Output**: Count of deleted sessions

---

## Courier Tools

### kratos_list_courier_messages

List courier messages (emails/SMS) with filtering.

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "page_size": {
      "type": "integer",
      "minimum": 1,
      "maximum": 100,
      "default": 20
    },
    "page_token": {
      "type": "string"
    },
    "status": {
      "type": "string",
      "enum": ["queued", "sent", "processing", "abandoned", "failed"],
      "description": "Filter by delivery status"
    },
    "recipient": {
      "type": "string",
      "description": "Filter by recipient address"
    }
  }
}
```

**Output**: List of CourierMessage objects

---

### kratos_get_courier_message

Get details of a specific courier message.

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "format": "uuid",
      "description": "Message UUID"
    }
  },
  "required": ["id"]
}
```

**Output**: Single CourierMessage object

---

## Recovery Tools

### kratos_create_recovery_link

Generate an account recovery link.

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "identity_id": {
      "type": "string",
      "format": "uuid",
      "description": "Identity UUID"
    },
    "expires_in": {
      "type": "string",
      "description": "Link validity duration (e.g., '1h', '24h')"
    }
  },
  "required": ["identity_id"]
}
```

**Output**: Recovery link URL

---

### kratos_create_recovery_code

Generate an account recovery code.

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "identity_id": {
      "type": "string",
      "format": "uuid",
      "description": "Identity UUID"
    },
    "expires_in": {
      "type": "string",
      "description": "Code validity duration"
    }
  },
  "required": ["identity_id"]
}
```

**Output**: Recovery code

---

## Health Tools

### kratos_health_alive

Check if Kratos is accepting requests.

**Input Schema**:
```json
{
  "type": "object",
  "properties": {}
}
```

**Output**: Health status (alive: true/false)

---

### kratos_health_ready

Check if Kratos is ready (database connected, etc.).

**Input Schema**:
```json
{
  "type": "object",
  "properties": {}
}
```

**Output**: Readiness status with dependency checks

---

### kratos_version

Get Kratos server version.

**Input Schema**:
```json
{
  "type": "object",
  "properties": {}
}
```

**Output**: Version string

---

## Analytics Tools

### kratos_session_analytics

Get aggregated session statistics (for Business Analysts).

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "from": {
      "type": "string",
      "format": "date-time",
      "description": "Start of time range (ISO 8601)"
    },
    "to": {
      "type": "string",
      "format": "date-time",
      "description": "End of time range (ISO 8601)"
    },
    "include_auth_methods": {
      "type": "boolean",
      "default": true,
      "description": "Include auth method distribution"
    },
    "include_devices": {
      "type": "boolean",
      "default": true,
      "description": "Include device/browser breakdown"
    }
  }
}
```

**Output**: SessionAnalytics object with aggregated counts

---

### kratos_credential_analytics

Get authentication method adoption statistics.

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "include_mfa": {
      "type": "boolean",
      "default": true,
      "description": "Include MFA adoption stats"
    }
  }
}
```

**Output**: CredentialAnalytics object

---

## Common Error Codes

| Code | Description |
|------|-------------|
| `kratos_connection_error` | Cannot connect to Kratos Admin API |
| `kratos_auth_error` | Authentication to Kratos failed |
| `identity_not_found` | Requested identity does not exist |
| `session_not_found` | Requested session does not exist |
| `message_not_found` | Requested courier message does not exist |
| `schema_not_found` | Invalid identity schema ID |
| `validation_error` | Input validation failed |
| `duplicate_identifier` | Credential identifier already in use |
| `rate_limit_exceeded` | Too many requests to Kratos |
