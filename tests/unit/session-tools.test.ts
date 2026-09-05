/**
 * Session tool tests: list (plain and filtered multi-page scan), get,
 * per-identity list, disable/extend/delete with confirmation.
 */

import type { Session } from "@ory/kratos-client";
import { afterEach, describe, expect, it } from "vitest";
import { type Harness, page, startHarness } from "./harness";

const SESSION_ID = "11111111-2222-4333-8444-555555555555";
const IDENTITY_ID = "9f8d7c6b-5a49-4838-9271-605948372615";

function session(id: string, method: string, provider?: string): Session {
  return {
    id,
    active: true,
    authenticated_at: "2026-01-01T00:00:00Z",
    expires_at: "2026-01-02T00:00:00Z",
    authentication_methods: [{ method, provider }],
    identity: { id: IDENTITY_ID, traits: { email: `${id}@example.test` } },
  } as unknown as Session;
}

describe("session tools", () => {
  let h: Harness;
  afterEach(async () => {
    await h?.close();
  });

  describe("kratos_list_sessions", () => {
    it("passes pagination params through and returns nextPageToken", async () => {
      h = await startHarness();
      h.stubs.identity.listSessions.mockResolvedValue(
        page([session("s1", "password"), session("s2", "oidc", "google")], "next-1"),
      );

      const res = await h.callTool("kratos_list_sessions", {
        pageSize: 5,
        pageToken: "tok",
        active: true,
        expand: ["identity"],
      });

      expect(res.isError).toBeFalsy();
      expect(h.stubs.identity.listSessions).toHaveBeenCalledTimes(1);
      expect(h.stubs.identity.listSessions).toHaveBeenCalledWith({
        pageSize: 5,
        pageToken: "tok",
        active: true,
        expand: ["identity"],
      });
      const out = res.structuredContent as {
        items: Array<{ id: string; email?: string; auth_methods: unknown[] }>;
        count: number;
        nextPageToken?: string;
        pagesScanned?: number;
      };
      expect(out.count).toBe(2);
      expect(out.nextPageToken).toBe("next-1");
      expect(out.pagesScanned).toBeUndefined();
      expect(out.items[0]).toMatchObject({
        id: "s1",
        session_id: "s1",
        identity_id: IDENTITY_ID,
        email: "s1@example.test",
        auth_methods: [{ method: "password" }],
      });
    });

    const setupThreePages = (hh: Harness) => {
      const pages: Record<string, ReturnType<typeof page>> = {
        first: page([session("a1", "oidc", "google"), session("a2", "password")], "p2"),
        p2: page([session("b1", "oidc", "github"), session("b2", "oidc", "google")], "p3"),
        p3: page([session("c1", "oidc", "google")]),
      };
      hh.stubs.identity.listSessions.mockImplementation(
        async (params: { pageToken?: string }) => pages[params.pageToken ?? "first"],
      );
    };

    it("scans across all pages when a filter is set (regression: page-1-only bug)", async () => {
      h = await startHarness();
      setupThreePages(h);

      const res = await h.callTool("kratos_list_sessions", {
        filter: { authMethod: "oidc", provider: "google" },
      });

      expect(res.isError).toBeFalsy();
      const out = res.structuredContent as {
        items: Array<{ id: string }>;
        pagesScanned: number;
        truncated: boolean;
        nextPageToken?: string;
      };
      expect(out.items.map((s) => s.id)).toEqual(["a1", "b2", "c1"]);
      expect(out.pagesScanned).toBe(3);
      expect(out.truncated).toBe(false);
      expect(out.nextPageToken).toBeUndefined();
      expect(h.stubs.identity.listSessions).toHaveBeenCalledTimes(3);
      // Filtered scans always fetch 100 per page with identity expanded
      expect(h.stubs.identity.listSessions).toHaveBeenNthCalledWith(1, {
        pageSize: 100,
        pageToken: undefined,
        active: undefined,
        expand: ["identity"],
      });
      expect(h.stubs.identity.listSessions).toHaveBeenNthCalledWith(2, {
        pageSize: 100,
        pageToken: "p2",
        active: undefined,
        expand: ["identity"],
      });
    });

    it("honours maxPages and reports truncated with a resume token", async () => {
      h = await startHarness();
      setupThreePages(h);

      const res = await h.callTool("kratos_list_sessions", {
        filter: { authMethod: "oidc", provider: "google" },
        maxPages: 1,
      });

      const out = res.structuredContent as {
        items: Array<{ id: string }>;
        pagesScanned: number;
        truncated: boolean;
        nextPageToken?: string;
      };
      expect(out.items.map((s) => s.id)).toEqual(["a1"]);
      expect(out.pagesScanned).toBe(1);
      expect(out.truncated).toBe(true);
      expect(out.nextPageToken).toBe("p2");
      expect(h.stubs.identity.listSessions).toHaveBeenCalledTimes(1);
    });

    it("stops fetching once pageSize matches are collected", async () => {
      h = await startHarness();
      setupThreePages(h);

      const res = await h.callTool("kratos_list_sessions", {
        filter: { authMethod: "oidc", provider: "google" },
        pageSize: 2,
      });

      const out = res.structuredContent as {
        items: Array<{ id: string }>;
        pagesScanned: number;
        truncated: boolean;
        nextPageToken?: string;
      };
      expect(out.items.map((s) => s.id)).toEqual(["a1", "b2"]);
      expect(out.pagesScanned).toBe(2);
      expect(h.stubs.identity.listSessions).toHaveBeenCalledTimes(2);
      expect(out.truncated).toBe(false);
      expect(out.nextPageToken).toBe("p3");
    });
  });

  it("kratos_get_session passes expand through", async () => {
    h = await startHarness();
    h.stubs.identity.getSession.mockResolvedValue({ data: { id: SESSION_ID, active: true } });

    const res = await h.callTool("kratos_get_session", {
      id: SESSION_ID,
      expand: ["identity", "devices"],
    });

    expect(res.isError).toBeFalsy();
    expect(h.stubs.identity.getSession).toHaveBeenCalledWith({
      id: SESSION_ID,
      expand: ["identity", "devices"],
    });
    expect(res.structuredContent).toEqual({ id: SESSION_ID, active: true });
  });

  it("kratos_list_identity_sessions returns identityId and nextPageToken", async () => {
    h = await startHarness();
    h.stubs.identity.listIdentitySessions.mockResolvedValue(
      page([session("s1", "password")], "more"),
    );

    const res = await h.callTool("kratos_list_identity_sessions", {
      identityId: IDENTITY_ID,
      pageSize: 10,
      active: false,
    });

    expect(res.isError).toBeFalsy();
    expect(h.stubs.identity.listIdentitySessions).toHaveBeenCalledWith({
      id: IDENTITY_ID,
      pageSize: 10,
      pageToken: undefined,
      active: false,
    });
    expect(res.structuredContent).toMatchObject({
      identityId: IDENTITY_ID,
      count: 1,
      nextPageToken: "more",
    });
  });

  describe("destructive tools", () => {
    it("kratos_disable_session is cancelled when declined", async () => {
      h = await startHarness();
      h.elicit.handler = () => ({ action: "decline" });
      const res = await h.callTool("kratos_disable_session", { id: SESSION_ID });
      expect(res.isError).toBeFalsy();
      expect(res.structuredContent?.cancelled).toBe(true);
      expect(h.stubs.identity.disableSession).not.toHaveBeenCalled();
    });

    it("kratos_disable_session succeeds when accepted", async () => {
      h = await startHarness();
      h.stubs.identity.disableSession.mockResolvedValue({ data: undefined });
      const res = await h.callTool("kratos_disable_session", { id: SESSION_ID });
      expect(res.isError).toBeFalsy();
      expect(res.structuredContent?.success).toBe(true);
      expect(h.stubs.identity.disableSession).toHaveBeenCalledWith({ id: SESSION_ID });
    });

    it("kratos_delete_identity_sessions is cancelled when declined", async () => {
      h = await startHarness();
      h.elicit.handler = () => ({ action: "cancel" });
      const res = await h.callTool("kratos_delete_identity_sessions", { identityId: IDENTITY_ID });
      expect(res.structuredContent?.cancelled).toBe(true);
      expect(h.stubs.identity.deleteIdentitySessions).not.toHaveBeenCalled();
    });

    it("kratos_delete_identity_sessions succeeds when accepted", async () => {
      h = await startHarness();
      h.stubs.identity.deleteIdentitySessions.mockResolvedValue({ data: undefined });
      const res = await h.callTool("kratos_delete_identity_sessions", { identityId: IDENTITY_ID });
      expect(res.structuredContent?.success).toBe(true);
      expect(h.stubs.identity.deleteIdentitySessions).toHaveBeenCalledWith({ id: IDENTITY_ID });
    });
  });

  it("kratos_extend_session returns the extended session", async () => {
    h = await startHarness();
    h.stubs.identity.extendSession.mockResolvedValue({
      data: { id: SESSION_ID, expires_at: "2027-01-01T00:00:00Z" },
    });
    const res = await h.callTool("kratos_extend_session", { id: SESSION_ID });
    expect(res.isError).toBeFalsy();
    expect(h.stubs.identity.extendSession).toHaveBeenCalledWith({ id: SESSION_ID });
    expect(res.structuredContent).toEqual({ id: SESSION_ID, expires_at: "2027-01-01T00:00:00Z" });
  });

  it("annotates extend as destructive and non-idempotent", async () => {
    h = await startHarness();
    const { tools } = await h.client.listTools();
    const extend = tools.find((t) => t.name === "kratos_extend_session");
    expect(extend?.annotations?.readOnlyHint).toBe(false);
    expect(extend?.annotations?.destructiveHint).toBe(true);
    expect(extend?.annotations?.idempotentHint).toBe(false);
  });
});
