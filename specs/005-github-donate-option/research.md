# Research: GitHub Donate Option

**Branch**: `005-github-donate-option` | **Date**: 2026-01-19

## Research Tasks

### 1. FUNDING.yml Schema

**Decision**: Use GitHub's standard FUNDING.yml format with `github` and `open_collective` keys.

**Rationale**: GitHub natively supports FUNDING.yml files in the `.github/` directory. The schema is well-documented and widely adopted. Using standard keys ensures compatibility with GitHub's Sponsor button UI.

**Alternatives considered**:
- Custom donation page: Rejected - unnecessary complexity, GitHub provides native support
- Only GitHub Sponsors: Rejected - spec requires Open Collective as alternative platform
- Multiple custom URLs: Rejected - direct platform integration is cleaner

### 2. FUNDING.yml Supported Platforms

**Reference**: [GitHub Documentation](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/displaying-a-sponsor-button-in-your-repository)

| Platform | Syntax | Selected |
|----------|--------|----------|
| GitHub Sponsors | `github: USERNAME` | Yes - `github: valentinyanakiev` |
| Open Collective | `open_collective: USERNAME` | Yes - slug TBD |
| LFX Mentorship | `community_bridge: PROJECT-NAME` | No |
| IssueHunt | `issuehunt: USERNAME` | No |
| Ko-fi | `ko_fi: USERNAME` | No |
| Liberapay | `liberapay: USERNAME` | No |
| Patreon | `patreon: USERNAME` | No |
| Tidelift | `tidelift: PLATFORM-NAME/PACKAGE-NAME` | No |
| Polar | `polar: USERNAME` | No |
| Buy Me a Coffee | `buy_me_a_coffee: USERNAME` | No |
| thanks.dev | `thanks_dev: u/gh/USERNAME` | No |
| Custom URLs | `custom: [URL1, URL2, URL3, URL4]` | No |

**Constraints**:
- One entry per platform (username or project name)
- GitHub Sponsors: up to 4 sponsored developers or 1 organization
- Custom URLs: maximum 4 links

### 3. Account Requirements

**GitHub Sponsors** (`valentinyanakiev`):
- Decision: Use personal GitHub username
- Rationale: Spec explicitly states `github: valentinyanakiev` per clarification
- Status: Assumed account exists (per spec assumptions)

**Open Collective**:
- Decision: Placeholder until collective is created
- Rationale: Spec notes "collective slug to be determined after account creation"
- Options:
  1. Comment out `open_collective` key until account exists
  2. Add placeholder value that will fail validation
  3. Create collective first, then add to FUNDING.yml
- Selected: Option 1 - comment out until ready to avoid broken links

### 4. README Sponsor Section Best Practices

**Decision**: Add a "Support" section before the License section with:
- Brief explanation of project sustainability
- Link to sponsor button
- Optional: GitHub Sponsors badge

**Rationale**:
- Placement near end keeps focus on technical content
- Before License is conventional for open source projects
- Brief text respects reader's time

**Alternatives considered**:
- Top of README: Rejected - detracts from project purpose
- Separate SPONSORS.md file: Rejected - reduces visibility
- Only FUNDING.yml (no README mention): Rejected - spec FR-004 requires README section

## Resolved Clarifications

| Original Question | Resolution |
|-------------------|------------|
| FUNDING.yml schema format | Standard GitHub FUNDING.yml with platform keys |
| GitHub Sponsors username | `valentinyanakiev` (from spec clarification) |
| Open Collective slug | TBD - comment out until account created |
| README section placement | Before License section |

## Dependencies

None. This feature requires only:
- Write access to repository
- Existing GitHub Sponsors account (assumed)
- Future: Open Collective account (deferred)
