/**
 * Identity management tools for Kratos MCP Server
 *
 * Implements tools for listing, viewing, creating, updating, and deleting
 * identities, plus identity schema lookups.
 * @module tools/identity
 */

import type {
  CreateIdentityBody,
  IdentityPatchResponseActionEnum,
  UpdateIdentityBody,
} from "@ory/kratos-client";
import type { z } from "zod";
import { nextPageTokenOf } from "../kratos/pagination.js";
import { revokeAllSessions } from "../kratos/sessions.js";
import { ALL_CREDENTIAL_TYPES, redactCredentials } from "../kratos/types.js";
import {
  BatchPatchIdentitiesInputSchema,
  BatchPatchIdentitiesOutputSchema,
  CreateIdentityInputSchema,
  DeleteIdentityCredentialInputSchema,
  DeleteIdentityInputSchema,
  GetIdentityByExternalIdInputSchema,
  GetIdentityInputSchema,
  GetIdentitySchemaInputSchema,
  IdentitySummarySchema,
  ListIdentitiesInputSchema,
  ListIdentitiesOutputSchema,
  ListIdentitySchemasInputSchema,
  PaginatedOutputSchema,
  PassthroughObjectSchema,
  PatchIdentityInputSchema,
  SetIdentityStateInputSchema,
  UpdateIdentityInputSchema,
} from "../schemas/tools.js";
import {
  CREATE,
  DESTRUCTIVE,
  defineTool,
  READ_ONLY,
  type ToolContext,
  UPDATE,
  UPDATE_IDEMPOTENT,
} from "./define.js";

type Passthrough = z.infer<typeof PassthroughObjectSchema>;
type IdentitySummary = z.infer<typeof IdentitySummarySchema>;
type CreateIdentityInput = z.infer<typeof CreateIdentityInputSchema>;
type UpdateIdentityInput = z.infer<typeof UpdateIdentityInputSchema>;

const ListIdentitySchemasOutputSchema = PaginatedOutputSchema(PassthroughObjectSchema);

/** Map the camelCase create input onto the snake_case Kratos body */
function toCreateIdentityBody(input: CreateIdentityInput): CreateIdentityBody {
  return {
    schema_id: input.schemaId,
    traits: input.traits,
    state: input.state,
    metadata_public: input.metadataPublic,
    metadata_admin: input.metadataAdmin,
    external_id: input.externalId,
    organization_id: input.organizationId,
    credentials: input.credentials,
    verifiable_addresses: input.verifiableAddresses?.map((address) => ({
      value: address.value,
      via: address.via,
      verified: address.verified,
      status: address.status ?? (address.verified ? "completed" : "pending"),
    })),
    recovery_addresses: input.recoveryAddresses,
  };
}

/** Map the camelCase update input onto the snake_case Kratos body */
function toUpdateIdentityBody(input: UpdateIdentityInput): UpdateIdentityBody {
  return {
    schema_id: input.schemaId,
    traits: input.traits,
    state: input.state,
    metadata_public: input.metadataPublic,
    metadata_admin: input.metadataAdmin,
    external_id: input.externalId,
    credentials: input.credentials,
  };
}

/** Kratos `Identity` (traits: object) is not structurally assignable to the zod summary type */
function asSummary(identity: unknown): IdentitySummary {
  return identity as IdentitySummary;
}

function toBatchAction(action: IdentityPatchResponseActionEnum | undefined) {
  return action === "create" || action === "error" ? action : ("unknown" as const);
}

/** Human-readable target for credential deletion prompts/messages */
function credentialTarget(args: { type: string; identifier?: string }): string {
  return args.identifier ? `${args.type} (${args.identifier})` : args.type;
}

/**
 * Register identity tools (query, mutation, batch, schema)
 */
