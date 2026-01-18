# Tasks: GitHub Donate Option

**Input**: Design documents from `/specs/005-github-donate-option/`
**Prerequisites**: research.md (platform decisions), quickstart.md (implementation details)

**Tests**: Not applicable - this feature is configuration-only (YAML and Markdown files).

**Organization**: This is a simple 2-task feature with no user stories or code implementation.

## Format: `[ID] [P?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Create FUNDING.yml)

**Purpose**: Enable GitHub's native Sponsor button via FUNDING.yml configuration

- [X] T001 Create `.github/FUNDING.yml` with GitHub Sponsors configuration

**Content for T001**:
```yaml
# Funding configuration for mcp-ory-kratos
# See: https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/displaying-a-sponsor-button-in-your-repository

github: valentinyanakiev
# open_collective: COLLECTIVE_SLUG  # Uncomment when Open Collective account is created
```

**Checkpoint**: FUNDING.yml exists with valid YAML syntax

---

## Phase 2: README Update (Add Support Section)

**Purpose**: Add visibility to sponsorship options in project documentation

- [X] T002 Add "Support" section to `README.md` before the "License" section

**Content for T002** (insert before `## License`):
```markdown
## Support

If you find this project useful, consider sponsoring its development:

[![Sponsor](https://img.shields.io/badge/Sponsor-%E2%9D%A4-pink?logo=github-sponsors)](https://github.com/sponsors/valentinyanakiev)

Your support helps maintain and improve the MCP Ory Kratos server.
```

**Checkpoint**: README.md contains Support section with sponsor badge

---

## Phase 3: Validation

**Purpose**: Verify implementation matches specification

- [X] T003 Verify FUNDING.yml has valid YAML syntax (no parse errors)
- [X] T004 Verify README.md Support section renders correctly (badge displays)

---

## Dependencies & Execution Order

### Task Dependencies

- **T001**: No dependencies - can start immediately
- **T002**: No dependencies - can run in parallel with T001
- **T003**: Depends on T001 completion
- **T004**: Depends on T002 completion

### Parallel Opportunities

```bash
# T001 and T002 can run in parallel (different files):
Task: "Create .github/FUNDING.yml with GitHub Sponsors configuration"
Task: "Add Support section to README.md before the License section"
```

---

## Implementation Strategy

### Single Pass Execution

1. Create `.github/FUNDING.yml` (T001)
2. Update `README.md` with Support section (T002)
3. Validate both files (T003, T004)
4. Commit and push changes

### Post-Merge Verification

After merging to main branch:
1. Navigate to repository on GitHub.com
2. Verify "Sponsor" button appears in repository header
3. Click button to confirm GitHub Sponsors option displays
4. Verify README Support section renders with clickable badge

---

## Files Changed

| File | Change Type | Description |
|------|-------------|-------------|
| `.github/FUNDING.yml` | Create | GitHub funding configuration |
| `README.md` | Modify | Add Support section before License |

---

## Notes

- GitHub Sponsors username: `valentinyanakiev` (per research.md clarification)
- Open Collective: Commented out until account is created
- No code changes required - configuration files only
- No tests required - feature is YAML/Markdown configuration
- Validation is manual (GitHub UI verification post-merge)
