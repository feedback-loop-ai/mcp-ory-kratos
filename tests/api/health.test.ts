/**
 * Health API Tests
 *
 * Verifies health and version endpoints respond correctly against configured Kratos instance.
 * User Story 6: Run Health Check Tests (Priority: P3)
 */

import { beforeAll, describe, expect, it } from "vitest";
import { loadConfig } from "../setup/config";
import { createKratosClients, createTestContext, type TestContext } from "../setup/context";

describe("Health API", () => {
  let ctx: TestContext;

  beforeAll(() => {
    const config = loadConfig();
    const clients = createKratosClients(config);
    ctx = createTestContext(clients);
  });

  describe("Alive Endpoint", () => {
    it("should return status ok", async () => {
      const response = await ctx.clients.metadata.isAlive();

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty("status");
      expect(response.data.status).toBe("ok");
    });

    it("should respond quickly (under 1 second)", async () => {
      const startTime = Date.now();
      await ctx.clients.metadata.isAlive();
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(1000);
    });
  });

  describe("Ready Endpoint", () => {
    it("should return status ok", async () => {
      const response = await ctx.clients.metadata.isReady();

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty("status");
      expect(response.data.status).toBe("ok");
    });

    it("should respond within reasonable time", async () => {
      const startTime = Date.now();
      await ctx.clients.metadata.isReady();
      const duration = Date.now() - startTime;

      // Ready check may take longer as it checks dependencies
      expect(duration).toBeLessThan(5000);
    });
  });

  describe("Version Endpoint", () => {
    it("should return version string", async () => {
      const response = await ctx.clients.metadata.getVersion();

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty("version");
      expect(typeof response.data.version).toBe("string");
      expect(response.data.version.length).toBeGreaterThan(0);
    });

    it("should match expected version format", async () => {
      const response = await ctx.clients.metadata.getVersion();

      // Kratos versions typically follow format like "v1.3.0" or similar
      const version = response.data.version;

      // Should start with 'v' or be a semver-like string
      expect(version).toMatch(/^v?\d+\.\d+/);
    });

    it("should match configured expected version", async () => {
      const config = loadConfig();
      const response = await ctx.clients.metadata.getVersion();

      // This test validates the same version check done in global setup
      expect(response.data.version).toBe(config.expectedVersion);
    });
  });

  describe("Health Response Structure", () => {
    it("alive response should have correct structure", async () => {
      const response = await ctx.clients.metadata.isAlive();

      expect(response.data).toEqual({ status: "ok" });
    });

    it("ready response should have correct structure", async () => {
      const response = await ctx.clients.metadata.isReady();

      // Ready response should have status: ok
      expect(response.data).toMatchObject({ status: "ok" });
    });

    it("version response should have version field", async () => {
      const response = await ctx.clients.metadata.getVersion();

      expect(Object.keys(response.data)).toContain("version");
    });
  });

  describe("Endpoint Availability", () => {
    it("all health endpoints should be accessible", async () => {
      // Run all health checks in parallel
      const [aliveResponse, readyResponse, versionResponse] = await Promise.all([
        ctx.clients.metadata.isAlive(),
        ctx.clients.metadata.isReady(),
        ctx.clients.metadata.getVersion(),
      ]);

      expect(aliveResponse.status).toBe(200);
      expect(readyResponse.status).toBe(200);
      expect(versionResponse.status).toBe(200);
    });

    it("health endpoints should not require authentication", async () => {
      // These endpoints should work even without auth headers
      // The test itself verifies this by using the same client
      // If auth was required and missing, we'd get 401/403
      const response = await ctx.clients.metadata.isAlive();
      expect(response.status).toBe(200);
    });
  });
});
