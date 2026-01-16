<!--
================================================================================
SYNC IMPACT REPORT
================================================================================
Version change: 1.0.0 → 1.1.0 (Technology stack overhaul + new principle)

Modified principles:
- VI. Type Safety & Validation → VII. Type Safety & Validation (renumbered)

Added sections:
- VI. Fast Feedback Loops (NON-NEGOTIABLE) - new principle

Modified sections:
- Technology Stack: Node.js → Bun, npm → bun, added Biome

Templates requiring updates:
- .specify/templates/plan-template.md ✅ (compatible - no stack-specific content)
- .specify/templates/spec-template.md ✅ (compatible - no stack-specific content)
- .specify/templates/tasks-template.md ✅ (compatible - no stack-specific content)
- CLAUDE.md ✅ (updated - Active Technologies now references Bun stack)

Follow-up TODOs: None
================================================================================
-->

# MCP Ory Kratos Constitution

## Core Principles

### I. AI-Native Development (NON-NEGOTIABLE)

The MCP server MUST be designed for AI-first interaction with clear, machine-parseable interfaces.

- All MCP tools MUST have unambiguous, schema-validated inputs and outputs
- Tool descriptions MUST be explicit, action-oriented, and include usage examples
- Error responses MUST be structured and actionable (no generic error messages)
- The server MUST operate as a stateless proxy to Kratos Admin API—no hidden state or side effects
- Documentation MUST be structured for AI consumption (typed interfaces, JSON schemas, explicit contracts)

**Rationale**: This is an MCP server—its primary consumers are AI agents. Every design decision prioritizes machine comprehension and autonomous operation.

### II. Spec-Driven Development (SDD)

All features MUST follow a three-role workflow with clear separation of concerns:

- **WHAT** (Product): Define user value, acceptance criteria, and priority. Captured in `spec.md`.
- **HOW** (Engineering): Design architecture, data models, and implementation approach. Captured in `plan.md`, `data-model.md`, `contracts/`.
- **VALIDATION** (QA): Verify correctness via automated tests, manual validation, or both. Captured in test suites and `tasks.md` checkpoints.

One person MAY wear multiple hats, but the roles MUST remain distinct in artifacts. Every feature MUST have a spec before implementation begins.

**Rationale**: Clear role separation ensures traceability, reduces rework, and enables parallel work by different agents or humans.

### III. Contract-First API Design

All MCP tools MUST be designed contract-first before implementation:

- Tool schemas MUST be defined in `contracts/` before any code is written
- Input/output types MUST use Zod schemas with strict validation
- Breaking changes to tool signatures MUST be versioned and documented
- Tools MUST map cleanly to Ory Kratos Admin API operations—no invented abstractions
- Error codes and messages MUST be consistent across all tools

**Rationale**: MCP clients depend on stable, predictable tool contracts. Contract-first development prevents API drift and ensures documentation accuracy.

### IV. Operational Excellence

The server MUST be designed for production reliability and observability:

- **Structured Logging**: All operations MUST log structured JSON with request/response tracing
- **Error Handling**: Every Kratos API error MUST be mapped to a clear, actionable MCP error
- **Health Checks**: Server MUST expose health status for monitoring integration
- **Graceful Degradation**: Connection failures to Kratos MUST produce helpful error messages, not crashes
- **Security**: No sensitive data (credentials, tokens) in logs; API key configuration MUST be secure

**Rationale**: MCP servers run as infrastructure—operational reliability is non-negotiable for production use.

### V. Simplicity & YAGNI

Start with the simplest solution that could work:

- No premature optimization or over-engineering
- Every architectural decision MUST cite a concrete requirement
- Complexity MUST be justified in writing before implementation
- Delete unused code; dead code is negative value
- Prefer direct Kratos API mapping over invented abstractions
- No feature creep: if it's not in the spec, don't build it

**Rationale**: Simplicity accelerates development and reduces maintenance burden. The server is a thin proxy layer—keep it thin.

### VI. Fast Feedback Loops (NON-NEGOTIABLE)

Development tooling MUST minimize time between code change and validation:

- **Instant Startup**: Runtime and tooling MUST start in milliseconds, not seconds
- **Hot Reload**: Development server MUST support instant code reloading
- **Fast Tests**: Test suite MUST complete in under 5 seconds for unit tests
- **Unified Tooling**: Prefer all-in-one tools (bundler, test runner, package manager) over fragmented toolchains
- **Zero Config**: Tools MUST work out-of-the-box with sensible defaults

