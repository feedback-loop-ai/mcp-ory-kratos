# Tool Contracts: recovery toolset

**Feature**: 011-architecture-hardening  
**Source**: generated from the live `tools/list` response of `createServer` (all toolsets enabled, not read-only). Regenerate by connecting an SDK `Client` over `InMemoryTransport` to `createServer` and dumping `tools/list`; `src/schemas/tools.ts` is the Zod source of truth.

**Common envelope**: success → `content[0].text` = JSON of the result and `structuredContent` = the same object; upstream/validation failure → `isError: true` with `{ error: { code, message, kratosStatus?, kratosCode?, suggestion? } }`; declined confirmation (destructive tools) → `{ cancelled: true, message }`.

## `kratos_create_recovery_code`

**Title**: Create recovery code  
**Annotations**: readOnlyHint=false, destructiveHint=false, idempotentHint=false, openWorldHint=false

**Description**

> Generate an account recovery code for a user. WARNING: the returned code (and accompanying link) is equivalent to full account takeover - anyone who redeems it gains access to the account. Treat it as a secret, never log or share it, and provide it only to the verified account owner verbally or via a secure channel.

**Input schema (JSON Schema)**

```json
{
  "type": "object",
  "properties": {
    "identityId": {
      "type": "string",
      "format": "uuid",
      "description": "Identity UUID"
    },
    "expiresIn": {
      "type": "string",
      "pattern": "^([0-9]+([.][0-9]+)?(ns|us|\\u00B5s|ms|s|m|h))+$",
      "description": "Code validity duration (e.g., '15m')"
    },
    "flowType": {
      "type": "string",
      "enum": [
        "browser",
        "api"
      ],
      "description": "Flow type the code will be used with"
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
    "identityId": {
      "type": "string"
    },
    "recoveryCode": {
      "type": "string"
    },
    "recoveryLink": {
      "type": "string"
    },
    "expiresAt": {
      "type": "string"
    },
    "warning": {
      "type": "string"
    }
  },
  "required": [
    "identityId",
    "recoveryCode",
    "warning"
  ],
  "additionalProperties": false,
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

## `kratos_create_recovery_link`

**Title**: Create recovery link  
**Annotations**: readOnlyHint=false, destructiveHint=false, idempotentHint=false, openWorldHint=false

**Description**

> Generate an account recovery link for a user who cannot complete self-service recovery. WARNING: the returned link is equivalent to full account takeover - anyone who opens it gains access to the account. Treat it as a secret, never log or share it, and deliver it only to the verified account owner via a secure channel.

**Input schema (JSON Schema)**

```json
{
  "type": "object",
  "properties": {
    "identityId": {
      "type": "string",
      "format": "uuid",
      "description": "Identity UUID"
    },
    "expiresIn": {
      "type": "string",
      "pattern": "^([0-9]+([.][0-9]+)?(ns|us|\\u00B5s|ms|s|m|h))+$",
      "description": "Link validity duration (e.g., '1h', '24h')"
    },
    "returnTo": {
      "type": "string",
      "format": "uri",
      "description": "URL to redirect to after the recovery flow completes"
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
    "identityId": {
      "type": "string"
    },
    "recoveryLink": {
      "type": "string"
    },
    "expiresAt": {
      "type": "string"
    },
    "warning": {
      "type": "string"
    }
  },
  "required": [
    "identityId",
    "recoveryLink",
    "warning"
  ],
  "additionalProperties": false,
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```
