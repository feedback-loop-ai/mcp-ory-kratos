# Research: Release Pipeline

**Date**: 2026-01-19
**Feature**: 006-release-pipeline

## Summary

Research completed for building and releasing the MCP Ory Kratos server as a standalone npm package. All "NEEDS CLARIFICATION" items resolved.

---

## 1. Bun Bundler for npm Distribution

### Decision: Use `bun build` with `target: "node"` and external dependencies

**Rationale**: Bun's bundler produces standard JavaScript that runs on both Node.js 18+ and Bun 1.x without separate builds. The `target: "node"` option ensures compatibility with Node.js runtime APIs.

**Alternatives Considered**:
- **esbuild directly**: Would work but loses Bun ecosystem benefits (native TS, unified tooling)
- **tsc only**: No bundling capability, would require separate bundler
- **`--compile` standalone binary**: Includes Bun runtime (~90MB), not suitable for npm distribution

### Implementation Approach

```typescript
// bun.build.ts
await Bun.build({
  entrypoints: ["./src/index.ts"],
  outdir: "./dist",
  target: "node",           // Node.js 18+ compatible output
  format: "esm",            // ES modules
  packages: "external",     // Keep npm dependencies external
  minify: false,            // Preserve readability for debugging
});
```

### Key Configuration Points

1. **Shebang**: Use `#!/usr/bin/env node` for broad runtime compatibility
2. **Dependencies as external**: Mark `@modelcontextprotocol/sdk`, `@ory/kratos-client`, `zod` as external
3. **Single file output**: Bundle all local modules into one `dist/index.js`
4. **No TypeScript declarations needed**: MCP server is a CLI tool, not a library

---

## 2. npm Publishing from GitHub Actions

### Decision: Trigger on semantic version tags with OIDC Trusted Publishing

**Rationale**: npm Trusted Publishing (GA July 2025) eliminates long-lived secrets by using OpenID Connect for authentication. Short-lived, per-workflow credentials are more secure than static NPM_TOKEN. Tag-based triggers are explicit and auditable.

**Alternatives Considered**:
- **NPM_TOKEN (legacy)**: Requires secret management, rotation, risk of leakage - use only as fallback
- **Manual publish**: Error-prone, violates SC-006 (zero manual steps)
- **On merge to main**: Requires version bump detection, more complex
- **GitHub Packages**: npm registry has broader ecosystem support

### Workflow Trigger Pattern

```yaml
on:
  push:
    tags:
      - 'v[0-9]+.[0-9]+.[0-9]+'           # Stable: v1.0.0
      - 'v[0-9]+.[0-9]+.[0-9]+-alpha*'    # Alpha: v1.0.0-alpha.0
      - 'v[0-9]+.[0-9]+.[0-9]+-beta*'     # Beta: v1.0.0-beta.0
      - 'v[0-9]+.[0-9]+.[0-9]+-rc*'       # RC: v1.0.0-rc.0
```

### Authentication Setup (OIDC Trusted Publishing - Recommended)

**Prerequisites on npmjs.com**:
1. Go to package settings on npmjs.com → "Publishing access"
2. Add Trusted Publisher with:
   - Provider: GitHub Actions
   - Organization/User: `feedback-loop-ai`
   - Repository: `mcp-ory-kratos`
   - Workflow filename: `release.yml`
   - Environment: (leave empty for no environment restriction)

**Workflow configuration**:

```yaml
permissions:
  contents: write    # For GitHub Release creation
  id-token: write    # Required for OIDC authentication

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '22'        # Node.js 22+ has npm 10.9+ with OIDC support
          registry-url: 'https://registry.npmjs.org'

      - run: npm publish --provenance --access public
        # No NODE_AUTH_TOKEN needed - OIDC handles authentication
```

**Key benefits**:
- No secrets to manage, rotate, or risk leaking
- Provenance attestation is automatic with `--provenance`
- Per-workflow, short-lived credentials
- Audit trail tied to specific workflow runs

### Fallback: NPM_TOKEN (Legacy)

For environments where OIDC is not available (self-hosted runners, older npm versions):

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: '20.x'
    registry-url: 'https://registry.npmjs.org'

- run: npm publish --provenance
  env:
    NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

**Note**: If using NPM_TOKEN fallback, create a Granular Access Token with publish-only scope.

---

## 3. Retry Strategy for npm Publish

### Decision: Single automatic retry with 10-second delay, then fail with clear error

**Rationale**: Per spec edge case: "Single automatic retry, then fail with clear error message for maintainer action." More retries would delay failure notification unnecessarily.

**Alternatives Considered**:
- **No retry**: Too fragile for network issues
- **Multiple retries with backoff**: Delays feedback to maintainers
- **Manual retry only**: More manual intervention required

### Implementation Pattern

```yaml
- name: Publish to npm
  uses: nick-fields/retry@v3
  with:
    max_attempts: 2          # Initial + 1 retry
    timeout_minutes: 10
    retry_wait_seconds: 10
    command: npm publish --provenance
  env:
    NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

**Note**: `--provenance` flag enables npm provenance attestation (verifiable build origin).

---

## 4. GitHub Release with Auto-Generated Notes

### Decision: Use `gh release create --generate-notes`

**Rationale**: Native GitHub CLI integration, automatic changelog from merged PRs, no additional tooling required.

**Alternatives Considered**:
- **Manual release notes**: Requires maintainer effort, error-prone
- **conventional-changelog**: Requires commit message conventions not currently enforced
- **release-drafter**: Additional configuration and GitHub App setup

### Implementation Pattern

```yaml
- name: Create GitHub Release
  env:
    GH_TOKEN: ${{ github.token }}
  run: |
    gh release create "${{ github.ref_name }}" \
      --title "Release ${{ github.ref_name }}" \
      --generate-notes \
      --prerelease=${{ contains(github.ref_name, '-') }}
