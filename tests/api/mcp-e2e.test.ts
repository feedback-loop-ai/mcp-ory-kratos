/**
 * End-to-end: the built MCP server over stdio against a live Kratos.
 *
 * Unlike the other tests/api suites (which exercise the SDK directly), this
 * drives the actual product surface: tools/list, tools/call, resources.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getTestContext } from "../setup/context";

const ADMIN_URL = process.env.KRATOS_ADMIN_URL ?? "http://127.0.0.1:4434";

interface ToolText {
  content: Array<{ type: string; text?: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}

describe("MCP server e2e (stdio)", () => {
  let client: Client;
  let schemaId = "default";
  const created: string[] = [];

  async function call<T = Record<string, unknown>>(
    name: string,
    args: Record<string, unknown> = {},
  ): Promise<{ data: T; raw: ToolText }> {
    const raw = (await client.callTool({ name, arguments: args })) as ToolText;
    const text = raw.content.find((c) => c.type === "text")?.text ?? "{}";
    return { data: JSON.parse(text) as T, raw };
  }

  beforeAll(async () => {
    const ctx = getTestContext();
    schemaId = ctx.getDefaultSchemaId();
    const env: Record<string, string> = {
      ...(process.env as Record<string, string>),
      KRATOS_ADMIN_URL: ADMIN_URL,
      KRATOS_AUTH_TYPE: process.env.KRATOS_AUTH_TYPE ?? "none",
      KRATOS_CONFIRM_DESTRUCTIVE: "0",
      LOG_LEVEL: "error",
    };
    const transport = new StdioClientTransport({
      command: "bun",
      args: ["run", "src/index.ts"],
      env,
      stderr: "pipe",
    });
    client = new Client({ name: "e2e", version: "0.0.0" });
    await client.connect(transport);
  });

  afterAll(async () => {
    for (const id of created) {
      await call("kratos_delete_identity", { id }).catch(() => undefined);
    }
    await client?.close();
  });

  it("lists tools with annotations and the server instructions", async () => {
    const { tools } = await client.listTools();
    expect(tools.length).toBeGreaterThanOrEqual(27);
    const del = tools.find((t) => t.name === "kratos_delete_identity");
    expect(del?.annotations?.destructiveHint).toBe(true);
    expect(client.getInstructions()).toContain("Kratos");
  });

  it("reports the Kratos version", async () => {
    const { data } = await call<{ version: string }>("kratos_version");
    expect(data.version).toMatch(/^v\d+/);
  });

  it("creates, reads (with redacted credentials), pages, and deletes an identity", async () => {
    const email = `mcp-e2e-${Date.now()}@example.com`;
    const create = await call<{ id: string }>("kratos_create_identity", {
      schemaId,
      traits: { email },
      credentials: { password: { config: { password: "correct-horse-battery-staple" } } },
    });
    expect(create.raw.isError).toBeFalsy();
    created.push(create.data.id);

    const get = await call<{ id: string; credentials?: Record<string, { config?: unknown }> }>(
      "kratos_get_identity",
      { id: create.data.id, includeCredential: ["password"] },
    );
    expect(get.data.id).toBe(create.data.id);
    expect(get.data.credentials?.password).toBeDefined();
    expect(String(get.data.credentials?.password?.config)).toContain("redacted");

    const list = await call<{ items: Array<{ id: string }>; nextPageToken?: string }>(
      "kratos_list_identities",
      { pageSize: 1 },
    );
    expect(list.data.items).toHaveLength(1);
    if (list.data.nextPageToken) {
      const next = await call<{ items: Array<{ id: string }> }>("kratos_list_identities", {
        pageSize: 1,
        pageToken: list.data.nextPageToken,
      });
      expect(next.raw.isError).toBeFalsy();
      expect(next.data.items[0]?.id).not.toBe(list.data.items[0]?.id);
    }

    const del = await call<{ success: boolean }>("kratos_delete_identity", {
      id: create.data.id,
    });
    expect(del.data.success).toBe(true);
    created.pop();

    const gone = await call<{ error: { code: string } }>("kratos_get_identity", {
      id: create.data.id,
    });
    expect(gone.raw.isError).toBe(true);
    expect(gone.data.error.code).toBe("NOT_FOUND");
  });

  it("suspends and reactivates an identity via kratos_set_identity_state", async () => {
    const create = await call<{ id: string }>("kratos_create_identity", {
      schemaId,
      traits: { email: `mcp-e2e-state-${Date.now()}@example.com` },
    });
    created.push(create.data.id);

    const off = await call<{ state: string; sessionsRevoked: boolean }>(
      "kratos_set_identity_state",
      { id: create.data.id, state: "inactive", revokeSessions: true },
    );
    expect(off.raw.isError).toBeFalsy();
    expect(off.data.state).toBe("inactive");
    // A freshly created identity has no sessions: revocation is a no-op, reported truthfully
    expect(off.data.sessionsRevoked).toBe(false);
    const sessions = await call<{ count: number }>("kratos_list_identity_sessions", {
      identityId: create.data.id,
    });
    expect(sessions.data.count).toBe(0);

    const on = await call<{ state: string }>("kratos_set_identity_state", {
      id: create.data.id,
      state: "active",
    });
    expect(on.data.state).toBe("active");
  });

  it("lists and fetches identity schemas as tools", async () => {
    const list = await call<{ items: Array<{ id: string }>; count: number }>(
      "kratos_list_identity_schemas",
    );
    expect(list.raw.isError).toBeFalsy();
    expect(list.data.items.map((s) => s.id)).toContain(schemaId);

    const get = await call<Record<string, unknown>>("kratos_get_identity_schema", { id: schemaId });
    expect(get.raw.isError).toBeFalsy();
    expect(get.data).toHaveProperty("properties");
  });

  it("serves identity schemas as a resource template", async () => {
    const { resources } = await client.listResources();
    expect(resources.map((r) => r.uri)).toContain(`kratos://schemas/${schemaId}`);
    const read = await client.readResource({ uri: `kratos://schemas/${schemaId}` });
    const first = read.contents[0] as { text?: string } | undefined;
    expect(JSON.parse(first?.text ?? "")).toHaveProperty("properties");
  });
});
