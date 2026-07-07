# Tool Contract: kratos_batch_patch_identities

**Feature**: 010-batch-patch-identities
**Kratos operation**: `IdentityApi.batchPatchIdentities` — `PATCH /admin/identities`

## Tool Definition

- **Name**: `kratos_batch_patch_identities`
- **Description** (verbatim, per FR-009):

  > Create multiple identities in a single batch request (up to 100 per call). This is a bulk write operation: items succeed or fail independently (non-atomic) — the response reports a per-item result with action 'create' (with the new identity ID) or 'error' (with the Kratos error detail), plus a summary of succeeded/failed counts. Optionally supply a patchId (UUID) per item to correlate results.

## Input Schema (Zod)

```typescript
export const BatchIdentityPatchSchema = z.object({
  create: z
    .object({
      schemaId: z.string().min(1).describe("Identity schema to use"),
      traits: z.record(z.unknown()).describe("Identity traits (must match schema)"),
      state: z.enum(["active", "inactive"]).default("active").describe("Initial identity state"),
      metadataPublic: z.record(z.unknown()).optional().describe("Public metadata"),
      metadataAdmin: z.record(z.unknown()).optional().describe("Admin-only metadata"),
    })
    .describe("Identity to create (same fields as kratos_create_identity)"),
  patchId: z
    .string()
    .uuid()
    .optional()
    .describe("Optional correlation ID (UUID), echoed back in the matching result"),
});

export const BatchPatchIdentitiesInputSchema = z.object({
  identities: z
    .array(BatchIdentityPatchSchema)
    .min(1, "At least one identity patch is required")
    .max(100, "Batch size is limited to 100 identities per call")
    .describe("Identity patches to apply in order (1-100 items)"),
});
```

## Request Mapping

| Tool input | SDK request (`IdentityApiBatchPatchIdentitiesRequest`) |
|------------|--------------------------------------------------------|
| `identities[i].create.schemaId` | `patchIdentitiesBody.identities[i].create.schema_id` |
| `identities[i].create.traits` | `patchIdentitiesBody.identities[i].create.traits` |
| `identities[i].create.state` | `patchIdentitiesBody.identities[i].create.state` |
| `identities[i].create.metadataPublic` | `patchIdentitiesBody.identities[i].create.metadata_public` |
| `identities[i].create.metadataAdmin` | `patchIdentitiesBody.identities[i].create.metadata_admin` |
| `identities[i].patchId` | `patchIdentitiesBody.identities[i].patch_id` |

## Output (success — HTTP request succeeded, items may still individually fail)

`content[0].text` is pretty-printed JSON:

```json
{
  "results": [
    { "index": 0, "action": "create", "identityId": "<uuid>", "patchId": "<uuid>" },
    { "index": 1, "action": "error", "patchId": "<uuid>", "error": { "<verbatim Kratos error payload>": "..." } }
  ],
  "summary": { "total": 2, "succeeded": 1, "failed": 1 }
}
```

- `results[i]` maps from `BatchPatchIdentitiesResponse.identities[i]`: `action` → `action`, `identity` → `identityId`, `patch_id` → `patchId`, `error` → `error` (untouched).
- `index` is the array position (response order matches request order).
- `summary.succeeded` counts `action === "create"`; `summary.failed` counts `action === "error"`.
- `isError` is **not** set for partial (or even total) per-item failure.

## Output (request-level failure)

`isError: true` with the shared `McpToolError` shape produced by `mapError(error, "batch_patch_identities")`:

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "…",
    "kratosStatus": 401,
    "kratosCode": "…",
    "suggestion": "…"
  }
}
```

## Validation Failures (before any Kratos call)

Standard MCP SDK Zod validation errors, e.g.:

- Empty `identities` array → "At least one identity patch is required"
- More than 100 items → "Batch size is limited to 100 identities per call"
- Non-UUID `patchId`, missing `schemaId`/`traits` → field-level Zod errors identifying the offending item
