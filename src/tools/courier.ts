/**
 * Courier tools for Kratos MCP Server
 *
 * Implements tools for viewing courier messages (emails/SMS sent by Kratos)
 * @module tools/courier
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { mapError } from "../errors/mapper.js";
import type { KratosClients } from "../kratos/client.js";
import type { CorrelatedLogger } from "../logging/logger.js";
import { GetCourierMessageInputSchema, ListCourierMessagesInputSchema } from "../schemas/tools.js";

// Valid courier message status values
type CourierStatus = "queued" | "sent" | "processing" | "abandoned";

/**
 * Register courier tools (list, get)
 * Used in Phase 4 (US2)
 */
export function registerCourierTools(
  server: McpServer,
  kratosClients: KratosClients,
  getLogger: () => CorrelatedLogger,
): void {
  // kratos_list_courier_messages - List courier messages with filtering
  server.tool(
    "kratos_list_courier_messages",
    "List courier messages (emails/SMS) sent by Kratos. Filter by delivery status or recipient to investigate delivery issues.",
    ListCourierMessagesInputSchema.shape,
    async (args) => {
      const log = getLogger();

      log.info("Listing courier messages", {
        tool: "kratos_list_courier_messages",
      });

      const startTime = Date.now();

      try {
        const response = await kratosClients.courier.listCourierMessages({
          pageSize: args.pageSize ?? 20,
          pageToken: args.pageToken,
          status: args.status as CourierStatus | undefined,
          recipient: args.recipient,
        });

        log.info("Courier messages listed successfully", {
          tool: "kratos_list_courier_messages",
          durationMs: Date.now() - startTime,
        });

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  messages: response.data,
                  count: response.data.length,
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (error) {
        log.error("Failed to list courier messages", {
          tool: "kratos_list_courier_messages",
          durationMs: Date.now() - startTime,
          error: { message: error instanceof Error ? error.message : String(error) },
        });

        const mcpError = mapError(error, "list_courier_messages");
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

  // kratos_get_courier_message - Get a single courier message by ID
  server.tool(
    "kratos_get_courier_message",
    "Get detailed information about a specific courier message, including delivery attempts and status history.",
    GetCourierMessageInputSchema.shape,
    async (args) => {
      const log = getLogger();

      log.info("Getting courier message", {
        tool: "kratos_get_courier_message",
      });

      const startTime = Date.now();

      try {
        const response = await kratosClients.courier.getCourierMessage({
          id: args.id,
        });

        log.info("Courier message retrieved successfully", {
          tool: "kratos_get_courier_message",
          durationMs: Date.now() - startTime,
        });

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(response.data, null, 2),
            },
          ],
        };
      } catch (error) {
        log.error("Failed to get courier message", {
          tool: "kratos_get_courier_message",
          durationMs: Date.now() - startTime,
          error: { message: error instanceof Error ? error.message : String(error) },
        });

        const mcpError = mapError(error, "get_courier_message");
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
