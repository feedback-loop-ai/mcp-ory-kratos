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

# Run integration tests (requires Kratos - see .env.test.local.example)
bun run test
bun run test:watch

# Run unit tests only (CI-safe, no external dependencies)
bun x vitest run --config tests/vitest.config.ts --dir tests/unit

# Run tests with coverage
bun run test -- --coverage.enabled
```

## CI/CD

GitHub Actions CI runs on every push and PR:
- **Lint**: `bun run lint` (Biome)
- **Type Check**: `bun x tsc --noEmit`
- **Test**: Unit tests only (tests/unit/) - integration tests excluded

Test organization:
- `tests/unit/` - Unit tests (run in CI)
- `tests/api/` - Integration tests (require Kratos, run locally only)

## Architecture

*To be updated once the codebase is developed.*

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

## Recent Changes
- 003-ci-build-pipeline: Added GitHub Actions CI pipeline for lint, typecheck, and unit tests
- 001-kratos-mcp-server: Updated stack to Bun 1.x + Biome (fast feedback loops per Constitution v1.1.0)
