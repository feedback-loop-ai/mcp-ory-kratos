# Feature Specification: Comprehensive README with MCP Integration

**Feature Branch**: `004-readme-mcp-integration`
**Created**: 2026-01-18
**Status**: Draft
**Input**: User description: "add comprehensive README. Focus on MCP integration, with priority on Claude Code, Github Copilot, Gemini CLI samples."

## Clarifications

### Session 2026-01-18

- Q: How does the README handle users who have Kratos deployed in non-standard configurations (Docker, Kubernetes, cloud-hosted)? → A: Document only environment variable configuration, link to Ory Kratos docs for deployment specifics
- Q: What happens when a user's MCP client version doesn't support required features? → A: Include minimum version requirements in Prerequisites section with a note that older versions may lack full feature support
- Q: What guidance exists for users running multiple MCP servers simultaneously? → A: Add a brief note that the server coexists with other MCP servers using standard MCP configuration; no special handling needed
- Q: Should the README have explicit quality metrics (readability grade, file size limits)? → A: No explicit metrics; focus on functional correctness per existing FRs
- Q: How to make "understand within 30 seconds" measurable? → A: Replace with objective proxy: introduction paragraph ≤50 words stating purpose, target users, and primary capability

## User Scenarios & Testing *(mandatory)*

### User Story 1 - New User Discovers and Configures MCP Server (Priority: P1)

A developer discovers the mcp-ory-kratos repository and needs to quickly understand what it does, how to install it, and how to configure it with their preferred AI coding assistant.

**Why this priority**: This is the primary entry point for all users. Without clear onboarding documentation, users cannot adopt the tool regardless of its quality.

**Independent Test**: Can be fully tested by having a new developer with no prior knowledge attempt to set up the MCP server using only the README documentation.

**Acceptance Scenarios**:

1. **Given** a developer lands on the repository, **When** they read the README introduction (≤50 words), **Then** they understand this is an MCP server for Ory Kratos identity management targeting AI coding assistants
2. **Given** a developer wants to install the server, **When** they follow the installation section, **Then** they can install the package in under 2 minutes
3. **Given** a developer needs to configure Kratos connection, **When** they read the configuration section, **Then** they understand all required environment variables and their purpose

---

### User Story 2 - Claude Code User Configures MCP Server (Priority: P1)

A Claude Code user wants to integrate the Ory Kratos MCP server into their workflow to manage identities directly from their AI assistant.

**Why this priority**: Claude Code is the primary target audience based on user input priority, and is the most common MCP client.

**Independent Test**: Can be tested by a Claude Code user following the specific configuration example and successfully invoking a Kratos tool.

**Acceptance Scenarios**:

1. **Given** a Claude Code user, **When** they follow the Claude Code configuration example, **Then** they can add the MCP server to their settings file
2. **Given** the MCP server is configured in Claude Code, **When** the user starts a session, **Then** they see Kratos tools available in the tool list
3. **Given** a working configuration, **When** the user asks Claude to list identities, **Then** the MCP server executes the request and returns results

---

### User Story 3 - GitHub Copilot User Configures MCP Server (Priority: P2)

A GitHub Copilot user wants to use the Ory Kratos MCP server with Copilot Chat to manage identities.

**Why this priority**: GitHub Copilot has significant market share and MCP support, making it the second priority integration.

**Independent Test**: Can be tested by a GitHub Copilot user following the configuration example and verifying tool availability.

**Acceptance Scenarios**:

1. **Given** a GitHub Copilot user, **When** they follow the Copilot configuration example, **Then** they can configure the MCP server in their VS Code settings
2. **Given** a properly configured environment, **When** the user invokes Copilot Chat, **Then** Kratos tools are accessible

---

### User Story 4 - Gemini CLI User Configures MCP Server (Priority: P2)

A Gemini CLI user wants to integrate the Ory Kratos MCP server for identity management tasks.

**Why this priority**: Gemini CLI is an emerging MCP client with growing adoption, specified as third priority.

**Independent Test**: Can be tested by a Gemini CLI user following the configuration example and listing available tools.

**Acceptance Scenarios**:

1. **Given** a Gemini CLI user, **When** they follow the Gemini CLI configuration example, **Then** they can add the MCP server to their configuration
2. **Given** a configured MCP server, **When** the user runs Gemini CLI, **Then** Kratos tools are available for use

---

### User Story 5 - Developer Explores Available Tools (Priority: P2)

A developer wants to understand what capabilities the MCP server provides before integrating it.

**Why this priority**: Tool discovery is essential for evaluating the server's usefulness and planning integrations.

**Independent Test**: Can be tested by reading the tools reference section and understanding each tool's purpose and parameters.

**Acceptance Scenarios**:

1. **Given** a developer reviewing the README, **When** they read the tools reference section, **Then** they see a complete list of all available MCP tools
2. **Given** a tool listing, **When** the developer examines a specific tool, **Then** they understand its purpose, required parameters, and example usage
3. **Given** the tools are grouped logically, **When** the developer looks for identity-related tools, **Then** they find them under a clear category heading

