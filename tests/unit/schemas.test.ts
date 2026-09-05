/**
 * Unit tests for tool schemas
 * (009-passkey-code-credentials, 011-architecture-hardening)
 *
 * Verifies the delete-credential input accepts every Kratos credential type,
 * the analytics output schemas carry the scan summary, and Go durations are
 * validated for recovery tools.
 */

import { describe, expect, it } from "vitest";
import { ALL_CREDENTIAL_TYPES } from "../../src/kratos/types";
import {
  CreateRecoveryCodeInputSchema,
  CreateRecoveryLinkInputSchema,
  CredentialAnalyticsOutputSchema,
  DeleteIdentityCredentialInputSchema,
  GoDurationSchema,
  SessionAnalyticsOutputSchema,
} from "../../src/schemas/tools";

const IDENTITY_ID = "3fa85f64-5717-4562-b3fc-2c963f66afa6";

describe("DeleteIdentityCredentialInputSchema", () => {
  it.each([...ALL_CREDENTIAL_TYPES])("accepts the '%s' credential type", (type) => {
    const result = DeleteIdentityCredentialInputSchema.safeParse({ id: IDENTITY_ID, type });
    expect(result.success).toBe(true);
  });

  it("accepts all eleven credential types", () => {
    expect(ALL_CREDENTIAL_TYPES).toHaveLength(11);
  });

  it.each(["foo", "passkeys", ""])("rejects unsupported credential type '%s'", (type) => {
    const result = DeleteIdentityCredentialInputSchema.safeParse({ id: IDENTITY_ID, type });
    expect(result.success).toBe(false);
  });

  it("accepts an optional identifier for oidc/saml unlinking", () => {
    const result = DeleteIdentityCredentialInputSchema.safeParse({
      id: IDENTITY_ID,
      type: "oidc",
      identifier: "google:123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a non-UUID identity id", () => {
    const result = DeleteIdentityCredentialInputSchema.safeParse({ id: "abc", type: "password" });
    expect(result.success).toBe(false);
  });
});

describe("CredentialAnalyticsOutputSchema", () => {
  const scan = { pagesScanned: 1, truncated: false };

  it("accepts output containing the passwordlessAdoption bucket", () => {
    const result = CredentialAnalyticsOutputSchema.safeParse({
      ...scan,
      totalIdentities: 10,
      credentialDistribution: { password: 8, passkey: 3, code: 2 },
      mfaAdoption: { enabled: 4, disabled: 6 },
      passwordlessAdoption: { enabled: 3, disabled: 7 },
    });
    expect(result.success).toBe(true);
  });

  it("remains backward compatible: output without passwordlessAdoption still validates", () => {
    const result = CredentialAnalyticsOutputSchema.safeParse({
      ...scan,
      totalIdentities: 5,
      credentialDistribution: { password: 5 },
      mfaAdoption: { enabled: 1, disabled: 4 },
    });
    expect(result.success).toBe(true);
  });

  it("accepts output with all adoption buckets omitted (includeMfa: false)", () => {
    const result = CredentialAnalyticsOutputSchema.safeParse({
      ...scan,
      totalIdentities: 5,
      credentialDistribution: { password: 5 },
    });
    expect(result.success).toBe(true);
  });

  it("accepts a truncated scan with a resume token", () => {
    const result = CredentialAnalyticsOutputSchema.safeParse({
      pagesScanned: 20,
      truncated: true,
      nextPageToken: "abc",
      totalIdentities: 2000,
      credentialDistribution: { password: 2000 },
    });
    expect(result.success).toBe(true);
  });

  it("requires the scan summary (pagesScanned, truncated)", () => {
    const result = CredentialAnalyticsOutputSchema.safeParse({
      totalIdentities: 5,
      credentialDistribution: { password: 5 },
    });
    expect(result.success).toBe(false);
  });
});

describe("SessionAnalyticsOutputSchema", () => {
  const base = {
    totalSessions: 3,
    activeSessions: 2,
    inactiveSessions: 1,
    byAuthenticationMethod: { password: 2, oidc: 1 },
    byAssuranceLevel: { aal1: 2, aal2: 1 },
    byDeviceType: { desktop: 3 },
    byBrowser: { chrome: 3 },
    timeRange: {},
  };

  it("accepts output with the scan summary", () => {
    const result = SessionAnalyticsOutputSchema.safeParse({
      ...base,
      pagesScanned: 1,
      truncated: false,
    });
    expect(result.success).toBe(true);
  });

  it("requires the scan summary (pagesScanned, truncated)", () => {
    expect(SessionAnalyticsOutputSchema.safeParse(base).success).toBe(false);
  });
});

describe("GoDurationSchema", () => {
  it.each(["1h", "30m", "1.5h", "1h30m", "15s", "500ms", "2h45m30s", "100us", "10ns"])(
    "accepts Go duration '%s'",
    (value) => {
      expect(GoDurationSchema.safeParse(value).success).toBe(true);
    },
  );

  it.each(["", "1", "h", "1 h", "1d", "1hour", "-1h", "1h-30m", "abc"])(
    "rejects invalid duration '%s'",
    (value) => {
      expect(GoDurationSchema.safeParse(value).success).toBe(false);
    },
  );

  it("is applied to expiresIn on recovery link and code inputs", () => {
    expect(
      CreateRecoveryLinkInputSchema.safeParse({ identityId: IDENTITY_ID, expiresIn: "24h" })
        .success,
    ).toBe(true);
    expect(
      CreateRecoveryLinkInputSchema.safeParse({ identityId: IDENTITY_ID, expiresIn: "1d" }).success,
    ).toBe(false);
    expect(
      CreateRecoveryCodeInputSchema.safeParse({ identityId: IDENTITY_ID, expiresIn: "15m" })
        .success,
    ).toBe(true);
    expect(
      CreateRecoveryCodeInputSchema.safeParse({ identityId: IDENTITY_ID, expiresIn: "15" }).success,
    ).toBe(false);
  });

  it("recovery inputs accept returnTo URL and flowType", () => {
    expect(
      CreateRecoveryLinkInputSchema.safeParse({
        identityId: IDENTITY_ID,
        returnTo: "https://app.example.com/done",
      }).success,
    ).toBe(true);
    expect(
      CreateRecoveryLinkInputSchema.safeParse({ identityId: IDENTITY_ID, returnTo: "not a url" })
        .success,
    ).toBe(false);
    expect(
      CreateRecoveryCodeInputSchema.safeParse({ identityId: IDENTITY_ID, flowType: "api" }).success,
    ).toBe(true);
    expect(
      CreateRecoveryCodeInputSchema.safeParse({ identityId: IDENTITY_ID, flowType: "native" })
        .success,
    ).toBe(false);
  });
});
