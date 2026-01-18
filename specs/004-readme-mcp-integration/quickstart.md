# Quick Start Guide Content

This document contains the quick start section content for the README.md.

---

## Quick Start

### 1. Prerequisites

- **Ory Kratos** instance running with Admin API access
- **Node.js 18+** or **Bun 1.x** installed
- One of the supported MCP clients:
  - Claude Code 1.0+
  - VS Code 1.99+ with GitHub Copilot
  - Gemini CLI 0.1+

### 2. Configure Your MCP Client

Choose your MCP client and add the configuration:

#### Claude Code

Add to `~/.claude.json`:

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

#### GitHub Copilot (VS Code)

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

#### Gemini CLI

Add to `~/.gemini/settings.json`:

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

### 3. Verify Installation

Start your MCP client and verify the tools are available:

**Claude Code**: Run `/mcp` to see available servers
**VS Code**: Click the tools icon in Copilot Chat
**Gemini CLI**: The server starts automatically when tools are needed

### 4. Try Your First Command

Ask your AI assistant:

> "List all identities in Kratos"

The MCP server will execute `kratos_list_identities` and return the results.

---

## Common Operations Examples

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
