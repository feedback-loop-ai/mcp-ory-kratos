/**
 * Analytics tool tests through the MCP harness: multi-page scanning, page
 * caps, expand handling, time filtering, and credential aggregation.
 * (Pure aggregation helpers are covered in analytics.test.ts.)
 */

import { afterEach, describe, expect, it } from "vitest";
import { CREDENTIAL_TYPES } from "../../src/kratos/types";
import { type Harness, page, startHarness } from "./harness";

const CHROME_DESKTOP =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";
const SAFARI_MOBILE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

function sess(
  id: string,
  opts: { active?: boolean; method?: string; aal?: string; at?: string; ua?: string } = {},
) {
  return {
    id,
    active: opts.active ?? true,
    authenticated_at: opts.at ?? "2026-03-01T12:00:00Z",
    authentication_methods: [{ method: opts.method ?? "password" }],
    authenticator_assurance_level: opts.aal ?? "aal1",
    devices: opts.ua ? [{ user_agent: opts.ua }] : [],
  };
}

type ScanOut = { pagesScanned: number; truncated: boolean; nextPageToken?: string };

describe("kratos_session_analytics", () => {
  let h: Harness;
  afterEach(async () => {
    await h?.close();
  });

  const threePages = (hh: Harness) => {
    const pages: Record<string, ReturnType<typeof page>> = {
      first: page([sess("a", { ua: CHROME_DESKTOP }), sess("b", { active: false })], "p2"),
      p2: page([sess("c", { method: "oidc", aal: "aal2", ua: SAFARI_MOBILE })], "p3"),
      p3: page([sess("d", { method: "totp" })]),
    };
    hh.stubs.identity.listSessions.mockImplementation(
      async (params: { pageToken?: string }) => pages[params.pageToken ?? "first"],
    );
  };

  it("scans every page and aggregates", async () => {
    h = await startHarness();
    threePages(h);

    const res = await h.callTool("kratos_session_analytics");
    expect(res.isError).toBeFalsy();
    expect(h.stubs.identity.listSessions).toHaveBeenCalledTimes(3);
    expect(h.stubs.identity.listSessions).toHaveBeenNthCalledWith(1, {
      pageSize: 250,
      pageToken: undefined,
      expand: ["devices"],
    });
    expect(h.stubs.identity.listSessions).toHaveBeenNthCalledWith(3, {
      pageSize: 250,
      pageToken: "p3",
      expand: ["devices"],
    });

    expect(res.structuredContent).toMatchObject({
      totalSessions: 4,
      activeSessions: 3,
      inactiveSessions: 1,
      byAuthenticationMethod: { password: 2, oidc: 1, totp: 1 },
      byAssuranceLevel: { aal1: 3, aal2: 1 },
      byDeviceType: { desktop: 1, mobile: 1 },
      byBrowser: { Chrome: 1, Safari: 1 },
      pagesScanned: 3,
      truncated: false,
    });
    expect((res.structuredContent as ScanOut).nextPageToken).toBeUndefined();
  });

  it("honours maxPages and reports truncated with nextPageToken", async () => {
    h = await startHarness();
    threePages(h);

    const res = await h.callTool("kratos_session_analytics", { maxPages: 2 });
    expect(h.stubs.identity.listSessions).toHaveBeenCalledTimes(2);
    const out = res.structuredContent as ScanOut & { totalSessions: number };
    expect(out.totalSessions).toBe(3);
    expect(out.pagesScanned).toBe(2);
    expect(out.truncated).toBe(true);
    expect(out.nextPageToken).toBe("p3");
  });

  it("does not expand devices when includeDevices is false", async () => {
    h = await startHarness();
    h.stubs.identity.listSessions.mockResolvedValue(page([sess("a", { ua: CHROME_DESKTOP })]));

    const res = await h.callTool("kratos_session_analytics", { includeDevices: false });
    expect(h.stubs.identity.listSessions).toHaveBeenCalledWith({
      pageSize: 250,
      pageToken: undefined,
      expand: undefined,
    });
    expect(res.structuredContent?.byDeviceType).toEqual({});
    expect(res.structuredContent?.byBrowser).toEqual({});
  });

  it("filters sessions by from/to and echoes the time range", async () => {
    h = await startHarness();
    h.stubs.identity.listSessions.mockResolvedValue(
      page([
        sess("old", { at: "2025-01-01T00:00:00Z" }),
        sess("in", { at: "2026-02-15T00:00:00Z" }),
        sess("late", { at: "2026-06-01T00:00:00Z" }),
      ]),
    );

    const res = await h.callTool("kratos_session_analytics", {
      from: "2026-01-01T00:00:00Z",
      to: "2026-03-01T00:00:00Z",
    });
    expect(res.isError).toBeFalsy();
    expect(res.structuredContent).toMatchObject({
      totalSessions: 1,
      timeRange: { from: "2026-01-01T00:00:00Z", to: "2026-03-01T00:00:00Z" },
      pagesScanned: 1,
      truncated: false,
    });
  });
});

describe("kratos_credential_analytics", () => {
  let h: Harness;
  afterEach(async () => {
    await h?.close();
  });

  const identity = (...types: string[]) => ({
    id: types.join("-") || "none",
    credentials: Object.fromEntries(types.map((t) => [t, { type: t }])),
  });

  const twoPages = (hh: Harness) => {
    const pages: Record<string, ReturnType<typeof page>> = {
      first: page([identity("password"), identity("password", "totp")], "p2"),
      p2: page([identity("oidc", "passkey"), identity()]),
    };
    hh.stubs.identity.listIdentities.mockImplementation(
      async (params: { pageToken?: string }) => pages[params.pageToken ?? "first"],
    );
  };

  it("requests every credential type and aggregates across pages", async () => {
    h = await startHarness();
    twoPages(h);

    const res = await h.callTool("kratos_credential_analytics");
    expect(res.isError).toBeFalsy();
    expect(h.stubs.identity.listIdentities).toHaveBeenCalledTimes(2);
    expect(h.stubs.identity.listIdentities).toHaveBeenNthCalledWith(1, {
      pageSize: 250,
      pageToken: undefined,
      includeCredential: [...CREDENTIAL_TYPES],
    });
    expect(res.structuredContent).toMatchObject({
      totalIdentities: 4,
      credentialDistribution: { password: 2, totp: 1, oidc: 1, passkey: 1 },
      mfaAdoption: { enabled: 1, disabled: 3 },
      passwordlessAdoption: { enabled: 1, disabled: 3 },
      pagesScanned: 2,
      truncated: false,
    });
  });

  it("uses config.maxScanPages as the default page cap", async () => {
    h = await startHarness({ maxScanPages: 1 });
    twoPages(h);

    const res = await h.callTool("kratos_credential_analytics");
    expect(h.stubs.identity.listIdentities).toHaveBeenCalledTimes(1);
    const out = res.structuredContent as ScanOut & { totalIdentities: number };
    expect(out.totalIdentities).toBe(2);
    expect(out.pagesScanned).toBe(1);
    expect(out.truncated).toBe(true);
    expect(out.nextPageToken).toBe("p2");
  });

  it("omits adoption buckets when includeMfa is false", async () => {
    h = await startHarness();
    twoPages(h);
    const res = await h.callTool("kratos_credential_analytics", { includeMfa: false });
    expect(res.isError).toBeFalsy();
    expect(res.structuredContent?.mfaAdoption).toBeUndefined();
    expect(res.structuredContent?.passwordlessAdoption).toBeUndefined();
    expect(res.structuredContent?.totalIdentities).toBe(4);
  });
});
