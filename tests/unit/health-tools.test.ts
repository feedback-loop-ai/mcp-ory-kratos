/**
 * Health tool tests: alive/ready via the SDK MetadataApi, version via the raw
 * HTTP client, and HTTP-client error mapping.
 */

import { afterEach, describe, expect, it } from "vitest";
import { KratosHttpError } from "../../src/kratos/client";
import { type Harness, startHarness } from "./harness";

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

describe("health tools", () => {
  let h: Harness;
  afterEach(async () => {
    await h?.close();
  });

  it("kratos_health_alive returns status and ISO checkedAt", async () => {
    h = await startHarness();
    h.stubs.metadata.isAlive.mockResolvedValue({ data: { status: "ok" } });
    const res = await h.callTool("kratos_health_alive");
    expect(res.isError).toBeFalsy();
    expect(res.structuredContent?.status).toBe("ok");
    expect(res.structuredContent?.checkedAt).toMatch(ISO);
    expect(h.stubs.metadata.isAlive).toHaveBeenCalledTimes(1);
  });

  it("kratos_health_ready returns status and ISO checkedAt", async () => {
    h = await startHarness();
    h.stubs.metadata.isReady.mockResolvedValue({ data: { status: "ok" } });
    const res = await h.callTool("kratos_health_ready");
    expect(res.isError).toBeFalsy();
    expect(res.structuredContent?.status).toBe("ok");
    expect(res.structuredContent?.checkedAt).toMatch(ISO);
    expect(h.stubs.metadata.isReady).toHaveBeenCalledTimes(1);
  });

  it("kratos_version uses http.get('/version')", async () => {
    h = await startHarness();
    h.stubs.http.get.mockResolvedValue({ version: "v1.3.1" });
    const res = await h.callTool("kratos_version");
    expect(res.isError).toBeFalsy();
    expect(h.stubs.http.get).toHaveBeenCalledWith("/version");
    expect(res.structuredContent).toEqual({ version: "v1.3.1" });
  });

  it("maps a 503 from the HTTP client to SERVICE_UNAVAILABLE", async () => {
    h = await startHarness();
    h.stubs.http.get.mockRejectedValue(new KratosHttpError(503, "Service Unavailable"));
    const res = await h.callTool("kratos_version");
    expect(res.isError).toBe(true);
    const payload = res.json as { error: { code: string; kratosStatus: number } };
    expect(payload.error.code).toBe("SERVICE_UNAVAILABLE");
    expect(payload.error.kratosStatus).toBe(503);
  });

  it("maps an ETIMEDOUT HTTP client error to TIMEOUT", async () => {
    h = await startHarness();
    h.stubs.http.get.mockRejectedValue(new KratosHttpError(0, "timeout", undefined, "ETIMEDOUT"));
    const res = await h.callTool("kratos_version");
    expect(res.isError).toBe(true);
    const payload = res.json as { error: { code: string } };
    expect(payload.error.code).toBe("TIMEOUT");
  });
});
