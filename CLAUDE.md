# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MCP (Model Context Protocol) server for Ory Kratos - an open-source identity and user management system.

## Build & Development Commands

```bash
# Start MCP server
bun run start

# Lint (Biome)
bun run lint
bun run lint:fix  # Auto-fix issues

# Type check
bun x tsc --noEmit

# Type check src + tests
bun run typecheck

# Unit tests only (CI-safe, no external dependencies, with coverage)
bun run test:unit

# Integration tests against a local Kratos v26.2.0
docker compose up -d --wait && bun run test:api

# All tests / watch mode (requires Kratos - see .env.test.local.example)
bun run test
bun run test:watch

# Dependency audit
bun run audit
```

## CI/CD

GitHub Actions CI runs on every push and PR:
- **Lint**: `bun run lint` (Biome)
- **Type Check**: `bun x tsc --noEmit`
- **Audit**: `bun audit --audit-level=high`
- **Test**: Unit tests with coverage (tests/unit/)
- **Integration**: Starts Kratos v26.2.0 via `docker-compose.yml` (config in `tests/kratos/`) and runs `bun run test:api`

Test organization:
- `tests/unit/` - Hermetic unit tests (in-memory MCP client, stubbed Kratos)
- `tests/api/` - Integration tests against a real Kratos (docker compose locally and in CI)

## Architecture

Stateless proxy from MCP to the Kratos Admin API. Layers, bottom up:

- `src/config.ts` - `loadConfig(env)` validates `KRATOS_*` env vars into a `Config` (URL, auth, timeout, toolsets, runtime flags).
- `src/kratos/client.ts` - `createKratosClients(config)` builds `@ory/kratos-client` `IdentityApi`/`CourierApi`/`MetadataApi` plus a raw `http.get` for endpoints the SDK cannot reach. Strips trailing `/` and a trailing `/admin` from the base URL (the SDK adds `/admin` itself). `kratos/pagination.ts` extracts `nextPageToken` from Link headers; `kratos/types.ts` holds `CREDENTIAL_TYPES` (7 login types), `ALL_CREDENTIAL_TYPES` (11) and `redactCredentials`.
- `src/tools/define.ts` - `defineTool(ctx, def)` is the single registration path. It wraps `McpServer.registerTool` with logging/timing, `mapError` (src/errors/mapper.ts), `structuredContent` when an `outputSchema` is given, annotations (`READ_ONLY`, `CREATE`, `UPDATE`, `UPDATE_IDEMPOTENT`, `DESTRUCTIVE` presets), toolset gating and read-only gating (disabled tools are hidden from `tools/list`), and a `confirm(message)` helper that uses MCP elicitation for `destructiveHint` tools (returns `CANCELLED` when declined).
- `src/tools/*.ts` - one `registerXxxTools(ctx)` per toolset (identity, session, courier, recovery, health, analytics). Zod input/output schemas live in `src/schemas/tools.ts`.
- `src/resources/schemas.ts` - resources `kratos://schemas`, `kratos://schemas/{schema_id}` (ResourceTemplate with list + completion) and `kratos://config/connection`.
- `src/server.ts` - `createServer(config, clients)` builds the `McpServer` (instructions, logging bridge to the client, `logging/setLevel`) and registers every toolset and the resources.
- `src/index.ts` - CLI entrypoint: load config, create clients, create server, connect stdio.

### defineTool contract

```ts
defineTool(ctx, {
  name: "kratos_xxx", title, description, toolset,   // toolset: one of TOOLSETS in config.ts
  inputSchema: ZodObject, outputSchema?: ZodObject,   // outputSchema => structuredContent + SDK validation
  annotations: READ_ONLY | CREATE | UPDATE | UPDATE_IDEMPOTENT | DESTRUCTIVE,
  run: async (args, { log, confirm }) => result,      // throw Kratos/axios errors; mapper turns them into isError results
});
```

### Adding a tool

1. Add input/output Zod schemas to `src/schemas/tools.ts` (reuse `PaginationInputSchema`, `PaginatedOutputSchema`, `ScanSummarySchema`, `MaxPagesInputSchema`, `GoDurationSchema`).
2. Call `defineTool` inside the matching `registerXxxTools` in `src/tools/`. Destructive tools must `await confirm(...)` first and return `CANCELLED` if declined. Redact credentials with `redactCredentials(identity, config.allowCredentialExposure)`.
3. Add a unit test in `tests/unit/` using the harness; add an integration test in `tests/api/` if the Kratos call is new.
4. Update the tool table in README.md.

### Test harness

`tests/unit/harness.ts` boots the real `createServer` with `vi.fn()`-backed Kratos client stubs (`createClientStubs`) and connects an MCP `Client` over `InMemoryTransport`. Tests exercise the full `tools/list` / `tools/call` path (annotations, `structuredContent`, toolset/read-only gating, elicitation via a configurable `elicit.handler`). `BASE_CONFIG` is the default `Config`; `page(data, nextToken)` fakes a paginated SDK response; `httpError(status, ...)` fakes an axios error.

