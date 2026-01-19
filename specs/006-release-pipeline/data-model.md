# Data Model: Release Pipeline

**Date**: 2026-01-19
**Feature**: 006-release-pipeline

## Overview

This feature adds CI/CD configuration for building and publishing the MCP server. It does not introduce runtime data models or persistent storage. The "entities" below represent conceptual artifacts managed by the build and release process.

---

## Entities

### 1. Package

The distributable npm artifact.

**Source**: `package.json` + build output

| Field | Type | Description | Source |
|-------|------|-------------|--------|
| name | string | Package name (`mcp-ory-kratos`) | package.json |
| version | string | Semantic version (e.g., `1.2.3`) | package.json, git tag |
| main | string | Entry point path (`./dist/index.js`) | package.json |
| bin | object | CLI command mapping | package.json |
| dependencies | object | Runtime dependencies | package.json |
| files | string[] | Files included in package | package.json |
| engines | object | Runtime requirements | package.json |

**Validation Rules**:
- `name` must be valid npm package name (lowercase, no spaces)
- `version` must follow semantic versioning (MAJOR.MINOR.PATCH[-prerelease])
- `main` must point to existing file after build
- `bin` entry must have shebang and be executable

**State Transitions**:
```
Source (src/) → Build → Distributable (dist/) → Publish → Published (npm)
```

---

### 2. Version Tag

Git tag that triggers the release process.

**Source**: Git repository

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| name | string | Tag name | `v1.2.3`, `v1.2.3-beta.0` |
| type | enum | Release type | `stable`, `alpha`, `beta`, `rc` |
| commit | string | Tagged commit SHA | `abc123...` |
| message | string | Optional tag message | `Release v1.2.3` |

**Validation Rules**:
- Must match pattern: `v[0-9]+.[0-9]+.[0-9]+(-prerelease)?`
- Must be unique (no duplicate tags)
- Must be on main branch or approved feature branch

**Type Detection**:
```
v1.2.3        → stable  → dist-tag: latest
v1.2.3-alpha* → alpha   → dist-tag: alpha
v1.2.3-beta*  → beta    → dist-tag: beta
v1.2.3-rc*    → rc      → dist-tag: rc
```

---

### 3. Release

Published version including npm package and GitHub Release.

**Source**: GitHub Actions workflow output

| Field | Type | Description | Source |
|-------|------|-------------|--------|
| tag | string | Version tag | git tag |
| npm_version | string | Published npm version | npm registry |
| npm_dist_tag | string | npm dist-tag | workflow output |
| github_release_url | string | GitHub Release URL | GitHub API |
| release_notes | string | Auto-generated notes | GitHub API |
| prerelease | boolean | Is pre-release | tag pattern |
| published_at | datetime | Publication timestamp | workflow |

**State Transitions**:
```
Tag Push → Validate → Build → Publish to npm → Create GitHub Release → Complete
                ↓                    ↓
             [Fail]              [Retry Once]
                ↓                    ↓
           Abort Release        [Fail → Abort]
```

---

### 4. Build Artifact

Compiled distributable output.

**Source**: Bun bundler output

| Field | Type | Description | Location |
|-------|------|-------------|----------|
| entry | file | Main JavaScript bundle | `dist/index.js` |
| size | number | Bundle size in bytes | build output |
| format | string | Module format | `esm` |
| target | string | Target runtime | `node` |

**Validation Rules**:
- Size must be under 5MB (SC-004)
- Must include shebang (`#!/usr/bin/env node`)
- Must be valid JavaScript (syntax check)

---

## Relationships

```
┌─────────────┐     triggers     ┌──────────────┐
│ Version Tag │ ────────────────→│   Release    │
└─────────────┘                  │   Workflow   │
                                 └──────────────┘
                                        │
                    ┌───────────────────┼───────────────────┐
                    ↓                   ↓                   ↓
             ┌──────────┐        ┌──────────┐        ┌──────────┐
             │ Validate │        │  Build   │        │  Publish │
             └──────────┘        └──────────┘        └──────────┘
                    │                   │                   │
                    ↓                   ↓                   ↓
             ┌──────────┐        ┌──────────┐        ┌──────────┐
             │   CI     │        │  Build   │        │   npm    │
             │  Gates   │        │ Artifact │        │ Package  │
             └──────────┘        └──────────┘        └──────────┘
                                                           │
                                                           ↓
                                                    ┌──────────┐
                                                    │  GitHub  │
                                                    │ Release  │
                                                    └──────────┘
```

---

## Configuration Files

### package.json (Modified)

```json
{
  "name": "mcp-ory-kratos",
  "version": "0.1.0",
  "type": "module",
  "description": "MCP server for Ory Kratos Admin API",
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
    "build": "bun run bun.build.ts"
  }
}
```

### bun.build.ts (New)

```typescript
await Bun.build({
  entrypoints: ["./src/index.ts"],
  outdir: "./dist",
  target: "node",
  format: "esm",
  packages: "external",
  banner: "#!/usr/bin/env node\n",
});
```

### .github/workflows/release.yml (New)

Workflow configuration for release automation (see quickstart.md for details).

---

## Notes

- No database entities - this is CI/CD configuration only
- Build artifacts are ephemeral (generated during workflow, published to npm)
- Version is single source of truth from git tag (synced to package.json during release)
- Package size constraint (5MB) enforced by build validation step