export function registerIdentityTools(ctx: ToolContext): void {
  const { clients, config } = ctx;
  const redact = <T extends { credentials?: unknown }>(identity: T): T =>
    redactCredentials(identity, config.allowCredentialExposure);

  defineTool(ctx, {
    name: "kratos_list_identities",
    title: "List identities",
    description:
      "List identities with optional filtering by exact or similar credential identifier (e.g. email), ID list, or organization. Returns nextPageToken for pagination. Use includeCredential to also load linked credentials (secret config is redacted by default).",
    toolset: "identities",
    inputSchema: ListIdentitiesInputSchema,
    outputSchema: ListIdentitiesOutputSchema,
    annotations: READ_ONLY,
    run: async (args) => {
      const response = await clients.identity.listIdentities({
        pageSize: args.pageSize,
        pageToken: args.pageToken,
        ids: args.ids,
        organizationId: args.organizationId,
        credentialsIdentifier: args.credentialsIdentifier,
        previewCredentialsIdentifierSimilar: args.previewCredentialsIdentifierSimilar,
        includeCredential: args.includeCredential ? [...args.includeCredential] : undefined,
        consistency: args.consistency,
      });
      const identities = args.includeCredential ? response.data.map(redact) : response.data;
      const items = identities.map(asSummary);
      return { items, count: items.length, nextPageToken: nextPageTokenOf(response) };
    },
  });

  defineTool(ctx, {
    name: "kratos_get_identity",
    title: "Get identity",
    description:
      "Get a single identity by ID. Use includeCredential (e.g. ['oidc', 'password']) to see which credentials are linked; secret config is redacted unless KRATOS_ALLOW_CREDENTIAL_EXPOSURE is set.",
    toolset: "identities",
    inputSchema: GetIdentityInputSchema,
    outputSchema: IdentitySummarySchema,
    annotations: READ_ONLY,
    run: async (args) => {
      const includeCredential =
        args.includeCredential ?? (args.includeCredentials ? [...ALL_CREDENTIAL_TYPES] : undefined);
      const response = await clients.identity.getIdentity({ id: args.id, includeCredential });
      return asSummary(redact(response.data));
    },
  });

  defineTool(ctx, {
    name: "kratos_get_identity_by_external_id",
    title: "Get identity by external ID",
    description:
      "Look up an identity by its external_id field (exact match, requires Kratos 25.4.0+). The external_id links an identity to a record in an external system and is unique across all identities. Returns a structured NOT_FOUND error if no identity has the given external_id.",
    toolset: "identities",
    inputSchema: GetIdentityByExternalIdInputSchema,
    outputSchema: IdentitySummarySchema,
    annotations: READ_ONLY,
    run: async (args) => {
      const response = await clients.identity.getIdentityByExternalID({
        externalID: args.externalId,
      });
      return asSummary(response.data);
    },
  });

  defineTool(ctx, {
    name: "kratos_create_identity",
    title: "Create identity",
    description:
      "Create a new identity with the given schema and traits. Optionally set metadata, external_id, organization, pre-verified addresses, and import existing credentials (password hash, OIDC/SAML links). Traits must match the schema.",
    toolset: "identities",
    inputSchema: CreateIdentityInputSchema,
    outputSchema: IdentitySummarySchema,
    annotations: CREATE,
    run: async (args) => {
      const response = await clients.identity.createIdentity({
        createIdentityBody: toCreateIdentityBody(args),
      });
      return asSummary(response.data);
    },
  });

  defineTool(ctx, {
    name: "kratos_update_identity",
    title: "Update identity (full replace)",
    description:
      "Replace an identity's schema, traits, state, and metadata (PUT semantics). WARNING: fields you omit are cleared - omitting metadataPublic or metadataAdmin removes the existing metadata. Prefer kratos_patch_identity to change individual fields.",
    toolset: "identities",
    inputSchema: UpdateIdentityInputSchema,
    outputSchema: IdentitySummarySchema,
    annotations: UPDATE_IDEMPOTENT,
    confirmMessage: (args) =>
      `Replace all traits/metadata of identity ${args.id}? Omitted metadata will be cleared.`,
    run: async (args) => {
      const response = await clients.identity.updateIdentity({
        id: args.id,
        updateIdentityBody: toUpdateIdentityBody(args),
      });
      return asSummary(response.data);
    },
  });

  defineTool(ctx, {
    name: "kratos_patch_identity",
    title: "Patch identity",
    description:
      "Partially update an identity with JSON Patch operations (add/remove/replace on paths like /traits/email, /state, /metadata_admin/role). Use this to change specific fields without replacing the whole identity.",
    toolset: "identities",
    inputSchema: PatchIdentityInputSchema,
    outputSchema: IdentitySummarySchema,
    annotations: UPDATE,
    confirmMessage: (args) =>
      `Apply ${args.patch.length} JSON patch operation(s) to identity ${args.id}?`,
    run: async (args) => {
      const response = await clients.identity.patchIdentity({
        id: args.id,
        jsonPatch: args.patch.map((op) => ({ op: op.op, path: op.path, value: op.value })),
      });
      return asSummary(response.data);
    },
  });

  defineTool(ctx, {
    name: "kratos_set_identity_state",
    title: "Set identity state",
    description:
      "Activate or suspend (inactive) an identity. An inactive identity cannot log in. Set revokeSessions to also delete all of its sessions, logging it out everywhere immediately (session deletion is irreversible).",
    toolset: "identities",
    inputSchema: SetIdentityStateInputSchema,
    outputSchema: PassthroughObjectSchema,
    annotations: UPDATE_IDEMPOTENT,
    confirmMessage: (args) =>
      `Set identity ${args.id} to ${args.state}${args.revokeSessions ? " and revoke all its sessions" : ""}?`,
    run: async (args) => {
      const response = await clients.identity.patchIdentity({
        id: args.id,
        jsonPatch: [{ op: "replace", path: "/state", value: args.state }],
      });
      const sessionsRevoked = args.revokeSessions
        ? await revokeAllSessions(clients.identity, args.id)
        : false;
      return { ...response.data, sessionsRevoked } as Passthrough;
    },
  });

  defineTool(ctx, {
    name: "kratos_delete_identity",
    title: "Delete identity",
    description:
      "Permanently delete an identity together with its credentials, sessions, and addresses. This cannot be undone; consider kratos_set_identity_state with state=inactive to suspend instead.",
    toolset: "identities",
    inputSchema: DeleteIdentityInputSchema,
    outputSchema: PassthroughObjectSchema,
    annotations: DESTRUCTIVE,
    confirmMessage: (args) => `Permanently delete identity ${args.id}? This cannot be undone.`,
    run: async (args) => {
      await clients.identity.deleteIdentity({ id: args.id });
      return { success: true, message: `Identity ${args.id} has been permanently deleted` };
    },
  });

  defineTool(ctx, {
    name: "kratos_delete_identity_credential",
    title: "Delete identity credential",
    description:
      "Remove one credential type from an identity (e.g. reset TOTP, WebAuthn, passkey, or lookup secrets while keeping the password). For oidc/saml pass identifier='<provider>:<subject>' to unlink a single provider. The credential is gone permanently; the user must re-enrol.",
    toolset: "identities",
    inputSchema: DeleteIdentityCredentialInputSchema,
    outputSchema: PassthroughObjectSchema,
    annotations: DESTRUCTIVE,
    confirmMessage: (args) =>
      `Delete ${credentialTarget(args)} credential from identity ${args.id}?`,
    run: async (args) => {
      const target = credentialTarget(args);
      await clients.identity.deleteIdentityCredentials({
        id: args.id,
        type: args.type,
        identifier: args.identifier,
      });
      return { success: true, message: `${target} credential removed from identity ${args.id}` };
    },
  });

  defineTool(ctx, {
    name: "kratos_batch_patch_identities",
    title: "Batch create identities",
    description:
      "Create up to 100 identities in one request (bulk import). Items succeed or fail independently: each result reports action 'create' (with the new identity ID) or 'error' (with Kratos error detail), plus a succeeded/failed summary. Supply a patchId per item to correlate results.",
    toolset: "identities",
    inputSchema: BatchPatchIdentitiesInputSchema,
    outputSchema: BatchPatchIdentitiesOutputSchema,
    annotations: CREATE,
    run: async (args, { log }) => {
      const response = await clients.identity.batchPatchIdentities({
        patchIdentitiesBody: {
          identities: args.identities.map((item) => ({
            create: toCreateIdentityBody(item.create),
            patch_id: item.patchId,
          })),
        },
      });
      const results = (response.data.identities ?? []).map((item) => ({
        action: toBatchAction(item.action),
        identity: item.identity,
        patchId: item.patch_id,
        error: item.error,
      }));
      const succeeded = results.filter((r) => r.action === "create").length;
      const failed = results.filter((r) => r.action === "error").length;
      if (failed > 0) {
        log.warn("Batch patch had failures", { tool: "kratos_batch_patch_identities", failed });
      }
      return { results, summary: { total: results.length, succeeded, failed } };
    },
  });

  defineTool(ctx, {
    name: "kratos_list_identity_schemas",
    title: "List identity schemas",
    description:
      "List the identity schemas configured in Kratos (ID plus JSON Schema). Use this to discover valid schemaId values and required traits before creating identities.",
    toolset: "identities",
    inputSchema: ListIdentitySchemasInputSchema,
    outputSchema: ListIdentitySchemasOutputSchema,
    annotations: READ_ONLY,
    run: async (args) => {
      const response = await clients.identity.listIdentitySchemas({
        pageSize: args.pageSize,
        pageToken: args.pageToken,
      });
      const items = response.data as unknown as Passthrough[];
      return { items, count: items.length, nextPageToken: nextPageTokenOf(response) };
    },
  });

  defineTool(ctx, {
    name: "kratos_get_identity_schema",
    title: "Get identity schema",
    description:
      "Get the raw JSON Schema for an identity schema ID (e.g. 'default'). Use it to learn which traits are required and which are used as login identifiers.",
    toolset: "identities",
    inputSchema: GetIdentitySchemaInputSchema,
    outputSchema: PassthroughObjectSchema,
    annotations: READ_ONLY,
    run: async (args) => {
      const response = await clients.identity.getIdentitySchema({ id: args.id });
      return response.data as Passthrough;
    },
  });
}
