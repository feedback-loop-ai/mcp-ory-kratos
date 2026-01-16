# Data Model: Ory Kratos MCP Server

**Date**: 2026-01-14
**Feature**: 001-kratos-mcp-server

## Overview

This document defines the data entities, relationships, and validation rules for the MCP server. Note that the MCP server is a stateless proxy - all data is sourced from the Ory Kratos Admin API. The models here represent the shapes of data passed through MCP tools and resources.

## Core Entities

### Identity

Represents a user account in Ory Kratos.

| Field | Type | Description | Validation |
|-------|------|-------------|------------|
| id | string (UUID) | Unique identity identifier | Required, UUID format |
| schema_id | string | Reference to identity schema | Required |
| schema_url | string | URL to identity schema | Optional |
| state | IdentityState | Account state | Enum: active, inactive |
| state_changed_at | datetime | When state last changed | ISO 8601 |
| traits | object | User profile data (schema-dependent) | Required, varies by schema |
| verifiable_addresses | VerifiableAddress[] | Email/phone for verification | Optional |
| recovery_addresses | RecoveryAddress[] | Addresses for account recovery | Optional |
| credentials | IdentityCredentials | Auth methods (admin-only expand) | Optional (expand param) |
| metadata_public | object | Public metadata | Optional |
| metadata_admin | object | Admin-only metadata | Optional |
| created_at | datetime | Creation timestamp | ISO 8601 |
| updated_at | datetime | Last update timestamp | ISO 8601 |

**State Transitions**:
```
[created] --> active <--> inactive --> [deleted]
```

### Session

Represents an authenticated user session.

| Field | Type | Description | Validation |
|-------|------|-------------|------------|
| id | string (UUID) | Unique session identifier | Required, UUID format |
| active | boolean | Whether session is valid | Required |
| expires_at | datetime | Session expiration time | ISO 8601 |
| authenticated_at | datetime | When authentication occurred | ISO 8601 |
| authenticator_assurance_level | AAL | Authentication assurance level | Enum: aal0, aal1, aal2, aal3 |
| authentication_methods | AuthMethod[] | Methods used to authenticate | Required |
| issued_at | datetime | When session was created | ISO 8601 |
| identity | Identity | Associated identity (expand) | Optional (expand param) |
| devices | Device[] | Devices used in session (expand) | Optional (expand param) |

**Lifecycle**:
- Created on successful authentication
- Expires based on Kratos configuration
- Can be manually disabled (revoked)
- Can be extended (expiration pushed forward)

### Device

Represents a device/browser used in a session.

| Field | Type | Description | Validation |
|-------|------|-------------|------------|
| id | string | Device identifier | Required |
| ip_address | string | Client IP address | IPv4 or IPv6 |
| user_agent | string | Browser/client user agent | Optional |
| location | string | Geographic location | Optional |

### CourierMessage

Represents an email or SMS message sent by Kratos.

| Field | Type | Description | Validation |
|-------|------|-------------|------------|
| id | string (UUID) | Message identifier | Required, UUID format |
| status | MessageStatus | Delivery status | Enum: queued, sent, processing, abandoned, failed |
| type | MessageType | Message channel | Enum: email, phone |
| recipient | string | Email address or phone number | Required |
| body | string | Message content | Required |
| subject | string | Email subject (email only) | Optional |
| template_type | string | Template identifier | Required |
| send_count | integer | Number of send attempts | >= 0 |
| created_at | datetime | When message was created | ISO 8601 |
| updated_at | datetime | Last status update | ISO 8601 |

**Status Flow**:
```
queued --> processing --> sent
                    \--> failed --> abandoned (after retries)
```

### IdentitySchema

JSON Schema defining identity traits structure.

| Field | Type | Description | Validation |
|-------|------|-------------|------------|
| id | string | Schema identifier | Required |
| schema | object | JSON Schema definition | Valid JSON Schema |

### Credential

Authentication credential associated with an identity.

| Field | Type | Description | Validation |
|-------|------|-------------|------------|
| type | CredentialType | Credential type | Enum: password, oidc, totp, webauthn, lookup_secret |
| identifiers | string[] | Unique identifiers (e.g., email) | Required |
| created_at | datetime | When credential was added | ISO 8601 |
| updated_at | datetime | Last update | ISO 8601 |

