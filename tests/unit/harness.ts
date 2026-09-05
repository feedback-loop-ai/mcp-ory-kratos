/**
 * In-memory MCP test harness
 *
 * Boots the real server (`createServer`) with stubbed Kratos clients and
 * connects an MCP `Client` over `InMemoryTransport`, so tests exercise the
 * full tools/list + tools/call path including annotations, structuredContent,
 * toolset gating, and elicitation.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { ElicitRequest, ElicitResult } from "@modelcontextprotocol/sdk/types.js";
import { ElicitRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { vi } from "vitest";
import type { Config } from "../../src/config";
import type { KratosClients } from "../../src/kratos/client";
import { createServer } from "../../src/server";

export type Mock = ReturnType<typeof vi.fn>;

/** Every method on an SDK API class becomes a vi.fn(); the Proxy creates them lazily */
type ApiStubs<T> = { [K in keyof T]-?: Mock };

export interface ClientStubs {
  identity: ApiStubs<KratosClients["identity"]>;
  courier: ApiStubs<KratosClients["courier"]>;
  metadata: ApiStubs<KratosClients["metadata"]>;
  http: { get: Mock };
}

/** Build a KratosClients object where every SDK method is a vi.fn() */
export function createClientStubs(): ClientStubs {
  const auto = <T>(): ApiStubs<T> =>
    new Proxy({} as Record<string, Mock>, {
      get(target, prop: string) {
        if (!(prop in target)) target[prop] = vi.fn();
        return target[prop];
      },
    }) as unknown as ApiStubs<T>;
  return { identity: auto(), courier: auto(), metadata: auto(), http: { get: vi.fn() } };
}

export const BASE_CONFIG: Config = {
  kratosAdminUrl: "http://kratos.test:4434",
  auth: { type: "none" },
  logLevel: "error",
  timeoutMs: 5000,
  toolsets: ["identities", "sessions", "courier", "recovery", "health", "analytics"],
  readOnly: false,
  confirmDestructive: true,
  allowCredentialExposure: false,
  maxScanPages: 20,
};

export interface Harness {
  client: Client;
  stubs: ClientStubs;
  /** Set to control the elicitation answer; default accepts */
  elicit: {
    handler: (req: ElicitRequest) => ElicitResult | Promise<ElicitResult>;
    calls: ElicitRequest[];
  };
  callTool: (name: string, args?: Record<string, unknown>) => Promise<ToolCallResult>;
  close: () => Promise<void>;
}

export interface ToolCallResult {
  content: Array<{ type: string; text?: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
  /** Parsed JSON of the first text content */
  json: unknown;
}

/** Axios-like error as thrown by @ory/kratos-client */
export function httpError(status: number, message: string, reason?: string) {
  return Object.assign(new Error(message), {
    response: { status, data: { error: { code: status, message, reason } } },
  });
}

/** SDK-style response with an optional Link header carrying a next page token */
export function page<T>(data: T[], nextToken?: string) {
  return {
    data,
    headers: nextToken
      ? { link: `<http://kratos.test/admin/x?page_token=${nextToken}&page_size=1>; rel="next"` }
      : {},
  };
}

export async function startHarness(
  overrides: Partial<Config> = {},
  opts: { elicitation?: boolean } = {},
): Promise<Harness> {
  const stubs = createClientStubs();
  const config = { ...BASE_CONFIG, ...overrides };
  const { server } = createServer(config, stubs as unknown as KratosClients);

  const elicit: Harness["elicit"] = {
    handler: () => ({ action: "accept", content: { confirm: true } }),
    calls: [],
  };

  const client = new Client(
    { name: "test-client", version: "0.0.0" },
    { capabilities: opts.elicitation === false ? {} : { elicitation: {} } },
  );
  if (opts.elicitation !== false) {
    client.setRequestHandler(ElicitRequestSchema, async (req) => {
      elicit.calls.push(req);
      return elicit.handler(req);
    });
  }

  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  await client.connect(clientTransport);

  const callTool = async (name: string, args: Record<string, unknown> = {}) => {
    const res = (await client.callTool({ name, arguments: args })) as unknown as ToolCallResult;
    const text = res.content.find((c) => c.type === "text")?.text;
    try {
      res.json = text ? JSON.parse(text) : undefined;
    } catch {
      res.json = text; // e.g. SDK input-validation error text
    }
    return res;
  };

  return {
    client,
    stubs,
    elicit,
    callTool,
    close: async () => {
      await client.close();
      await server.close();
    },
  };
}
