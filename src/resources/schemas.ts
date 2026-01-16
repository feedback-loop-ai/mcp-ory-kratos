/**
 * MCP Resources for Kratos MCP Server
 *
 * Implements resources for identity schemas and configuration
 * @module resources/schemas
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Config } from "../config.js";
import { mapError } from "../errors/mapper.js";
import type { KratosClients } from "../kratos/client.js";
import type { CorrelatedLogger } from "../logging/logger.js";
import { RESOURCE_URIS } from "../schemas/resources.js";

/**
 * Register all MCP resources
 * Used in Phase 10
 */
export function registerResources(
  server: McpServer,
  kratosClients: KratosClients,
  config: Config,
  getLogger: () => CorrelatedLogger,
): void {
  // Register resource templates (must be done before the list handler)
  server.resource(
    RESOURCE_URIS.SCHEMAS,
    "List all identity schemas available in Kratos",
    async () => {
      const log = getLogger();

      log.info("Fetching identity schemas", {
        resource: RESOURCE_URIS.SCHEMAS,
      });

      const startTime = Date.now();

      try {
        const response = await kratosClients.identity.listIdentitySchemas({});

        log.info("Identity schemas fetched successfully", {
          resource: RESOURCE_URIS.SCHEMAS,
          durationMs: Date.now() - startTime,
        });

        const schemas = response.data.map((schema) => ({
          id: schema.id,
          schema: schema.schema,
        }));

        return {
          contents: [
            {
              uri: RESOURCE_URIS.SCHEMAS,
              mimeType: "application/json",
              text: JSON.stringify({ schemas }, null, 2),
            },
          ],
        };
      } catch (error) {
        log.error("Failed to fetch identity schemas", {
          resource: RESOURCE_URIS.SCHEMAS,
          durationMs: Date.now() - startTime,
          error: { message: error instanceof Error ? error.message : String(error) },
        });

        const mcpError = mapError(error, "list_schemas");
        return {
          contents: [
            {
              uri: RESOURCE_URIS.SCHEMAS,
              mimeType: "application/json",
              text: JSON.stringify({ error: mcpError }, null, 2),
            },
          ],
        };
      }
    },
  );

  // kratos://schemas/{schema_id} - Get specific schema by ID
  server.resource(
    "kratos://schemas/{schema_id}",
    "Get a specific identity schema by ID",
    async (uri) => {
      const log = getLogger();

      // Extract schema_id from URI
      const match = uri.href.match(/kratos:\/\/schemas\/(.+)/);
      const schemaId = match?.[1];

      if (!schemaId) {
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: "application/json",
              text: JSON.stringify(
                {
                  error: {
                    code: "INVALID_URI",
                    message: "Schema ID not found in URI",
                    suggestion: "Use format: kratos://schemas/{schema_id}",
                  },
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      log.info("Fetching identity schema", {
        resource: "kratos://schemas/{schema_id}",
      });

      const startTime = Date.now();

      try {
        const response = await kratosClients.identity.getIdentitySchema({
          id: schemaId,
        });

        log.info("Identity schema fetched successfully", {
          resource: "kratos://schemas/{schema_id}",
          durationMs: Date.now() - startTime,
        });

        return {
          contents: [
            {
              uri: uri.href,
              mimeType: "application/json",
              text: JSON.stringify(response.data, null, 2),
            },
          ],
        };
      } catch (error) {
        log.error("Failed to fetch identity schema", {
          resource: "kratos://schemas/{schema_id}",
          durationMs: Date.now() - startTime,
          error: { message: error instanceof Error ? error.message : String(error) },
        });

        const mcpError = mapError(error, "get_schema");
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: "application/json",
              text: JSON.stringify({ error: mcpError }, null, 2),
            },
          ],
        };
      }
    },
  );

  // kratos://config/connection - Get connection configuration (non-sensitive)
  server.resource(
    RESOURCE_URIS.CONNECTION_CONFIG,
    "Get Kratos connection configuration",
    async () => {
      const log = getLogger();

      log.info("Fetching connection configuration", {
        resource: RESOURCE_URIS.CONNECTION_CONFIG,
      });

      const startTime = Date.now();

      // Get version to verify connection
      let kratosVersion: string | undefined;
      let connected = false;

      try {
        const versionResponse = await kratosClients.metadata.getVersion();
        kratosVersion = versionResponse.data.version;
        connected = true;
      } catch {
        // Connection failed, but we can still return config
        connected = false;
      }

      log.info("Connection configuration fetched", {
        resource: RESOURCE_URIS.CONNECTION_CONFIG,
        durationMs: Date.now() - startTime,
      });

      const connectionConfig = {
        baseUrl: config.kratosAdminUrl,
        authType:
          config.auth.type === "api-key"
            ? "api_key"
            : config.auth.type === "custom-headers"
              ? "custom_headers"
              : "none",
        timeoutMs: config.timeoutMs,
        connected,
        kratosVersion,
      };

      return {
        contents: [
          {
            uri: RESOURCE_URIS.CONNECTION_CONFIG,
            mimeType: "application/json",
            text: JSON.stringify(connectionConfig, null, 2),
          },
        ],
      };
    },
  );
}
