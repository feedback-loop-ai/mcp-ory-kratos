# Quickstart: CI Build Pipeline

**Feature**: 003-ci-build-pipeline
**Date**: 2026-01-18

## Prerequisites

- GitHub repository with admin access
- Bun 1.x installed locally
- Existing project structure with `package.json`, `biome.json`, `tsconfig.json`

## Implementation Steps

### Step 1: Add Coverage Dependencies

```bash
bun add -d @vitest/coverage-v8
```

### Step 2: Update Vitest Configuration

Add coverage settings to `tests/vitest.config.ts`:

```typescript
coverage: {
  provider: "v8",
  enabled: false,  // Enable via CLI
  reporter: ["text", "json-summary"],
  reportsDirectory: "./coverage",
  include: ["src/**/*.ts"],
  exclude: ["**/*.d.ts", "**/index.ts"],
  reportOnFailure: true,
}
```

### Step 3: Create Workflow File

Create `.github/workflows/ci.yml` from the contract in `contracts/ci-workflow.yml`.

### Step 4: Update README Badge

Add to `README.md`:

```markdown
![CI](https://github.com/feedback-loop-ai/mcp-ory-kratos/actions/workflows/ci.yml/badge.svg?branch=001-kratos-mcp-server)
```

### Step 5: Push and Verify

```bash
git add .
git commit -m "feat: add CI build pipeline"
git push
```

Verify:
1. GitHub Actions tab shows workflow running
2. All three jobs (lint, typecheck, test) run in parallel
3. Badge updates on README

### Step 6: Configure Branch Protection (Manual)

In GitHub Repository Settings → Branches → Branch protection rules:

1. Click "Add rule"
2. Branch name pattern: `001-kratos-mcp-server`
3. Enable:
   - [x] Require status checks to pass before merging
   - [x] Require branches to be up to date before merging
4. Select required status checks:
   - `Lint`
   - `Type Check`
   - `Test`
5. Click "Save changes"

## Validation Checklist

- [ ] Workflow triggers on push to any branch
- [ ] Workflow triggers on PR to main branches
- [ ] Lint job completes successfully
- [ ] Type check job completes successfully
- [ ] Test job completes with coverage report
- [ ] Coverage appears in GitHub Job Summary
- [ ] Badge displays on README.md
- [ ] PR merge blocked when checks fail (after branch protection)
- [ ] Force push cancels in-progress runs

## Troubleshooting

### "bun ci" fails with lockfile mismatch
```bash
# Regenerate lockfile
bun install
git add bun.lock bun.lockb
git commit -m "chore: update lockfile"
```

### Coverage report missing
```bash
# Run locally to verify
bun run test -- --coverage.enabled
ls tests/coverage/
```

### Badge shows "no status"
- Workflow must run at least once on the target branch
- Check workflow file is in `.github/workflows/` directory
- Verify branch name in badge URL matches

## Local Development

Run the same checks locally before pushing:

```bash
# Lint
bun run lint

# Type check
bun x tsc --noEmit

# Test with coverage (unit tests only - place in tests/unit/)
bun x vitest run --config tests/vitest.config.ts --dir tests/unit --coverage.enabled

# Integration tests (requires Kratos - not run in CI)
bun run test -- --coverage.enabled
```

## Test Organization

CI only runs **unit tests** to avoid external service dependencies (per FR-002):

- `tests/unit/` - Unit tests (run in CI) - test pure functions, utilities, schemas
- `tests/api/` - Integration tests (run locally only) - require running Kratos instance

When adding new tests:
1. Unit tests: Place in `tests/unit/*.test.ts`
2. Integration tests: Place in `tests/api/*.test.ts`
