/**
 * Identity management tools for Kratos MCP Server
 *
 * Implements tools for listing, viewing, creating, updating, and deleting identities
 * @module tools/identity
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { mapError } from "../errors/mapper.js";
import type { KratosClients } from "../kratos/client.js";
import type { CorrelatedLogger } from "../logging/logger.js";
import {
  CreateIdentityInputSchema,
  DeleteIdentityCredentialInputSchema,
  DeleteIdentityInputSchema,
  GetIdentityByExternalIdInputSchema,
  GetIdentityInputSchema,
  ListIdentitiesInputSchema,
  PatchIdentityInputSchema,
  UpdateIdentityInputSchema,
} from "../schemas/tools.js";

// Map credential type to API parameter
const CREDENTIAL_TYPE_MAP: Record<string, string> = {
  password: "password",
  oidc: "oidc",
  totp: "totp",
  webauthn: "webauthn",
  lookup_secret: "lookup_secret",
};

/**
 * Register identity query tools (list, get, get_by_external_id)
 * Used in Phase 4 (US2)
 */
export function registerIdentityQueryTools(
  server: McpServer,
  kratosClients: KratosClients,
  getLogger: () => CorrelatedLogger,
): void {
  // kratos_list_identities - List identities with optional filtering
  server.tool(
    "kratos_list_identities",
    "List identities with optional filtering by credential identifier (e.g., email). Returns paginated results.",
    ListIdentitiesInputSchema.shape,
    async (args) => {
      const log = getLogger();

      log.info("Listing identities", {
        tool: "kratos_list_identities",
      });

      const startTime = Date.now();

      try {
        const response = await kratosClients.identity.listIdentities({
          pageSize: args.pageSize ?? 20,
          pageToken: args.pageToken,
          credentialsIdentifier: args.credentialsIdentifier,
        });

        log.info("Identities listed successfully", {
          tool: "kratos_list_identities",
          durationMs: Date.now() - startTime,
        });

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  identities: response.data,
                  count: response.data.length,
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (error) {
        log.error("Failed to list identities", {
          tool: "kratos_list_identities",
          durationMs: Date.now() - startTime,
          error: { message: error instanceof Error ? error.message : String(error) },
        });

        const mcpError = mapError(error, "list_identities");
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

  // kratos_get_identity - Get a single identity by ID
  server.tool(
    "kratos_get_identity",
    "Get detailed information about a specific identity by its ID. Optionally include credential information (admin only).",
    GetIdentityInputSchema.shape,
    async (args) => {
      const log = getLogger();

      log.info("Getting identity", {
        tool: "kratos_get_identity",
      });

      const startTime = Date.now();

      try {
        const response = await kratosClients.identity.getIdentity({
          id: args.id,
          includeCredential: args.includeCredentials
            ? ["password", "oidc", "totp", "webauthn", "lookup_secret"]
            : undefined,
        });

        log.info("Identity retrieved successfully", {
          tool: "kratos_get_identity",
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
        log.error("Failed to get identity", {
          tool: "kratos_get_identity",
          durationMs: Date.now() - startTime,
          error: { message: error instanceof Error ? error.message : String(error) },
        });

        const mcpError = mapError(error, "get_identity");
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

  // kratos_get_identity_by_external_id - Get identity by external identifier
  server.tool(
    "kratos_get_identity_by_external_id",
    "Look up an identity by its external identifier. Useful when integrating with external systems that use their own user IDs.",
    GetIdentityByExternalIdInputSchema.shape,
    async (args) => {
      const log = getLogger();

      log.info("Getting identity by external ID", {
        tool: "kratos_get_identity_by_external_id",
      });

      const startTime = Date.now();

      try {
        // The Kratos API doesn't have a direct "get by external ID" endpoint,
        // so we use list with credentials_identifier filter
        const response = await kratosClients.identity.listIdentities({
          credentialsIdentifier: args.externalId,
          pageSize: 1,
        });

        if (response.data.length === 0) {
          log.warn("Identity not found by external ID", {
            tool: "kratos_get_identity_by_external_id",
            durationMs: Date.now() - startTime,
          });

          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(
                  {
                    error: {
                      code: "IDENTITY_NOT_FOUND",
                      message: `No identity found with external ID: ${args.externalId}`,
                      suggestion: "Verify the external ID is correct",
                    },
                  },
                  null,
                  2,
                ),
              },
            ],
            isError: true,
          };
        }

        log.info("Identity found by external ID", {
          tool: "kratos_get_identity_by_external_id",
          durationMs: Date.now() - startTime,
        });

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(response.data[0], null, 2),
            },
          ],
        };
      } catch (error) {
        log.error("Failed to get identity by external ID", {
          tool: "kratos_get_identity_by_external_id",
          durationMs: Date.now() - startTime,
          error: { message: error instanceof Error ? error.message : String(error) },
        });

        const mcpError = mapError(error, "get_identity_by_external_id");
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

/**
 * Register identity management tools (create, update, patch, delete)
 * Used in Phase 6 (US4)
 */
export function registerIdentityManagementTools(
  server: McpServer,
  kratosClients: KratosClients,
  getLogger: () => CorrelatedLogger,
): void {
  // kratos_create_identity - Create a new identity
  server.tool(
    "kratos_create_identity",
    "Create a new identity with the specified schema, traits, and optional metadata. The traits must match the schema definition.",
    CreateIdentityInputSchema.shape,
    async (args) => {
      const log = getLogger();

      log.info("Creating identity", {
        tool: "kratos_create_identity",
      });

      const startTime = Date.now();

      try {
        const response = await kratosClients.identity.createIdentity({
          createIdentityBody: {
            schema_id: args.schemaId,
            traits: args.traits,
            state: args.state,
            metadata_public: args.metadataPublic,
            metadata_admin: args.metadataAdmin,
          },
        });

        log.info("Identity created successfully", {
          tool: "kratos_create_identity",
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
        log.error("Failed to create identity", {
          tool: "kratos_create_identity",
          durationMs: Date.now() - startTime,
          error: { message: error instanceof Error ? error.message : String(error) },
        });

        const mcpError = mapError(error, "create_identity");
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

  // kratos_update_identity - Full update of an identity
  server.tool(
    "kratos_update_identity",
    "Perform a full update of an identity, replacing all fields. All required fields must be provided.",
    UpdateIdentityInputSchema.shape,
    async (args) => {
      const log = getLogger();

      log.info("Updating identity", {
        tool: "kratos_update_identity",
      });

      const startTime = Date.now();

      try {
        const response = await kratosClients.identity.updateIdentity({
          id: args.id,
          updateIdentityBody: {
            schema_id: args.schemaId,
            traits: args.traits,
            state: args.state,
            metadata_public: args.metadataPublic,
            metadata_admin: args.metadataAdmin,
          },
        });

        log.info("Identity updated successfully", {
          tool: "kratos_update_identity",
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
        log.error("Failed to update identity", {
          tool: "kratos_update_identity",
          durationMs: Date.now() - startTime,
          error: { message: error instanceof Error ? error.message : String(error) },
        });

        const mcpError = mapError(error, "update_identity");
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

  // kratos_patch_identity - Partial update using JSON Patch
  server.tool(
    "kratos_patch_identity",
    "Perform a partial update of an identity using JSON Patch operations. Useful for modifying specific fields without replacing the entire identity.",
    PatchIdentityInputSchema.shape,
    async (args) => {
      const log = getLogger();

      log.info("Patching identity", {
        tool: "kratos_patch_identity",
      });

      const startTime = Date.now();

      try {
        const response = await kratosClients.identity.patchIdentity({
          id: args.id,
          jsonPatch: args.patch.map((op) => ({
            op: op.op,
            path: op.path,
            value: op.value,
          })),
        });

        log.info("Identity patched successfully", {
          tool: "kratos_patch_identity",
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
        log.error("Failed to patch identity", {
          tool: "kratos_patch_identity",
          durationMs: Date.now() - startTime,
          error: { message: error instanceof Error ? error.message : String(error) },
        });

        const mcpError = mapError(error, "patch_identity");
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

  // kratos_delete_identity - Delete an identity
  server.tool(
    "kratos_delete_identity",
    "Permanently delete an identity and all associated data. This action cannot be undone.",
    DeleteIdentityInputSchema.shape,
    async (args) => {
      const log = getLogger();

      log.info("Deleting identity", {
        tool: "kratos_delete_identity",
      });

      const startTime = Date.now();

      try {
        await kratosClients.identity.deleteIdentity({
          id: args.id,
        });

        log.info("Identity deleted successfully", {
          tool: "kratos_delete_identity",
          durationMs: Date.now() - startTime,
        });

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  success: true,
                  message: `Identity ${args.id} has been permanently deleted`,
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (error) {
        log.error("Failed to delete identity", {
          tool: "kratos_delete_identity",
          durationMs: Date.now() - startTime,
          error: { message: error instanceof Error ? error.message : String(error) },
        });

        const mcpError = mapError(error, "delete_identity");
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

  // kratos_delete_identity_credential - Delete a specific credential type
  server.tool(
    "kratos_delete_identity_credential",
    "Delete a specific credential type from an identity. For example, remove TOTP or WebAuthn credentials while keeping password authentication.",
    DeleteIdentityCredentialInputSchema.shape,
    async (args) => {
      const log = getLogger();

      log.info("Deleting identity credential", {
        tool: "kratos_delete_identity_credential",
      });

      const startTime = Date.now();

      try {
        const credType = CREDENTIAL_TYPE_MAP[args.type];
        if (!credType) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(
                  {
                    error: {
                      code: "INVALID_CREDENTIAL_TYPE",
                      message: `Invalid credential type: ${args.type}`,
                      suggestion: "Valid types are: password, oidc, totp, webauthn, lookup_secret",
                    },
                  },
                  null,
                  2,
                ),
              },
            ],
            isError: true,
          };
        }

        await kratosClients.identity.deleteIdentityCredentials({
          id: args.id,
          type: credType as "password" | "oidc" | "totp" | "webauthn" | "lookup_secret",
        });

        log.info("Identity credential deleted successfully", {
          tool: "kratos_delete_identity_credential",
          durationMs: Date.now() - startTime,
        });

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  success: true,
                  message: `${args.type} credential removed from identity ${args.id}`,
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (error) {
        log.error("Failed to delete identity credential", {
          tool: "kratos_delete_identity_credential",
          durationMs: Date.now() - startTime,
          error: { message: error instanceof Error ? error.message : String(error) },
        });

        const mcpError = mapError(error, "delete_identity_credential");
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
