/**
 * Unit tests for credential analytics aggregation
 * (009-passkey-code-credentials)
 *
 * Verifies FR-006/FR-007/FR-008: passkey counts toward passwordless adoption
 * (not MFA), code counts toward neither bucket, and existing MFA semantics
 * are unchanged.
 */

import { describe, expect, it } from "vitest";
import type { CredentialAnalyticsOutput } from "../../src/schemas/tools";
import { processIdentityForCredentialAnalytics } from "../../src/tools/analytics";

function makeAnalytics(includeAdoption = true): CredentialAnalyticsOutput {
  return {
    totalIdentities: 0,
    credentialDistribution: {},
    mfaAdoption: includeAdoption ? { enabled: 0, disabled: 0 } : undefined,
    passwordlessAdoption: includeAdoption ? { enabled: 0, disabled: 0 } : undefined,
  };
}

function identityWith(...credentialTypes: string[]): { credentials?: Record<string, unknown> } {
  if (credentialTypes.length === 0) {
    return {};
  }
  return {
    credentials: Object.fromEntries(credentialTypes.map((type) => [type, { type }])),
  };
}

describe("processIdentityForCredentialAnalytics", () => {
  it("counts a passkey-only identity as passwordless-enabled but NOT MFA-enabled", () => {
    const analytics = makeAnalytics();
    processIdentityForCredentialAnalytics(identityWith("passkey"), analytics);

    expect(analytics.passwordlessAdoption).toEqual({ enabled: 1, disabled: 0 });
    expect(analytics.mfaAdoption).toEqual({ enabled: 0, disabled: 1 });
    expect(analytics.credentialDistribution).toEqual({ passkey: 1 });
  });

  it("never counts password+passkey as MFA-enabled (passkey is a first factor)", () => {
    const analytics = makeAnalytics();
    processIdentityForCredentialAnalytics(identityWith("password", "passkey"), analytics);

    expect(analytics.mfaAdoption).toEqual({ enabled: 0, disabled: 1 });
    expect(analytics.passwordlessAdoption).toEqual({ enabled: 1, disabled: 0 });
  });

  it("counts a code-only identity in neither MFA nor passwordless buckets", () => {
    const analytics = makeAnalytics();
    processIdentityForCredentialAnalytics(identityWith("code"), analytics);

    expect(analytics.credentialDistribution).toEqual({ code: 1 });
    expect(analytics.mfaAdoption).toEqual({ enabled: 0, disabled: 1 });
    expect(analytics.passwordlessAdoption).toEqual({ enabled: 0, disabled: 1 });
  });

  it("keeps existing MFA semantics: totp/webauthn/lookup_secret count as MFA", () => {
    const analytics = makeAnalytics();
    processIdentityForCredentialAnalytics(identityWith("password", "totp"), analytics);
    processIdentityForCredentialAnalytics(identityWith("password", "webauthn"), analytics);
    processIdentityForCredentialAnalytics(identityWith("password", "lookup_secret"), analytics);

    expect(analytics.mfaAdoption).toEqual({ enabled: 3, disabled: 0 });
    expect(analytics.passwordlessAdoption).toEqual({ enabled: 0, disabled: 3 });
  });

  it("counts an identity without credentials as disabled in both buckets", () => {
    const analytics = makeAnalytics();
    processIdentityForCredentialAnalytics(identityWith(), analytics);

    expect(analytics.totalIdentities).toBe(1);
    expect(analytics.mfaAdoption).toEqual({ enabled: 0, disabled: 1 });
    expect(analytics.passwordlessAdoption).toEqual({ enabled: 0, disabled: 1 });
  });

  it("still tallies the credential distribution when adoption stats are disabled", () => {
    const analytics = makeAnalytics(false);
    processIdentityForCredentialAnalytics(identityWith("passkey", "code"), analytics);

    expect(analytics.credentialDistribution).toEqual({ passkey: 1, code: 1 });
    expect(analytics.mfaAdoption).toBeUndefined();
    expect(analytics.passwordlessAdoption).toBeUndefined();
  });

  it("ignores unknown future credential types for both buckets but keeps them in the distribution", () => {
    const analytics = makeAnalytics();
    processIdentityForCredentialAnalytics(identityWith("some_future_type"), analytics);

    expect(analytics.credentialDistribution).toEqual({ some_future_type: 1 });
    expect(analytics.mfaAdoption).toEqual({ enabled: 0, disabled: 1 });
    expect(analytics.passwordlessAdoption).toEqual({ enabled: 0, disabled: 1 });
  });

  it("aggregates a mixed population correctly", () => {
    const analytics = makeAnalytics();
    const population = [
      identityWith("password"),
      identityWith("password", "totp"),
      identityWith("passkey"),
      identityWith("password", "passkey", "webauthn"),
      identityWith("code"),
      identityWith(),
    ];
    for (const identity of population) {
      processIdentityForCredentialAnalytics(identity, analytics);
    }

    expect(analytics.totalIdentities).toBe(6);
    expect(analytics.credentialDistribution).toEqual({
      password: 3,
      totp: 1,
      passkey: 2,
      webauthn: 1,
      code: 1,
    });
    // MFA: totp identity + webauthn identity
    expect(analytics.mfaAdoption).toEqual({ enabled: 2, disabled: 4 });
    // Passwordless: the two passkey holders
    expect(analytics.passwordlessAdoption).toEqual({ enabled: 2, disabled: 4 });
  });
});
