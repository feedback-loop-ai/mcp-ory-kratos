# Research: Native External-ID Identity Lookup

**Feature**: 008-native-external-id | **Date**: 2026-07-07

## R1: Does the installed Kratos SDK expose a native external-ID lookup?

**Decision**: Use `IdentityApi.getIdentityByExternalID` from `@ory/kratos-client` 25.4.0.

**Verification** (from `node_modules/@ory/kratos-client/dist/api.d.ts`):

- Object-style method on `IdentityApi`:
  `getIdentityByExternalID(requestParameters: IdentityApiGetIdentityByExternalIDRequest, options?): Promise<AxiosResponse<Identity>>`
- Request parameters interface:
  ```ts
  export interface IdentityApiGetIdentityByExternalIDRequest {
    readonly externalID: string; // "ExternalID must be set to the ID of identity you want to get"
    readonly includeCredential?: Array<GetIdentityByExternalIDIncludeCredentialEnum>;
  }
  ```
- Wire operation: `GET /admin/identities/by/external/{externalID}` (the SDK URL-encodes
  the path parameter). Returns `Identity` on 200; Kratos returns 404 when no identity
  has that `external_id`.
- Casing pitfall: the SDK property is `externalID` (capital "ID"), while the MCP tool
  input is `externalId`. The handler maps between them explicitly.

**Alternatives considered**:
- Keep `listIdentities({ credentialsIdentifier })` emulation — rejected: matches
  sign-in identifiers (email/username/phone), not `external_id`; produces false
  positives and false negatives (the bug this feature fixes).
- Raw HTTP via the internal `KratosHttpClient` — rejected: SDK method exists and gives
  typed responses plus Axios error shapes the shared mapper already understands.

## R2: `external_id` semantics in Kratos

**Decision**: Treat `external_id` as an exact-match, optionally-set, globally-unique
identity attribute.

**Rationale**: The SDK model documents: "ExternalID is an optional external ID of the
identity. This is used to link the identity to an external system. If set, the external
ID must be unique across all identities." Introduced with Kratos 25.4.0 together with
the by-external-ID endpoint. Exact uniqueness means a lookup returns at most one
identity — no pagination or disambiguation logic is needed.

## R3: Error handling for 404 and other failures

**Decision**: Let all errors flow through `mapError(error, "get_identity_by_external_id")`
in `src/errors/mapper.ts`; delete the bespoke `IDENTITY_NOT_FOUND` empty-list branch.

**Rationale**: The mapper already converts Axios-style errors to structured
`McpToolError`s: 404 → `NOT_FOUND` + `kratosStatus: 404` + actionable suggestion;
401/403, 5xx, `ECONNREFUSED`, timeouts likewise. `kratos_get_identity` (the closest
sibling tool) uses exactly this path, satisfying cross-tool consistency (Constitution
III). A custom not-found shape would diverge from every other tool.

**Alternatives considered**: keep the custom `IDENTITY_NOT_FOUND` code for backward
compatibility — rejected: the old code only fired on the *wrong* lookup semantics, and
error payloads are not part of the frozen tool contract (inputs/name are).

## R4: Running unit tests without a live Kratos

**Decision**: Make `tests/vitest.config.ts` conditionally omit the Kratos-dependent
`globalSetup`/`setupFiles` (and integration-oriented reporter/bail/global-timeout
settings) when the invocation is scoped to `tests/unit` via the CLI `--dir` flag.

**Rationale**: CI (feature 003) already runs
`bun x vitest run --config tests/vitest.config.ts --dir tests/unit` when `tests/unit/`
exists, but the shared config's `globalSetup` performs connectivity/auth/version
pre-flight against a live Kratos and throws otherwise — so the first unit test added
would break CI without this change. Detecting `--dir …tests/unit` in `process.argv`
inside the config (which executes in the Vitest CLI process) keeps a single config
file, leaves the documented CI command untouched, and changes nothing for integration
runs.

**Alternatives considered**:
- Separate `tests/unit/vitest.config.ts` — rejected: CI and CLAUDE.md pin the config
  path `tests/vitest.config.ts`; changing the CI workflow is out of scope and risks
  conflicts with in-flight sibling features.
- Environment-variable switch (e.g. `UNIT_ONLY=1`) — rejected: the documented CI/dev
  command would silently break unless every caller remembers the variable.
- Guard inside `global-setup.ts` — rejected: harder to detect scope from the setup
  process reliably, and it would still load integration reporters for unit runs.

## R5: Unit-test strategy for MCP tool handlers

**Decision**: Register tools against a minimal `McpServer` stub that captures
`tool(name, description, shape, handler)` calls; drive the captured handler with a
mocked `KratosClients` object and a no-op `CorrelatedLogger`.

**Rationale**: `registerIdentityQueryTools` only calls `server.tool(...)`, so a
4-argument capture stub exercises the real registration path (names, descriptions,
schemas) and the real handler closure without transport or a live server. Mocking at
the `KratosClients` boundary matches the module's dependency injection design and needs
no module-level mocking. Existing tests (`tests/api/`) call the SDK directly against a
live Kratos, which is not CI-safe; this is the first unit suite, per the CI pipeline's
`tests/unit/` convention.
