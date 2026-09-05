# Tool Contracts: analytics toolset

**Feature**: 011-architecture-hardening  
**Source**: generated from the live `tools/list` response of `createServer` (all toolsets enabled, not read-only). Regenerate by connecting an SDK `Client` over `InMemoryTransport` to `createServer` and dumping `tools/list`; `src/schemas/tools.ts` is the Zod source of truth.

**Common envelope**: success → `content[0].text` = JSON of the result and `structuredContent` = the same object; upstream/validation failure → `isError: true` with `{ error: { code, message, kratosStatus?, kratosCode?, suggestion? } }`; declined confirmation (destructive tools) → `{ cancelled: true, message }`.

## `kratos_credential_analytics`

**Title**: Credential analytics  
**Annotations**: readOnlyHint=true, destructiveHint=—, idempotentHint=true, openWorldHint=false

**Description**

> Get authentication method adoption statistics showing which credential types (password, OIDC, TOTP, WebAuthn, passkey, code) are most used, plus MFA adoption (totp/webauthn/lookup_secret) and passwordless adoption (passkey) rates. Code credentials appear only in the distribution because they may be a first or second factor. Scans up to maxPages pages of 250 identities (default from KRATOS_MAX_SCAN_PAGES); check `truncated` in the result and raise maxPages or pass its nextPageToken as pageToken to continue. Example: {"includeMfa": true, "maxPages": 50}.

**Input schema (JSON Schema)**

```json
{
  "type": "object",
  "properties": {
    "maxPages": {
      "type": "integer",
      "minimum": 1,
      "maximum": 1000,
      "description": "Maximum pages to scan (default from KRATOS_MAX_SCAN_PAGES, 20)"
    },
    "pageToken": {
      "type": "string",
      "description": "Resume a truncated scan from the nextPageToken of a previous result"
    },
    "includeMfa": {
      "type": "boolean",
      "default": true,
      "description": "Include adoption stats (MFA and passwordless/passkey)"
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
    "pagesScanned": {
      "type": "integer",
      "description": "Pages fetched from Kratos"
    },
    "truncated": {
      "type": "boolean",
      "description": "True when the page cap was hit before the end; raise maxPages or resume"
    },
    "nextPageToken": {
      "type": "string",
      "description": "Cursor to resume from when truncated"
    },
    "totalIdentities": {
      "type": "integer",
      "description": "Total identities analyzed"
    },
    "credentialDistribution": {
      "type": "object",
      "additionalProperties": {
        "type": "integer"
      },
      "description": "Count by credential type"
    },
    "mfaAdoption": {
      "type": "object",
      "properties": {
        "enabled": {
          "type": "integer",
          "description": "Identities with MFA enabled"
        },
        "disabled": {
          "type": "integer",
          "description": "Identities without MFA"
        }
      },
      "required": [
        "enabled",
        "disabled"
      ],
      "additionalProperties": false
    },
    "passwordlessAdoption": {
      "type": "object",
      "properties": {
        "enabled": {
          "type": "integer",
          "description": "Identities with a passwordless first factor (passkey)"
        },
        "disabled": {
          "type": "integer",
          "description": "Identities without a passwordless first factor"
        }
      },
      "required": [
        "enabled",
        "disabled"
      ],
      "additionalProperties": false,
      "description": "Passwordless (passkey) adoption. Separate from mfaAdoption because passkeys are a first factor, not MFA. 'code' credentials appear only in credentialDistribution since they may act as first or second factor."
    }
  },
  "required": [
    "pagesScanned",
    "truncated",
    "totalIdentities",
    "credentialDistribution"
  ],
  "additionalProperties": false,
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

## `kratos_session_analytics`

**Title**: Session analytics  
**Annotations**: readOnlyHint=true, destructiveHint=—, idempotentHint=true, openWorldHint=false

**Description**

> Get aggregated session statistics including authentication methods, device types, and browser distribution. Useful for understanding user login patterns. Scans up to maxPages pages of 250 sessions (default from KRATOS_MAX_SCAN_PAGES); check `truncated` in the result and raise maxPages or pass its nextPageToken as pageToken to continue. Example: {"from": "2026-09-01T00:00:00Z", "includeDevices": false}.

**Input schema (JSON Schema)**

```json
{
  "type": "object",
  "properties": {
    "maxPages": {
      "type": "integer",
      "minimum": 1,
      "maximum": 1000,
      "description": "Maximum pages to scan (default from KRATOS_MAX_SCAN_PAGES, 20)"
    },
    "pageToken": {
      "type": "string",
      "description": "Resume a truncated scan from the nextPageToken of a previous result"
    },
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
    "includeAuthMethods": {
      "type": "boolean",
      "default": true,
      "description": "Include auth method distribution"
    },
    "includeDevices": {
      "type": "boolean",
      "default": true,
      "description": "Include device/browser breakdown"
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
    "pagesScanned": {
      "type": "integer",
      "description": "Pages fetched from Kratos"
    },
    "truncated": {
      "type": "boolean",
      "description": "True when the page cap was hit before the end; raise maxPages or resume"
    },
    "nextPageToken": {
      "type": "string",
      "description": "Cursor to resume from when truncated"
    },
    "totalSessions": {
      "type": "integer",
      "description": "Total sessions in query period"
    },
    "activeSessions": {
      "type": "integer",
      "description": "Currently active sessions"
    },
    "inactiveSessions": {
      "type": "integer",
      "description": "Inactive/expired sessions"
    },
    "byAuthenticationMethod": {
      "type": "object",
      "additionalProperties": {
        "type": "integer"
      },
      "description": "Count by auth method"
    },
    "byAssuranceLevel": {
      "type": "object",
      "properties": {
        "aal1": {
          "type": "integer",
          "description": "Single-factor sessions"
        },
        "aal2": {
          "type": "integer",
          "description": "Multi-factor sessions"
        }
      },
      "required": [
        "aal1",
        "aal2"
      ],
      "additionalProperties": false,
      "description": "Count by assurance level"
    },
    "byDeviceType": {
      "type": "object",
      "additionalProperties": {
        "type": "integer"
      },
      "description": "Count by device type"
    },
    "byBrowser": {
      "type": "object",
      "additionalProperties": {
        "type": "integer"
      },
      "description": "Count by browser"
    },
    "timeRange": {
      "type": "object",
      "properties": {
        "from": {
          "type": "string",
          "format": "date-time"
        },
        "to": {
          "type": "string",
          "format": "date-time"
        }
      },
      "additionalProperties": false
    }
  },
  "required": [
    "pagesScanned",
    "truncated",
    "totalSessions",
    "activeSessions",
    "inactiveSessions",
    "byAuthenticationMethod",
    "byAssuranceLevel",
    "byDeviceType",
    "byBrowser",
    "timeRange"
  ],
  "additionalProperties": false,
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```
