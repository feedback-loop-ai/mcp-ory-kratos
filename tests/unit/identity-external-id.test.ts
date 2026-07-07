/**
 * Unit tests for kratos_get_identity_by_external_id (feature 008-native-external-id)
 *
 * Verifies the tool uses the native Kratos Admin API operation
 * IdentityApi.getIdentityByExternalID (GET /admin/identities/by/external/{externalId})
 * instead of the old (semantically wrong) listIdentities credentials_identifier
 * emulation, and that failures flow through the shared error mapper.
 *
 * Hermetic: the Kratos client and MCP server are mocked; no live Kratos needed.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z, type ZodRawShape } from "zod";
import type { KratosClients } from "../../src/kratos/client";
import type { CorrelatedLogger } from "../../src/logging/logger";
import { registerIdentityQueryTools } from "../../src/tools/identity";

const TOOL_NAME = "kratos_get_identity_by_external_id";

interface ToolResult {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}

type ToolHandler = (args: Record<string, unknown>) => Promise<ToolResult>;

interface RegisteredTool {
  description: string;
  shape: ZodRawShape;
  handler: ToolHandler;
}

/** Minimal McpServer stub capturing server.tool(name, description, shape, handler) */
function createServerStub(): { server: McpServer; tools: Map<string, RegisteredTool> } {
  const tools = new Map<string, RegisteredTool>();
  const server = {
    tool: (name: string, description: string, shape: ZodRawShape, handler: ToolHandler) => {
      tools.set(name, { description, shape, handler });
    },
  } as unknown as McpServer;
  return { server, tools };
}

/** Silent logger stub */
function createLoggerStub(): CorrelatedLogger {
  return {
    trace: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  } as unknown as CorrelatedLogger;
}

const TEST_IDENTITY = {
  id: "9f8d7c6b-5a49-4838-9271-605948372615",
  schema_id: "default",
  external_id: "crm-42",
  traits: { email: "ext-check@example.com" },
  state: "active",
};

/** Axios-like error as thrown by @ory/kratos-client */
function httpError(status: number, message: string, reason?: string) {
  return Object.assign(new Error(message), {
    response: {
      status,
      data: { error: { code: status, message, reason } },
    },
  });
}

describe("kratos_get_identity_by_external_id", () => {
  let tools: Map<string, RegisteredTool>;
  let getIdentityByExternalID: ReturnType<typeof vi.fn>;
  let listIdentities: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    const stub = createServerStub();
    tools = stub.tools;
    getIdentityByExternalID = vi.fn();
    listIdentities = vi.fn();

    const kratosClients = {
      identity: { getIdentityByExternalID, listIdentities },
    } as unknown as KratosClients;

    registerIdentityQueryTools(stub.server, kratosClients, () => createLoggerStub());
  });

  function getTool(): RegisteredTool {
    const tool = tools.get(TOOL_NAME);
    expect(tool).toBeDefined();
    return tool as RegisteredTool;
  }

  describe("US1: correct lookup via the native endpoint", () => {
    it("calls IdentityApi.getIdentityByExternalID with the externalID request property", async () => {
      getIdentityByExternalID.mockResolvedValue({ data: TEST_IDENTITY });

      const result = await getTool().handler({ externalId: "crm-42" });

      expect(getIdentityByExternalID).toHaveBeenCalledTimes(1);
      expect(getIdentityByExternalID).toHaveBeenCalledWith({ externalID: "crm-42" });
      expect(result.isError).toBeUndefined();
      expect(JSON.parse(result.content[0]?.text ?? "")).toEqual(TEST_IDENTITY);
    });

    it("never uses the listIdentities credentials_identifier emulation", async () => {
      getIdentityByExternalID.mockResolvedValue({ data: TEST_IDENTITY });

      await getTool().handler({ externalId: "crm-42" });

      expect(listIdentities).not.toHaveBeenCalled();
    });

    it("does not match credential identifiers (email) when external_id is unset", async () => {
      // Native endpoint 404s for an email that is only a credential identifier;
      // the old emulation would have returned the identity here.
      getIdentityByExternalID.mockRejectedValue(httpError(404, "Unable to locate the resource"));
      listIdentities.mockResolvedValue({ data: [TEST_IDENTITY] });

      const result = await getTool().handler({ externalId: "ext-check@example.com" });

      expect(result.isError).toBe(true);
      expect(listIdentities).not.toHaveBeenCalled();
    });
  });

  describe("US2: structured errors via the shared mapper", () => {
    it("maps Kratos 404 to a structured NOT_FOUND error", async () => {
      getIdentityByExternalID.mockRejectedValue(
        httpError(404, "Unable to locate the resource", "identity not found"),
      );

      const result = await getTool().handler({ externalId: "missing-id" });

      expect(result.isError).toBe(true);
      const payload = JSON.parse(result.content[0]?.text ?? "");
      expect(payload.error.code).toBe("NOT_FOUND");
      expect(payload.error.kratosStatus).toBe(404);
      expect(payload.error.message).toBe("Unable to locate the resource");
      expect(payload.error.suggestion).toContain("get_identity_by_external_id");
    });

    it("maps connection failures to a structured CONNECTION_REFUSED error", async () => {
      getIdentityByExternalID.mockRejectedValue(
        Object.assign(new Error("connect ECONNREFUSED"), { code: "ECONNREFUSED" }),
      );

      const result = await getTool().handler({ externalId: "crm-42" });

      expect(result.isError).toBe(true);
      const payload = JSON.parse(result.content[0]?.text ?? "");
      expect(payload.error.code).toBe("CONNECTION_REFUSED");
      expect(payload.error.suggestion).toBeTruthy();
    });

    it("maps auth failures to a structured UNAUTHORIZED error", async () => {
      getIdentityByExternalID.mockRejectedValue(httpError(401, "Access credentials are invalid"));

      const result = await getTool().handler({ externalId: "crm-42" });

      expect(result.isError).toBe(true);
      const payload = JSON.parse(result.content[0]?.text ?? "");
      expect(payload.error.code).toBe("UNAUTHORIZED");
      expect(payload.error.kratosStatus).toBe(401);
    });
  });

  describe("US3: stable tool contract with corrected semantics", () => {
    it("keeps the tool name and required externalId string input", () => {
      const tool = getTool();
      const schema = z.object(tool.shape);

      expect(schema.safeParse({ externalId: "crm-42" }).success).toBe(true);
      expect(schema.safeParse({}).success).toBe(false);
      expect(schema.safeParse({ externalId: "" }).success).toBe(false);
      expect(schema.safeParse({ externalId: 42 }).success).toBe(false);
    });

    it("describes external_id field semantics, not credential identifiers", () => {
      const tool = getTool();

      expect(tool.description).toContain("external_id");
      expect(tool.description).not.toMatch(/email|username|credential identifier/i);
    });
  });
});
