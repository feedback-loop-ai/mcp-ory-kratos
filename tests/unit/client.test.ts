/**
 * Unit tests for the Kratos client factory and the raw HTTP client
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import type { Config } from "../../src/config";
import { createKratosClients, KratosHttpError } from "../../src/kratos/client";

const CONFIG: Config = {
  kratosAdminUrl: "http://kratos.test:4434/admin/",
  auth: { type: "api-key", key: "secret" },
  logLevel: "error",
  timeoutMs: 5000,
  toolsets: ["health"],
  readOnly: false,
  confirmDestructive: true,
  allowCredentialExposure: false,
  maxScanPages: 20,
};

function jsonResponse(status: number, body: unknown, statusText = "") {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    json: async () => body,
  } as unknown as Response;
}

describe("createKratosClients", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("strips a trailing /admin for the SDK basePath but keeps it for http.get", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { version: "v1.3.1" }));
    vi.stubGlobal("fetch", fetchMock);

    const clients = createKratosClients(CONFIG);
    const sdkBasePath = (clients.identity as unknown as { configuration?: { basePath?: string } })
      .configuration?.basePath;
    expect(sdkBasePath).toBe("http://kratos.test:4434");

    const body = await clients.http.get<{ version: string }>("/version");
    expect(body).toEqual({ version: "v1.3.1" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("http://kratos.test:4434/admin/version");
  });

  it("sends auth headers and an abort signal", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, {}));
    vi.stubGlobal("fetch", fetchMock);

    await createKratosClients(CONFIG).http.get("version");

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(init.method).toBe("GET");
    expect(init.headers).toEqual({ Authorization: "Bearer secret" });
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("http://kratos.test:4434/admin/version");
  });

  it("rejects with KratosHttpError carrying status and parsed body on non-ok responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          jsonResponse(503, { error: { message: "down" } }, "Service Unavailable"),
        ),
    );

    const err = await createKratosClients(CONFIG)
      .http.get("/version")
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(KratosHttpError);
    const httpErr = err as KratosHttpError;
    expect(httpErr.response.status).toBe(503);
    expect(httpErr.response.data).toEqual({ error: { message: "down" } });
    expect(httpErr.message).toBe("HTTP 503: Service Unavailable");
  });

  it("maps a fetch TimeoutError to an ETIMEDOUT KratosHttpError", async () => {
    const timeout = Object.assign(new Error("The operation timed out"), { name: "TimeoutError" });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(timeout));

    const err = await createKratosClients(CONFIG)
      .http.get("/version")
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(KratosHttpError);
    expect((err as KratosHttpError).code).toBe("ETIMEDOUT");
    expect((err as KratosHttpError).response.status).toBe(0);
  });

  it("applies custom headers", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, {}));
    vi.stubGlobal("fetch", fetchMock);

    await createKratosClients({
      ...CONFIG,
      auth: { type: "custom-headers", headers: { "X-Tenant": "t1" } },
    }).http.get("/version");

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(init.headers).toEqual({ "X-Tenant": "t1" });
  });
});
