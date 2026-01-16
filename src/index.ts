#!/usr/bin/env bun
/**
 * Ory Kratos MCP Server
 *
 * MCP server exposing Ory Kratos Admin API operations as tools for AI agents
 * @module index
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { Config } from "./config.js";
import { loadConfig } from "./config.js";
import { createKratosClients, type KratosClients } from "./kratos/client.js";
import { type CorrelatedLogger, generateCorrelationId, Logger } from "./logging/logger.js";
import { registerResources } from "./resources/schemas.js";
import {
  registerCredentialAnalyticsTools,
  registerSessionAnalyticsTools,
} from "./tools/analytics.js";
import { registerCourierTools } from "./tools/courier.js";
import { registerHealthTools } from "./tools/health.js";
// Import tool registration functions
import { registerIdentityManagementTools, registerIdentityQueryTools } from "./tools/identity.js";
import { registerRecoveryTools } from "./tools/recovery.js";
import {
  registerIdentitySessionTools,
  registerSessionManagementTools,
  registerSessionQueryTools,
} from "./tools/session.js";

// Global state
let config: Config;
let kratosClients: KratosClients;
let logger: Logger;

/**
 * Get a correlated logger for request tracing
 */
function getCorrelatedLogger(): CorrelatedLogger {
  return logger.withCorrelationId(generateCorrelationId());
}

/**
 * Initialize the MCP server
 */
async function main(): Promise<void> {
  // Load configuration
  try {
    config = loadConfig();
  } catch (error) {
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "error",
        message: "Failed to load configuration",
        error: error instanceof Error ? error.message : String(error),
      }),
    );
    process.exit(1);
  }

  // Initialize logger
  logger = new Logger(config);
  logger.info("Starting Kratos MCP Server", {
    kratosEndpoint: config.kratosAdminUrl,
  });

  // Initialize Kratos clients
  kratosClients = createKratosClients(config);

  // Create MCP server
  const server = new McpServer({
    name: "mcp-ory-kratos",
    version: "0.1.0",
  });

  // Register all tools
  // Phase 3: US1 - Session Analytics
  registerSessionQueryTools(server, kratosClients, getCorrelatedLogger);
  registerSessionAnalyticsTools(server, kratosClients, getCorrelatedLogger);

  // Phase 4: US2 - Authentication Investigation
  registerIdentityQueryTools(server, kratosClients, getCorrelatedLogger);
  registerIdentitySessionTools(server, kratosClients, getCorrelatedLogger);
  registerCourierTools(server, kratosClients, getCorrelatedLogger);

  // Phase 5: US3 - Session Management
  registerSessionManagementTools(server, kratosClients, getCorrelatedLogger);

  // Phase 6: US4 - Identity Administration
  registerIdentityManagementTools(server, kratosClients, getCorrelatedLogger);

  // Phase 7: US5 - Credential Analytics
  registerCredentialAnalyticsTools(server, kratosClients, getCorrelatedLogger);

  // Phase 8: US6 - Recovery Links
  registerRecoveryTools(server, kratosClients, getCorrelatedLogger);

  // Phase 9: US7 - Health Monitoring
  registerHealthTools(server, kratosClients, getCorrelatedLogger);

  // Phase 10: MCP Resources
  registerResources(server, kratosClients, config, getCorrelatedLogger);

  // Start server with stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  logger.info("Kratos MCP Server connected and ready");
}

// Export for use in tool implementations
export { config, kratosClients, logger, generateCorrelationId };

// Run the server
main().catch((error) => {
  console.error(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: "error",
      message: "Fatal error",
      error: error instanceof Error ? error.message : String(error),
    }),
  );
  process.exit(1);
});