---

### User Story 6 - Developer Troubleshoots Configuration Issues (Priority: P3)

A developer encounters issues during setup and needs guidance to resolve common problems.

**Why this priority**: Troubleshooting documentation reduces support burden and improves user experience, but is secondary to core functionality.

**Independent Test**: Can be tested by simulating common error scenarios and verifying the troubleshooting section addresses them.

**Acceptance Scenarios**:

1. **Given** a developer with connection errors, **When** they consult the troubleshooting section, **Then** they find steps to verify Kratos connectivity
2. **Given** a developer with authentication issues, **When** they read the troubleshooting guide, **Then** they understand how to validate their configuration
3. **Given** an error message, **When** the developer searches the README, **Then** they find relevant guidance

---

### User Story 7 - Contributor Understands How to Contribute (Priority: P3)

A developer wants to contribute to the project and needs to understand development setup and contribution guidelines.

**Why this priority**: Contributor documentation supports project growth but is not essential for end users.

**Independent Test**: Can be tested by a new contributor following the development setup and successfully running tests.

**Acceptance Scenarios**:

1. **Given** a potential contributor, **When** they read the contributing section, **Then** they understand how to set up the development environment
2. **Given** a contributor ready to submit changes, **When** they check contribution guidelines, **Then** they know the expected process

---

### Edge Cases

- **MCP client version incompatibility**: Prerequisites section will list minimum supported versions; README will note that older versions may lack full feature support
- **Non-standard Kratos deployments (Docker, Kubernetes, cloud)**: README documents environment variable configuration only; links to Ory Kratos docs for deployment-specific setup
- **Multiple MCP servers**: Brief note in configuration sections that this server coexists with other MCP servers using standard MCP configuration patterns

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: README MUST include a clear project title, description, and badges (CI status, license)
- **FR-002**: README MUST provide installation instructions for npm/bun package installation
- **FR-003**: README MUST document all required environment variables with descriptions and example values
- **FR-004**: README MUST include a Claude Code configuration example with complete JSON snippet
- **FR-005**: README MUST include a GitHub Copilot configuration example with VS Code settings
- **FR-006**: README MUST include a Gemini CLI configuration example with appropriate format
- **FR-007**: README MUST provide a complete reference of all available MCP tools grouped by category (Identity, Session, Courier, Health, Recovery, Analytics)
- **FR-008**: README MUST include at least one usage example per tool category showing common operations
- **FR-009**: README MUST include a troubleshooting section covering common connection and authentication issues
- **FR-010**: README MUST include a prerequisites section listing Ory Kratos requirements
- **FR-011**: README MUST include a quick start section that gets users operational in minimal steps
- **FR-012**: README MUST link to Ory Kratos documentation for detailed Kratos setup
- **FR-013**: README MUST include development setup instructions for contributors
- **FR-014**: README MUST include license information and link to LICENSE file
- **FR-015**: README MUST be structured with a table of contents for easy navigation
- **FR-016**: README MUST list minimum supported versions for each MCP client (Claude Code, GitHub Copilot, Gemini CLI) in the Prerequisites section
- **FR-017**: README MUST note that Kratos deployment configuration is out of scope and link to official Ory Kratos deployment documentation
- **FR-018**: README MUST include a note that the MCP server can run alongside other MCP servers using standard configuration patterns

### Key Entities

- **MCP Server**: The primary software component being documented - connects AI assistants to Ory Kratos
- **MCP Client**: The AI assistant consuming the MCP server (Claude Code, GitHub Copilot, Gemini CLI)
- **Tool**: An individual capability exposed by the MCP server (e.g., list identities, create session)
- **Configuration**: The JSON/settings required to connect an MCP client to the server

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The introduction paragraph is ≤50 words and clearly states the project's purpose, target users (AI coding assistants), and primary capability (Ory Kratos identity management via MCP)
- **SC-002**: A developer can go from zero to working MCP integration in under 5 minutes using only the README (measured by following documented steps without requiring external documentation or troubleshooting)
- **SC-003**: Each MCP client (Claude Code, GitHub Copilot, Gemini CLI) has a copy-paste-ready configuration example
- **SC-004**: 100% of available MCP tools are documented with description, parameters, and at least one example
- **SC-005**: Common troubleshooting scenarios are addressable using only the README (no external support needed for standard issues)
- **SC-006**: The README passes accessibility checks for proper heading hierarchy and structure
- **SC-007**: All code examples are syntactically valid and can be copied directly into configuration files

## Assumptions

- Users have basic familiarity with their chosen MCP client (Claude Code, GitHub Copilot, or Gemini CLI)
- Users have access to an Ory Kratos instance (local or remote) with Admin API access
- npm or bun is installed on the user's system
- MCP configuration formats for the three target clients follow their current documented standards
- The MCP server is published to npm or can be run directly from source
