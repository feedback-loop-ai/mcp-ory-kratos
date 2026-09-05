# Tool Contract Index

**Feature**: 011-architecture-hardening — 27 tools across 6 toolsets. Per-tool contracts: one file per toolset in this directory.

## identities ([identities.md](./identities.md))

| Tool | Title | Kind | Idempotent |
|---|---|---|---|
| `kratos_batch_patch_identities` | Batch create identities | create | no |
| `kratos_create_identity` | Create identity | create | no |
| `kratos_delete_identity` | Delete identity | destructive | yes |
| `kratos_delete_identity_credential` | Delete identity credential | destructive | yes |
| `kratos_get_identity` | Get identity | read-only | yes |
| `kratos_get_identity_by_external_id` | Get identity by external ID | read-only | yes |
| `kratos_get_identity_schema` | Get identity schema | read-only | yes |
| `kratos_list_identities` | List identities | read-only | yes |
| `kratos_list_identity_schemas` | List identity schemas | read-only | yes |
| `kratos_patch_identity` | Patch identity | destructive | no |
| `kratos_set_identity_state` | Set identity state | destructive | yes |
| `kratos_update_identity` | Update identity (full replace) | destructive | yes |

## recovery ([recovery.md](./recovery.md))

| Tool | Title | Kind | Idempotent |
|---|---|---|---|
| `kratos_create_recovery_code` | Create recovery code | create | no |
| `kratos_create_recovery_link` | Create recovery link | create | no |

## analytics ([analytics.md](./analytics.md))

| Tool | Title | Kind | Idempotent |
|---|---|---|---|
| `kratos_credential_analytics` | Credential analytics | read-only | yes |
| `kratos_session_analytics` | Session analytics | read-only | yes |

## sessions ([sessions.md](./sessions.md))

| Tool | Title | Kind | Idempotent |
|---|---|---|---|
| `kratos_delete_identity_sessions` | Delete identity sessions | destructive | yes |
| `kratos_disable_session` | Disable session | destructive | yes |
| `kratos_extend_session` | Extend session | destructive | no |
| `kratos_get_session` | Get session | read-only | yes |
| `kratos_list_identity_sessions` | List identity sessions | read-only | yes |
| `kratos_list_sessions` | List sessions | read-only | yes |

## courier ([courier.md](./courier.md))

| Tool | Title | Kind | Idempotent |
|---|---|---|---|
| `kratos_get_courier_message` | Get courier message | read-only | yes |
| `kratos_list_courier_messages` | List courier messages | read-only | yes |

## health ([health.md](./health.md))

| Tool | Title | Kind | Idempotent |
|---|---|---|---|
| `kratos_health_alive` | Health: alive | read-only | yes |
| `kratos_health_ready` | Health: ready | read-only | yes |
| `kratos_version` | Kratos version | read-only | yes |

## Resources ([resources.md](./resources.md))

| URI | Kind |
|---|---|
| `kratos://schemas` | static |
| `kratos://schemas/{schema_id}` | template (list + completion) |
| `kratos://config/connection` | static |
