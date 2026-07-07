# Data Model: Batch Identity Operations MCP Tool

**Date**: 2026-07-07
**Feature**: 010-batch-patch-identities

## Overview

The MCP server remains a stateless proxy — these models describe the shapes passed through the `kratos_batch_patch_identities` tool and their mapping to `@ory/kratos-client` 25.4.x types. No data is persisted.

## Entities

### BatchIdentityPatch (tool input item)

One unit of work in a batch. Maps 1:1 to the SDK's `IdentityPatch`.

| Field | Type | Description | Validation | SDK mapping |
|-------|------|-------------|------------|-------------|
| create | BatchIdentityCreate | Identity definition to create | Required | `IdentityPatch.create` |
| patchId | string (UUID) | Client-supplied correlation ID, echoed in the result | Optional, UUID format | `IdentityPatch.patch_id` |

### BatchIdentityCreate (nested identity definition)

Mirrors the `kratos_create_identity` tool input exactly. Maps to the SDK's `CreateIdentityBody`.

| Field | Type | Description | Validation | SDK mapping |
|-------|------|-------------|------------|-------------|
| schemaId | string | Identity schema to use | Required, min length 1 | `CreateIdentityBody.schema_id` |
| traits | object | Identity traits (must match schema) | Required | `CreateIdentityBody.traits` |
| state | enum | Initial identity state | Optional, `active` \| `inactive`, default `active` | `CreateIdentityBody.state` |
| metadataPublic | object | Public metadata | Optional | `CreateIdentityBody.metadata_public` |
| metadataAdmin | object | Admin-only metadata | Optional | `CreateIdentityBody.metadata_admin` |

### BatchPatchIdentitiesInput (tool input)

| Field | Type | Description | Validation | SDK mapping |
|-------|------|-------------|------------|-------------|
| identities | BatchIdentityPatch[] | Patches to apply, processed in order | Required, 1–100 items | `PatchIdentitiesBody.identities` |

### BatchIdentityPatchResult (tool output item)

The outcome for one input item. Fields pass through the SDK's `IdentityPatchResponse` verbatim; `index` is computed.

| Field | Type | Description | Source |
|-------|------|-------------|--------|
| index | number | Zero-based position of the corresponding input item (response order matches request order) | Computed |
| action | string | `create` on success, `error` on failure | `IdentityPatchResponse.action` |
| identityId | string (UUID) | ID of the created identity (success only) | `IdentityPatchResponse.identity` |
| patchId | string (UUID) | Echo of the input `patchId`, if supplied | `IdentityPatchResponse.patch_id` |
| error | object | Kratos error payload for this item (failure only), passed through untouched | `IdentityPatchResponse.error` |

### BatchSummary (tool output aggregate)

| Field | Type | Description |
|-------|------|-------------|
| total | number | Number of results returned by Kratos |
| succeeded | number | Results with `action === "create"` |
| failed | number | Results with `action === "error"` |

### BatchPatchIdentitiesOutput (tool output)

```json
{
  "results": [
    { "index": 0, "action": "create", "identityId": "3f2a…", "patchId": "9b1c…" },
    { "index": 1, "action": "error", "patchId": "77aa…", "error": { "code": 409, "message": "…" } }
  ],
  "summary": { "total": 2, "succeeded": 1, "failed": 1 }
}
```

## State & Relationships

- **State transitions**: None owned by this server. Each successful item creates an Identity in Kratos in state `active` (or `inactive` if requested) — identical lifecycle to `kratos_create_identity` (see feature 001 data model).
- **Correlation**: Input item ↔ output result is by array position (guaranteed by Kratos response ordering) and, when supplied, by `patchId`.
- **Error entity**: Request-level failures reuse the shared `McpToolError` shape (`code`, `message`, `kratosStatus`, `kratosCode`, `suggestion`) from feature 001 — no new error entity.
