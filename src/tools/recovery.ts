/**
 * Recovery tools for Kratos MCP Server
 *
 * Implements tools for generating account recovery links and codes.
 * Both outputs are account-takeover-equivalent secrets.
 * @module tools/recovery
 */

import {
  CreateRecoveryCodeInputSchema,
  CreateRecoveryLinkInputSchema,
  RecoveryCodeOutputSchema,
  RecoveryLinkOutputSchema,
} from "../schemas/tools.js";
import { CREATE, defineTool, type ToolContext } from "./define.js";

const RECOVERY_SECRET_WARNING =
  "This link grants account access; treat it as a secret and deliver it only to the verified account owner.";

/**
 * Register recovery tools (create_link, create_code)
 */
export function registerRecoveryTools(ctx: ToolContext): void {
  defineTool(ctx, {
    name: "kratos_create_recovery_link",
    title: "Create recovery link",
    description:
      'Generate an account recovery link for a user who cannot complete self-service recovery. WARNING: the returned link is equivalent to full account takeover - anyone who opens it gains access to the account. Treat it as a secret, never log or share it, and deliver it only to the verified account owner via a secure channel. Example: {"identityId": "9f8d7c6b-5a49-4838-9271-605948372615", "expiresIn": "1h"}.',
    toolset: "recovery",
    inputSchema: CreateRecoveryLinkInputSchema,
    outputSchema: RecoveryLinkOutputSchema,
    annotations: CREATE,
    run: async (args) => {
      const { data } = await ctx.clients.identity.createRecoveryLinkForIdentity({
        createRecoveryLinkForIdentityBody: {
          identity_id: args.identityId,
          expires_in: args.expiresIn,
        },
        returnTo: args.returnTo,
      });
      return {
        identityId: args.identityId,
        recoveryLink: data.recovery_link,
        expiresAt: data.expires_at,
        warning: RECOVERY_SECRET_WARNING,
      };
    },
  });

  defineTool(ctx, {
    name: "kratos_create_recovery_code",
    title: "Create recovery code",
    description:
      'Generate an account recovery code for a user. WARNING: the returned code (and accompanying link) is equivalent to full account takeover - anyone who redeems it gains access to the account. Treat it as a secret, never log or share it, and provide it only to the verified account owner verbally or via a secure channel. Example: {"identityId": "9f8d7c6b-5a49-4838-9271-605948372615", "expiresIn": "15m"}.',
    toolset: "recovery",
    inputSchema: CreateRecoveryCodeInputSchema,
    outputSchema: RecoveryCodeOutputSchema,
    annotations: CREATE,
    run: async (args) => {
      const { data } = await ctx.clients.identity.createRecoveryCodeForIdentity({
        createRecoveryCodeForIdentityBody: {
          identity_id: args.identityId,
          expires_in: args.expiresIn,
          flow_type: args.flowType,
        },
      });
      return {
        identityId: args.identityId,
        recoveryCode: data.recovery_code,
        recoveryLink: data.recovery_link,
        expiresAt: data.expires_at,
        warning: RECOVERY_SECRET_WARNING,
      };
    },
  });
}
