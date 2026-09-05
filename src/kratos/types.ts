/**
 * Kratos type helpers
 * @module kratos/types
 */

import type { DeleteIdentityCredentialsTypeEnum } from "@ory/kratos-client";

export type { Identity, Session } from "@ory/kratos-client";

/**
 * Login credential types (used by credential analytics as the default scan set).
 * Excludes recovery and profile pseudo-credentials.
 */
export const CREDENTIAL_TYPES = [
  "password",
  "oidc",
  "totp",
  "webauthn",
  "lookup_secret",
  "passkey",
  "code",
] as const satisfies readonly DeleteIdentityCredentialsTypeEnum[];

/**
 * Every credential type Kratos v26.2 accepts for include/delete operations.
 */
export const ALL_CREDENTIAL_TYPES = [
  ...CREDENTIAL_TYPES,
  "profile",
  "saml",
  "link_recovery",
  "code_recovery",
] as const satisfies readonly DeleteIdentityCredentialsTypeEnum[];

export type CredentialType = (typeof CREDENTIAL_TYPES)[number];

/** Credential types whose `config` carries secret material and is redacted by default */
export const SENSITIVE_CREDENTIAL_TYPES: ReadonlySet<string> = new Set([
  "password",
  "oidc",
  "saml",
  "totp",
  "lookup_secret",
  "webauthn",
  "passkey",
]);

/**
 * Redact secret-bearing credential config from an identity unless exposure is allowed.
 * Keeps identifiers/type/version/timestamps so agents can still see what is linked.
 */
export function redactCredentials<T extends { credentials?: unknown }>(
  identity: T,
  allowExposure: boolean,
): T {
  if (allowExposure || !identity.credentials || typeof identity.credentials !== "object") {
    return identity;
  }
  const redacted: Record<string, unknown> = {};
  for (const [type, cred] of Object.entries(identity.credentials as Record<string, unknown>)) {
    if (SENSITIVE_CREDENTIAL_TYPES.has(type) && cred && typeof cred === "object") {
      const { config, ...rest } = cred as Record<string, unknown>;
      redacted[type] = {
        ...rest,
        config:
          config === undefined ? undefined : "[redacted: set KRATOS_ALLOW_CREDENTIAL_EXPOSURE=1]",
      };
    } else {
      redacted[type] = cred;
    }
  }
  return { ...identity, credentials: redacted };
}
