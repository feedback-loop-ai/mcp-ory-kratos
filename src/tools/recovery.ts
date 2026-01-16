/**
 * Recovery tools for Kratos MCP Server
 *
 * Implements tools for generating account recovery links and codes
 * @module tools/recovery
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { mapError } from "../errors/mapper.js";
import type { KratosClients } from "../kratos/client.js";
import type { CorrelatedLogger } from "../logging/logger.js";
import { CreateRecoveryCodeInputSchema, CreateRecoveryLinkInputSchema } from "../schemas/tools.js";

/**
 * Register recovery tools (create_link, create_code)
 * Used in Phase 8 (US6)
 */
export function registerRecoveryTools(
  server: McpServer,
  kratosClients: KratosClients,
  getLogger: () => CorrelatedLogger,
): void {
  // kratos_create_recovery_link - Generate an account recovery link
  server.tool(
    "kratos_create_recovery_link",
    "Generate an account recovery link for a user who cannot complete self-service recovery. The link can be sent to the user via external channels.",
    CreateRecoveryLinkInputSchema.shape,
    async (args) => {
      const log = getLogger();

      log.info("Creating recovery link", {
        tool: "kratos_create_recovery_link",
      });

      const startTime = Date.now();

      try {
        const response = await kratosClients.identity.createRecoveryLinkForIdentity({
          createRecoveryLinkForIdentityBody: {
            identity_id: args.identityId,
            expires_in: args.expiresIn,
          },
        });

        log.info("Recovery link created successfully", {
          tool: "kratos_create_recovery_link",
          durationMs: Date.now() - startTime,
        });

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  recovery_link: response.data.recovery_link,
                  expires_at: response.data.expires_at,
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (error) {
        log.error("Failed to create recovery link", {
          tool: "kratos_create_recovery_link",
          durationMs: Date.now() - startTime,
          error: { message: error instanceof Error ? error.message : String(error) },
        });

        const mcpError = mapError(error, "create_recovery_link");
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

  // kratos_create_recovery_code - Generate an account recovery code
  server.tool(
    "kratos_create_recovery_code",
    "Generate an account recovery code for a user. The code can be provided to the user verbally or via secure channels.",
    CreateRecoveryCodeInputSchema.shape,
    async (args) => {
      const log = getLogger();

      log.info("Creating recovery code", {
        tool: "kratos_create_recovery_code",
      });

      const startTime = Date.now();

      try {
        const response = await kratosClients.identity.createRecoveryCodeForIdentity({
          createRecoveryCodeForIdentityBody: {
            identity_id: args.identityId,
            expires_in: args.expiresIn,
          },
        });

        log.info("Recovery code created successfully", {
          tool: "kratos_create_recovery_code",
          durationMs: Date.now() - startTime,
        });

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  recovery_code: response.data.recovery_code,
                  recovery_link: response.data.recovery_link,
                  expires_at: response.data.expires_at,
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (error) {
        log.error("Failed to create recovery code", {
          tool: "kratos_create_recovery_code",
          durationMs: Date.now() - startTime,
          error: { message: error instanceof Error ? error.message : String(error) },
        });

        const mcpError = mapError(error, "create_recovery_code");
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
