# Tool Contracts: sessions toolset

**Feature**: 011-architecture-hardening  
**Source**: generated from the live `tools/list` response of `createServer` (all toolsets enabled, not read-only). Regenerate by connecting an SDK `Client` over `InMemoryTransport` to `createServer` and dumping `tools/list`; `src/schemas/tools.ts` is the Zod source of truth.

**Common envelope**: success → `content[0].text` = JSON of the result and `structuredContent` = the same object; upstream/validation failure → `isError: true` with `{ error: { code, message, kratosStatus?, kratosCode?, suggestion? } }`; declined confirmation (destructive tools) → `{ cancelled: true, message }`.

## `kratos_delete_identity_sessions`

**Title**: Delete identity sessions  
**Annotations**: readOnlyHint=false, destructiveHint=true, idempotentHint=true, openWorldHint=false

**Description**

> Delete all sessions for a specific identity, effectively logging the user out from all devices. Example: {"identityId": "9f8d7c6b-5a49-4838-9271-605948372615"}.

**Input schema (JSON Schema)**

```json
{
  "type": "object",
  "properties": {
    "identityId": {
      "type": "string",
      "format": "uuid",
      "description": "Identity UUID"
    }
  },
  "required": [
    "identityId"
  ],
  "additionalProperties": false,
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

**Output schema (JSON Schema)**

```json
{
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean",
      "const": true
    },
    "message": {
      "type": "string"
    },
    "sessionsExisted": {
      "type": "boolean",
      "description": "False when the identity had no sessions to delete"
    },
    "cancelled": {
      "type": "boolean",
      "const": true
    }
  },
  "additionalProperties": true,
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

## `kratos_disable_session`

**Title**: Disable session  
**Annotations**: readOnlyHint=false, destructiveHint=true, idempotentHint=true, openWorldHint=false

**Description**

> Revoke/disable a specific session, effectively logging the user out from that session. Example: {"id": "3a1b2c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d"}.

**Input schema (JSON Schema)**

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
  "required": [
    "id"
  ],
  "additionalProperties": false,
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

**Output schema (JSON Schema)**

```json
{
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean",
      "const": true
    },
    "message": {
      "type": "string"
    },
    "cancelled": {
      "type": "boolean",
      "const": true
    }
  },
  "additionalProperties": true,
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

## `kratos_extend_session`

**Title**: Extend session  
**Annotations**: readOnlyHint=false, destructiveHint=true, idempotentHint=false, openWorldHint=false

**Description**

> Extend a session's expiration time, keeping the user logged in longer (this widens the user's access window). Example: {"id": "<session uuid>"}.

**Input schema (JSON Schema)**

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
  "required": [
    "id"
  ],
  "additionalProperties": false,
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

**Output schema (JSON Schema)**

```json
{
  "type": "object",
  "properties": {
    "id": {
      "type": "string"
    },
    "active": {
      "type": "boolean"
    },
    "authenticated_at": {
      "type": "string"
    },
    "expires_at": {
      "type": "string"
    },
    "authenticator_assurance_level": {
      "type": "string"
    },
    "cancelled": {
      "type": "boolean",
      "const": true
    },
    "message": {
      "type": "string"
    }
  },
  "additionalProperties": true,
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

## `kratos_get_session`

**Title**: Get session  
**Annotations**: readOnlyHint=true, destructiveHint=—, idempotentHint=true, openWorldHint=false

**Description**

> Get detailed information about a specific session by its ID. Use expand to include identity or device details. Example: {"id": "3a1b2c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d", "expand": ["identity"]}.

**Input schema (JSON Schema)**

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
        "enum": [
          "identity",
          "devices"
        ]
      },
      "description": "Include related data"
    }
  },
  "required": [
    "id"
  ],
  "additionalProperties": false,
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

**Output schema (JSON Schema)**

