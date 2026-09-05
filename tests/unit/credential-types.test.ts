/**
 * Unit tests for the shared credential type lists
 * (009-passkey-code-credentials, 011-architecture-hardening)
 *
 * CREDENTIAL_TYPES is the set of login credential types (default scan set for
 * credential analytics). ALL_CREDENTIAL_TYPES is every type Kratos accepts for
 * include/delete operations and is what the tool input schemas use.
 */

import {
  DeleteIdentityCredentialsTypeEnum,
  GetIdentityIncludeCredentialEnum,
} from "@ory/kratos-client";
import { describe, expect, it } from "vitest";
import {
  ALL_CREDENTIAL_TYPES,
  CREDENTIAL_TYPES,
  redactCredentials,
  SENSITIVE_CREDENTIAL_TYPES,
} from "../../src/kratos/types";

describe("CREDENTIAL_TYPES (login credential types)", () => {
  it("is exactly the seven login credential types", () => {
    expect([...CREDENTIAL_TYPES].sort()).toEqual(
      ["password", "oidc", "totp", "webauthn", "lookup_secret", "passkey", "code"].sort(),
    );
  });

  it("includes the passkey and code credential types", () => {
    expect(CREDENTIAL_TYPES).toContain("passkey");
    expect(CREDENTIAL_TYPES).toContain("code");
  });

  it("has no duplicate entries", () => {
    expect(new Set(CREDENTIAL_TYPES).size).toBe(CREDENTIAL_TYPES.length);
  });

  it("is a subset of ALL_CREDENTIAL_TYPES", () => {
    for (const type of CREDENTIAL_TYPES) {
      expect(ALL_CREDENTIAL_TYPES).toContain(type);
    }
  });

  it("deliberately excludes non-login credential types", () => {
    for (const excluded of ["profile", "saml", "link_recovery", "code_recovery"]) {
      expect(CREDENTIAL_TYPES).not.toContain(excluded);
    }
  });
});

describe("ALL_CREDENTIAL_TYPES (every include/delete type)", () => {
  it("has eleven entries: the login types plus profile, saml, link_recovery, code_recovery", () => {
    expect(ALL_CREDENTIAL_TYPES).toHaveLength(11);
    for (const extra of ["profile", "saml", "link_recovery", "code_recovery"]) {
      expect(ALL_CREDENTIAL_TYPES).toContain(extra);
    }
  });

  it("has no duplicate entries", () => {
    expect(new Set(ALL_CREDENTIAL_TYPES).size).toBe(ALL_CREDENTIAL_TYPES.length);
  });

  it("is a subset of the SDK's DeleteIdentityCredentialsTypeEnum (delete endpoint)", () => {
    const sdkDeleteTypes = Object.values(DeleteIdentityCredentialsTypeEnum) as string[];
    for (const type of ALL_CREDENTIAL_TYPES) {
      expect(sdkDeleteTypes).toContain(type);
    }
  });

  it("is a subset of the SDK's GetIdentityIncludeCredentialEnum (credential expansion)", () => {
    const sdkIncludeTypes = Object.values(GetIdentityIncludeCredentialEnum) as string[];
    for (const type of ALL_CREDENTIAL_TYPES) {
      expect(sdkIncludeTypes).toContain(type);
    }
  });
});

describe("redactCredentials", () => {
  const identity = {
    id: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    traits: { email: "user@example.com" },
    credentials: {
      password: {
        type: "password",
        identifiers: ["user@example.com"],
        config: { hashed_password: "$2a$10$secret" },
      },
      oidc: {
        type: "oidc",
        identifiers: ["google:123"],
        config: { providers: [{ provider: "google", subject: "123", access_token: "tok" }] },
      },
      code: {
        type: "code",
        identifiers: ["user@example.com"],
        config: { addresses: [{ channel: "email", address: "user@example.com" }] },
      },
      totp: { type: "totp", identifiers: [] },
    },
  };

  it("returns the identity unchanged when exposure is allowed", () => {
    expect(redactCredentials(identity, true)).toBe(identity);
  });

  it("returns the identity unchanged when it has no credentials", () => {
    const bare: { id: string; traits: unknown; credentials?: unknown } = {
      id: identity.id,
      traits: identity.traits,
    };
    expect(redactCredentials(bare, false)).toBe(bare);
  });

  it("replaces config of sensitive credential types with a redaction marker", () => {
    const out = redactCredentials(identity, false);
    const creds = out.credentials as Record<string, Record<string, unknown>>;
    expect(creds.password?.config).toBe("[redacted: set KRATOS_ALLOW_CREDENTIAL_EXPOSURE=1]");
    expect(creds.oidc?.config).toBe("[redacted: set KRATOS_ALLOW_CREDENTIAL_EXPOSURE=1]");
  });

  it("keeps type and identifiers of redacted credentials", () => {
    const out = redactCredentials(identity, false);
    const creds = out.credentials as Record<string, Record<string, unknown>>;
    expect(creds.password?.type).toBe("password");
    expect(creds.password?.identifiers).toEqual(["user@example.com"]);
    expect(creds.oidc?.identifiers).toEqual(["google:123"]);
  });

  it("leaves non-sensitive credential types untouched", () => {
    const out = redactCredentials(identity, false);
    const creds = out.credentials as Record<string, unknown>;
    expect(creds.code).toEqual(identity.credentials.code);
  });

  it("leaves config undefined when a sensitive credential has no config", () => {
    const out = redactCredentials(identity, false);
    const creds = out.credentials as Record<string, Record<string, unknown>>;
    expect(creds.totp?.config).toBeUndefined();
    expect(creds.totp?.type).toBe("totp");
  });

  it("does not mutate the input identity", () => {
    const copy = structuredClone(identity);
    redactCredentials(identity, false);
    expect(identity).toEqual(copy);
  });

  it("redacts every type listed in SENSITIVE_CREDENTIAL_TYPES", () => {
    const credentials: Record<string, unknown> = {};
    for (const type of SENSITIVE_CREDENTIAL_TYPES) {
      credentials[type] = { type, config: { secret: true } };
    }
    const out = redactCredentials({ credentials }, false);
    for (const type of SENSITIVE_CREDENTIAL_TYPES) {
      const cred = (out.credentials as Record<string, Record<string, unknown>>)[type];
      expect(cred?.config).toBe("[redacted: set KRATOS_ALLOW_CREDENTIAL_EXPOSURE=1]");
    }
  });
});
