/**
 * Unit tests for the shared credential type list (009-passkey-code-credentials)
 *
 * Verifies FR-004/FR-005: CREDENTIAL_TYPES is the single source of truth,
 * includes the new passkey/code types, and stays a subset of the credential
 * types the installed @ory/kratos-client SDK accepts.
 */

import {
  DeleteIdentityCredentialsTypeEnum,
  GetIdentityIncludeCredentialEnum,
} from "@ory/kratos-client";
import { describe, expect, it } from "vitest";
import { CREDENTIAL_TYPES } from "../../src/kratos/types";

describe("CREDENTIAL_TYPES (shared credential type list)", () => {
  it("includes the new passkey and code credential types", () => {
    expect(CREDENTIAL_TYPES).toContain("passkey");
    expect(CREDENTIAL_TYPES).toContain("code");
  });

  it("still includes the five legacy credential types", () => {
    for (const legacy of ["password", "oidc", "totp", "webauthn", "lookup_secret"]) {
      expect(CREDENTIAL_TYPES).toContain(legacy);
    }
  });

  it("has no duplicate entries", () => {
    expect(new Set(CREDENTIAL_TYPES).size).toBe(CREDENTIAL_TYPES.length);
  });

  it("is a subset of the SDK's DeleteIdentityCredentialsTypeEnum (delete endpoint)", () => {
    const sdkDeleteTypes = Object.values(DeleteIdentityCredentialsTypeEnum) as string[];
    for (const type of CREDENTIAL_TYPES) {
      expect(sdkDeleteTypes).toContain(type);
    }
  });

  it("is a subset of the SDK's GetIdentityIncludeCredentialEnum (credential expansion)", () => {
    const sdkIncludeTypes = Object.values(GetIdentityIncludeCredentialEnum) as string[];
    for (const type of CREDENTIAL_TYPES) {
      expect(sdkIncludeTypes).toContain(type);
    }
  });

  it("deliberately excludes non-login credential types", () => {
    for (const excluded of ["profile", "saml", "link_recovery", "code_recovery"]) {
      expect(CREDENTIAL_TYPES).not.toContain(excluded);
    }
  });
});
