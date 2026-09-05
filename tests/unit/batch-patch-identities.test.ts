/**
 * Unit tests for the `kratos_batch_patch_identities` MCP tool.
 *
 * Mock-based and CI-safe (no live Kratos): runs through the in-memory MCP
 * harness with stubbed Kratos SDK clients.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { BatchPatchIdentitiesInputSchema } from "../../src/schemas/tools.js";
import { type Harness, startHarness } from "./harness";

const TOOL_NAME = "kratos_batch_patch_identities";

const validItem = {
  create: {
    schemaId: "default",
    traits: { email: "a@example.com" },
    state: "active" as const,
  },
};

interface BatchResult {
  results: Array<{ action: string; identity?: string; patchId?: string; error?: unknown }>;
  summary: { total: number; succeeded: number; failed: number };
}

describe("kratos_batch_patch_identities", () => {
  let h: Harness;

  beforeEach(async () => {
    h = await startHarness();
  });
  afterEach(async () => {
    await h?.close();
  });

  describe("registration", () => {
    it("registers with the correct name and a bulk, non-atomic, capped description", async () => {
      const { tools } = await h.client.listTools();
      const tool = tools.find((t) => t.name === TOOL_NAME);
      expect(tool).toBeDefined();
      // FR-009: bulk write, non-atomic, documented cap
      const description = tool?.description?.toLowerCase() ?? "";
      expect(description).toContain("bulk");
      expect(description).toMatch(/non-atomic|independently/);
      expect(description).toContain("100");
      expect(tool?.annotations?.readOnlyHint).toBe(false);
    });
  });

  describe("happy path (US1)", () => {
    it("maps camelCase input to snake_case SDK body", async () => {
      h.stubs.identity.batchPatchIdentities.mockResolvedValue({ data: { identities: [] } });

      await h.callTool(TOOL_NAME, {
        identities: [
          {
            create: {
              schemaId: "default",
              traits: { email: "a@example.com" },
              state: "active",
              metadataPublic: { tier: "gold" },
              metadataAdmin: { note: "vip" },
            },
            patchId: "11111111-1111-1111-1111-111111111111",
          },
        ],
      });

      expect(h.stubs.identity.batchPatchIdentities).toHaveBeenCalledWith({
        patchIdentitiesBody: {
          identities: [
            {
              create: {
                schema_id: "default",
                traits: { email: "a@example.com" },
                state: "active",
                metadata_public: { tier: "gold" },
                metadata_admin: { note: "vip" },
              },
              patch_id: "11111111-1111-1111-1111-111111111111",
            },
          ],
        },
      });
    });

    it("maps the extended import fields (external_id, organization, credentials, addresses)", async () => {
      h.stubs.identity.batchPatchIdentities.mockResolvedValue({ data: { identities: [] } });

      await h.callTool(TOOL_NAME, {
        identities: [
          {
            create: {
              schemaId: "default",
              traits: { email: "b@example.com" },
              externalId: "crm-7",
              organizationId: "22222222-2222-2222-2222-222222222222",
              credentials: { password: { config: { hashed_password: "$2a$hash" } } },
              verifiableAddresses: [
                { value: "b@example.com", via: "email", verified: true },
                { value: "+123", via: "sms", status: "sent" },
              ],
              recoveryAddresses: [{ value: "b@example.com", via: "email" }],
            },
          },
        ],
      });

      const body = h.stubs.identity.batchPatchIdentities.mock.calls[0]?.[0].patchIdentitiesBody;
      expect(body.identities[0]).toEqual({
        create: {
          schema_id: "default",
          traits: { email: "b@example.com" },
          state: "active",
          external_id: "crm-7",
          organization_id: "22222222-2222-2222-2222-222222222222",
          credentials: { password: { config: { hashed_password: "$2a$hash" } } },
          verifiable_addresses: [
            { value: "b@example.com", via: "email", verified: true, status: "completed" },
            { value: "+123", via: "sms", verified: false, status: "sent" },
          ],
          recovery_addresses: [{ value: "b@example.com", via: "email" }],
        },
        patch_id: undefined,
      });
    });

    it("maps SDK response fields to results and computes summary", async () => {
      h.stubs.identity.batchPatchIdentities.mockResolvedValue({
        data: {
          identities: [
            { action: "create", identity: "id-1", patch_id: "patch-1" },
            { action: "create", identity: "id-2" },
          ],
        },
      });

      const result = await h.callTool(TOOL_NAME, { identities: [validItem, validItem] });
      const parsed = result.json as BatchResult;

      expect(result.isError).toBeFalsy();
      expect(parsed.results).toEqual([
        { action: "create", identity: "id-1", patchId: "patch-1" },
        { action: "create", identity: "id-2" },
      ]);
      expect(parsed.summary).toEqual({ total: 2, succeeded: 2, failed: 0 });
      expect(result.structuredContent?.summary).toEqual(parsed.summary);
    });
  });

  describe("per-item failures (US2)", () => {
    it("passes per-item error payloads through verbatim and keeps isError unset", async () => {
      const errorPayload = { code: 409, message: "identity already exists", reason: "conflict" };
      h.stubs.identity.batchPatchIdentities.mockResolvedValue({
        data: {
          identities: [
            { action: "create", identity: "id-1", patch_id: "patch-1" },
            { action: "error", error: errorPayload, patch_id: "patch-2" },
          ],
        },
      });

      const result = await h.callTool(TOOL_NAME, { identities: [validItem, validItem] });
      const parsed = result.json as BatchResult;

      expect(result.isError).toBeFalsy();
      expect(parsed.results[1]).toEqual({
        action: "error",
        patchId: "patch-2",
        error: errorPayload,
      });
      expect(parsed.summary).toEqual({ total: 2, succeeded: 1, failed: 1 });
    });

    it("handles an all-failed batch", async () => {
      h.stubs.identity.batchPatchIdentities.mockResolvedValue({
        data: {
          identities: [
            { action: "error", error: { message: "bad" } },
            { action: "error", error: { message: "worse" } },
          ],
        },
      });

      const result = await h.callTool(TOOL_NAME, { identities: [validItem, validItem] });
      const parsed = result.json as BatchResult;

      expect(result.isError).toBeFalsy();
      expect(parsed.summary).toEqual({ total: 2, succeeded: 0, failed: 2 });
    });

    it("handles a missing/empty identities array in the Kratos response", async () => {
      h.stubs.identity.batchPatchIdentities.mockResolvedValue({ data: {} });

      const result = await h.callTool(TOOL_NAME, { identities: [validItem] });
      const parsed = result.json as BatchResult;

      expect(parsed.results).toEqual([]);
      expect(parsed.summary).toEqual({ total: 0, succeeded: 0, failed: 0 });
    });

    it("maps request-level failures to structured errors with isError (FR-008)", async () => {
      h.stubs.identity.batchPatchIdentities.mockRejectedValue({
        response: { status: 401, data: { error: { message: "no session" } } },
        message: "Request failed with status code 401",
      });

      const result = await h.callTool(TOOL_NAME, { identities: [validItem] });
      const parsed = result.json as { error: { code: string; suggestion: string } };

      expect(result.isError).toBe(true);
      expect(result.structuredContent).toBeUndefined();
      expect(parsed.error.code).toBe("UNAUTHORIZED");
      expect(parsed.error.suggestion).toContain("batch_patch_identities");
    });
  });

  describe("input validation through the server (US3)", () => {
    it("rejects an empty batch before calling the SDK", async () => {
      const result = await h.callTool(TOOL_NAME, { identities: [] });
      expect(result.isError).toBe(true);
      expect(h.stubs.identity.batchPatchIdentities).not.toHaveBeenCalled();
    });

    it("rejects 101 items before calling the SDK", async () => {
      const identities = Array.from({ length: 101 }, () => validItem);
      const result = await h.callTool(TOOL_NAME, { identities });
      expect(result.isError).toBe(true);
      expect(h.stubs.identity.batchPatchIdentities).not.toHaveBeenCalled();
    });

    it("accepts 100 items", async () => {
      h.stubs.identity.batchPatchIdentities.mockResolvedValue({ data: { identities: [] } });
      const identities = Array.from({ length: 100 }, () => validItem);
      const result = await h.callTool(TOOL_NAME, { identities });
      expect(result.isError).toBeFalsy();
      expect(
        h.stubs.identity.batchPatchIdentities.mock.calls[0]?.[0].patchIdentitiesBody.identities,
      ).toHaveLength(100);
    });
  });
});

describe("BatchPatchIdentitiesInputSchema validation (US3)", () => {
  const item = validItem;

  it("accepts 1 item", () => {
    expect(BatchPatchIdentitiesInputSchema.safeParse({ identities: [item] }).success).toBe(true);
  });

  it("accepts 100 items", () => {
    const identities = Array.from({ length: 100 }, () => item);
    expect(BatchPatchIdentitiesInputSchema.safeParse({ identities }).success).toBe(true);
  });

  it("rejects 0 items with an actionable message", () => {
    const parsed = BatchPatchIdentitiesInputSchema.safeParse({ identities: [] });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0]?.message).toContain("At least one identity");
    }
  });

  it("rejects 101 items with a cap message", () => {
    const identities = Array.from({ length: 101 }, () => item);
    const parsed = BatchPatchIdentitiesInputSchema.safeParse({ identities });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0]?.message).toContain("100");
    }
  });

  it("rejects a non-UUID patchId", () => {
    const parsed = BatchPatchIdentitiesInputSchema.safeParse({
      identities: [{ ...item, patchId: "not-a-uuid" }],
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects an item missing create.schemaId", () => {
    const parsed = BatchPatchIdentitiesInputSchema.safeParse({
      identities: [{ create: { traits: { email: "a@example.com" } } }],
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects an item missing create.traits", () => {
    const parsed = BatchPatchIdentitiesInputSchema.safeParse({
      identities: [{ create: { schemaId: "default" } }],
    });
    expect(parsed.success).toBe(false);
  });

  it("applies the default state of active", () => {
    const parsed = BatchPatchIdentitiesInputSchema.safeParse({
      identities: [{ create: { schemaId: "default", traits: {} } }],
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.identities[0]?.create.state).toBe("active");
    }
  });
});
