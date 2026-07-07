# Quickstart: Verifying the Native External-ID Lookup

**Feature**: 008-native-external-id

## Hermetic verification (no Kratos needed)

```bash
bun install
bun run lint
bun x tsc --noEmit
bun x vitest run --config tests/vitest.config.ts --dir tests/unit
```

The unit suite (`tests/unit/identity-external-id.test.ts`) asserts:

1. The handler calls `IdentityApi.getIdentityByExternalID` with
   `{ externalID: <input> }` and returns the identity JSON.
2. `listIdentities` is never invoked (the old emulation is gone).
3. A Kratos 404 yields `isError: true` with code `NOT_FOUND` and `kratosStatus: 404`.
4. `ECONNREFUSED` yields a structured `CONNECTION_REFUSED` error.
5. The tool is still registered under `kratos_get_identity_by_external_id` with a
   required `externalId` string input.

## Manual verification against a live Kratos (25.4.0+)

1. Configure `.env` with `KRATOS_ADMIN_URL` (and API key if needed), then
   `bun run start` and connect an MCP client.
2. Create an identity with an external ID:
   `kratos_create_identity` currently has no externalId input, so seed directly:
   ```bash
   curl -X POST "$KRATOS_ADMIN_URL/identities" \
     -H "Content-Type: application/json" \
     -d '{"schema_id":"default","external_id":"crm-42","traits":{"email":"ext-check@example.com"}}'
   ```
3. Call `kratos_get_identity_by_external_id` with `externalId: "crm-42"` → returns that
   identity.
4. Call it with `externalId: "ext-check@example.com"` (the *email*) → structured
   `NOT_FOUND` error. Before this fix, the tool wrongly returned the identity here.
5. Call it with `externalId: "does-not-exist"` → structured `NOT_FOUND` error with
   `kratosStatus: 404` and a suggestion.
