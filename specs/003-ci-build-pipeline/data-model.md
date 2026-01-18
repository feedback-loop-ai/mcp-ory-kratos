# Data Model: CI Build Pipeline

**Feature**: 003-ci-build-pipeline
**Date**: 2026-01-18

## Overview

This feature does not introduce persistent data models. It defines configuration artifacts and transient runtime entities managed by GitHub Actions.

---

## Configuration Entities

### Workflow Configuration (`ci.yml`)

**Location**: `.github/workflows/ci.yml`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Workflow display name |
| `on.push.branches` | string[] | Yes | Branches triggering on push |
| `on.pull_request.branches` | string[] | Yes | Branches triggering on PR |
| `concurrency.group` | string | Yes | Concurrency group identifier |
| `concurrency.cancel-in-progress` | boolean | Yes | Cancel obsolete runs |
| `env.BUN_VERSION` | string | Yes | Pinned Bun version |
| `jobs` | object | Yes | Job definitions |

### Job Definition

Each parallel validation job follows this structure:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `runs-on` | string | Yes | Runner type (`ubuntu-latest`) |
| `timeout-minutes` | number | No | Job timeout (default: 360) |
| `steps` | Step[] | Yes | Ordered execution steps |

### Step Definition

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | No | Step display name |
| `uses` | string | Conditional | Action reference (if using action) |
| `run` | string | Conditional | Shell command (if running command) |
| `with` | object | No | Action inputs |
| `if` | string | No | Conditional execution |

---

## Transient Entities (Runtime)

These entities exist only during workflow execution, managed by GitHub Actions.

### Pipeline Run

| Field | Type | Description |
|-------|------|-------------|
| `run_id` | number | Unique workflow run identifier |
| `run_number` | number | Sequential run number per workflow |
| `workflow` | string | Workflow filename |
| `head_sha` | string | Commit SHA triggering run |
| `head_branch` | string | Branch name |
| `event` | string | Trigger event (`push`, `pull_request`) |
| `status` | enum | `queued`, `in_progress`, `completed` |
| `conclusion` | enum | `success`, `failure`, `cancelled`, `skipped` |
| `created_at` | timestamp | Run creation time |
| `updated_at` | timestamp | Last update time |

### Validation Check (Job)

| Field | Type | Description |
|-------|------|-------------|
| `job_id` | number | Unique job identifier |
| `name` | string | Job name (`lint`, `typecheck`, `test`) |
| `status` | enum | `queued`, `in_progress`, `completed` |
| `conclusion` | enum | `success`, `failure`, `cancelled`, `skipped` |
| `started_at` | timestamp | Job start time |
| `completed_at` | timestamp | Job completion time |
| `run_id` | number | Parent run reference |

### Build Status (Commit Status)

| Field | Type | Description |
|-------|------|-------------|
| `state` | enum | `pending`, `success`, `failure`, `error` |
| `context` | string | Check name (e.g., `CI / lint`) |
| `description` | string | Human-readable status |
| `target_url` | string | Link to detailed logs |
| `sha` | string | Associated commit |

---

## Entity Relationships

```
Pipeline Run (1) ─────────┬──────────> Validation Check (N)
                          │
                          └──────────> Build Status (N)
                                       (one per job)
```

---

## State Transitions

### Pipeline Run States

```
┌─────────┐     ┌─────────────┐     ┌───────────┐
│ queued  │────>│ in_progress │────>│ completed │
└─────────┘     └─────────────┘     └───────────┘
                      │                    │
                      │  (force push)      ├──> conclusion: success
                      v                    ├──> conclusion: failure
                ┌───────────┐              └──> conclusion: cancelled
                │ cancelled │
                └───────────┘
```

### Build Status States

```
┌─────────┐
│ pending │────┬──> success (all checks pass)
└─────────┘    ├──> failure (any check fails)
               └──> error   (infrastructure failure)
```

---

## Validation Rules

### Workflow Configuration
- `name` must be unique within repository
- `on` must include at least one trigger event
- `jobs` must define at least one job
- `runs-on` must specify a valid GitHub-hosted runner

### Runtime Constraints
- Pipeline runs are immutable after completion
- Job conclusions cannot change after job completes
- Cancelled runs do not update build status to failure

---

## Notes

- No persistent storage required (Constitution: N/A - stateless)
- All entities are managed by GitHub's infrastructure
- Retention follows GitHub's default (90 days for workflow runs)
