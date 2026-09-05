/**
 * MCP server factory
 *
 * Builds a fully wired `McpServer` from a `Config` and a set of Kratos
 * clients. Kept separate from the CLI entrypoint so tests can connect a
 * client over an in-memory transport.
 * @module server
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SetLevelRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import pkg from "../package.json" with { type: "json" };
import type { Config } from "./config.js";
import type { KratosClients } from "./kratos/client.js";
import { generateCorrelationId, type LogEntry, Logger, type LogLevel } from "./logging/logger.js";
import { registerResources } from "./resources/schemas.js";
import { registerAnalyticsTools } from "./tools/analytics.js";
import { registerCourierTools } from "./tools/courier.js";
import type { ToolContext } from "./tools/define.js";
import { registerHealthTools } from "./tools/health.js";
import { registerIdentityTools } from "./tools/identity.js";
import { registerRecoveryTools } from "./tools/recovery.js";
import { registerSessionTools } from "./tools/session.js";

export const SERVER_NAME = pkg.name;
export const SERVER_VERSION = pkg.version;

const INSTRUCTIONS = `Admin tools for an Ory Kratos identity server.
- Identities, sessions, and courier messages are addressed by UUID. Use the list/search tools to resolve an email or external_id to an ID first.
- List tools return \`nextPageToken\`; pass it back as \`pageToken\` to continue. Tokens are opaque and instance-bound.
- Tools annotated destructive (delete/disable/update/patch) change or remove data; the server may ask for confirmation before running them.
- Credential material (password hashes, OIDC tokens, TOTP secrets) is redacted unless the operator enabled KRATOS_ALLOW_CREDENTIAL_EXPOSURE.
- Analytics tools scan many pages; check \`truncated\` in the result and raise \`maxPages\` if coverage matters.
- Identity schemas are exposed both as tools (kratos_list_identity_schemas / kratos_get_identity_schema) and as resources (kratos://schemas).`;

/** Map internal log levels to MCP logging levels */
const MCP_LEVEL: Record<LogLevel, "debug" | "info" | "warning" | "error"> = {
  trace: "debug",
  debug: "debug",
  info: "info",
  warn: "warning",
  error: "error",
};

const LOG_LEVELS: LogLevel[] = ["trace", "debug", "info", "warn", "error"];

export interface CreatedServer {
  server: McpServer;
  logger: Logger;
}

/**
 * Create and fully register the MCP server (tools, resources, logging bridge).
 */
export function createServer(config: Config, clients: KratosClients): CreatedServer {
  const logger = new Logger({ logLevel: config.logLevel });

  const server = new McpServer(
    { name: SERVER_NAME, version: SERVER_VERSION },
    {
      capabilities: { tools: { listChanged: true }, resources: {}, logging: {} },
      instructions: INSTRUCTIONS,
    },
  );

  // Forward warn/error entries to the connected client via the MCP logging capability
  logger.addSink((entry: LogEntry) => {
    if (!server.isConnected()) return;
    if (entry.level !== "warn" && entry.level !== "error") return;
    const { level, ...data } = entry;
    void server.sendLoggingMessage({ level: MCP_LEVEL[level], logger: SERVER_NAME, data });
  });

  // Let the client raise/lower verbosity (logging/setLevel)
  server.server.setRequestHandler(SetLevelRequestSchema, async (req) => {
    const requested = req.params.level;
    const mapped: LogLevel =
      requested === "warning"
        ? "warn"
        : LOG_LEVELS.includes(requested as LogLevel)
          ? (requested as LogLevel)
          : "error";
    logger.setLevel(mapped);
    return {};
  });

  const ctx: ToolContext = {
    server,
    clients,
    config,
    getLogger: () => logger.withCorrelationId(generateCorrelationId()),
  };

  registerIdentityTools(ctx);
  registerSessionTools(ctx);
  registerCourierTools(ctx);
  registerRecoveryTools(ctx);
  registerHealthTools(ctx);
  registerAnalyticsTools(ctx);
  registerResources(ctx);

  return { server, logger };
}
