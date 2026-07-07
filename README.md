# mcp-ory-kratos

![CI](https://github.com/feedback-loop-ai/mcp-ory-kratos/actions/workflows/ci.yml/badge.svg?branch=001-kratos-mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![MCP](https://img.shields.io/badge/MCP-1.25+-blue.svg)](https://modelcontextprotocol.io/)

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
- [Usage Examples](#usage-examples)
- [Troubleshooting](#troubleshooting)
- [Development](#development)
- [Contributing](#contributing)
- [Support](#support)
- [License](#license)

## Prerequisites

- **Ory Kratos** instance running with Admin API access
- **Node.js 18+** or **Bun 1.x** installed
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
| `LOG_LEVEL` | No | `info` | Log level: `trace`, `debug`, `info`, `warn`, `error` |

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

### Identity Tools

| Tool | Description |
|------|-------------|
| `kratos_list_identities` | List identities with optional filtering by credential identifier (e.g., email) |
| `kratos_get_identity` | Get detailed information about a specific identity by ID |
| `kratos_get_identity_by_external_id` | Look up identity by external identifier |
| `kratos_create_identity` | Create a new identity with schema, traits, and optional metadata |
| `kratos_batch_patch_identities` | Bulk-create up to 100 identities in one non-atomic request, with per-item results and a summary |
| `kratos_update_identity` | Full update of an identity (replaces all fields) |
| `kratos_patch_identity` | Partial update using JSON Patch operations |
| `kratos_delete_identity` | Permanently delete an identity and all associated data |
| `kratos_delete_identity_credential` | Delete a specific credential type from an identity |

### Session Tools

| Tool | Description |
|------|-------------|
| `kratos_list_sessions` | List all sessions with optional filtering by active status |
| `kratos_get_session` | Get session details by ID |
| `kratos_list_identity_sessions` | List all sessions for a specific identity |
| `kratos_disable_session` | Revoke/disable a session (log user out) |
| `kratos_extend_session` | Extend session expiration time |
| `kratos_delete_identity_sessions` | Delete all sessions for an identity |

### Courier Tools

| Tool | Description |
|------|-------------|
| `kratos_list_courier_messages` | List emails/SMS sent by Kratos with delivery status |
| `kratos_get_courier_message` | Get courier message details including delivery attempts |

### Recovery Tools

| Tool | Description |
|------|-------------|
| `kratos_create_recovery_link` | Generate account recovery link for a user |
| `kratos_create_recovery_code` | Generate account recovery code for a user |

### Analytics Tools

| Tool | Description |
|------|-------------|
| `kratos_session_analytics` | Aggregated session statistics (auth methods, devices, browsers) |
| `kratos_credential_analytics` | Authentication method adoption statistics and MFA rates |

### Health Tools

| Tool | Description |
|------|-------------|
| `kratos_health_alive` | Check if Kratos server is alive and accepting requests |
| `kratos_health_ready` | Check if Kratos is ready (database connectivity, dependencies) |
| `kratos_version` | Get Kratos server version |

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

# Type check
bun x tsc --noEmit

# Run unit tests
bun x vitest run --config tests/vitest.config.ts --dir tests/unit

# Run all tests (requires Kratos - see .env.test.local.example)
bun run test

# Run tests with coverage
bun run test -- --coverage.enabled
```

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Make your changes
4. Run lint and tests (`bun run lint && bun run test`)
5. Commit your changes (`git commit -m 'Add my feature'`)
6. Push to your branch (`git push origin feature/my-feature`)
7. Open a Pull Request

## Support

If you find this project useful, consider sponsoring its development:

[![Sponsor](https://img.shields.io/badge/Sponsor-%E2%9D%A4-pink?logo=github-sponsors)](https://github.com/sponsors/valentinyanakiev)

Your support helps maintain and improve the MCP Ory Kratos server.

## License

[MIT](LICENSE)
