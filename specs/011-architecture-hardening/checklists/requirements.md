# Specification Quality Checklist: Architecture Hardening & Operator Safety

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-09-05
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs) — considered judgement, see Notes
- [x] Focused on user value and business needs
- [ ] Written for non-technical stakeholders — the audience is operators and maintainers of an MCP server; US5/US6 and FR-028…FR-034 are unavoidably technical
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [ ] Success criteria are technology-agnostic (no implementation details) — SC-007 names Kratos v26.2.0 and a compose command, SC-008 names `bun audit`; both are deliberate (the gate is only meaningful against a named version and tool) but they are not technology-agnostic
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [ ] No implementation details leak into specification — FR-032 names `server.tool`/`server.resource` and the SDK major line, FR-033 names Node 20 and package-manager pinning, Assumptions name Zod 3.x and SDK 1.30.x; see Notes for why these are accepted

## Notes

- **Implementation-detail judgement**: the spec names environment variables (`KRATOS_TOOLSETS`, `KRATOS_READ_ONLY`, `KRATOS_ALLOW_CREDENTIAL_EXPOSURE`, `KRATOS_MAX_SCAN_PAGES`), MCP protocol concepts (elicitation, tool annotations, output schemas, logging capability, resource templates), Kratos Admin API parameters (`include_credential`, `preview_credentials_identifier_similar`, page tokens) and concrete tool names. For an MCP server these *are* the product contract: Constitution I (AI-native — every tool has a precise schema and description) and Constitution III (contract-first — parameter names and error shapes are versioned interfaces) require this precision, and an FR such as "list tools return a cursor" is untestable without naming the field. These are therefore accepted as contract-level detail, not leakage.
- **Genuine leakage, accepted with reason**: FR-032 (deprecated SDK registration APIs), FR-033 (Node floor, package-manager pin) and the SDK/Zod version assumptions describe the toolchain rather than behaviour. They are retained because the feature's stated purpose includes closing a named SDK security advisory and making the quality gates truthful; a reviewer should expect these to move to plan.md if the spec is ever reused outside this repository.
- **Success-criteria specificity**: SC-007 and SC-008 pin a Kratos version and an audit tool. This is intentional — the constitution's quality gates name the same tools — but they will need updating when the supported Kratos version moves.
- 16 clarifications are recorded and each is encoded in an FR, an Edge Case or a Key Entity; no orphan clarification was found.
- Spec is ready for `/speckit.plan`; the domain findings in `safety-and-contracts.md` should be resolved (or consciously deferred) in the next `/speckit.analyze` round before `/speckit.tasks`.
