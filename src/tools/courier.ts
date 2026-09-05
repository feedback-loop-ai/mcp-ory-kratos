/**
 * Courier tools for Kratos MCP Server
 *
 * Implements tools for viewing courier messages (emails/SMS sent by Kratos)
 * @module tools/courier
 */

import { nextPageTokenOf } from "../kratos/pagination.js";
import {
  GetCourierMessageInputSchema,
  ListCourierMessagesInputSchema,
  ListCourierMessagesOutputSchema,
  PassthroughObjectSchema,
} from "../schemas/tools.js";
import { defineTool, passthrough, READ_ONLY, type ToolContext } from "./define.js";

/**
 * Register courier tools (list, get)
 */
export function registerCourierTools(ctx: ToolContext): void {
  defineTool(ctx, {
    name: "kratos_list_courier_messages",
    title: "List courier messages",
    description:
      'List courier messages (emails/SMS) sent by Kratos. Filter by delivery status or recipient to investigate delivery issues. Returns nextPageToken for pagination. Example: {"status": "sent"}.',
    toolset: "courier",
    inputSchema: ListCourierMessagesInputSchema,
    outputSchema: ListCourierMessagesOutputSchema,
    annotations: READ_ONLY,
    run: async (args) => {
      const response = await ctx.clients.courier.listCourierMessages({
        pageSize: args.pageSize,
        pageToken: args.pageToken,
        status: args.status,
        recipient: args.recipient,
      });
      return {
        messages: passthrough(response.data),
        count: response.data.length,
        nextPageToken: nextPageTokenOf(response),
      };
    },
  });

  defineTool(ctx, {
    name: "kratos_get_courier_message",
    title: "Get courier message",
    description:
      'Get detailed information about a specific courier message, including delivery attempts and status history. Example: {"id": "3a1b2c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d"}.',
    toolset: "courier",
    inputSchema: GetCourierMessageInputSchema,
    outputSchema: PassthroughObjectSchema,
    annotations: READ_ONLY,
    run: async (args) => {
      const response = await ctx.clients.courier.getCourierMessage({ id: args.id });
      return passthrough(response.data);
    },
  });
}
