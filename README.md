# mcp-ory-kratos

![CI](https://github.com/feedback-loop-ai/mcp-ory-kratos/actions/workflows/ci.yml/badge.svg?branch=main)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![MCP](https://img.shields.io/badge/MCP-1.30+-blue.svg)](https://modelcontextprotocol.io/)

MCP server enabling AI assistants to manage Ory Kratos identities, sessions, and authentication flows. Built for developers integrating identity management into Claude Code, GitHub Copilot, or Gemini CLI workflows.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
  - [Environment Variables](#environment-variables)
  - [Claude Code](#claude-code)
  - [GitHub Copilot (VS Code)](#github-copilot-vs-code)
  - [Gemini CLI](#gemini-cli)
- [Quick Start](#quick-start)
- [Tool Reference](#tool-reference)
  - [Identity Tools](#identity-tools)
  - [Session Tools](#session-tools)
  - [Courier Tools](#courier-tools)
  - [Recovery Tools](#recovery-tools)
  - [Analytics Tools](#analytics-tools)
  - [Health Tools](#health-tools)
- [Behaviour](#behaviour)
  - [Pagination](#pagination)
  - [Credential Redaction](#credential-redaction)
  - [Destructive Tools and Confirmation](#destructive-tools-and-confirmation)
  - [Resources](#resources)
- [Usage Examples](#usage-examples)
- [Troubleshooting](#troubleshooting)
- [Development](#development)
- [Contributing](#contributing)
- [Support](#support)
- [License](#license)

## Prerequisites

- **Ory Kratos** instance running with Admin API access (developed and tested against **v26.2.0**; the integration suite pins that version)
- **Node.js 20+** or **Bun 1.x** installed
- One of the supported MCP clients:
  - **Claude Code** 1.0+
  - **VS Code** 1.99+ with GitHub Copilot (GA in 1.102+)
  - **Gemini CLI** 0.1+

> **Note**: Kratos deployment and configuration is out of scope for this MCP server. See the [Ory Kratos documentation](https://www.ory.sh/docs/kratos) for deployment guidance.

## Installation

Install via npm or run directly with npx:

```bash
# Using npm
npm install -g mcp-ory-kratos

# Using npx (no installation required)
npx mcp-ory-kratos

# Using bun
bun add -g mcp-ory-kratos
```

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `KRATOS_ADMIN_URL` | Yes | - | Kratos Admin API base URL (e.g., `http://localhost:4434`) |
| `KRATOS_AUTH_TYPE` | No | `none` | Authentication type: `none`, `api-key`, or `custom-headers` |
| `KRATOS_API_KEY` | Conditional | - | Required when `KRATOS_AUTH_TYPE=api-key` |
| `KRATOS_CUSTOM_HEADERS` | Conditional | - | JSON object of headers when `KRATOS_AUTH_TYPE=custom-headers` |
| `KRATOS_TIMEOUT_MS` | No | `30000` | Request timeout in milliseconds |
| `KRATOS_TOOLSETS` | No | `all` | Comma-separated toolsets to expose: `identities`, `sessions`, `courier`, `recovery`, `health`, `analytics` (or `all`) |
| `KRATOS_READ_ONLY` | No | `false` | `1`/`true` hides every tool that is not read-only |
| `KRATOS_CONFIRM_DESTRUCTIVE` | No | `true` | `0`/`false` disables the elicitation prompt before destructive tools run |
| `KRATOS_ALLOW_CREDENTIAL_EXPOSURE` | No | `false` | `1`/`true` returns raw credential config (password hashes, OIDC tokens, TOTP secrets) instead of redacting it |
| `KRATOS_MAX_SCAN_PAGES` | No | `20` | Default page cap (1-1000) for tools that scan many pages (analytics, filtered session listing) |
| `LOG_LEVEL` | No | `info` | Log level: `trace`, `debug`, `info`, `warn`, `error` |

Boolean variables accept `1`, `true`, `yes`, `on` (case-insensitive); anything else is `false`.

> **Admin URL**: The Kratos SDK appends `/admin/...` to the base URL itself. Trailing slashes are stripped, and if `KRATOS_ADMIN_URL` already ends in `/admin` (common behind a reverse proxy, e.g. `https://ory.example.com/kratos/admin`) that suffix is removed for SDK calls so paths do not become `/admin/admin/...`. Both `http://localhost:4434` and `http://localhost:4434/admin` work.

> **Note**: This MCP server can run alongside other MCP servers in your configuration. Each server operates independently.

### Claude Code

Add to `~/.claude.json` for global configuration:

```json
{
  "mcpServers": {
    "kratos": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "mcp-ory-kratos"],
      "env": {
        "KRATOS_ADMIN_URL": "http://localhost:4434"
      }
    }
  }
}
```

For project-scoped configuration, create `.mcp.json` in your project root:

```json
{
  "mcpServers": {
    "kratos": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "mcp-ory-kratos"],
      "env": {
        "KRATOS_ADMIN_URL": "http://localhost:4434"
      }
    }
  }
}
```

### GitHub Copilot (VS Code)

Create `.vscode/mcp.json` in your workspace:

```json
{
  "servers": {
    "kratos": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "mcp-ory-kratos"],
      "env": {
        "KRATOS_ADMIN_URL": "http://localhost:4434"
      }
    }
  }
}
```

For secrets handling with input variables:

```json
{
  "inputs": [
    {
      "type": "promptString",
      "id": "kratos-url",
      "description": "Kratos Admin API URL",
      "password": false
    }
  ],
  "servers": {
    "kratos": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "mcp-ory-kratos"],
      "env": {
        "KRATOS_ADMIN_URL": "${input:kratos-url}"
      }
    }
  }
}
```

### Gemini CLI

Add to `~/.gemini/settings.json` for global configuration:

```json
{
  "mcpServers": {
    "kratos": {
      "command": "npx",
      "args": ["-y", "mcp-ory-kratos"],
      "env": {
        "KRATOS_ADMIN_URL": "http://localhost:4434"
      }
    }
  }
}
```

For project-scoped configuration, create `.gemini/settings.json` in your project:

```json
{
  "mcpServers": {
    "kratos": {
      "command": "npx",
      "args": ["-y", "mcp-ory-kratos"],
      "env": {
        "KRATOS_ADMIN_URL": "http://localhost:4434"
      }
    }
  }
}
```

## Quick Start

### 1. Configure Your MCP Client

Choose your MCP client from the [Configuration](#configuration) section above and add the appropriate configuration.

### 2. Verify Installation

Start your MCP client and verify the tools are available:

- **Claude Code**: Run `/mcp` to see available servers
- **VS Code**: Click the tools icon in Copilot Chat
- **Gemini CLI**: The server starts automatically when tools are needed

### 3. Try Your First Command

Ask your AI assistant:

> "List all identities in Kratos"

The MCP server will execute `kratos_list_identities` and return the results.

## Tool Reference

27 tools, grouped by toolset (enable/disable groups with `KRATOS_TOOLSETS`). **Kind** is the MCP annotation: read-only tools survive `KRATOS_READ_ONLY=1`; destructive tools change or remove data and trigger a confirmation prompt (see [Behaviour](#behaviour)).

### Identity Tools

Toolset: `identities`

| Tool | Kind | Description |
|------|------|-------------|
| `kratos_list_identities` | read-only | List identities; filter by credential identifier (exact or fuzzy), IDs, organization; optional `includeCredential` |
| `kratos_get_identity` | read-only | Get an identity by ID; `includeCredential` (array of types) expands credentials (`includeCredentials: true` is deprecated) |
| `kratos_get_identity_by_external_id` | read-only | Look up an identity by `external_id` |
| `kratos_list_identity_schemas` | read-only | List identity JSON schemas (paginated) |
| `kratos_get_identity_schema` | read-only | Get one identity JSON schema by ID |
| `kratos_create_identity` | create | Create an identity with schema, traits, metadata, credentials and addresses |
| `kratos_batch_patch_identities` | create | Bulk-create up to 100 identities in one non-atomic request, with per-item results and a summary |
| `kratos_update_identity` | destructive | Full update of an identity (replaces all fields) |
| `kratos_patch_identity` | destructive | Partial update using JSON Patch operations |
| `kratos_set_identity_state` | destructive | Activate or suspend an identity; optionally revoke all its sessions |
| `kratos_delete_identity` | destructive | Permanently delete an identity and all associated data |
| `kratos_delete_identity_credential` | destructive | Delete a credential type; `identifier` (`<provider>:<subject>`) unlinks a single oidc/saml provider |

### Session Tools

Toolset: `sessions`

| Tool | Kind | Description |
|------|------|-------------|
| `kratos_list_sessions` | read-only | List sessions (`pageSize`/`pageToken`); `filter` (auth method, provider, time range) scans up to `maxPages` pages client-side |
| `kratos_get_session` | read-only | Get session details by ID |
| `kratos_list_identity_sessions` | read-only | List sessions for one identity |
| `kratos_disable_session` | destructive | Revoke/disable a session (log user out) |
| `kratos_extend_session` | destructive | Extend session expiration time |
| `kratos_delete_identity_sessions` | destructive | Delete all sessions for an identity |

### Courier Tools

Toolset: `courier`

| Tool | Kind | Description |
|------|------|-------------|
| `kratos_list_courier_messages` | read-only | List emails/SMS sent by Kratos with delivery status |
| `kratos_get_courier_message` | read-only | Get courier message details including delivery attempts |

### Recovery Tools

Toolset: `recovery`

| Tool | Kind | Description |
|------|------|-------------|
| `kratos_create_recovery_link` | create | Generate an account recovery link (`expiresIn` Go duration, `returnTo` URL) |
| `kratos_create_recovery_code` | create | Generate an account recovery code (`expiresIn` Go duration, `flowType` browser/api) |

> Recovery links and codes are equivalent to full account takeover. Treat them as secrets.

### Analytics Tools

Toolset: `analytics`

| Tool | Kind | Description |
|------|------|-------------|
| `kratos_session_analytics` | read-only | Aggregated session statistics (auth methods, assurance levels, devices, browsers) |
| `kratos_credential_analytics` | read-only | Credential type distribution, MFA and passwordless (passkey) adoption |

Both scan up to `maxPages` pages and report `pagesScanned` / `truncated`.

### Health Tools

Toolset: `health`

| Tool | Kind | Description |
|------|------|-------------|
| `kratos_health_alive` | read-only | Check if Kratos is alive and accepting requests |
| `kratos_health_ready` | read-only | Check if Kratos is ready (database connectivity, dependencies) |
| `kratos_version` | read-only | Get the Kratos server version |

## Behaviour

Every tool declares an `outputSchema` and returns its result as `structuredContent` alongside the JSON text; errors come back as `isError` results with `{ code, message, kratosStatus?, suggestion? }`.

### Pagination

List tools take `pageSize` (1-100, default 20) and `pageToken`, and return `{ items, count, nextPageToken }`. `nextPageToken` is absent on the last page; pass it back as `pageToken` to continue. Tokens are opaque cursors bound to the Kratos instance.

Tools that walk many pages (analytics, `kratos_list_sessions` with `filter`) accept `maxPages` (default `KRATOS_MAX_SCAN_PAGES`) and return `pagesScanned` and `truncated`. When `truncated` is true the page cap was hit; raise `maxPages` or resume from the returned `nextPageToken`.

### Credential Redaction

When `includeCredential` is requested, the `config` of secret-bearing credential types (`password`, `oidc`, `saml`, `totp`, `lookup_secret`, `webauthn`, `passkey`) is replaced with `"[redacted: set KRATOS_ALLOW_CREDENTIAL_EXPOSURE=1]"`. Type, identifiers, version and timestamps are kept so an agent can still see what is linked. Set `KRATOS_ALLOW_CREDENTIAL_EXPOSURE=1` to return the raw config.

### Destructive Tools and Confirmation

Tools annotated `destructiveHint` (delete, disable, update, patch, set state) ask the client to confirm via [MCP elicitation](https://modelcontextprotocol.io/) before doing anything. If the user declines, the tool returns `{ cancelled: true }` and nothing is changed. Clients without elicitation support skip the prompt (the annotation still lets them warn on their own). Disable the prompt with `KRATOS_CONFIRM_DESTRUCTIVE=0`, or hide destructive tools entirely with `KRATOS_READ_ONLY=1`.

### Resources

| URI | Description |
|-----|-------------|
| `kratos://schemas` | All identity schemas (`{ schemas: [{ id, schema }] }`) |
| `kratos://schemas/{schema_id}` | One identity JSON schema; listed and completable per schema ID |
| `kratos://config/connection` | Non-sensitive connection info: base URL (credentials stripped), auth type, timeout, enabled toolsets, read-only flag, reachability and Kratos version |

## Usage Examples

### List Identities

```
List all identities in Kratos
```

### Find User by Email

```
Find the identity with email user@example.com
```

### Check Kratos Health

```
Is Kratos healthy and ready?
```

### View Active Sessions

```
Show all active sessions in Kratos
```

### Get Session Analytics

```
What authentication methods are users using? Show session analytics.
```

### Create Recovery Link

```
Create a recovery link for user with ID abc-123
```

## Troubleshooting

### Connection refused

**Symptom**: `ECONNREFUSED` or connection timeout errors

**Solutions**:
1. Verify Kratos is running: `curl http://localhost:4434/health/alive`
2. Check `KRATOS_ADMIN_URL` is correct (use Admin API port, typically 4434)
3. Ensure Kratos Admin API is accessible from the MCP server's network

### 401 Unauthorized

**Symptom**: Authentication errors when calling Kratos API

**Solutions**:
1. If Kratos requires authentication, set `KRATOS_AUTH_TYPE=api-key`
2. Provide `KRATOS_API_KEY` with a valid API key
3. For custom auth, use `KRATOS_AUTH_TYPE=custom-headers` with `KRATOS_CUSTOM_HEADERS`

### Tool not found

**Symptom**: MCP client doesn't show Kratos tools

**Solutions**:
1. Restart your MCP client after configuration changes
2. Verify configuration file syntax (valid JSON)
3. Check file location matches your client's expected path
4. Run `npx mcp-ory-kratos` manually to verify the server starts

### Timeout errors

**Symptom**: Requests timeout before completing

**Solutions**:
1. Increase `KRATOS_TIMEOUT_MS` (default: 30000ms)
2. Check network latency to Kratos instance
3. Verify Kratos isn't overloaded or unresponsive

## Development

### Local Setup

```bash
# Clone the repository
git clone https://github.com/feedback-loop-ai/mcp-ory-kratos.git
cd mcp-ory-kratos

# Install dependencies
bun install

# Start the MCP server
bun run start
```

### Build Commands

```bash
# Lint (Biome)
bun run lint
bun run lint:fix  # Auto-fix issues

# Type check (src + tests)
bun run typecheck

# Unit tests (hermetic, with coverage) - this is what CI runs
bun run test:unit

# Dependency audit (high severity and above)
bun run audit

# Build the distributable
bun run build
```

### Integration Tests

The integration suite in `tests/api/` runs against a real Kratos (pinned to v26.2.0, configured from `tests/kratos/`). Start one with Docker and run the suite:

```bash
docker compose up -d --wait
bun run test:api
docker compose down
```

To target another instance, copy `.env.test.local.example` to `.env.test.local` and set `KRATOS_ADMIN_URL` / `KRATOS_EXPECTED_VERSION` (the suite fails fast on a version mismatch). Override the container version with `KRATOS_VERSION=v26.x.y docker compose up -d`.

CI runs lint, type check, audit and unit tests on every push and PR, plus the integration job against the docker-compose Kratos.

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Make your changes
4. Run lint, type check and tests (`bun run lint && bun run typecheck && bun run test:unit`)
5. Commit your changes (`git commit -m 'Add my feature'`)
6. Push to your branch (`git push origin feature/my-feature`)
7. Open a Pull Request

## Support

If you find this project useful, consider sponsoring its development:

[![Sponsor](https://img.shields.io/badge/Sponsor-%E2%9D%A4-pink?logo=github-sponsors)](https://github.com/sponsors/valentinyanakiev)

Your support helps maintain and improve the MCP Ory Kratos server.

## License

[MIT](LICENSE)
