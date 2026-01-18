# Research: CI Build Pipeline for Validation

**Feature**: 003-ci-build-pipeline
**Date**: 2026-01-18

## Summary

Research findings for implementing GitHub Actions CI pipeline with Bun, Vitest, and Biome. All decisions align with Constitution principles, particularly VI. Fast Feedback Loops.

---

## Decision 1: GitHub Actions Setup for Bun

### Decision
Use `oven-sh/setup-bun@v2` with explicit version pinning and `bun ci` command for reproducible builds.

### Rationale
- Official action maintained by Oven (Bun creators)
- v2 released January 2026 with improved caching
- `bun ci` is optimized for CI environments (equivalent to `--frozen-lockfile`)
- Supports version detection from `package.json` engines field

### Alternatives Considered
| Alternative | Rejected Because |
|-------------|------------------|
| Manual Bun installation | Slower, no caching, version management overhead |
| Node.js-based CI | Violates Constitution VI (Fast Feedback Loops) |
| Direct binary download | No version management, inconsistent across runs |

### Configuration

```yaml
- uses: oven-sh/setup-bun@v2
  with:
    bun-version: 1.3.3  # Pin for reproducibility
```

---

## Decision 2: Dependency Caching Strategy

### Decision
Cache `~/.bun/install/cache` (Bun's global package cache) with lockfile hash as key. Do NOT cache `node_modules`.

### Rationale
- Bun maintainers recommend against caching `node_modules` because `bun install` is often faster than cache retrieval
- Global cache (`~/.bun/install/cache`) provides better cache hit ratios
- Lockfile hash ensures cache invalidation on dependency changes

### Alternatives Considered
| Alternative | Rejected Because |
|-------------|------------------|
| Cache `node_modules` | Slower than fresh install per Bun maintainers |
| No caching | Misses easy performance win on repeated runs |
| Full workspace caching | Overkill, diminishing returns |

### Configuration

```yaml
- uses: actions/cache@v4
  with:
    path: ~/.bun/install/cache
    key: ${{ runner.os }}-bun-${{ hashFiles('**/bun.lock', '**/bun.lockb') }}
    restore-keys: ${{ runner.os }}-bun-
```

---

## Decision 3: Parallel Job Execution

### Decision
Run lint, typecheck, and test as parallel jobs. No sequential dependencies between validation steps.

### Rationale
- Constitution VI requires fast feedback loops
- Lint, typecheck, and test are independent operations
- Parallel execution reduces total pipeline time from ~3-5 minutes to ~1-2 minutes
- Each job gets its own runner, maximizing resource utilization

### Alternatives Considered
| Alternative | Rejected Because |
|-------------|------------------|
| Single sequential job | Violates Constitution VI (slow feedback) |
| Matrix strategy | Unnecessary complexity for single-platform project |
| Conditional job execution | Over-engineering, YAGNI |

### Configuration

```yaml
jobs:
  lint:
    runs-on: ubuntu-latest
    # parallel with typecheck and test

  typecheck:
    runs-on: ubuntu-latest
    # parallel with lint and test

  test:
    runs-on: ubuntu-latest
    # parallel with lint and typecheck
```

---

## Decision 4: Coverage Reporting

### Decision
Use Vitest's built-in V8 coverage provider with `json-summary` reporter. Display coverage in GitHub Job Summary (non-blocking). No external services required.

### Rationale
- Spec explicitly states: "Report coverage only (visible but non-blocking)"
- V8 provider is faster than Istanbul for Bun projects
- Job Summary provides native GitHub integration without third-party dependencies
- Avoids Codecov/Coveralls setup complexity and token management

### Alternatives Considered
| Alternative | Rejected Because |
|-------------|------------------|
| Codecov | External dependency, requires token setup, over-engineering |
| vitest-coverage-report-action | PR comments require extra permissions, complexity |
| Istanbul provider | Slower than V8 for Bun projects |
| Coverage thresholds (blocking) | Spec says "non-blocking, informational only" |

### Configuration

```typescript
// vitest.config.ts addition
coverage: {
  provider: "v8",
  reporter: ["text", "json-summary"],
  reportsDirectory: "./coverage",
  include: ["src/**/*.ts"],
}
```

```yaml
# GitHub Actions Job Summary
- name: Coverage Summary
  if: always()
  run: |
    echo "## Coverage Report" >> $GITHUB_STEP_SUMMARY
    # Parse json-summary and display
```

---

## Decision 5: Build Status Badge

### Decision
Use native GitHub Actions badge URL format pointing to the CI workflow.

### Rationale
- FR-011 requires status badge on README.md
- Native GitHub badge requires no external services
- Automatically updates with workflow status
- Simple markdown syntax

### Badge Format

```markdown
![CI](https://github.com/{owner}/{repo}/actions/workflows/ci.yml/badge.svg?branch=main)
```

For this repo:
```markdown
![CI](https://github.com/feedback-loop-ai/mcp-ory-kratos/actions/workflows/ci.yml/badge.svg?branch=001-kratos-mcp-server)
```

---

## Decision 6: Biome Integration

### Decision
Use `bun run lint` which invokes Biome via existing package.json script. No separate Biome GitHub Action needed.

### Rationale
- Biome already configured in project (`biome.json`)
- `bun lint` script already defined in package.json
- Biome is 100x faster than ESLint+Prettier (aligns with Constitution VI)
- No additional action setup required

### Alternatives Considered
| Alternative | Rejected Because |
|-------------|------------------|
| biomejs/setup-biome action | Unnecessary, already installed via bun |
| ESLint + Prettier | Violates Constitution VI (slow) |
| Separate lint job | Over-engineering for <1 second lint time |

---

## Decision 7: PR Merge Protection

### Decision
Configure branch protection rules via GitHub UI (not workflow). Workflow provides status checks that branch protection references.

### Rationale
- FR-004 requires blocking PR merges on validation failure
- Branch protection rules are repository settings, not workflow config
- Workflow just needs to report status checks correctly
- GitHub natively blocks merges when required checks fail

### Implementation Notes
- After workflow is created, enable branch protection on `001-kratos-mcp-server` (main)
- Mark all CI jobs as required status checks
- Document setup in quickstart.md

---

## Decision 8: Concurrency Control

### Decision
Use GitHub Actions concurrency groups to cancel in-progress runs when new commits are pushed.

### Rationale
- Edge case from spec: "What happens when a developer force-pushes during an ongoing validation? (Cancel previous run, start new one)"
- Saves CI minutes by not completing obsolete runs
- Standard GitHub Actions pattern

### Configuration

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

---

## Known Issues & Gotchas

### 1. Lockfile Cross-Platform Inconsistencies
- Lockfiles generated on macOS arm64 may fail validation on Linux x64 runners
- **Mitigation**: Use `bun ci` which handles this gracefully
- **Long-term**: Generate lockfiles on Linux or use text-based `bun.lock`

### 2. Reserved Script Names
- `bun build` runs Bun's bundler, not a script named "build"
- **Mitigation**: Use `bun run build` for custom scripts

### 3. Test Timeout Configuration
- Current vitest.config.ts has 30s test timeout, 60s hook timeout
- **CI Impact**: None, timeouts are reasonable for unit tests

---

## References

- [oven-sh/setup-bun v2.1.2](https://github.com/oven-sh/setup-bun/releases)
- [Bun CI/CD Guide](https://bun.sh/docs/guides/runtime/cicd)
- [Vitest Coverage Guide](https://vitest.dev/guide/coverage)
- [GitHub Actions Cache](https://github.com/actions/cache)
- [GitHub Job Summaries](https://github.blog/news-insights/product-news/supercharging-github-actions-with-job-summaries/)