```

**Key Features**:
- Auto-categorizes PRs by labels (enhancement, bug fix, etc.)
- Automatically sets prerelease flag for alpha/beta/rc versions
- Uses built-in `GITHUB_TOKEN` (no additional secrets needed)

---

## 5. Pre-Release Versions with npm Dist-Tags

### Decision: Use npm dist-tags (alpha, beta, rc) for pre-release versions

**Rationale**: npm dist-tags allow parallel release channels without affecting `latest` tag. Users must explicitly opt-in with `npm install mcp-ory-kratos@beta`.

**Tag Mapping**:

| Version Pattern | Dist-Tag | Install Command |
|-----------------|----------|-----------------|
| v1.2.3 | `latest` | `npm install mcp-ory-kratos` |
| v1.2.3-alpha.0 | `alpha` | `npm install mcp-ory-kratos@alpha` |
| v1.2.3-beta.0 | `beta` | `npm install mcp-ory-kratos@beta` |
| v1.2.3-rc.0 | `rc` | `npm install mcp-ory-kratos@rc` |

### Implementation Pattern

```yaml
- name: Determine dist-tag
  id: tag
  run: |
    if [[ "${{ github.ref_name }}" =~ -alpha ]]; then
      echo "dist_tag=alpha" >> $GITHUB_OUTPUT
    elif [[ "${{ github.ref_name }}" =~ -beta ]]; then
      echo "dist_tag=beta" >> $GITHUB_OUTPUT
    elif [[ "${{ github.ref_name }}" =~ -rc ]]; then
      echo "dist_tag=rc" >> $GITHUB_OUTPUT
    else
      echo "dist_tag=latest" >> $GITHUB_OUTPUT
    fi

- run: npm publish --tag ${{ steps.tag.outputs.dist_tag }}
```

---

## 6. package.json Configuration for Dual Runtime

### Decision: ESM-only with `type: "module"` and `bin` entry pointing to bundled output

**Rationale**: Modern package configuration following npm best practices. No CommonJS fallback needed since Node.js 18+ has full ESM support.

### Required package.json Updates

```json
{
  "name": "mcp-ory-kratos",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.js",
  "bin": {
    "mcp-ory-kratos": "./dist/index.js"
  },
  "files": [
    "dist"
  ],
  "engines": {
    "node": ">=18.0.0",
    "bun": ">=1.0.0"
  },
  "scripts": {
    "build": "bun run bun.build.ts",
    "prepublishOnly": "bun run build"
  }
}
```

**Key Points**:
- `files` array limits published content to `dist/` (keeps package small)
- `engines` specifies runtime requirements
- `prepublishOnly` ensures build runs before publish

---

## Requirement-to-Implementation Mapping

| Requirement | Research Finding | Implementation |
|-------------|-----------------|----------------|
| FR-001 (Build TypeScript) | Bun bundler with `target: "node"` | `bun.build.ts` configuration |
| FR-002 (Bundle dependencies) | Mark dependencies as external | `packages: "external"` in Bun.build |
| FR-003 (Single entry point) | Single output file with shebang | `dist/index.js` with `#!/usr/bin/env node` |
| FR-004 (Publish on tag) | GitHub Actions `push.tags` trigger | `release.yml` workflow |
| FR-005 (Validate before publish) | Run existing CI checks first | Lint + typecheck + test gates |
| FR-006 (Semantic versioning) | Tag pattern matching | `v[0-9]+.[0-9]+.[0-9]+` pattern |
| FR-007 (Auto release notes) | `gh release --generate-notes` | GitHub CLI in workflow |
| FR-008 (Prevent publish on fail) | Job fails on validation error | Sequential steps with `&&` |
| FR-009 (Pre-release support) | npm dist-tags | `--tag alpha/beta/rc` |
| FR-010 (Preserve CI) | Separate workflow file | New `release.yml`, keep `ci.yml` |

---

## Sources

- Bun Bundler Documentation: https://bun.sh/docs/bundler
- Bun.build API Reference: https://bun.sh/docs/api/build
- Node.js Compatibility - Bun: https://bun.sh/docs/runtime/nodejs-compat
- GitHub Actions - Publishing Node.js packages: https://docs.github.com/en/actions/publishing-packages/publishing-nodejs-packages
- GitHub REST API - Releases: https://docs.github.com/en/rest/releases/releases
- npm dist-tag documentation: https://docs.npmjs.com/cli/v10/commands/npm-dist-tag
- actions/setup-node: https://github.com/actions/setup-node
- nick-fields/retry action: https://github.com/nick-fields/retry
- **npm Trusted Publishing (OIDC)**: https://docs.npmjs.com/trusted-publishers/
- **GitHub Changelog - npm OIDC GA (July 2025)**: https://github.blog/changelog/2025-07-31-npm-trusted-publishing-with-oidc-is-generally-available/
- npm Provenance Statements: https://docs.npmjs.com/generating-provenance-statements/
