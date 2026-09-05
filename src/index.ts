#!/usr/bin/env bun
/**
 * Ory Kratos MCP Server — CLI entrypoint (stdio transport)
 *
 * @module index
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config.js";
import { createKratosClients } from "./kratos/client.js";
import { createServer, SERVER_VERSION } from "./server.js";

function fatal(message: string, error: unknown): never {
  console.error(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: "error",
      message,
      error: error instanceof Error ? error.message : String(error),
    }),
  );
  process.exit(1);
}

/** Strip userinfo so credentials embedded in the URL never reach logs */
function redactUrl(url: string): string {
  try {
    const u = new URL(url);
    u.username = "";
    u.password = "";
    return u.toString();
  } catch {
    return url;
  }
}

async function main(): Promise<void> {
  let config: ReturnType<typeof loadConfig>;
  try {
    config = loadConfig();
  } catch (error) {
    fatal("Failed to load configuration", error);
  }

  const clients = createKratosClients(config);
  const { server, logger } = createServer(config, clients);

  logger.info("Starting Kratos MCP Server", {
    version: SERVER_VERSION,
    kratosEndpoint: redactUrl(config.kratosAdminUrl),
    toolsets: config.toolsets,
    readOnly: config.readOnly,
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);

  logger.info("Kratos MCP Server connected and ready");
}

main().catch((error) => fatal("Fatal error", error));
