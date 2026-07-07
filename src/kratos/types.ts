/**
 * Re-exported types from @ory/kratos-client
 *
 * This module provides convenient access to Kratos API types
 * @module kratos/types
 */

export type {
  AuthenticatorAssuranceLevel,
  CreateIdentityBody,
  HealthStatus,
  Identity,
  IdentityCredentials,
  IdentityCredentialsOidc,
  IdentityCredentialsPassword,
  IdentitySchemaContainer,
  JsonPatch,
  Message,
  MessageDispatch,
  RecoveryCodeForIdentity,
  RecoveryIdentityAddress,
  RecoveryLinkForIdentity,
  Session,
  SessionDevice,
  UpdateIdentityBody,
  VerifiableIdentityAddress,
  Version,
} from "@ory/kratos-client";

/**
 * Identity state enum values
 */
export type IdentityState = "active" | "inactive";

/**
 * Credential types supported by this server (single source of truth).
 *
 * A deliberate subset of the SDK's DeleteIdentityCredentialsTypeEnum /
 * GetIdentityIncludeCredentialEnum limited to account login credentials
 * (excludes profile, saml, link_recovery, code_recovery).
 */
export const CREDENTIAL_TYPES = [
  "password",
  "oidc",
  "totp",
  "webauthn",
  "lookup_secret",
  "passkey",
  "code",
] as const;

/**
 * Credential types supported by Kratos
 */
export type CredentialType = (typeof CREDENTIAL_TYPES)[number];

/**
 * Message status values
 */
export type MessageStatus = "queued" | "sent" | "processing" | "abandoned" | "failed";

/**
 * Authenticator Assurance Levels
 */
export type AAL = "aal0" | "aal1" | "aal2" | "aal3";