## Supporting Types

### VerifiableAddress

| Field | Type | Description |
|-------|------|-------------|
| id | string (UUID) | Address identifier |
| value | string | Email or phone number |
| verified | boolean | Verification status |
| via | string | Verification channel (email, sms) |
| status | string | Verification state |
| verified_at | datetime | When verified |

### RecoveryAddress

| Field | Type | Description |
|-------|------|-------------|
| id | string (UUID) | Address identifier |
| value | string | Email or phone number |
| via | string | Recovery channel |
| created_at | datetime | When added |
| updated_at | datetime | Last update |

### AuthMethod

| Field | Type | Description |
|-------|------|-------------|
| method | string | Authentication method used |
| aal | AAL | Assurance level achieved |
| completed_at | datetime | When method completed |

## Enumerations

### IdentityState
- `active` - Account is usable
- `inactive` - Account is disabled

### MessageStatus
- `queued` - Message waiting to be sent
- `processing` - Message being sent
- `sent` - Message successfully delivered
- `failed` - Delivery failed (will retry)
- `abandoned` - Delivery failed (no more retries)

### CredentialType
- `password` - Password-based authentication
- `oidc` - OpenID Connect (social login)
- `totp` - Time-based One-Time Password (MFA)
- `webauthn` - WebAuthn/Passkeys
- `lookup_secret` - Backup codes

### AAL (Authenticator Assurance Level)
- `aal0` - No authentication
- `aal1` - Single factor (password, OIDC)
- `aal2` - Two factors (+ TOTP, WebAuthn)
- `aal3` - Hardware token (not commonly used)

## Analytics Aggregations

For FR-013 (Business Analyst analytics), the server provides computed aggregations:

### SessionAnalytics

| Field | Type | Description |
|-------|------|-------------|
| total_sessions | integer | Total sessions in query period |
| active_sessions | integer | Currently active sessions |
| auth_method_distribution | Record<string, number> | Count by auth method |
| device_type_distribution | Record<string, number> | Count by device type |
| browser_distribution | Record<string, number> | Count by browser |
| sessions_by_day | Record<string, number> | Session count by date |

### CredentialAnalytics

| Field | Type | Description |
|-------|------|-------------|
| total_identities | integer | Total identities analyzed |
| credential_distribution | Record<CredentialType, number> | Count by credential type |
| mfa_adoption | { enabled: number, disabled: number } | MFA adoption stats |

## Configuration Entities

### KratosConfig

Server configuration for connecting to Kratos.

| Field | Type | Description | Validation |
|-------|------|-------------|------------|
| baseUrl | string | Kratos Admin API base URL | Required, valid URL |
| auth | AuthConfig | Authentication configuration | Required |
| timeout | integer | Request timeout in ms | Default: 30000 |

### AuthConfig (Union Type)

```typescript
type AuthConfig =
  | { type: 'none' }
  | { type: 'api-key'; key: string }
  | { type: 'custom-headers'; headers: Record<string, string> };
```

### LogConfig

| Field | Type | Description | Validation |
|-------|------|-------------|------------|
| level | LogLevel | Minimum log level | Enum: trace, debug, info, warn, error |
| format | string | Output format | Enum: json, pretty |

## Relationships

```
Identity 1 ----< * Session
    |
    +-- 1 ----< * VerifiableAddress
    |
    +-- 1 ----< * RecoveryAddress
    |
    +-- 1 ----< * Credential

Session 1 ----< * Device
Session 1 ----< * AuthMethod

Identity * >---- 1 IdentitySchema

CourierMessage * >---- 1 Identity (via recipient)
```

## Validation Rules

1. **Identity Creation**:
   - `traits` must conform to referenced `schema_id`
   - `verifiable_addresses` must be unique across all identities

2. **Session Operations**:
   - Cannot extend expired sessions
   - Cannot disable already-inactive sessions

3. **Pagination**:
   - `pageSize` must be 1-100 (default: 20)
   - `pageToken` must be valid cursor from previous response

4. **Time Filters**:
   - All datetime values in ISO 8601 format
   - Time ranges: `created_after`, `created_before` parameters
