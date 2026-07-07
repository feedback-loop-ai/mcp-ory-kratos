# Quickstart: Upgrade @ory/kratos-client to 26.2.0

**Feature**: 007-kratos-client-26

## Upgrade steps

```bash
# 1. Bump the dependency in package.json
#    "@ory/kratos-client": "^25.4.0"  →  "^26.2.0"

# 2. Refresh the lockfile
bun install

# 3. Update agent context (CLAUDE.md Active Technologies)
.specify/scripts/bash/update-agent-context.sh claude
```

## Verification (all must pass)

```bash
# Lint (Biome) — expect zero violations
bun run lint

# Type check — expect zero errors
bun x tsc --noEmit

# Unit tests (CI-safe) — expect all green
# Note: tests/unit/ does not exist yet; CI detects this and skips with a
# documented pass (see .github/workflows/ci.yml "Check for unit tests")
bun x vitest run --config tests/vitest.config.ts --dir tests/unit
```

## Expected diff

| File | Change |
|------|--------|
| `package.json` | `@ory/kratos-client` version range `^25.4.0` → `^26.2.0` |
| `bun.lock` | Resolved `@ory/kratos-client` entry updated to 26.2.x |
| `CLAUDE.md` | Active Technologies entry for 007-kratos-client-26 |
| `specs/007-kratos-client-26/` | New SDD artifacts (spec, plan, research, quickstart, tasks) |

No changes under `src/` or `tests/`.

## Optional local validation against live Kratos

Integration tests are not part of the merge gate, but can be run locally against a Kratos v26.2.0 instance:

```bash
# Requires Kratos — see .env.test.local.example
bun run test
```
