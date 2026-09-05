# Specification Quality Checklist: Architecture Hardening & Operator Safety

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-09-05
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs) — considered judgement, see Notes
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders — answered by explicit exclusion: spec Assumptions ("Audience and level of detail") records that this is a contract-level spec for a machine-facing server whose audience is operators, agents and maintainers
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details) — answered by explicit exclusion: spec Assumptions states the SC-007/SC-008 version and tool pins are requirements (a gate is only meaningful against a named version and tool), to be revised when the supported Kratos version moves
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification — answered by explicit exclusion: spec Assumptions records FR-032/FR-033 toolchain facts as requirements (closing a named SDK advisory and truthful gates are part of the feature purpose), not leakage

## Notes

- **Implementation-detail judgement**: the spec names environment variables (`KRATOS_TOOLSETS`, `KRATOS_READ_ONLY`, `KRATOS_ALLOW_CREDENTIAL_EXPOSURE`, `KRATOS_MAX_SCAN_PAGES`), MCP protocol concepts (elicitation, tool annotations, output schemas, logging capability, resource templates), Kratos Admin API parameters (`include_credential`, `preview_credentials_identifier_similar`, page tokens) and concrete tool names. For an MCP server these *are* the product contract: Constitution I (AI-native — every tool has a precise schema and description) and Constitution III (contract-first — parameter names and error shapes are versioned interfaces) require this precision, and an FR such as "list tools return a cursor" is untestable without naming the field. These are therefore accepted as contract-level detail, not leakage.
- **Genuine leakage, accepted with reason**: FR-032 (deprecated SDK registration APIs), FR-033 (Node floor, package-manager pin) and the SDK/Zod version assumptions describe the toolchain rather than behaviour. They are retained because the feature's stated purpose includes closing a named SDK security advisory and making the quality gates truthful; a reviewer should expect these to move to plan.md if the spec is ever reused outside this repository.
- **Success-criteria specificity**: SC-007 and SC-008 pin a Kratos version and an audit tool. This is intentional — the constitution's quality gates name the same tools — but they will need updating when the supported Kratos version moves.
- 37 clarifications are recorded (17 from rounds 1–2, 15 from round 3, 5 from the `/speckit.analyze` remediation on 2026-09-05) and each is encoded in an FR, an Edge Case, a Key Entity or Assumptions; no orphan clarification was found.
- All items ticked after clarify round 3; `safety-and-contracts.md` is fully resolved. The former plan.md follow-up (D5 claiming redaction on `kratos_get_identity_by_external_id`) is closed: plan D5 and tasks T033/T035 now state that only `kratos_get_identity` and `kratos_list_identities` redact (FR-010a).
