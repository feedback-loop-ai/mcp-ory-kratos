# Quickstart: Kratos API Compatibility Tests

This guide covers setup and execution of the Kratos API compatibility test suite.

## Prerequisites

- Bun 1.x installed
- Access to a running Ory Kratos instance with Admin API enabled
- Admin API credentials (if authentication is required)

## Setup

### 1. Install Dependencies

```bash
bun install
```

### 2. Configure Test Environment

Create a `.env.test.local` file in the repository root (this file is gitignored):

```bash
# Required: Kratos Admin API endpoint
KRATOS_ADMIN_URL=http://localhost:4434

# Required: Expected Kratos version (tests fail if mismatch)
KRATOS_EXPECTED_VERSION=v1.3.0

# Authentication (choose one)
# Option A: No authentication
KRATOS_AUTH_TYPE=none

# Option B: API Key
# KRATOS_AUTH_TYPE=api-key
# KRATOS_API_KEY=your-api-key

# Option C: Custom headers (JSON format)
# KRATOS_AUTH_TYPE=custom-headers
# KRATOS_CUSTOM_HEADERS={"X-Custom-Header": "value"}

# Optional: Request timeout (default: 30000ms)
# KRATOS_TIMEOUT_MS=30000
```

### 3. Verify Configuration

Check that your Kratos instance is accessible:

```bash
curl -s ${KRATOS_ADMIN_URL}/health/alive
# Should return: {"status":"ok"}
```

## Running Tests

### Run All Tests

```bash
bun run test
```

### Run Specific Test Suite

```bash
# Identity tests only
bun run test tests/api/identity.test.ts

# Session tests only
bun run test tests/api/session.test.ts

# Health check tests only
bun run test tests/api/health.test.ts

# Recovery tests only
bun run test tests/api/recovery.test.ts

# Courier tests only
bun run test tests/api/courier.test.ts
```

### Run with Verbose Output

```bash
bun run test:verbose
```

### Run in Watch Mode (for development)

```bash
bun run test:watch
```

## Test Categories

| Suite | File | Coverage |
|-------|------|----------|
| Identity | `tests/api/identity.test.ts` | List, Get, Create, Update, Patch, Delete |
| Session | `tests/api/session.test.ts` | List, Get, Extend, Disable, Delete |
| Recovery | `tests/api/recovery.test.ts` | Create Link, Create Code |
| Courier | `tests/api/courier.test.ts` | List Messages, Get Message |
| Health | `tests/api/health.test.ts` | Alive, Ready, Version |

## Fail-Fast Behavior

The test suite will abort immediately in these scenarios:

1. **Connection Error**: Kratos endpoint unreachable
2. **Authentication Error**: 401/403 response from Kratos
3. **Version Mismatch**: Kratos version doesn't match `KRATOS_EXPECTED_VERSION`

When this happens, you'll see a clear error message explaining the issue.

## Test Data Cleanup

Tests automatically clean up any data they create:

- Identities created during tests are deleted in `afterAll` hooks
- Cleanup runs even if tests fail
- If cleanup fails, the test report includes failed deletion IDs

## Troubleshooting

### "Cannot connect to Kratos"

- Verify `KRATOS_ADMIN_URL` is correct
- Check Kratos is running: `curl ${KRATOS_ADMIN_URL}/health/alive`
- Ensure you're targeting the Admin API (typically port 4434, not 4433)

### "Authentication failed"

- Verify `KRATOS_AUTH_TYPE` matches your Kratos configuration
- Check `KRATOS_API_KEY` or `KRATOS_CUSTOM_HEADERS` values
- Ensure credentials have admin permissions

### "Version mismatch"

- Check actual version: `curl ${KRATOS_ADMIN_URL}/version`
- Update `KRATOS_EXPECTED_VERSION` to match

### Tests fail with "Identity not found"

- This usually indicates a previous test run didn't clean up properly
- Run cleanup manually or restart your Kratos instance

## CI/CD Integration

For CI pipelines, set environment variables directly:

```yaml
# GitHub Actions example
env:
  KRATOS_ADMIN_URL: ${{ secrets.KRATOS_ADMIN_URL }}
  KRATOS_AUTH_TYPE: api-key
  KRATOS_API_KEY: ${{ secrets.KRATOS_API_KEY }}
  KRATOS_EXPECTED_VERSION: v1.3.0

steps:
  - uses: actions/checkout@v4
  - uses: oven-sh/setup-bun@v2
  - run: bun install
  - run: bun test
```
