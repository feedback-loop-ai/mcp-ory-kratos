# Quickstart: Release Pipeline

**Date**: 2026-01-19
**Feature**: 006-release-pipeline

## Prerequisites

### 1. Configure npm Trusted Publishing (Recommended - No Secrets Needed)

OIDC Trusted Publishing eliminates the need for long-lived npm tokens.

**On npmjs.com** (after first manual publish to create the package):
1. Go to https://www.npmjs.com/package/mcp-ory-kratos/access
2. Scroll to "Publishing access" → "Add trusted publisher"
3. Configure:
   - **Provider**: GitHub Actions
   - **Organization/User**: `feedback-loop-ai`
   - **Repository**: `mcp-ory-kratos`
   - **Workflow filename**: `release.yml`
   - **Environment**: (leave empty)
4. Click "Add trusted publisher"

**Note**: The package must exist on npm before configuring trusted publishers. For the initial v0.1.0 release, use the NPM_TOKEN fallback method below.

### 2. Fallback: NPM_TOKEN (Legacy - For Initial Publish Only)

Only needed for the first release before the package exists on npm:
- Go to https://npmjs.com/settings/tokens
- Create "Granular Access Token" with publish permission
- Add to GitHub: Settings → Secrets → Actions → `NPM_TOKEN`

After the initial publish, configure Trusted Publishing and remove the NPM_TOKEN secret.

### 3. Repository Permissions

GitHub Actions workflow requires these permissions (configured in `release.yml`):
- `contents: write` - For creating GitHub Releases
- `id-token: write` - For OIDC authentication to npm

---

## Creating a Release

### Stable Release

```bash
# 1. Update version in package.json (optional - workflow can sync from tag)
bun version patch  # or minor, or major

# 2. Commit and push
git add package.json
git commit -m "chore: bump version to 1.2.3"
git push

# 3. Create and push version tag
git tag v1.2.3
git push origin v1.2.3
```

The release workflow automatically:
1. Runs lint, type-check, and tests
2. Builds the distributable bundle
3. Publishes to npm with `latest` tag
4. Creates GitHub Release with auto-generated notes

### Pre-Release (Alpha/Beta/RC)

```bash
# Alpha release
git tag v1.2.3-alpha.0
git push origin v1.2.3-alpha.0

# Beta release
git tag v1.2.3-beta.0
git push origin v1.2.3-beta.0

# Release candidate
git tag v1.2.3-rc.0
git push origin v1.2.3-rc.0
```

Pre-releases are published with their respective dist-tags:
- `npm install mcp-ory-kratos@alpha`
- `npm install mcp-ory-kratos@beta`
- `npm install mcp-ory-kratos@rc`

---

## Local Build Testing

```bash
# Run the build locally
bun run build

# Verify output
ls -la dist/
cat dist/index.js | head -20  # Should show shebang

# Test the built output
node dist/index.js --help  # Node.js
bun dist/index.js --help   # Bun

# Check package size
du -h dist/index.js  # Should be < 5MB
```

---

## Workflow Structure

### release.yml (New)

Triggers on version tags (`v*`):

```yaml
on:
  push:
    tags:
      - 'v[0-9]+.[0-9]+.[0-9]+'
      - 'v[0-9]+.[0-9]+.[0-9]+-alpha*'
      - 'v[0-9]+.[0-9]+.[0-9]+-beta*'
      - 'v[0-9]+.[0-9]+.[0-9]+-rc*'
```

### Job Flow

```
┌─────────────┐
│ Validate    │ ← Lint, TypeCheck, Test
└──────┬──────┘
       │ pass
       ↓
┌─────────────┐
│ Build       │ ← bun build
└──────┬──────┘
       │
       ↓
┌─────────────┐
│ Publish npm │ ← npm publish (with retry)
└──────┬──────┘
       │
       ↓
┌─────────────┐
│ GitHub      │ ← gh release create
│ Release     │
└─────────────┘
```

---

## Installing the Published Package

### For Users

```bash
# Install globally
npm install -g mcp-ory-kratos

# Run
mcp-ory-kratos --help

# Or use with npx
npx mcp-ory-kratos
```

### Configure in MCP Client

**Claude Desktop** (`~/.config/claude/claude_desktop_config.json`):

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

**VS Code Extension**:

```json
{
  "mcp.servers": {
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

---

## Troubleshooting

### npm Publish Fails with 404 (OIDC)

This usually means the Trusted Publisher configuration doesn't match your workflow:
1. Verify org/user, repository, and workflow filename match exactly on npmjs.com
2. Ensure `id-token: write` permission is set in workflow
3. Check that package exists on npm (OIDC requires pre-existing package)

### npm Publish Fails (General)

1. If using NPM_TOKEN: Check secret is configured correctly
2. Verify package name is not taken: `npm view mcp-ory-kratos`
3. Check version doesn't already exist: `npm view mcp-ory-kratos versions`
4. Review workflow logs for specific error

### Build Fails

1. Run locally: `bun run build`
2. Check TypeScript errors: `bun x tsc --noEmit`
3. Check lint errors: `bun run lint`

### Tag Already Exists

```bash
# Delete local tag
git tag -d v1.2.3

# Delete remote tag (if needed)
git push origin :refs/tags/v1.2.3

# Create new tag
git tag v1.2.3
git push origin v1.2.3
```

---

## Verification Checklist

After publishing a release:

- [ ] Package visible on npmjs.com: https://www.npmjs.com/package/mcp-ory-kratos
- [ ] GitHub Release created with release notes
- [ ] Can install: `npm install -g mcp-ory-kratos`
- [ ] Can run: `mcp-ory-kratos --help`
- [ ] Package size < 5MB
- [ ] Works with Node.js 18+: `node $(which mcp-ory-kratos) --help`
- [ ] Works with Bun: `bun $(which mcp-ory-kratos) --help`
