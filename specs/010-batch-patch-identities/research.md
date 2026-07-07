# Research: Batch Identity Operations MCP Tool

**Date**: 2026-07-07
**Feature**: 010-batch-patch-identities

## R1: SDK surface for the batch endpoint

**Question**: What exactly does `@ory/kratos-client` 25.4.0 expose for `PATCH /admin/identities`?

**Findings** (verified against `node_modules/@ory/kratos-client/dist/api.d.ts`):

- Method: `IdentityApi.batchPatchIdentities(requestParameters?: IdentityApiBatchPatchIdentitiesRequest, options?)` returning `AxiosPromise<BatchPatchIdentitiesResponse>`.
- Request: `IdentityApiBatchPatchIdentitiesRequest = { patchIdentitiesBody?: PatchIdentitiesBody }` where `PatchIdentitiesBody = { identities?: IdentityPatch[] }`.
- `IdentityPatch = { create?: CreateIdentityBody; patch_id?: string }` — **create-only**; no delete or JSON-Patch capability in this SDK version.
- Response: `BatchPatchIdentitiesResponse = { identities?: IdentityPatchResponse[] }` with `IdentityPatchResponse = { action?: "create" | "error"; error?: any; identity?: string; patch_id?: string }`. Note `identity` is the created identity's **ID string**, not a full identity object.
- `IdentityPatchResponseActionEnum` values: `create`, `error` (plus the OpenAPI unknown-default sentinel `11184809`, which is ignored).

**Decision**: Expose batch create only, passing through the per-item response fields verbatim. This matches Constitution Principle III (map cleanly to the API, no invented abstractions).

## R2: Per-item error semantics

**Question**: How are partial failures reported?

**Findings**: The endpoint is non-atomic. Each item independently yields `action: "create"` (with `identity` = new ID) or `action: "error"` (with `error` = Kratos error payload). Kratos v26.2.0 improved per-item error propagation for this endpoint (previously errors could be swallowed or generic), so the tool must surface the `error` payload untouched rather than collapsing it into a single message. Response ordering matches request ordering, and `patch_id` (when supplied) is echoed per item.

**Decision**: Return `isError: false` with a per-item results array + computed summary when the batch request succeeds at the HTTP level, even if every item failed. Reserve `isError: true` (via the shared `mapError`) for request-level failures.

## R3: Batch size cap

**Question**: What client-side cap should the tool enforce?

**Findings**: Kratos enforces a server-side batch limit (configurable/deployment-dependent; oversized batches are rejected upstream). The MCP server already standardizes on 100 as its maximum list page size (`PaginationInputSchema`). Large batches also inflate MCP response token usage linearly.

**Decision**: Cap at 100 items client-side via Zod (`.min(1).max(100)`), documented in the tool description. Upstream limits smaller than 100 still surface through error mapping.

## R4: Patch ID format

**Question**: Should `patchId` be free-form or validated?

**Findings**: Kratos parses `patch_id` as a UUID and rejects non-UUID values for the whole request.

**Decision**: Validate `patchId` as UUID in the input schema so malformed IDs fail fast with an actionable message instead of failing the entire batch upstream.

## R5: Running unit tests without a live Kratos

**Question**: CI (feature 003) runs `bun x vitest run --config tests/vitest.config.ts --dir tests/unit` once `tests/unit/` exists — but `tests/vitest.config.ts` wires `globalSetup` (Kratos connectivity/auth/version pre-flight) and `setupFiles` (schema discovery), both of which fail fast without a reachable Kratos.

**Findings**: The pre-flight is intentional for `tests/api/` (feature 002, FR-015/FR-016 fail-fast). Vitest evaluates the config file in the main process with full CLI argv, so a unit-only run (`--dir` pointing at `tests/unit`) is detectable at config-load time.

**Decision**: In `tests/vitest.config.ts`, omit `globalSetup`/`setupFiles` (and the API-oriented JSON output file) when the invocation targets `tests/unit` only. `tests/api/` runs keep the exact existing behavior. This is the smallest change that makes the already-merged CI test job green without modifying the workflow or the shared setup modules.
