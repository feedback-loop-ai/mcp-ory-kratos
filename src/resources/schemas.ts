/**
 * MCP Resources for Kratos MCP Server
 *
 * Read-only resources for identity schemas and connection configuration.
 * Errors are thrown so the SDK returns a JSON-RPC error rather than a
 * successful read with an error body.
 * @module resources/schemas
 */

import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { mapError } from "../errors/mapper.js";
import type { ToolContext } from "../tools/define.js";

export const RESOURCE_URIS = {
  SCHEMAS: "kratos://schemas",
  SCHEMA_TEMPLATE: "kratos://schemas/{schema_id}",
  CONNECTION_CONFIG: "kratos://config/connection",
} as const;

function toError(error: unknown, context: string): Error {
  const mapped = mapError(error, context);
  return new Error(
    `${mapped.code}: ${mapped.message}${mapped.suggestion ? ` (${mapped.suggestion})` : ""}`,
  );
}

/**
 * Register all MCP resources
 */
export function registerResources(ctx: ToolContext): void {
  const { server, clients, config, getLogger } = ctx;

  const listSchemaIds = async (): Promise<string[]> => {
    const response = await clients.identity.listIdentitySchemas({ pageSize: 100 });
    return response.data.map((s) => s.id).filter((id): id is string => typeof id === "string");
  };

  server.registerResource(
    "identity-schemas",
    RESOURCE_URIS.SCHEMAS,
    {
      title: "Identity schemas",
      description: "List all identity schemas available in Kratos",
      mimeType: "application/json",
    },
    async () => {
      const log = getLogger();
      const startTime = Date.now();
      try {
        const response = await clients.identity.listIdentitySchemas({ pageSize: 100 });
        log.info("Identity schemas fetched", {
          resource: RESOURCE_URIS.SCHEMAS,
          durationMs: Date.now() - startTime,
        });
        const schemas = response.data.map((schema) => ({ id: schema.id, schema: schema.schema }));
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
          error: { message: error instanceof Error ? error.message : String(error) },
        });
        throw toError(error, "list_schemas");
      }
    },
  );

  server.registerResource(
    "identity-schema",
    new ResourceTemplate(RESOURCE_URIS.SCHEMA_TEMPLATE, {
      list: async () => ({
        resources: (await listSchemaIds()).map((id) => ({
          uri: `kratos://schemas/${id}`,
          name: id,
          mimeType: "application/json",
        })),
      }),
      complete: {
        schema_id: async (value) => (await listSchemaIds()).filter((id) => id.startsWith(value)),
      },
    }),
    {
      title: "Identity schema",
      description: "A specific identity JSON schema by ID",
      mimeType: "application/json",
    },
    async (uri, { schema_id }) => {
      const log = getLogger();
      const startTime = Date.now();
      const schemaId = Array.isArray(schema_id) ? schema_id[0] : schema_id;
      if (!schemaId) {
        throw new Error("INVALID_URI: use kratos://schemas/{schema_id}");
      }
      try {
        const response = await clients.identity.getIdentitySchema({ id: schemaId });
        log.info("Identity schema fetched", {
          resource: RESOURCE_URIS.SCHEMA_TEMPLATE,
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
          resource: RESOURCE_URIS.SCHEMA_TEMPLATE,
          error: { message: error instanceof Error ? error.message : String(error) },
        });
        throw toError(error, "get_schema");
      }
    },
  );

  server.registerResource(
    "connection-config",
    RESOURCE_URIS.CONNECTION_CONFIG,
    {
      title: "Kratos connection",
      description: "Non-sensitive connection configuration and reachability of the Kratos server",
      mimeType: "application/json",
    },
    async () => {
      let kratosVersion: string | undefined;
      let connected = false;
      try {
        kratosVersion = (await clients.metadata.getVersion()).data.version;
        connected = true;
      } catch {
        connected = false;
      }
      const url = new URL(config.kratosAdminUrl);
      url.username = "";
      url.password = "";
      const connectionConfig = {
        baseUrl: url.toString(),
        authType: config.auth.type,
        timeoutMs: config.timeoutMs,
        toolsets: config.toolsets,
        readOnly: config.readOnly,
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
