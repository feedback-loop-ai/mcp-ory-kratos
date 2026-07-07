/**
 * Unit tests for tool schemas affected by passkey/code support
 * (009-passkey-code-credentials)
 *
 * Verifies FR-001/FR-002 (delete-credential input) and FR-006/FR-008
 * (additive credential-analytics output).
 */

import { describe, expect, it } from "vitest";
import {
  CredentialAnalyticsOutputSchema,
  DeleteIdentityCredentialInputSchema,
} from "../../src/schemas/tools";

const IDENTITY_ID = "3fa85f64-5717-4562-b3fc-2c963f66afa6";

describe("DeleteIdentityCredentialInputSchema", () => {
  it.each(["passkey", "code"])("accepts the new '%s' credential type", (type) => {
    const result = DeleteIdentityCredentialInputSchema.safeParse({ id: IDENTITY_ID, type });
    expect(result.success).toBe(true);
  });

  it.each(["password", "oidc", "totp", "webauthn", "lookup_secret"])(
    "still accepts the legacy '%s' credential type",
    (type) => {
      const result = DeleteIdentityCredentialInputSchema.safeParse({ id: IDENTITY_ID, type });
      expect(result.success).toBe(true);
    },
  );

  it.each(["profile", "saml", "link_recovery", "code_recovery", "passkeys", ""])(
    "rejects unsupported credential type '%s'",
    (type) => {
      const result = DeleteIdentityCredentialInputSchema.safeParse({ id: IDENTITY_ID, type });
      expect(result.success).toBe(false);
    },
  );
});

describe("CredentialAnalyticsOutputSchema", () => {
  it("accepts output containing the new passwordlessAdoption bucket", () => {
    const result = CredentialAnalyticsOutputSchema.safeParse({
      totalIdentities: 10,
      credentialDistribution: { password: 8, passkey: 3, code: 2 },
      mfaAdoption: { enabled: 4, disabled: 6 },
      passwordlessAdoption: { enabled: 3, disabled: 7 },
    });
    expect(result.success).toBe(true);
  });

  it("remains backward compatible: output without passwordlessAdoption still validates", () => {
    const result = CredentialAnalyticsOutputSchema.safeParse({
      totalIdentities: 5,
      credentialDistribution: { password: 5 },
      mfaAdoption: { enabled: 1, disabled: 4 },
    });
    expect(result.success).toBe(true);
  });

  it("accepts output with all adoption buckets omitted (includeMfa: false)", () => {
    const result = CredentialAnalyticsOutputSchema.safeParse({
      totalIdentities: 5,
      credentialDistribution: { password: 5 },
    });
    expect(result.success).toBe(true);
  });
});
