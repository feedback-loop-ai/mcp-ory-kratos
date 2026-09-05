/**
 * Recovery tool tests: link/code creation, duration validation, annotations.
 */

import { afterEach, describe, expect, it } from "vitest";
import { type Harness, startHarness } from "./harness";

const IDENTITY_ID = "9f8d7c6b-5a49-4838-9271-605948372615";

describe("recovery tools", () => {
  let h: Harness;
  afterEach(async () => {
    await h?.close();
  });

  it("kratos_create_recovery_link passes body and returnTo, returns link with warning", async () => {
    h = await startHarness();
    h.stubs.identity.createRecoveryLinkForIdentity.mockResolvedValue({
      data: {
        recovery_link: "https://kratos.test/recover?token=abc",
        expires_at: "2026-01-01T01:00:00Z",
      },
    });

    const res = await h.callTool("kratos_create_recovery_link", {
      identityId: IDENTITY_ID,
      expiresIn: "1h",
      returnTo: "https://app.test/home",
    });

    expect(res.isError).toBeFalsy();
    expect(h.stubs.identity.createRecoveryLinkForIdentity).toHaveBeenCalledWith({
      createRecoveryLinkForIdentityBody: { identity_id: IDENTITY_ID, expires_in: "1h" },
      returnTo: "https://app.test/home",
    });
    expect(res.structuredContent).toEqual({
      identityId: IDENTITY_ID,
      recoveryLink: "https://kratos.test/recover?token=abc",
      expiresAt: "2026-01-01T01:00:00Z",
      warning: expect.stringContaining("secret"),
    });
  });

  it("kratos_create_recovery_code passes flow_type", async () => {
    h = await startHarness();
    h.stubs.identity.createRecoveryCodeForIdentity.mockResolvedValue({
      data: {
        recovery_code: "123456",
        recovery_link: "https://kratos.test/recover?flow=x",
        expires_at: "2026-01-01T00:15:00Z",
      },
    });

    const res = await h.callTool("kratos_create_recovery_code", {
      identityId: IDENTITY_ID,
      expiresIn: "15m",
      flowType: "api",
    });

    expect(res.isError).toBeFalsy();
    expect(h.stubs.identity.createRecoveryCodeForIdentity).toHaveBeenCalledWith({
      createRecoveryCodeForIdentityBody: {
        identity_id: IDENTITY_ID,
        expires_in: "15m",
        flow_type: "api",
      },
    });
    expect(res.structuredContent).toMatchObject({
      identityId: IDENTITY_ID,
      recoveryCode: "123456",
      recoveryLink: "https://kratos.test/recover?flow=x",
      expiresAt: "2026-01-01T00:15:00Z",
    });
    expect(typeof res.structuredContent?.warning).toBe("string");
  });

  it("rejects an invalid Go duration before calling Kratos", async () => {
    h = await startHarness();
    const res = await h.callTool("kratos_create_recovery_link", {
      identityId: IDENTITY_ID,
      expiresIn: "soon",
    });
    expect(res.isError).toBe(true);
    expect(h.stubs.identity.createRecoveryLinkForIdentity).not.toHaveBeenCalled();
  });

  it("accepts a compound Go duration like 1h30m", async () => {
    h = await startHarness();
    h.stubs.identity.createRecoveryLinkForIdentity.mockResolvedValue({
      data: { recovery_link: "https://kratos.test/r", expires_at: "2026-01-01T01:30:00Z" },
    });
    const res = await h.callTool("kratos_create_recovery_link", {
      identityId: IDENTITY_ID,
      expiresIn: "1h30m",
    });
    expect(res.isError).toBeFalsy();
    expect(h.stubs.identity.createRecoveryLinkForIdentity).toHaveBeenCalledWith({
      createRecoveryLinkForIdentityBody: { identity_id: IDENTITY_ID, expires_in: "1h30m" },
      returnTo: undefined,
    });
  });

  it("annotates both tools as CREATE (not read-only, not destructive)", async () => {
    h = await startHarness();
    const { tools } = await h.client.listTools();
    for (const name of ["kratos_create_recovery_link", "kratos_create_recovery_code"]) {
      const tool = tools.find((t) => t.name === name);
      expect(tool?.annotations?.readOnlyHint, name).toBe(false);
      expect(tool?.annotations?.destructiveHint, name).toBe(false);
      expect(tool?.annotations?.idempotentHint, name).toBe(false);
    }
  });
});
