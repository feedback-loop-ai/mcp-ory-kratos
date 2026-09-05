/**
 * Unit tests for configuration loading from environment variables
 */

import { describe, expect, it } from "vitest";
import { loadConfig, TOOLSETS } from "../../src/config";

const BASE = { KRATOS_ADMIN_URL: "http://kratos.test:4434/admin" };

describe("loadConfig", () => {
  it("applies defaults", () => {
    const config = loadConfig({ ...BASE });
    expect(config).toEqual({
      kratosAdminUrl: "http://kratos.test:4434/admin",
      auth: { type: "none" },
      logLevel: "info",
      timeoutMs: 30000,
      toolsets: [...TOOLSETS],
      readOnly: false,
      confirmDestructive: true,
      allowCredentialExposure: false,
      maxScanPages: 20,
    });
  });

  it("throws when KRATOS_ADMIN_URL is missing", () => {
    expect(() => loadConfig({})).toThrow(/KRATOS_ADMIN_URL/);
  });

  it("throws when KRATOS_ADMIN_URL is not a URL", () => {
    expect(() => loadConfig({ KRATOS_ADMIN_URL: "not a url" })).toThrow();
  });

  describe("KRATOS_TOOLSETS", () => {
    it("parses a comma-separated list with whitespace", () => {
      const config = loadConfig({ ...BASE, KRATOS_TOOLSETS: "identities, health" });
      expect(config.toolsets).toEqual(["identities", "health"]);
    });

    it("expands 'all' to every toolset", () => {
      expect(loadConfig({ ...BASE, KRATOS_TOOLSETS: "all" }).toolsets).toEqual([...TOOLSETS]);
      expect(loadConfig({ ...BASE, KRATOS_TOOLSETS: "ALL" }).toolsets).toEqual([...TOOLSETS]);
    });

    it("rejects unknown toolsets and lists the valid values", () => {
      expect(() => loadConfig({ ...BASE, KRATOS_TOOLSETS: "identities,bogus" })).toThrow(
        /Invalid KRATOS_TOOLSETS.*identities, sessions, courier, recovery, health, analytics, all/,
      );
    });
  });

  describe("boolean flags", () => {
    it.each([
      ["1", true],
      ["true", true],
      ["TRUE", true],
      ["yes", true],
      ["0", false],
      ["false", false],
      ["", false],
    ])("KRATOS_READ_ONLY=%j -> %s", (value, expected) => {
      expect(loadConfig({ ...BASE, KRATOS_READ_ONLY: value }).readOnly).toBe(expected);
    });

    it("KRATOS_CONFIRM_DESTRUCTIVE=0 disables confirmation", () => {
      expect(loadConfig({ ...BASE, KRATOS_CONFIRM_DESTRUCTIVE: "0" }).confirmDestructive).toBe(
        false,
      );
      expect(loadConfig({ ...BASE, KRATOS_CONFIRM_DESTRUCTIVE: "" }).confirmDestructive).toBe(true);
    });

    it("KRATOS_ALLOW_CREDENTIAL_EXPOSURE enables credential exposure", () => {
      expect(
        loadConfig({ ...BASE, KRATOS_ALLOW_CREDENTIAL_EXPOSURE: "true" }).allowCredentialExposure,
      ).toBe(true);
      expect(
        loadConfig({ ...BASE, KRATOS_ALLOW_CREDENTIAL_EXPOSURE: "0" }).allowCredentialExposure,
      ).toBe(false);
    });
  });

  describe("KRATOS_MAX_SCAN_PAGES", () => {
    it("parses a number", () => {
      expect(loadConfig({ ...BASE, KRATOS_MAX_SCAN_PAGES: "5" }).maxScanPages).toBe(5);
    });

    it("rejects out-of-range or non-numeric values", () => {
      expect(() => loadConfig({ ...BASE, KRATOS_MAX_SCAN_PAGES: "0" })).toThrow();
      expect(() => loadConfig({ ...BASE, KRATOS_MAX_SCAN_PAGES: "1001" })).toThrow();
      expect(() => loadConfig({ ...BASE, KRATOS_MAX_SCAN_PAGES: "lots" })).toThrow();
    });
  });

  it("parses KRATOS_TIMEOUT_MS and LOG_LEVEL", () => {
    const config = loadConfig({ ...BASE, KRATOS_TIMEOUT_MS: "5000", LOG_LEVEL: "debug" });
    expect(config.timeoutMs).toBe(5000);
    expect(config.logLevel).toBe("debug");
  });

  describe("auth", () => {
    it("api-key requires KRATOS_API_KEY", () => {
      expect(() => loadConfig({ ...BASE, KRATOS_AUTH_TYPE: "api-key" })).toThrow(/KRATOS_API_KEY/);
      expect(
        loadConfig({ ...BASE, KRATOS_AUTH_TYPE: "api-key", KRATOS_API_KEY: "secret" }).auth,
      ).toEqual({ type: "api-key", key: "secret" });
    });

    it("custom-headers parses a JSON object of strings", () => {
      const config = loadConfig({
        ...BASE,
        KRATOS_AUTH_TYPE: "custom-headers",
        KRATOS_CUSTOM_HEADERS: '{"X-Api-Key":"abc","X-Tenant":"t1"}',
      });
      expect(config.auth).toEqual({
        type: "custom-headers",
        headers: { "X-Api-Key": "abc", "X-Tenant": "t1" },
      });
    });

    it("custom-headers rejects a JSON array", () => {
      expect(() =>
        loadConfig({
          ...BASE,
          KRATOS_AUTH_TYPE: "custom-headers",
          KRATOS_CUSTOM_HEADERS: '["X-Api-Key","abc"]',
        }),
      ).toThrow(/JSON object of string values/);
    });

    it("custom-headers rejects non-string values and invalid JSON", () => {
      expect(() =>
        loadConfig({
          ...BASE,
          KRATOS_AUTH_TYPE: "custom-headers",
          KRATOS_CUSTOM_HEADERS: '{"X-Count":1}',
        }),
      ).toThrow(/JSON object of string values/);
      expect(() =>
        loadConfig({ ...BASE, KRATOS_AUTH_TYPE: "custom-headers", KRATOS_CUSTOM_HEADERS: "{" }),
      ).toThrow(/valid JSON/);
      expect(() => loadConfig({ ...BASE, KRATOS_AUTH_TYPE: "custom-headers" })).toThrow(
        /KRATOS_CUSTOM_HEADERS is required/,
      );
    });

    it("rejects an unknown auth type", () => {
      expect(() => loadConfig({ ...BASE, KRATOS_AUTH_TYPE: "oauth" })).toThrow(
        /Invalid KRATOS_AUTH_TYPE/,
      );
    });
  });
});
