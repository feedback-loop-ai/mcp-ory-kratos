# Tool Contracts: health toolset

**Feature**: 011-architecture-hardening  
**Source**: generated from the live `tools/list` response of `createServer` (all toolsets enabled, not read-only). Regenerate by connecting an SDK `Client` over `InMemoryTransport` to `createServer` and dumping `tools/list`; `src/schemas/tools.ts` is the Zod source of truth.

**Common envelope**: success → `content[0].text` = JSON of the result and `structuredContent` = the same object; upstream/validation failure → `isError: true` with `{ error: { code, message, kratosStatus?, kratosCode?, suggestion? } }`; declined confirmation (destructive tools) → `{ cancelled: true, message }`.

## `kratos_health_alive`

**Title**: Health: alive  
**Annotations**: readOnlyHint=true, destructiveHint=—, idempotentHint=true, openWorldHint=false

**Description**

> Check if the Kratos server is alive and accepting requests. Returns alive status.

**Input schema (JSON Schema)**

```json
{
  "type": "object",
  "properties": {},
  "additionalProperties": false,
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

**Output schema (JSON Schema)**

```json
{
  "type": "object",
  "properties": {
    "status": {
      "type": "string"
    },
    "checkedAt": {
      "type": "string"
    }
  },
  "required": [
    "status",
    "checkedAt"
  ],
  "additionalProperties": false,
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

## `kratos_health_ready`

**Title**: Health: ready  
**Annotations**: readOnlyHint=true, destructiveHint=—, idempotentHint=true, openWorldHint=false

**Description**

> Check if the Kratos server is ready to handle requests. Checks database connectivity and other dependencies.

**Input schema (JSON Schema)**

```json
{
  "type": "object",
  "properties": {},
  "additionalProperties": false,
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

**Output schema (JSON Schema)**

```json
{
  "type": "object",
  "properties": {
    "status": {
      "type": "string"
    },
    "checkedAt": {
      "type": "string"
    }
  },
  "required": [
    "status",
    "checkedAt"
  ],
  "additionalProperties": false,
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

## `kratos_version`

**Title**: Kratos version  
**Annotations**: readOnlyHint=true, destructiveHint=—, idempotentHint=true, openWorldHint=false

**Description**

> Get the version of the Kratos server. Useful for debugging and compatibility checks.

**Input schema (JSON Schema)**

```json
{
  "type": "object",
  "properties": {},
  "additionalProperties": false,
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

**Output schema (JSON Schema)**

```json
{
  "type": "object",
  "properties": {
    "version": {
      "type": "string"
    }
  },
  "required": [
    "version"
  ],
  "additionalProperties": false,
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```
