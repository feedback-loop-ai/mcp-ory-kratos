# Quickstart: GitHub Donate Option

**Branch**: `005-github-donate-option` | **Date**: 2026-01-19

## Overview

This feature adds donation capability to the mcp-ory-kratos repository via GitHub's native FUNDING.yml configuration and a README support section.

## Implementation Steps

### Step 1: Create FUNDING.yml

Create `.github/FUNDING.yml` with the following content:

```yaml
# Funding configuration for mcp-ory-kratos
# See: https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/displaying-a-sponsor-button-in-your-repository

github: valentinyanakiev
# open_collective: COLLECTIVE_SLUG  # Uncomment when Open Collective account is created
```

**Location**: `.github/FUNDING.yml` (create `.github/` directory if it doesn't exist)

### Step 2: Update README.md

Add a "Support" section before the "License" section:

```markdown
## Support

If you find this project useful, consider sponsoring its development:

[![Sponsor](https://img.shields.io/badge/Sponsor-%E2%9D%A4-pink?logo=github-sponsors)](https://github.com/sponsors/valentinyanakiev)

Your support helps maintain and improve the MCP Ory Kratos server.
```

### Step 3: Verify

1. Push changes to the repository
2. Navigate to the repository on GitHub.com
3. Verify the "Sponsor" button appears in the repository header
4. Click the button to confirm funding options display correctly

## Files Changed

| File | Change Type | Description |
|------|-------------|-------------|
| `.github/FUNDING.yml` | Create | GitHub funding configuration |
| `README.md` | Modify | Add Support section |

## Validation Checklist

- [ ] `.github/FUNDING.yml` exists with valid YAML syntax
- [ ] `github: valentinyanakiev` is present in FUNDING.yml
- [ ] README.md contains "Support" section
- [ ] Sponsor button visible on GitHub repository page
- [ ] Clicking Sponsor button shows GitHub Sponsors option

## Future Work

When Open Collective account is created:
1. Uncomment the `open_collective` line in FUNDING.yml
2. Replace `COLLECTIVE_SLUG` with actual collective slug
3. Optionally add Open Collective badge to README Support section
