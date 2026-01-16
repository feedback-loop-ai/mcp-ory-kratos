# Quickstart: Ory Kratos MCP Server

**Date**: 2026-01-14
**Feature**: 001-kratos-mcp-server

## Prerequisites

- Bun 1.x (install: `curl -fsSL https://bun.sh/install | bash`)
- Access to an Ory Kratos instance (self-hosted or Ory Network)
- An MCP-compatible client (e.g., Claude Desktop)

## Installation

```bash
# Clone the repository
git clone https://github.com/your-org/mcp-ory-kratos.git
cd mcp-ory-kratos

# Install dependencies
bun install

# Note: No build step needed - Bun runs TypeScript directly
```

## Configuration

The MCP server is configured via environment variables:

```bash
# Required: Kratos Admin API base URL
export KRATOS_ADMIN_URL="http://localhost:4434"

# Authentication (choose one):

# Option 1: No auth (self-hosted with network security)
export KRATOS_AUTH_TYPE="none"

# Option 2: API Key (Ory Network)
export KRATOS_AUTH_TYPE="api-key"
export KRATOS_API_KEY="ory_pat_..."

# Option 3: Custom headers (enterprise proxy)
export KRATOS_AUTH_TYPE="custom-headers"
export KRATOS_CUSTOM_HEADERS='{"X-Custom-Auth": "value"}'

# Optional: Logging
export LOG_LEVEL="info"  # trace, debug, info, warn, error
```

## Running the Server

### Standalone (for testing)

```bash
bun run src/index.ts
```

### With Claude Desktop

Add to your Claude Desktop configuration (`~/.config/claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "kratos": {
      "command": "bun",
      "args": ["run", "/path/to/mcp-ory-kratos/src/index.ts"],
      "env": {
        "KRATOS_ADMIN_URL": "http://localhost:4434",
        "KRATOS_AUTH_TYPE": "none",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

Restart Claude Desktop to load the MCP server.

## Verifying the Setup

Once connected, you can verify the setup by asking Claude to:

1. **Check health**: "Check if Kratos is healthy"
2. **List schemas**: "Show me the available identity schemas"
3. **List identities**: "List the first 5 identities"

## Example Usage

### For Business Analysts

```
"Show me session analytics for the last 7 days"
"What authentication methods are users using?"
"How many active sessions do we have right now?"
```

### For DevOps/CloudOps

```
"Find the user with email john@example.com"
"Show me all sessions for identity 12345-..."
"What courier messages failed in the last hour?"
"Revoke all sessions for user abc123"
"Generate a recovery link for identity xyz789"
```

## Development

### Running Tests

```bash
# Run tests
bun test

# Watch mode
bun test --watch
```

**Note**: Tests are not implemented in this initial version. The test infrastructure (Vitest) is set up and ready for future test development.

### Linting & Formatting

```bash
# Check for issues
bun run lint

# Auto-fix issues
bun run lint:fix

# Format code
bun run format
```

## Troubleshooting

### "Cannot connect to Kratos"

1. Verify `KRATOS_ADMIN_URL` is correct
2. Check if Kratos is running: `curl http://localhost:4434/health/alive`
3. Ensure network connectivity between MCP server and Kratos

### "Authentication failed"

1. For Ory Network: Verify `KRATOS_API_KEY` is valid
2. For custom headers: Check header format in `KRATOS_CUSTOM_HEADERS`

### "Tool not found"

1. Restart Claude Desktop after configuration changes
2. Check MCP server logs for startup errors

## Next Steps

- Review the [MCP Tools Contract](./contracts/mcp-tools.md) for all available tools
- Review the [Data Model](./data-model.md) for entity structures
- See the [Research](./research.md) for technical decisions
