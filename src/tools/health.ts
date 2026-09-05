/**
 * Health check tools for Kratos MCP Server
 *
 * Implements tools for monitoring Kratos server health and version.
 * @module tools/health
 */

import { EmptyInputSchema, HealthOutputSchema, VersionOutputSchema } from "../schemas/tools.js";
import { defineTool, READ_ONLY, type ToolContext } from "./define.js";

/**
 * Register health check tools (alive, ready, version)
 *
 * Note: `alive` and `ready` go through the SDK MetadataApi (`/health/alive`,
 * `/health/ready`). `version` uses the shared HTTP client instead, because the
 * SDK expects `/version` at the root while some proxies expose it under
 * `/admin/version`; the HTTP client resolves the path against the configured
 * admin base URL and handles timeouts.
 */
export function registerHealthTools(ctx: ToolContext): void {
  defineTool(ctx, {
    name: "kratos_health_alive",
    title: "Health: alive",
    description:
      "Check if the Kratos server is alive and accepting requests. Returns alive status. Example: {} (no arguments).",
    toolset: "health",
    inputSchema: EmptyInputSchema,
    outputSchema: HealthOutputSchema,
    annotations: READ_ONLY,
    run: async () => {
      const { data } = await ctx.clients.metadata.isAlive();
      return { status: data.status, checkedAt: new Date().toISOString() };
    },
  });

  defineTool(ctx, {
    name: "kratos_health_ready",
    title: "Health: ready",
    description:
      "Check if the Kratos server is ready to handle requests. Checks database connectivity and other dependencies. Example: {} (no arguments).",
    toolset: "health",
    inputSchema: EmptyInputSchema,
    outputSchema: HealthOutputSchema,
    annotations: READ_ONLY,
    run: async () => {
      const { data } = await ctx.clients.metadata.isReady();
      return { status: data.status, checkedAt: new Date().toISOString() };
    },
  });

  defineTool(ctx, {
    name: "kratos_version",
    title: "Kratos version",
    description:
      "Get the version of the Kratos server. Useful for debugging and compatibility checks. Example: {} (no arguments).",
    toolset: "health",
    inputSchema: EmptyInputSchema,
    outputSchema: VersionOutputSchema,
    annotations: READ_ONLY,
    run: async () => {
      const { version } = await ctx.clients.http.get<{ version: string }>("/version");
      return { version };
    },
  });
}
