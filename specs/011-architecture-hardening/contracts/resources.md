# Resource Contracts

**Feature**: 011-architecture-hardening

## Static resources

| Name | URI | mimeType | Content |
|---|---|---|---|
| identity-schemas | `kratos://schemas` | application/json | `{ "schemas": [ { "id": string, "schema": object } ] }` |
| connection-config | `kratos://config/connection` | application/json | `{ baseUrl, authType, timeoutMs, toolsets, readOnly, connected, kratosVersion? }` — userinfo stripped from baseUrl |

## Resource templates

```json
[
  {
    "name": "identity-schema",
    "title": "Identity schema",
    "uriTemplate": "kratos://schemas/{schema_id}",
    "description": "A specific identity JSON schema by ID",
    "mimeType": "application/json"
  }
]
```

- `list`: enumerates `kratos://schemas/<id>` for every schema returned by `listIdentitySchemas`.
- `complete.schema_id`: prefix match over schema IDs.
- Read: returns the JSON schema document. Missing schema or upstream failure → JSON-RPC error whose message begins with the mapped error code (e.g. `NOT_FOUND: …`).

## Server metadata

- **capabilities**: `tools.listChanged`, `resources`, `logging`
- **instructions**: see `src/server.ts` `INSTRUCTIONS` (ID conventions, pagination, destructive tools, redaction, schema access)
- **logging**: `warn`/`error` entries forwarded via `notifications/message`; `logging/setLevel` honoured (`warning` → `warn`).
