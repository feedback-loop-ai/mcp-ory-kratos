/**
 * Unit tests for kratos_get_identity_by_external_id (feature 008-native-external-id)
 *
 * Verifies the tool uses the native Kratos Admin API operation
 * IdentityApi.getIdentityByExternalID (GET /admin/identities/by/external/{externalId})
 * instead of the old (semantically wrong) listIdentities credentials_identifier
 * emulation, and that failures flow through the shared error mapper.
 *
 * Hermetic: runs against the in-memory MCP harness with stubbed Kratos clients.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { type Harness, httpError, startHarness } from "./harness";

const TOOL_NAME = "kratos_get_identity_by_external_id";

const TEST_IDENTITY = {
  id: "9f8d7c6b-5a49-4838-9271-605948372615",
  schema_id: "default",
  external_id: "crm-42",
  traits: { email: "ext-check@example.com" },
  state: "active",
};

interface ErrorPayload {
  error: { code: string; kratosStatus?: number; message: string; suggestion: string };
}

describe("kratos_get_identity_by_external_id", () => {
  let h: Harness;

  beforeEach(async () => {
    h = await startHarness();
  });
  afterEach(async () => {
    await h?.close();
  });

  describe("US1: correct lookup via the native endpoint", () => {
    it("calls IdentityApi.getIdentityByExternalID with the externalID request property", async () => {
      h.stubs.identity.getIdentityByExternalID.mockResolvedValue({ data: TEST_IDENTITY });

      const result = await h.callTool(TOOL_NAME, { externalId: "crm-42" });

      expect(h.stubs.identity.getIdentityByExternalID).toHaveBeenCalledTimes(1);
      expect(h.stubs.identity.getIdentityByExternalID).toHaveBeenCalledWith({
        externalID: "crm-42",
      });
      expect(result.isError).toBeFalsy();
      expect(result.json).toEqual(TEST_IDENTITY);
      expect(result.structuredContent).toEqual(TEST_IDENTITY);
    });

    it("never uses the listIdentities credentials_identifier emulation", async () => {
      h.stubs.identity.getIdentityByExternalID.mockResolvedValue({ data: TEST_IDENTITY });

      await h.callTool(TOOL_NAME, { externalId: "crm-42" });

      expect(h.stubs.identity.listIdentities).not.toHaveBeenCalled();
    });

    it("does not match credential identifiers (email) when external_id is unset", async () => {
      // Native endpoint 404s for an email that is only a credential identifier;
      // the old emulation would have returned the identity here.
      h.stubs.identity.getIdentityByExternalID.mockRejectedValue(
        httpError(404, "Unable to locate the resource"),
      );
      h.stubs.identity.listIdentities.mockResolvedValue({ data: [TEST_IDENTITY] });

      const result = await h.callTool(TOOL_NAME, { externalId: "ext-check@example.com" });

      expect(result.isError).toBe(true);
      expect(h.stubs.identity.listIdentities).not.toHaveBeenCalled();
    });
  });

  describe("US2: structured errors via the shared mapper", () => {
    it("maps Kratos 404 to a structured NOT_FOUND error", async () => {
      h.stubs.identity.getIdentityByExternalID.mockRejectedValue(
        httpError(404, "Unable to locate the resource", "identity not found"),
      );

      const result = await h.callTool(TOOL_NAME, { externalId: "missing-id" });

      expect(result.isError).toBe(true);
      const payload = result.json as ErrorPayload;
      expect(payload.error.code).toBe("NOT_FOUND");
      expect(payload.error.kratosStatus).toBe(404);
      expect(payload.error.message).toBe("Unable to locate the resource");
      expect(payload.error.suggestion).toContain("get_identity_by_external_id");
    });

    it("maps connection failures to a structured CONNECTION_REFUSED error", async () => {
      h.stubs.identity.getIdentityByExternalID.mockRejectedValue(
        Object.assign(new Error("connect ECONNREFUSED"), { code: "ECONNREFUSED" }),
      );

      const result = await h.callTool(TOOL_NAME, { externalId: "crm-42" });

      expect(result.isError).toBe(true);
      const payload = result.json as ErrorPayload;
      expect(payload.error.code).toBe("CONNECTION_REFUSED");
      expect(payload.error.suggestion).toBeTruthy();
    });

    it("maps auth failures to a structured UNAUTHORIZED error", async () => {
      h.stubs.identity.getIdentityByExternalID.mockRejectedValue(
        httpError(401, "Access credentials are invalid"),
      );

      const result = await h.callTool(TOOL_NAME, { externalId: "crm-42" });

      expect(result.isError).toBe(true);
      const payload = result.json as ErrorPayload;
      expect(payload.error.code).toBe("UNAUTHORIZED");
      expect(payload.error.kratosStatus).toBe(401);
    });
  });

  describe("US3: stable tool contract with corrected semantics", () => {
    it("keeps the tool name and required non-empty externalId string input", async () => {
      const { tools } = await h.client.listTools();
      const tool = tools.find((t) => t.name === TOOL_NAME);
      expect(tool).toBeDefined();

      const schema = tool?.inputSchema as {
        required?: string[];
        properties: Record<string, { type?: string; minLength?: number }>;
      };
      expect(schema.required).toContain("externalId");
      expect(schema.properties.externalId?.type).toBe("string");
      expect(schema.properties.externalId?.minLength).toBe(1);
    });

    it("rejects missing, empty, and non-string externalId before reaching Kratos", async () => {
      for (const args of [{}, { externalId: "" }, { externalId: 42 }]) {
        const result = await h.callTool(TOOL_NAME, args);
        expect(result.isError, JSON.stringify(args)).toBe(true);
      }
      expect(h.stubs.identity.getIdentityByExternalID).not.toHaveBeenCalled();
    });

    it("describes external_id field semantics, not credential identifiers", async () => {
      const { tools } = await h.client.listTools();
      const tool = tools.find((t) => t.name === TOOL_NAME);

      expect(tool?.description).toContain("external_id");
      expect(tool?.description).not.toMatch(/email|username|credential identifier/i);
    });
  });
});