Integration tests (`tests/api/`) hit a real Kratos: `docker compose up -d --wait` starts `oryd/kratos:v26.2.0` with `tests/kratos/kratos.yml` + `identity.schema.json`, then `bun run test:api`. `tests/setup/` holds the shared context, fixtures and the compatibility reporter (`tests/test-results.json`). `KRATOS_EXPECTED_VERSION` must match the running instance.

### Runtime flags (KRATOS_*)

`KRATOS_ADMIN_URL` (required), `KRATOS_AUTH_TYPE` (`none`|`api-key`|`custom-headers`) with `KRATOS_API_KEY` / `KRATOS_CUSTOM_HEADERS`, `KRATOS_TIMEOUT_MS` (30000), `KRATOS_TOOLSETS` (comma list or `all`), `KRATOS_READ_ONLY` (false), `KRATOS_CONFIRM_DESTRUCTIVE` (true), `KRATOS_ALLOW_CREDENTIAL_EXPOSURE` (false), `KRATOS_MAX_SCAN_PAGES` (20), `LOG_LEVEL` (info).

## Active Technologies
- TypeScript 5.x with Bun 1.x + @modelcontextprotocol/sdk ^1.25.x, @ory/kratos-client, zod ^3.25.x (001-kratos-mcp-server)
- Vitest for testing, Biome for linting/formatting (001-kratos-mcp-server)
- N/A (stateless proxy to Kratos Admin API) (001-kratos-mcp-server)
- TypeScript 5.x (strict mode) + @modelcontextprotocol/sdk ^1.25.x, @ory/kratos-client, zod ^3.25.x (001-kratos-mcp-server)
- TypeScript 5.x (strict mode) + Vitest ^4.0.x, @ory/kratos-client ^25.4.x, Zod ^3.25.x (002-kratos-api-tests)
- N/A (test suite only, no persistent storage) (002-kratos-api-tests)
- TypeScript 5.x (strict mode), Bun 1.x runtime + GitHub Actions, Biome ^2.3.x, Vitest ^4.0.x, TypeScript ^5.9.x (003-ci-build-pipeline)
- N/A (CI configuration files only) (003-ci-build-pipeline)
- TypeScript 5.x with Bun 1.x runtime + @modelcontextprotocol/sdk ^1.25.x, @ory/kratos-client ^25.4.x, zod ^3.25.x (004-readme-mcp-integration)
- N/A (documentation only) (004-readme-mcp-integration)
- N/A (configuration files only - YAML and Markdown) + None (GitHub-native FUNDING.yml feature) (005-github-donate-option)
- TypeScript 5.x (strict mode) on Bun 1.x runtime + @ory/kratos-client ^26.2.0 (upgraded from ^25.4.0), @modelcontextprotocol/sdk ^1.25.x, zod ^3.25.x (007-kratos-client-26)
- N/A (stateless proxy to Kratos Admin API; this change touches dependency manifests only) (007-kratos-client-26)
- TypeScript 5.x (strict mode) on Bun 1.x + @modelcontextprotocol/sdk ^1.25.x, @ory/kratos-client ^26.2.0 (exposes `getIdentityByExternalID`), zod ^3.25.x (008-native-external-id)
- TypeScript 5.x (strict mode) on Bun 1.x + @modelcontextprotocol/sdk ^1.25.x, @ory/kratos-client ^26.2.0, zod ^3.25.x (009-passkey-code-credentials)
- TypeScript 5.x (strict mode) with Bun 1.x runtime + @modelcontextprotocol/sdk ^1.25.x, @ory/kratos-client ^26.2.0, zod ^3.25.x (010-batch-patch-identities)
- TypeScript 5.x (strict mode) on Bun 1.x (Node >= 20) + @modelcontextprotocol/sdk ^1.30.x (registerTool, annotations, outputSchema, elicitation, ResourceTemplate), @ory/kratos-client ^26.2.0, zod ^3.25.x; docker-compose Kratos v26.2.0 for integration tests (011-architecture-hardening)

## Recent Changes
- 011-architecture-hardening: defineTool registration layer (annotations, structuredContent, elicitation confirm), KRATOS_TOOLSETS/READ_ONLY/CONFIRM_DESTRUCTIVE/ALLOW_CREDENTIAL_EXPOSURE/MAX_SCAN_PAGES flags, nextPageToken pagination, credential redaction, schema tools + ResourceTemplate resources, in-memory test harness, CI integration job via docker-compose
- 003-ci-build-pipeline: Added GitHub Actions CI pipeline for lint, typecheck, and unit tests
- 001-kratos-mcp-server: Updated stack to Bun 1.x + Biome (fast feedback loops per Constitution v1.1.0)
