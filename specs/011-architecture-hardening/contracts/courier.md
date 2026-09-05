# Tool Contracts: courier toolset

**Feature**: 011-architecture-hardening  
**Source**: generated from the live `tools/list` response of `createServer` (all toolsets enabled, not read-only). Regenerate by connecting an SDK `Client` over `InMemoryTransport` to `createServer` and dumping `tools/list`; `src/schemas/tools.ts` is the Zod source of truth.

**Common envelope**: success → `content[0].text` = JSON of the result and `structuredContent` = the same object; upstream/validation failure → `isError: true` with `{ error: { code, message, kratosStatus?, kratosCode?, suggestion? } }`; declined confirmation (destructive tools) → `{ cancelled: true, message }`.

## `kratos_get_courier_message`

**Title**: Get courier message  
**Annotations**: readOnlyHint=true, destructiveHint=—, idempotentHint=true, openWorldHint=false

**Description**

> Get detailed information about a specific courier message, including delivery attempts and status history. Example: {"id": "3a1b2c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d"}.

**Input schema (JSON Schema)**

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

## `kratos_list_courier_messages`

**Title**: List courier messages  
**Annotations**: readOnlyHint=true, destructiveHint=—, idempotentHint=true, openWorldHint=false

**Description**

> List courier messages (emails/SMS) sent by Kratos. Filter by delivery status or recipient to investigate delivery issues. Returns nextPageToken for pagination. Example: {"status": "sent"}.

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
    "status": {
      "type": "string",
      "enum": [
        "queued",
        "sent",
        "processing",
        "abandoned"
      ],
      "description": "Filter by delivery status"
    },
    "recipient": {
      "type": "string",
      "description": "Filter by recipient address"
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
    "messages": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {},
        "additionalProperties": true
      }
    },
    "count": {
      "type": "integer"
    },
    "nextPageToken": {
      "type": "string"
    }
  },
  "required": [
    "messages",
    "count"
  ],
  "additionalProperties": false,
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```
