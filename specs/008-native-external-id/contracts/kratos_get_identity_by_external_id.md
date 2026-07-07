# Tool Contract: kratos_get_identity_by_external_id

**Feature**: 008-native-external-id | **Status**: Corrected semantics (interface unchanged)

Look up a single identity by its `external_id` field via the native Kratos Admin API
operation `GET /admin/identities/by/external/{externalId}` (Kratos 25.4.0+).

## Interface (unchanged from feature 001)

**Tool name**: `kratos_get_identity_by_external_id`

**Input Schema** (Zod: `GetIdentityByExternalIdInputSchema` in `src/schemas/tools.ts`):

```json
{
  "type": "object",
  "properties": {
    "externalId": {
      "type": "string",
      "minLength": 1,
      "description": "The identity's external_id field value (exact match, Kratos 25.4.0+)"
    }
  },
  "required": ["externalId"]
}
```

**Output**: Single Identity object, pretty-printed JSON (same shape as
`kratos_get_identity`).

## Semantics (corrected by this feature)

| Aspect | Before (bug) | After |
|--------|--------------|-------|
| Kratos operation | `GET /admin/identities?credentials_identifier=<value>&page_size=1` | `GET /admin/identities/by/external/{externalId}` |
| Matches on | Credential identifiers (email/username/phone), partial match | Identity `external_id` field, exact match |
| Multiple matches | First of page silently returned | Impossible (`external_id` is unique) |
| Not found | Custom `IDENTITY_NOT_FOUND` synthesized from empty list | Kratos 404 mapped by shared error mapper |

## Errors (via `mapError(error, "get_identity_by_external_id")`)

- `NOT_FOUND` (`kratosStatus: 404`): no identity has the given `external_id`
- `UNAUTHORIZED` / `FORBIDDEN` (401/403): auth failure against the Admin API
- `CONNECTION_REFUSED` / `TIMEOUT`: Kratos unreachable
- Other HTTP statuses: mapped per the shared `ERROR_SUGGESTIONS` table

All errors are returned as `{ error: McpToolError }` with `isError: true` and include
`code`, `message`, and an actionable `suggestion`.

## Non-goals

- No `includeCredential` input (supported by the SDK but out of scope; YAGNI)
- No fallback to the credential-identifier list filter (would reintroduce the bug)