**Rationale**: AI-driven development generates rapid iterations. Every second of feedback delay compounds into minutes of wasted time. Modern tooling (Bun ecosystem) provides 10-100x speedups over legacy Node.js toolchains.

### VII. Type Safety & Validation (NON-NEGOTIABLE)

All code MUST be type-safe with runtime validation at boundaries:

- TypeScript strict mode MUST be enabled (no `any` types except in type guards)
- All MCP tool inputs MUST be validated with Zod schemas before processing
- Kratos API responses MUST be validated against expected types
- Configuration MUST be validated at startup—fail fast on misconfiguration
- Tests MUST cover validation edge cases (malformed inputs, unexpected API responses)

**Rationale**: Type safety prevents entire categories of runtime errors. Validation at boundaries catches issues before they propagate.

## Technology Stack

**Locked Stack** (optimized for fastest feedback loops):

| Concern | Choice | Rationale |
|---------|--------|-----------|
| Runtime | Bun 1.x | 4x faster startup, native TypeScript, all-in-one toolchain |
| Language | TypeScript 5.x (strict mode) | Type safety, MCP SDK compatibility |
| MCP SDK | @modelcontextprotocol/sdk ^1.25.x | Official MCP implementation |
| Kratos Client | @ory/kratos-client | Official Ory client |
| Validation | Zod ^3.25.x | Runtime validation, TypeScript inference |
| Storage | N/A (stateless proxy) | Server maintains no state |
| Testing | Vitest | Fast, TypeScript-native, Bun-compatible |
| Linting/Formatting | Biome | 100x faster than ESLint+Prettier, zero config |

**Package Management**: bun (lockfile committed, `bun.lockb`)

**Why Bun over Node.js**:
- Native TypeScript execution (no transpilation step)
- Built-in bundler, test runner, package manager
- 4x faster cold start, 25x faster package installs
- Drop-in Node.js API compatibility
- Aligns with Principle VI: Fast Feedback Loops

## Development Workflow

### Feature Lifecycle

1. **Spec**: Product defines WHAT in `specs/[###-feature]/spec.md`
2. **Plan**: Engineering defines HOW in `specs/[###-feature]/plan.md`
3. **Tasks**: Break down into atomic tasks in `specs/[###-feature]/tasks.md`
4. **Implement**: AI/Engineer executes tasks, validates via tests
5. **Review**: Automated checks + optional human review
6. **Deploy**: Merge to main → tagged release

### Quality Gates

| Gate | Requirement | Enforcement |
|------|-------------|-------------|
| Spec Approval | Product sign-off on WHAT | Branch protection |
| Tests Pass | All unit/integration tests green | CI mandatory |
| Type Check | Zero TypeScript errors | CI mandatory |
| Lint/Format | Zero Biome violations | Pre-commit + CI |
| Constitution Compliance | Spec/Plan reference principles | Manual/AI review |

### Branching Strategy

- `main`: Production-ready, always releasable
- `feature/###-name`: Feature branches from main
- No long-lived branches; merge within 48 hours or rebase
- Squash merges for clean history

## Governance

This Constitution is the supreme governance document for MCP Ory Kratos. All practices, tools, and decisions MUST comply.

### Amendment Process

1. Propose change via PR to `.specify/memory/constitution.md`
2. Document rationale and impact assessment
3. Update dependent templates if principles change
4. Approve by project owner (or designated governance role)
5. Increment version per semantic rules:
   - **MAJOR**: Removes/redefines principles (breaking)
   - **MINOR**: Adds principles or expands guidance
   - **PATCH**: Clarifications, typos, non-semantic fixes

### Compliance

- All PRs MUST pass Constitution Check (automated where possible)
- Violations MUST be documented with justification if exception granted
- Quarterly constitution review: evaluate principle relevance, remove obsolete rules

### Guidance Files

- Runtime development guidance: `.specify/templates/` (templates for specs, plans, tasks)
- Agent-specific instructions: `.specify/templates/agent-file-template.md`
- Command definitions: `.claude/commands/` (speckit commands)

**Version**: 1.1.0 | **Ratified**: 2026-01-14 | **Last Amended**: 2026-01-14
