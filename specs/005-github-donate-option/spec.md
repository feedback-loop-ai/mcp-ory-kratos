# Feature Specification: GitHub Donate Option

**Feature Branch**: `005-github-donate-option`
**Created**: 2026-01-19
**Status**: Draft
**Input**: User description: "add option to donate in github"

## Clarifications

### Session 2026-01-19

- Q: Which funding platforms should be included in FUNDING.yml? → A: GitHub Sponsors + Open Collective
- Q: What are the account identifiers for FUNDING.yml? → A: GitHub Sponsors: valentinyanakiev (user); Open Collective: pending setup

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Enable GitHub Sponsors for the Repository (Priority: P1)

As a project maintainer, I want to enable GitHub Sponsors funding option on the repository so that community members and users can financially support the ongoing development and maintenance of the MCP Ory Kratos server.

**Why this priority**: This is the core functionality that enables any donation capability. Without enabling funding configuration, no other donation-related features can work. GitHub Sponsors is the native and most integrated donation option for open source projects.

**Independent Test**: Can be fully tested by verifying that the "Sponsor" button appears on the repository page and clicking it presents funding options to potential donors.

**Acceptance Scenarios**:

1. **Given** a visitor views the repository on GitHub, **When** they look at the repository header, **Then** they see a "Sponsor" button/heart icon
2. **Given** a visitor clicks the "Sponsor" button, **When** the sponsorship page loads, **Then** they see available funding options and links to donation platforms
3. **Given** the repository has a FUNDING.yml file configured, **When** GitHub processes the repository, **Then** the funding configuration is automatically reflected in the repository UI

---

### User Story 2 - Display Multiple Funding Options (Priority: P2)

As a potential donor, I want to see donation platform options (GitHub Sponsors and Open Collective) so that I can choose my preferred payment method.

**Why this priority**: Different donors have different preferences for payment platforms. Offering multiple options increases the likelihood of receiving donations by accommodating various user preferences and regional availability.

**Independent Test**: Can be tested by clicking the Sponsor button and verifying that multiple funding platform options are displayed with correct links.

**Acceptance Scenarios**:

1. **Given** a visitor clicks the Sponsor button, **When** the funding options display, **Then** they see at least the primary funding platform (GitHub Sponsors or alternative if account not eligible)
2. **Given** a visitor selects a funding option, **When** they click the link, **Then** they are redirected to the correct external donation platform
3. **Given** the FUNDING.yml includes custom funding links, **When** GitHub renders the sponsor section, **Then** custom links are displayed alongside or instead of built-in options

---

### User Story 3 - Acknowledge Sponsors in README (Priority: P3)

As a sponsor, I want to see acknowledgment of sponsorship support in the project README so that contributors feel recognized and appreciated, encouraging continued support.

**Why this priority**: Recognition encourages ongoing support and signals to potential sponsors that their contributions are valued. This is a lower priority than enabling the actual donation mechanism but adds community value.

**Independent Test**: Can be tested by verifying that the README contains a clearly visible sponsors/support section with appropriate acknowledgment text.

**Acceptance Scenarios**:

1. **Given** a visitor reads the README, **When** they scroll to the support section, **Then** they see information about how to sponsor the project
2. **Given** the README has a sponsorship section, **When** a visitor views it, **Then** it includes a link or badge directing to the funding options

---

### Edge Cases

- What happens when the repository owner's GitHub account is not eligible for GitHub Sponsors? Open Collective will serve as the fallback funding option.
- How does the system handle if a configured funding platform URL becomes invalid? GitHub will still display the link but users will see an error when clicking - maintainers should periodically verify links.
- What happens if no funding platforms are configured? The Sponsor button will not appear on the repository.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Repository MUST have a `.github/FUNDING.yml` file that defines funding configuration
- **FR-002**: FUNDING.yml MUST include at least one valid funding platform option
- **FR-003**: Funding configuration MUST be compatible with GitHub's FUNDING.yml schema
- **FR-004**: README SHOULD include a section directing users to sponsorship/donation options
- **FR-005**: All configured funding URLs MUST be valid and accessible
- **FR-006**: Funding configuration MUST include GitHub Sponsors as primary platform and Open Collective as the alternative platform

### Key Entities

- **FUNDING.yml**: Configuration file that specifies supported funding platforms and associated usernames/URLs. Located in `.github/` directory. Will configure `github: valentinyanakiev` and `open_collective: <collective-slug>` (slug TBD after account creation).
- **Sponsor Button**: GitHub-native UI element that appears on repository page when valid FUNDING.yml is present. Triggers display of configured funding options.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Repository displays a visible "Sponsor" button/heart icon on the GitHub repository page
- **SC-002**: Clicking the Sponsor button shows at least one configured funding option
- **SC-003**: All configured funding links successfully redirect to their respective donation platforms
- **SC-004**: README includes a clearly visible section about supporting/sponsoring the project
- **SC-005**: Configuration can be implemented in under 30 minutes by a maintainer

## Assumptions

- The repository is public and hosted on GitHub (github.com)
- GitHub Sponsors account exists for user `valentinyanakiev`
- Open Collective account will be created (prerequisite before full FUNDING.yml deployment); collective slug to be determined
- The repository owner/organization has permissions to add files to the .github directory
- GitHub's FUNDING.yml feature is available for the repository (it's a standard GitHub feature for public repos)
