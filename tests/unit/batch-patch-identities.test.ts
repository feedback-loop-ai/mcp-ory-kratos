import { beforeEach, describe, expect, it, vi } from "vitest";
import type { KratosClients } from "../../src/kratos/client.js";
import type { CorrelatedLogger } from "../../src/logging/logger.js";
import { BatchPatchIdentitiesInputSchema } from "../../src/schemas/tools.js";
import { registerIdentityManagementTools } from "../../src/tools/identity.js";

/**
 * Unit tests for the `kratos_batch_patch_identities` MCP tool.
 *
 * These are mock-based and CI-safe (no live Kratos). We stub `McpServer.tool()`
 * to capture the registered handler, then drive it with mocked SDK responses.
 */

type CapturedTool = {
  name: string;
  description: string;
  // biome-ignore lint/suspicious/noExplicitAny: test harness captures arbitrary handlers
  handler: (args: any) => Promise<any>;
};

function setup() {
  const tools = new Map<string, CapturedTool>();

  const server = {
    tool: (name: string, description: string, _shape: unknown, handler: CapturedTool["handler"]) => {
      tools.set(name, { name, description, handler });
    },
    // biome-ignore lint/suspicious/noExplicitAny: minimal McpServer stub for tests
  } as any;

  const batchPatchIdentities = vi.fn();
  const kratosClients = {
    identity: { batchPatchIdentities },
    // biome-ignore lint/suspicious/noExplicitAny: partial KratosClients mock
  } as unknown as KratosClients;

  const log = {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    // biome-ignore lint/suspicious/noExplicitAny: partial logger mock
  } as unknown as CorrelatedLogger;

  registerIdentityManagementTools(server, kratosClients, () => log);

  const tool = tools.get("kratos_batch_patch_identities");
  if (!tool) throw new Error("kratos_batch_patch_identities not registered");

  return { tool, batchPatchIdentities, log };
}

function parseResult(result: { content: Array<{ text: string }> }) {
  return JSON.parse(result.content[0].text);
}

const validItem = {
  create: {
    schemaId: "default",
    traits: { email: "a@example.com" },
    state: "active" as const,
  },
};

describe("kratos_batch_patch_identities registration", () => {
  it("registers with the correct name and a destructive-capable description", () => {
    const { tool } = setup();

    expect(tool.name).toBe("kratos_batch_patch_identities");
    // FR-009: bulk write, non-atomic, documented cap
    expect(tool.description.toLowerCase()).toContain("bulk");
    expect(tool.description.toLowerCase()).toContain("non-atomic");
    expect(tool.description).toContain("100");
  });
});

describe("kratos_batch_patch_identities happy path (US1)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("maps camelCase input to snake_case SDK body", async () => {
    const { tool, batchPatchIdentities } = setup();
    batchPatchIdentities.mockResolvedValue({ data: { identities: [] } });

    await tool.handler({
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

    expect(batchPatchIdentities).toHaveBeenCalledWith({
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

  it("maps SDK response fields to results and computes summary", async () => {
    const { tool, batchPatchIdentities } = setup();
    batchPatchIdentities.mockResolvedValue({
      data: {
        identities: [
          { action: "create", identity: "id-1", patch_id: "patch-1" },
          { action: "create", identity: "id-2" },
        ],
      },
    });

    const result = await tool.handler({ identities: [validItem, validItem] });
    const parsed = parseResult(result);

    expect(result.isError).toBeUndefined();
    expect(parsed.results).toEqual([
      { index: 0, action: "create", identityId: "id-1", patchId: "patch-1" },
      { index: 1, action: "create", identityId: "id-2" },
    ]);
    expect(parsed.summary).toEqual({ total: 2, succeeded: 2, failed: 0 });
  });

  it("logs batch size without logging traits (FR-010)", async () => {
    const { tool, batchPatchIdentities, log } = setup();
    batchPatchIdentities.mockResolvedValue({ data: { identities: [] } });

    await tool.handler({ identities: [validItem] });

    const infoCalls = (log.info as ReturnType<typeof vi.fn>).mock.calls;
    const serialized = JSON.stringify(infoCalls);
    expect(serialized).toContain("batchSize");
    expect(serialized).not.toContain("a@example.com");
  });
});

describe("kratos_batch_patch_identities per-item failures (US2)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("passes per-item error payloads through verbatim and keeps isError unset", async () => {
    const { tool, batchPatchIdentities } = setup();
    const errorPayload = { code: 409, message: "identity already exists", reason: "conflict" };
    batchPatchIdentities.mockResolvedValue({
      data: {
        identities: [
          { action: "create", identity: "id-1", patch_id: "patch-1" },
          { action: "error", error: errorPayload, patch_id: "patch-2" },
        ],
      },
    });

    const result = await tool.handler({ identities: [validItem, validItem] });
    const parsed = parseResult(result);

    expect(result.isError).toBeUndefined();
    expect(parsed.results[1]).toEqual({
      index: 1,
      action: "error",
      patchId: "patch-2",
      error: errorPayload,
    });
    expect(parsed.summary).toEqual({ total: 2, succeeded: 1, failed: 1 });
  });

  it("handles an all-failed batch", async () => {
    const { tool, batchPatchIdentities } = setup();
    batchPatchIdentities.mockResolvedValue({
      data: {
        identities: [
          { action: "error", error: { message: "bad" } },
          { action: "error", error: { message: "worse" } },
        ],
      },
    });

    const result = await tool.handler({ identities: [validItem, validItem] });
    const parsed = parseResult(result);

    expect(result.isError).toBeUndefined();
    expect(parsed.summary).toEqual({ total: 2, succeeded: 0, failed: 2 });
  });

  it("handles a missing/empty identities array in the Kratos response", async () => {
    const { tool, batchPatchIdentities } = setup();
    batchPatchIdentities.mockResolvedValue({ data: {} });

    const result = await tool.handler({ identities: [validItem] });
    const parsed = parseResult(result);

    expect(parsed.results).toEqual([]);
    expect(parsed.summary).toEqual({ total: 0, succeeded: 0, failed: 0 });
  });

  it("maps request-level failures to structured errors with isError (FR-008)", async () => {
    const { tool, batchPatchIdentities, log } = setup();
    batchPatchIdentities.mockRejectedValue({
      response: { status: 401, data: { error: { message: "no session" } } },
      message: "Request failed with status code 401",
    });

    const result = await tool.handler({ identities: [validItem] });
    const parsed = parseResult(result);

    expect(result.isError).toBe(true);
    expect(parsed.error.code).toBe("UNAUTHORIZED");
    expect(parsed.error.suggestion).toContain("batch_patch_identities");
    expect(log.error).toHaveBeenCalled();
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
      expect(parsed.error.issues[0].message).toContain("At least one identity");
    }
  });

  it("rejects 101 items with a cap message", () => {
    const identities = Array.from({ length: 101 }, () => item);
    const parsed = BatchPatchIdentitiesInputSchema.safeParse({ identities });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0].message).toContain("100");
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
      expect(parsed.data.identities[0].create.state).toBe("active");
    }
  });
});
