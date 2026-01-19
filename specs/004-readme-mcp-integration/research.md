# Research: MCP Client Configuration Formats

**Feature**: 004-readme-mcp-integration
**Date**: 2026-01-18
**Purpose**: Document MCP server configuration formats for Claude Code, GitHub Copilot, and Gemini CLI

---

## 1. Claude Code Configuration

### Decision
Use `~/.claude.json` file with `mcpServers` object for global configuration, or project-scoped `.mcp.json` for local configuration.

### Rationale
- `~/.claude.json` is the recommended location for user-wide MCP server configurations
- Project-scoped `.mcp.json` allows version-controlled team configurations
- CLI command `claude mcp add` provides alternative setup method

### Configuration Format

**File Location**: `~/.claude.json` (user) or `.mcp.json` (project root)

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

### Alternatives Considered
- `~/.claude/settings.json` - Not recognized for MCP servers (documented bug)
- Inline plugin.json - Only for plugin development, not end-user config

### Sources
- [Claude Code MCP Docs](https://code.claude.com/docs/en/mcp)
- [Configuring MCP Tools in Claude Code](https://scottspence.com/posts/configuring-mcp-tools-in-claude-code)
- [GitHub Issue #4976](https://github.com/anthropics/claude-code/issues/4976)

---

## 2. GitHub Copilot (VS Code) Configuration

### Decision
Use `.vscode/mcp.json` file in workspace root with `servers` object.

### Rationale
- VS Code 1.99+ required for MCP support
- Configuration file supports secrets via input variables
- Native integration with VS Code settings UI

### Configuration Format

**File Location**: `.vscode/mcp.json` (workspace)

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

### With Input Variables (for secrets)

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

### Alternatives Considered
- GitHub MCP Registry installation - Requires registry listing, not suitable for initial setup
- User settings.json - Less portable than workspace config

### Sources
- [VS Code MCP Servers Documentation](https://code.visualstudio.com/docs/copilot/customization/mcp-servers)
- [GitHub Docs: Extending Copilot with MCP](https://docs.github.com/copilot/customizing-copilot/using-model-context-protocol/extending-copilot-chat-with-mcp)

---

## 3. Gemini CLI Configuration

### Decision
Use `~/.gemini/settings.json` for global configuration or `.gemini/settings.json` for project-scoped configuration.

### Rationale
- Supports both global and project-level configurations
- Project config in `.gemini/settings.json` overrides global settings
- Consistent with Gemini CLI's standard settings pattern

### Configuration Format

**File Location**: `~/.gemini/settings.json` (global) or `.gemini/settings.json` (project)

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

### Advanced Configuration Options

```json
{
  "mcpServers": {
    "kratos": {
      "command": "npx",
      "args": ["-y", "mcp-ory-kratos"],
      "env": {
        "KRATOS_ADMIN_URL": "$KRATOS_ADMIN_URL"
      },
      "timeout": 30000,
      "trust": false
    }
  }
}
```

### Alternatives Considered
- HTTP/SSE transport - Only for remote servers, not local stdio
- Docker MCP Toolkit - Additional complexity not needed for simple setup

### Sources
- [Gemini CLI MCP Server Docs](https://geminicli.com/docs/tools/mcp-server/)
- [GitHub: gemini-cli configuration.md](https://github.com/google-gemini/gemini-cli/blob/main/docs/get-started/configuration.md)

---

## 4. MCP Server Environment Variables

### Decision
Document the following environment variables as the standard configuration interface:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `KRATOS_ADMIN_URL` | Yes | - | Kratos Admin API base URL (e.g., `http://localhost:4434`) |
| `KRATOS_AUTH_TYPE` | No | `none` | Authentication type: `none`, `api-key`, or `custom-headers` |
| `KRATOS_API_KEY` | Conditional | - | Required when `KRATOS_AUTH_TYPE=api-key` |
| `KRATOS_CUSTOM_HEADERS` | Conditional | - | JSON object of headers when `KRATOS_AUTH_TYPE=custom-headers` |
| `KRATOS_TIMEOUT_MS` | No | `30000` | Request timeout in milliseconds |
| `LOG_LEVEL` | No | `info` | Log level: `trace`, `debug`, `info`, `warn`, `error` |

### Rationale
- Environment variables are the standard MCP configuration pattern
- All MCP clients support `env` field in server configuration
- Sensitive values (API keys) should use client-specific secret management

---

## 5. Minimum Version Requirements

### Decision
Document the following minimum versions based on MCP support availability:

| Client | Minimum Version | MCP Support Status |
|--------|-----------------|-------------------|
| Claude Code | 1.0.0 | Full support |
| VS Code (Copilot) | 1.99 | GA in 1.102+ |
| Gemini CLI | 0.1.0 | Full support |

### Rationale
- These versions have stable MCP stdio transport support
- Older versions may lack full feature support or have bugs

### Sources
- VS Code 1.99 changelog mentions MCP preview
- VS Code 1.102 changelog mentions MCP GA

---

## 6. Available MCP Tools Summary

### Decision
Document all 23 tools grouped by category for the tool reference section.

### Tool Inventory

**Identity Tools (8)**
| Tool | Description |
|------|-------------|
| `kratos_list_identities` | List identities with optional filtering by credential identifier |
| `kratos_get_identity` | Get detailed information about a specific identity |
| `kratos_get_identity_by_external_id` | Look up identity by external identifier |
| `kratos_create_identity` | Create a new identity with schema, traits, metadata |
| `kratos_update_identity` | Full update of an identity |
| `kratos_patch_identity` | Partial update using JSON Patch operations |
| `kratos_delete_identity` | Permanently delete an identity |
| `kratos_delete_identity_credential` | Delete a specific credential type |

**Session Tools (6)**
| Tool | Description |
|------|-------------|
| `kratos_list_sessions` | List all sessions with optional filtering |
| `kratos_get_session` | Get session details by ID |
| `kratos_list_identity_sessions` | List all sessions for a specific identity |
| `kratos_disable_session` | Revoke/disable a session |
| `kratos_extend_session` | Extend session expiration |
| `kratos_delete_identity_sessions` | Delete all sessions for an identity |

**Courier Tools (2)**
| Tool | Description |
|------|-------------|
| `kratos_list_courier_messages` | List emails/SMS sent by Kratos |
| `kratos_get_courier_message` | Get courier message details |

**Recovery Tools (2)**
| Tool | Description |
|------|-------------|
| `kratos_create_recovery_link` | Generate account recovery link |
| `kratos_create_recovery_code` | Generate account recovery code |

**Analytics Tools (2)**
| Tool | Description |
|------|-------------|
| `kratos_session_analytics` | Aggregated session statistics |
| `kratos_credential_analytics` | Authentication method adoption statistics |

**Health Tools (3)**
| Tool | Description |
|------|-------------|
| `kratos_health_alive` | Check if Kratos is alive |
| `kratos_health_ready` | Check if Kratos is ready |
| `kratos_version` | Get Kratos server version |

### Rationale
- Categories match the existing tool organization in the codebase
- Each tool has clear, actionable description
- Tool names follow `kratos_` prefix convention for discoverability

---

## 7. Troubleshooting Scenarios

### Decision
Document the following common issues:

1. **Connection refused** - Kratos URL incorrect or Kratos not running
2. **401 Unauthorized** - Authentication configuration mismatch
3. **Tool not found** - MCP server not started or config not loaded
4. **Timeout errors** - Increase `KRATOS_TIMEOUT_MS` or check network

### Rationale
- These are the most common issues based on Kratos API error patterns
- Error mapper in codebase provides structured error responses

---

## Summary

All unknowns from Technical Context have been resolved. The README can now be written with:
- Three copy-paste-ready configuration examples for each MCP client
- Complete environment variable reference
- Full tool inventory with descriptions
- Troubleshooting guidance for common issues
