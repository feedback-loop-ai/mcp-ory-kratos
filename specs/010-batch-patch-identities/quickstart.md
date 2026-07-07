# Quickstart: kratos_batch_patch_identities

**Feature**: 010-batch-patch-identities

## Prerequisites

- MCP server configured and connected (see repository README)
- Kratos Admin API reachable (`KRATOS_ADMIN_URL`)

## Create two identities in one call

Ask your MCP client:

> "Create two identities: alice@example.com and bob@example.com, using the default schema."

The client invokes:

```json
{
  "tool": "kratos_batch_patch_identities",
  "arguments": {
    "identities": [
      {
        "create": { "schemaId": "default", "traits": { "email": "alice@example.com" } },
        "patchId": "0b9f1d38-6b5e-4b0e-9a51-6a0e6a1c1111"
      },
      {
        "create": { "schemaId": "default", "traits": { "email": "bob@example.com" } },
        "patchId": "0b9f1d38-6b5e-4b0e-9a51-6a0e6a1c2222"
      }
    ]
  }
}
```

Example response (both succeeded):

```json
{
  "results": [
    { "index": 0, "action": "create", "identityId": "8f3f0f6e-…", "patchId": "0b9f1d38-…1111" },
    { "index": 1, "action": "create", "identityId": "c2ab9a44-…", "patchId": "0b9f1d38-…2222" }
  ],
  "summary": { "total": 2, "succeeded": 2, "failed": 0 }
}
```

## Partial failure

If bob@example.com already exists, only that item fails:

```json
{
  "results": [
    { "index": 0, "action": "create", "identityId": "8f3f0f6e-…", "patchId": "0b9f1d38-…1111" },
    { "index": 1, "action": "error", "patchId": "0b9f1d38-…2222", "error": { "code": 409, "message": "…conflict…" } }
  ],
  "summary": { "total": 2, "succeeded": 1, "failed": 1 }
}
```

Retry or fix only the failed items — successful items are already created.

## Guardrails

- 1–100 items per call (validated before contacting Kratos)
- `patchId` must be a UUID when supplied; omit it to correlate by `index`
- Bulk write operation, non-atomic: always check `summary.failed`

## Validate locally

```bash
bun run lint
bun x tsc --noEmit
bun x vitest run --config tests/vitest.config.ts --dir tests/unit
```
