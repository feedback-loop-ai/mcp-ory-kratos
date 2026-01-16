/**
 * Health check tools for Kratos MCP Server
 *
 * Implements tools for monitoring Kratos server health and version
 * @module tools/health
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { mapError } from "../errors/mapper.js";
import type { KratosClients } from "../kratos/client.js";
import type { CorrelatedLogger } from "../logging/logger.js";
import {
  HealthAliveInputSchema,
  HealthReadyInputSchema,
  VersionInputSchema,
} from "../schemas/tools.js";

/**
 * Register health check tools (alive, ready, version)
 * Used in Phase 9 (US7)
 *
 * Note: The Kratos SDK's MetadataApi uses root-level paths (/version, /health/*)
 * but some proxies expose these under /admin/*. We use the shared HTTP client
 * for direct calls to handle both cases.
 */
export function registerHealthTools(
  server: McpServer,
  kratosClients: KratosClients,
  getLogger: () => CorrelatedLogger,
): void {
  // kratos_health_alive - Check if Kratos is accepting requests
  server.tool(
    "kratos_health_alive",
    "Check if the Kratos server is alive and accepting requests. Returns alive status.",
    HealthAliveInputSchema.shape,
    async () => {
      const log = getLogger();

      log.info("Checking Kratos health (alive)", {
        tool: "kratos_health_alive",
      });

      const startTime = Date.now();

      try {
        const response = await kratosClients.metadata.isAlive();

        log.info("Health check (alive) successful", {
          tool: "kratos_health_alive",
          durationMs: Date.now() - startTime,
        });

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  alive: true,
                  status: response.data.status,
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (error) {
        log.error("Health check (alive) failed", {
          tool: "kratos_health_alive",
          durationMs: Date.now() - startTime,
          error: { message: error instanceof Error ? error.message : String(error) },
        });

        const mcpError = mapError(error, "health_alive");
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  alive: false,
                  error: mcpError,
                },
                null,
                2,
              ),
            },
          ],
          isError: true,
        };
      }
    },
  );

  // kratos_health_ready - Check if Kratos is ready (database connected, etc.)
  server.tool(
    "kratos_health_ready",
    "Check if the Kratos server is ready to handle requests. Checks database connectivity and other dependencies.",
    HealthReadyInputSchema.shape,
    async () => {
      const log = getLogger();

      log.info("Checking Kratos health (ready)", {
        tool: "kratos_health_ready",
      });

      const startTime = Date.now();

      try {
        const response = await kratosClients.metadata.isReady();

        log.info("Health check (ready) successful", {
          tool: "kratos_health_ready",
          durationMs: Date.now() - startTime,
        });

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  ready: true,
                  status: response.data.status,
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (error) {
        log.error("Health check (ready) failed", {
          tool: "kratos_health_ready",
          durationMs: Date.now() - startTime,
          error: { message: error instanceof Error ? error.message : String(error) },
        });

        const mcpError = mapError(error, "health_ready");
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  ready: false,
                  error: mcpError,
                },
                null,
                2,
              ),
            },
          ],
          isError: true,
        };
      }
    },
  );

  // kratos_version - Get Kratos server version
  server.tool(
    "kratos_version",
    "Get the version of the Kratos server. Useful for debugging and compatibility checks.",
    VersionInputSchema.shape,
    async () => {
      const log = getLogger();

      log.info("Getting Kratos version", {
        tool: "kratos_version",
      });

      const startTime = Date.now();

      try {
        // Use HTTP client because MetadataApi expects /version at root,
        // but proxies may expose it under /admin/version
        const data = await kratosClients.http.get<{ version?: string }>("/version");

        log.info("Version retrieved successfully", {
          tool: "kratos_version",
          durationMs: Date.now() - startTime,
        });

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  version: data.version,
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (error) {
        log.error("Failed to get version", {
          tool: "kratos_version",
          durationMs: Date.now() - startTime,
          error: { message: error instanceof Error ? error.message : String(error) },
        });

        const mcpError = mapError(error, "version");
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ error: mcpError }, null, 2),
            },
          ],
          isError: true,
        };
      }
    },
  );
}
