/**
 * Shared tool definition helper
 *
 * Wraps `McpServer.registerTool` so every tool gets the same logging, timing,
 * error mapping, structured output envelope, annotations, toolset gating,
 * read-only gating, and (for destructive tools) elicitation-based confirmation.
 * @module tools/define
 */

import type { McpServer, RegisteredTool } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import type { Config, Toolset } from "../config.js";
import { mapError } from "../errors/mapper.js";
import type { KratosClients } from "../kratos/client.js";
import type { CorrelatedLogger } from "../logging/logger.js";

/** Everything a tool implementation needs, injected once at registration */
export interface ToolContext {
  server: McpServer;
  clients: KratosClients;
  config: Config;
  getLogger: () => CorrelatedLogger;
}

/** Per-invocation context passed to `run` */
export interface RunContext {
  log: CorrelatedLogger;
}

type AnyObjectSchema = z.ZodObject<z.ZodRawShape>;

export interface ToolDefinition<I extends AnyObjectSchema, O extends AnyObjectSchema> {
  /** Tool name, e.g. `kratos_get_identity` */
  name: string;
  /** Short human-readable title */
  title: string;
  description: string;
  toolset: Toolset;
  inputSchema: I;
  /** When set, the run result is also returned as `structuredContent` and validated by the SDK */
  outputSchema?: O;
  annotations: ToolAnnotations;
  /**
   * Builds the confirmation prompt for destructive tools. Required whenever
   * `annotations.destructiveHint` is true; the prompt is shown via MCP
   * elicitation before `run` and a declined answer short-circuits to CANCELLED.
   */
  confirmMessage?: (args: z.infer<I>) => string;
  run: (args: z.infer<I>, ctx: RunContext) => Promise<z.infer<O>>;
}

/** Loosely-typed JSON object as returned by passthrough output schemas */
export type Passthrough = Record<string, unknown>;

/** Treat an SDK model (or array of models) as a passthrough JSON object for output */
export function passthrough<T>(value: T): T extends unknown[] ? Passthrough[] : Passthrough {
  return value as never;
}

/** Result returned when the user declined a destructive action */
export const CANCELLED = { cancelled: true as const, message: "Cancelled by user" };

export const CancelledResultSchema = z.object({
  cancelled: z.literal(true),
  message: z.string(),
});

/**
 * Destructive tools may return CANCELLED instead of their declared output, so
 * the schema advertised to clients (and validated by the SDK) is the union.
 * Implemented as a passthrough object with every declared field optional plus
 * the cancellation fields, because tool output schemas must be objects.
 */
function withCancellation(schema: AnyObjectSchema): AnyObjectSchema {
  return schema.partial().extend(CancelledResultSchema.partial().shape).passthrough();
}

function toolResult(payload: unknown, opts: { structured: boolean; isError?: boolean }) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }],
    ...(opts.structured ? { structuredContent: payload as Record<string, unknown> } : {}),
    ...(opts.isError ? { isError: true } : {}),
  };
}

/**
 * Ask the connected client to confirm a destructive action via MCP elicitation.
 * Falls back to `true` when the client does not advertise elicitation support
 * (the `destructiveHint` annotation still lets such clients prompt on their own).
 */
async function confirmViaElicitation(server: McpServer, message: string): Promise<boolean> {
  const caps = server.server.getClientCapabilities();
  if (!caps?.elicitation) return true;
  const res = await server.server.elicitInput({
    message,
    requestedSchema: {
      type: "object",
      properties: { confirm: { type: "boolean", title: "Confirm", description: message } },
      required: ["confirm"],
    },
  });
  return res.action === "accept" && res.content?.confirm === true;
}

/**
 * Register a tool. The tool is disabled (hidden from `tools/list`) when its
 * toolset is not enabled or when the server runs read-only and the tool is not
 * annotated `readOnlyHint: true`.
 */
export function defineTool<I extends AnyObjectSchema, O extends AnyObjectSchema>(
  ctx: ToolContext,
  def: ToolDefinition<I, O>,
): RegisteredTool {
  const { server, config, getLogger } = ctx;
  const context = def.name.replace(/^kratos_/, "");
  const structured = def.outputSchema !== undefined;
  const destructive = def.annotations.destructiveHint === true;
  if (destructive && !def.confirmMessage) {
    throw new Error(`Tool ${def.name} is destructive but defines no confirmMessage`);
  }

  const registered = server.registerTool(
    def.name,
    {
      title: def.title,
      description: def.description,
      // Pass full zod objects (not `.shape`) so `.passthrough()` survives JSON Schema conversion
      inputSchema: def.inputSchema,
      ...(def.outputSchema
        ? { outputSchema: destructive ? withCancellation(def.outputSchema) : def.outputSchema }
        : {}),
      annotations: { openWorldHint: false, ...def.annotations },
    },
    // biome-ignore lint/suspicious/noExplicitAny: SDK callback generics resolve args from the raw shape
    (async (args: any) => {
      const log = getLogger();
      const startTime = Date.now();
      log.info("Tool invoked", { tool: def.name });

      try {
        if (destructive && config.confirmDestructive && def.confirmMessage) {
          const ok = await confirmViaElicitation(server, def.confirmMessage(args as z.infer<I>));
          if (!ok) {
            log.info("Tool cancelled by user", {
              tool: def.name,
              durationMs: Date.now() - startTime,
            });
            return toolResult(CANCELLED, { structured });
          }
        }
        const out = await def.run(args as z.infer<I>, { log });
        log.info("Tool completed", { tool: def.name, durationMs: Date.now() - startTime });
        return toolResult(out, { structured });
      } catch (error) {
        const mcpError = mapError(error, context);
        log.error("Tool failed", {
          tool: def.name,
          durationMs: Date.now() - startTime,
          error: { code: mcpError.code, message: mcpError.message },
        });
        // Error results are exempt from outputSchema validation, so never send structuredContent here
        return toolResult({ error: mcpError }, { structured: false, isError: true });
      }
    }) as Parameters<typeof server.registerTool>[2],
  );

  const hidden =
    !config.toolsets.includes(def.toolset) ||
    (config.readOnly && def.annotations.readOnlyHint !== true);
  if (hidden) registered.disable();

  return registered;
}

/** Common annotation presets */
export const READ_ONLY: ToolAnnotations = { readOnlyHint: true, idempotentHint: true };
export const CREATE: ToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
};
export const UPDATE_IDEMPOTENT: ToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: true,
};
export const UPDATE: ToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: false,
};
export const DESTRUCTIVE: ToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: true,
};