```json
{
  "type": "object",
  "properties": {},
  "additionalProperties": true,
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

## `kratos_list_identity_sessions`

**Title**: List identity sessions  
**Annotations**: readOnlyHint=true, destructiveHint=—, idempotentHint=true, openWorldHint=false

**Description**

> List all sessions for a specific identity. Useful for investigating a user's login history and active sessions. Returns nextPageToken for pagination. Example: {"identityId": "9f8d7c6b-5a49-4838-9271-605948372615"}.

**Input schema (JSON Schema)**

```json
{
  "type": "object",
  "properties": {
    "pageSize": {
      "type": "integer",
      "minimum": 1,
      "maximum": 100,
      "default": 20,
      "description": "Number of items per page (1-100, default 20)"
    },
    "pageToken": {
      "type": "string",
      "description": "Cursor from a previous response's nextPageToken"
    },
    "identityId": {
      "type": "string",
      "format": "uuid",
      "description": "Identity UUID"
    },
    "active": {
      "type": "boolean",
      "description": "Filter by active status"
    }
  },
  "required": [
    "identityId"
  ],
  "additionalProperties": false,
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

**Output schema (JSON Schema)**

```json
{
  "type": "object",
  "properties": {
    "items": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string"
          },
          "active": {
            "type": "boolean"
          },
          "authenticated_at": {
            "type": "string"
          },
          "expires_at": {
            "type": "string"
          },
          "authenticator_assurance_level": {
            "type": "string"
          }
        },
        "required": [
          "id"
        ],
        "additionalProperties": true
      }
    },
    "count": {
      "type": "integer",
      "description": "Items in this page"
    },
    "nextPageToken": {
      "type": "string",
      "description": "Cursor for the next page; absent on the last page"
    },
    "identityId": {
      "type": "string"
    }
  },
  "required": [
    "items",
    "count",
    "identityId"
  ],
  "additionalProperties": false,
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

## `kratos_list_sessions`

**Title**: List sessions  
**Annotations**: readOnlyHint=true, destructiveHint=—, idempotentHint=true, openWorldHint=false

**Description**

> List all sessions across all identities with optional filtering by active status. Use expand to include identity or device details. When `filter` is set (auth method, provider, time range) filtering is applied client-side over up to maxPages pages of 100 sessions until pageSize matches are collected; the response then includes pagesScanned, truncated and a nextPageToken to resume from. Example: {"active": true, "pageSize": 20}.

**Input schema (JSON Schema)**

```json
{
  "type": "object",
  "properties": {
    "pageSize": {
      "type": "integer",
      "minimum": 1,
      "maximum": 100,
      "default": 20,
      "description": "Number of items per page (1-100, default 20)"
    },
    "pageToken": {
      "type": "string",
      "description": "Cursor from a previous response's nextPageToken"
    },
    "active": {
      "type": "boolean",
      "description": "Filter by active status"
    },
    "expand": {
      "type": "array",
      "items": {
        "type": "string",
        "enum": [
          "identity",
          "devices"
        ]
      },
      "description": "Include related data"
    },
    "filter": {
      "type": "object",
      "properties": {
        "authMethod": {
          "type": "string",
          "enum": [
            "password",
            "oidc",
            "totp",
            "webauthn",
            "passkey",
            "lookup_secret",
            "code",
            "link_recovery",
            "code_recovery"
          ],
          "description": "Filter by authentication method (e.g., 'oidc' for Microsoft/Google login)"
        },
        "provider": {
          "type": "string",
          "description": "Filter by OIDC provider (e.g., 'microsoft', 'google'). Only applies when authMethod is 'oidc'"
        },
        "authenticatedAfter": {
          "type": "string",
          "format": "date-time",
          "description": "Only sessions authenticated after this time (ISO 8601)"
        },
        "authenticatedBefore": {
          "type": "string",
          "format": "date-time",
          "description": "Only sessions authenticated before this time (ISO 8601)"
        }
      },
      "additionalProperties": false,
      "description": "Client-side filters. When set, the tool scans up to maxPages pages to fill pageSize results"
    },
    "maxPages": {
      "type": "integer",
      "minimum": 1,
      "maximum": 1000,
      "description": "Maximum pages to scan (default from KRATOS_MAX_SCAN_PAGES, 20)"
    }
  },
  "additionalProperties": false,
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

**Output schema (JSON Schema)**

```json
{
  "type": "object",
  "properties": {
    "items": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string"
          },
          "active": {
            "type": "boolean"
          },
          "authenticated_at": {
            "type": "string"
          },
          "expires_at": {
            "type": "string"
          },
          "authenticator_assurance_level": {
            "type": "string"
          }
        },
        "required": [
          "id"
        ],
        "additionalProperties": true
      }
    },
    "count": {
      "type": "integer",
      "description": "Items in this page"
    },
    "nextPageToken": {
      "type": "string",
      "description": "Cursor for the next page; absent on the last page"
    },
    "pagesScanned": {
      "type": "integer"
    },
    "truncated": {
      "type": "boolean"
    }
  },
  "required": [
    "items",
    "count"
  ],
  "additionalProperties": false,
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```
