/**
 * Server-level tests: tool inventory, annotations, toolset/read-only gating,
 * structured output, error envelope, and elicitation-based confirmation.
 */

import { afterEach, describe, expect, it } from "vitest";
import { type Harness, httpError, startHarness } from "./harness";

const ALL_TOOLS = [
  "kratos_list_identities",
  "kratos_get_identity",
  "kratos_get_identity_by_external_id",
  "kratos_create_identity",
  "kratos_update_identity",
  "kratos_patch_identity",
  "kratos_set_identity_state",
  "kratos_delete_identity",
  "kratos_delete_identity_credential",
  "kratos_batch_patch_identities",
  "kratos_list_identity_schemas",
  "kratos_get_identity_schema",
  "kratos_list_sessions",
  "kratos_get_session",
  "kratos_list_identity_sessions",
  "kratos_disable_session",
  "kratos_extend_session",
  "kratos_delete_identity_sessions",
  "kratos_list_courier_messages",
  "kratos_get_courier_message",
  "kratos_create_recovery_link",
  "kratos_create_recovery_code",
  "kratos_health_alive",
  "kratos_health_ready",
  "kratos_version",
  "kratos_session_analytics",
  "kratos_credential_analytics",
];

describe("server", () => {
  let h: Harness;
  afterEach(async () => {
    await h?.close();
  });

  it("registers every tool with a title and annotations", async () => {
    h = await startHarness();
    const { tools } = await h.client.listTools();
    const names = tools.map((t) => t.name).sort();
    expect(names).toEqual([...ALL_TOOLS].sort());
    for (const tool of tools) {
      expect(tool.title, tool.name).toBeTruthy();
      expect(tool.annotations?.openWorldHint, tool.name).toBe(false);
      expect(typeof tool.annotations?.readOnlyHint, tool.name).toBe("boolean");
      expect(tool.outputSchema, tool.name).toBeDefined();
    }
  });

  it("hides mutating tools in read-only mode", async () => {
    h = await startHarness({ readOnly: true });
    const { tools } = await h.client.listTools();
    expect(tools.every((t) => t.annotations?.readOnlyHint === true)).toBe(true);
    expect(tools.map((t) => t.name)).not.toContain("kratos_delete_identity");
    expect(tools.map((t) => t.name)).toContain("kratos_get_identity");
  });

  it("hides tools outside the enabled toolsets", async () => {
    h = await startHarness({ toolsets: ["health"] });
    const { tools } = await h.client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual([
      "kratos_health_alive",
      "kratos_health_ready",
      "kratos_version",
    ]);
  });

  it("returns structuredContent alongside text", async () => {
    h = await startHarness();
    h.stubs.metadata.isAlive.mockResolvedValue({ data: { status: "ok" } });
    const res = await h.callTool("kratos_health_alive");
    expect(res.isError).toBeFalsy();
    expect(res.structuredContent?.status).toBe("ok");
    expect((res.json as { status: string }).status).toBe("ok");
  });

  it("maps Kratos errors to the structured error envelope with isError", async () => {
    h = await startHarness();
    h.stubs.identity.getIdentity.mockRejectedValue(httpError(404, "Unable to locate", "not_found"));
    const res = await h.callTool("kratos_get_identity", {
      id: "9f8d7c6b-5a49-4838-9271-605948372615",
    });
    expect(res.isError).toBe(true);
    expect(res.structuredContent).toBeUndefined();
    const payload = res.json as {
      error: { code: string; kratosStatus: number; suggestion: string };
    };
    expect(payload.error.code).toBe("NOT_FOUND");
    expect(payload.error.kratosStatus).toBe(404);
    expect(payload.error.suggestion).toContain("get_identity");
  });

  it("rejects invalid input before reaching Kratos", async () => {
    h = await startHarness();
    const res = await h.callTool("kratos_get_identity", { id: "not-a-uuid" });
    expect(res.isError).toBe(true);
    expect(h.stubs.identity.getIdentity).not.toHaveBeenCalled();
  });

  describe("destructive confirmation", () => {
    const ID = "9f8d7c6b-5a49-4838-9271-605948372615";

    it("asks the client and proceeds when accepted", async () => {
      h = await startHarness();
      h.stubs.identity.deleteIdentity.mockResolvedValue({ data: undefined });
      const res = await h.callTool("kratos_delete_identity", { id: ID });
      expect(h.elicit.calls).toHaveLength(1);
      expect(h.elicit.calls[0]?.params.message).toContain(ID);
      expect(res.isError).toBeFalsy();
      expect(h.stubs.identity.deleteIdentity).toHaveBeenCalledWith({ id: ID });
    });

    it("returns cancelled and does not call Kratos when declined", async () => {
      h = await startHarness();
      h.elicit.handler = () => ({ action: "decline" });
      const res = await h.callTool("kratos_delete_identity", { id: ID });
      expect(res.isError).toBeFalsy();
      expect(res.structuredContent?.cancelled).toBe(true);
      expect(h.stubs.identity.deleteIdentity).not.toHaveBeenCalled();
    });

    it("skips confirmation when the client lacks elicitation", async () => {
      h = await startHarness({}, { elicitation: false });
      h.stubs.identity.deleteIdentity.mockResolvedValue({ data: undefined });
      const res = await h.callTool("kratos_delete_identity", { id: ID });
      expect(res.isError).toBeFalsy();
      expect(h.stubs.identity.deleteIdentity).toHaveBeenCalled();
    });

    it("skips confirmation when KRATOS_CONFIRM_DESTRUCTIVE is off", async () => {
      h = await startHarness({ confirmDestructive: false });
      h.stubs.identity.deleteIdentity.mockResolvedValue({ data: undefined });
      await h.callTool("kratos_delete_identity", { id: ID });
      expect(h.elicit.calls).toHaveLength(0);
      expect(h.stubs.identity.deleteIdentity).toHaveBeenCalled();
    });

    it("asks for every destructive-annotated tool, with no per-tool code", async () => {
      h = await startHarness();
      const { tools } = await h.client.listTools();
      const destructive = tools.filter((t) => t.annotations?.destructiveHint === true);
      expect(destructive.length).toBeGreaterThanOrEqual(7);
      h.elicit.handler = () => ({ action: "decline" });
      for (const tool of destructive) {
        const args: Record<string, unknown> = { id: ID, identityId: ID };
        if (tool.name === "kratos_update_identity") {
          Object.assign(args, { schemaId: "default", traits: {}, state: "active" });
        }
        if (tool.name === "kratos_patch_identity") {
          args.patch = [{ op: "replace", path: "/state", value: "active" }];
        }
        if (tool.name === "kratos_set_identity_state") args.state = "inactive";
        if (tool.name === "kratos_delete_identity_credential") args.type = "totp";
        const res = await h.callTool(tool.name, args);
        expect(res.structuredContent?.cancelled, tool.name).toBe(true);
      }
      expect(h.elicit.calls).toHaveLength(destructive.length);
      for (const api of Object.values(h.stubs.identity)) {
        expect(api).not.toHaveBeenCalled();
      }
    });

    it("never asks for read-only tools", async () => {
      h = await startHarness();
      h.stubs.metadata.isReady.mockResolvedValue({ data: { status: "ok" } });
      await h.callTool("kratos_health_ready");
      expect(h.elicit.calls).toHaveLength(0);
    });
  });

  it("exposes identity schema resources and the schema template", async () => {
    h = await startHarness();
    h.stubs.identity.listIdentitySchemas.mockResolvedValue({
      data: [{ id: "default", schema: { type: "object" } }],
    });
    h.stubs.identity.getIdentitySchema.mockResolvedValue({ data: { type: "object" } });

    const { resourceTemplates } = await h.client.listResourceTemplates();
    expect(resourceTemplates.map((t) => t.uriTemplate)).toContain("kratos://schemas/{schema_id}");

    const { resources } = await h.client.listResources();
    expect(resources.map((r) => r.uri)).toContain("kratos://schemas/default");

    const read = await h.client.readResource({ uri: "kratos://schemas/default" });
    expect(h.stubs.identity.getIdentitySchema).toHaveBeenCalledWith({ id: "default" });
    const first = read.contents[0] as { text?: string } | undefined;
    expect(JSON.parse(first?.text ?? "")).toEqual({ type: "object" });
  });

  it("surfaces resource failures as errors, not as content", async () => {
    h = await startHarness();
    h.stubs.identity.getIdentitySchema.mockRejectedValue(httpError(404, "no such schema"));
    await expect(h.client.readResource({ uri: "kratos://schemas/nope" })).rejects.toThrow(
      /NOT_FOUND/,
    );
  });
});

describe("defineTool invariants", () => {
  it("refuses to register a destructive tool without a confirmMessage", async () => {
    const { defineTool, DESTRUCTIVE } = await import("../../src/tools/define");
    const { McpServer } = await import("@modelcontextprotocol/sdk/server/mcp.js");
    const { z } = await import("zod");
    const { BASE_CONFIG, createClientStubs } = await import("./harness");
    const server = new McpServer({ name: "t", version: "0" });
    const ctx = {
      server,
      clients: createClientStubs() as never,
      config: BASE_CONFIG,
      getLogger: () => ({ info() {}, error() {}, warn() {}, debug() {}, trace() {} }) as never,
    };
    expect(() =>
      defineTool(ctx, {
        name: "kratos_x",
        title: "x",
        description: "x",
        toolset: "health",
        inputSchema: z.object({}),
        annotations: DESTRUCTIVE,
        run: async () => ({}),
      }),
    ).toThrow(/confirmMessage/);
  });
});
