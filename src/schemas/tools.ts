/**
 * MCP Tool Schemas - Ory Kratos MCP Server
 *
 * Zod schemas for all MCP tools. These define the contract between
 * AI agents and the Kratos Admin API operations.
 *
 * @module contracts/tools
 */

import { z } from "zod";
import { CREDENTIAL_TYPES } from "../kratos/types.js";

// =============================================================================
// Common Types
// =============================================================================

/** Standard pagination input for list operations */
export const PaginationInputSchema = z.object({
  pageSize: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20)
    .describe("Number of items per page (1-100, default 20)"),
  pageToken: z.string().optional().describe("Cursor for pagination from previous response"),
});

/** Standard pagination output for list operations */
export const PaginatedOutputSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    nextPageToken: z.string().optional().describe("Cursor for next page"),
    totalCount: z.number().int().optional().describe("Total items if known"),
  });

// =============================================================================
// Identity Tools
// =============================================================================

export const ListIdentitiesInputSchema = PaginationInputSchema.extend({
  credentialsIdentifier: z
    .string()
    .optional()
    .describe("Filter by credential identifier (e.g., email)"),
});

export const GetIdentityInputSchema = z.object({
  id: z.string().uuid().describe("Identity UUID"),
  includeCredentials: z
    .boolean()
    .default(false)
    .describe("Include credential information (admin only)"),
});

export const GetIdentityByExternalIdInputSchema = z.object({
  externalId: z
    .string()
    .min(1)
    .describe("The identity's external_id field value (exact match, Kratos 25.4.0+)"),
});

export const CreateIdentityInputSchema = z.object({
  schemaId: z.string().min(1).describe("Identity schema to use"),
  traits: z.record(z.unknown()).describe("Identity traits (must match schema)"),
  state: z.enum(["active", "inactive"]).default("active").describe("Initial identity state"),
  metadataPublic: z.record(z.unknown()).optional().describe("Public metadata"),
  metadataAdmin: z.record(z.unknown()).optional().describe("Admin-only metadata"),
});

export const UpdateIdentityInputSchema = z.object({
  id: z.string().uuid().describe("Identity UUID"),
  schemaId: z.string().min(1).describe("Identity schema"),
  traits: z.record(z.unknown()).describe("Updated traits"),
  state: z.enum(["active", "inactive"]).describe("Identity state"),
  metadataPublic: z.record(z.unknown()).optional(),
  metadataAdmin: z.record(z.unknown()).optional(),
});

export const PatchIdentityInputSchema = z.object({
  id: z.string().uuid().describe("Identity UUID"),
  patch: z
    .array(
      z.object({
        op: z.enum(["add", "remove", "replace"]).describe("Patch operation"),
        path: z.string().describe("JSON path to modify"),
        value: z.unknown().optional().describe("Value for add/replace"),
      }),
    )
    .describe("JSON Patch operations"),
});

export const DeleteIdentityInputSchema = z.object({
  id: z.string().uuid().describe("Identity UUID"),
});

export const DeleteIdentityCredentialInputSchema = z.object({
  id: z.string().uuid().describe("Identity UUID"),
  type: z.enum(CREDENTIAL_TYPES).describe("Credential type to delete"),
});

/** One item in a batch identity patch (mirrors the Kratos IdentityPatch shape) */
export const BatchIdentityPatchSchema = z.object({
  create: z
    .object({
      schemaId: z.string().min(1).describe("Identity schema to use"),
      traits: z.record(z.unknown()).describe("Identity traits (must match schema)"),
      state: z.enum(["active", "inactive"]).default("active").describe("Initial identity state"),
      metadataPublic: z.record(z.unknown()).optional().describe("Public metadata"),
      metadataAdmin: z.record(z.unknown()).optional().describe("Admin-only metadata"),
    })
    .describe("Identity to create (same fields as kratos_create_identity)"),
  patchId: z
    .string()
    .uuid()
    .optional()
    .describe("Optional correlation ID (UUID), echoed back in the matching result"),
});

export const BatchPatchIdentitiesInputSchema = z.object({
  identities: z
    .array(BatchIdentityPatchSchema)
    .min(1, "At least one identity patch is required")
    .max(100, "Batch size is limited to 100 identities per call")
    .describe("Identity patches to apply in order (1-100 items)"),
});

// =============================================================================
// Session Tools
// =============================================================================

/** Server-side filters applied before returning results (reduces token usage) */
export const SessionFilterSchema = z.object({
  authMethod: z
    .enum([
      "password",
      "oidc",
      "totp",
      "webauthn",
      "passkey",
      "lookup_secret",
      "link_recovery",
      "code_recovery",
    ])
    .optional()
    .describe("Filter by authentication method (e.g., 'oidc' for Microsoft/Google login)"),
  provider: z
    .string()
    .optional()
    .describe(
      "Filter by OIDC provider (e.g., 'microsoft', 'google'). Only applies when authMethod is 'oidc'",
    ),
  authenticatedAfter: z
    .string()
    .datetime()
    .optional()
    .describe("Only sessions authenticated after this time (ISO 8601)"),
  authenticatedBefore: z
    .string()
    .datetime()
    .optional()
    .describe("Only sessions authenticated before this time (ISO 8601)"),
});

export const ListSessionsInputSchema = z.object({
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20)
    .describe("Maximum sessions to return (1-100, default 20)"),
  active: z.boolean().optional().describe("Filter by active status"),
  expand: z
    .array(z.enum(["identity", "devices"]))
    .optional()
    .describe("Include related data"),
  filter: SessionFilterSchema.optional().describe("Server-side filters (reduces response size)"),
});

export const ListIdentitySessionsInputSchema = PaginationInputSchema.extend({
  identityId: z.string().uuid().describe("Identity UUID"),
  active: z.boolean().optional().describe("Filter by active status"),
});

export const GetSessionInputSchema = z.object({
  id: z.string().uuid().describe("Session UUID"),
  expand: z
    .array(z.enum(["identity", "devices"]))
    .optional()
    .describe("Include related data"),
});

export const DisableSessionInputSchema = z.object({
  id: z.string().uuid().describe("Session UUID"),
});

export const ExtendSessionInputSchema = z.object({
  id: z.string().uuid().describe("Session UUID"),
});

export const DeleteIdentitySessionsInputSchema = z.object({
  identityId: z.string().uuid().describe("Identity UUID"),
});

// =============================================================================
// Courier Tools
// =============================================================================

export const ListCourierMessagesInputSchema = PaginationInputSchema.extend({
  status: z
    .enum(["queued", "sent", "processing", "abandoned"])
    .optional()
    .describe("Filter by delivery status"),
  recipient: z.string().optional().describe("Filter by recipient address"),
});

export const GetCourierMessageInputSchema = z.object({
  id: z.string().uuid().describe("Message UUID"),
});

// =============================================================================
// Recovery Tools
// =============================================================================

export const CreateRecoveryLinkInputSchema = z.object({
  identityId: z.string().uuid().describe("Identity UUID"),
  expiresIn: z.string().optional().describe("Link validity duration (e.g., '1h', '24h')"),
});

export const CreateRecoveryCodeInputSchema = z.object({
  identityId: z.string().uuid().describe("Identity UUID"),
  expiresIn: z.string().optional().describe("Code validity duration"),
});

// =============================================================================
// Health Tools
// =============================================================================

export const HealthAliveInputSchema = z.object({});

export const HealthReadyInputSchema = z.object({});

export const VersionInputSchema = z.object({});

// =============================================================================
// Analytics Tools
// =============================================================================

export const SessionAnalyticsInputSchema = z.object({
  from: z.string().datetime().optional().describe("Start of time range (ISO 8601)"),
  to: z.string().datetime().optional().describe("End of time range (ISO 8601)"),
  includeAuthMethods: z.boolean().default(true).describe("Include auth method distribution"),
  includeDevices: z.boolean().default(true).describe("Include device/browser breakdown"),
});

export const SessionAnalyticsOutputSchema = z.object({
  totalSessions: z.number().int().describe("Total sessions in query period"),
  activeSessions: z.number().int().describe("Currently active sessions"),
  inactiveSessions: z.number().int().describe("Inactive/expired sessions"),
  byAuthenticationMethod: z.record(z.number().int()).describe("Count by auth method"),
  byAssuranceLevel: z
    .object({
      aal1: z.number().int().describe("Single-factor sessions"),
      aal2: z.number().int().describe("Multi-factor sessions"),
    })
    .describe("Count by assurance level"),
  byDeviceType: z.record(z.number().int()).describe("Count by device type"),
  byBrowser: z.record(z.number().int()).describe("Count by browser"),
  timeRange: z.object({
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
  }),
});

export const CredentialAnalyticsInputSchema = z.object({
  includeMfa: z
    .boolean()
    .default(true)
    .describe("Include adoption stats (MFA and passwordless/passkey)"),
});

export const CredentialAnalyticsOutputSchema = z.object({
  totalIdentities: z.number().int().describe("Total identities analyzed"),
  credentialDistribution: z.record(z.number().int()).describe("Count by credential type"),
  mfaAdoption: z
    .object({
      enabled: z.number().int().describe("Identities with MFA enabled"),
      disabled: z.number().int().describe("Identities without MFA"),
    })
    .optional(),
  passwordlessAdoption: z
    .object({
      enabled: z.number().int().describe("Identities with a passwordless first factor (passkey)"),
      disabled: z.number().int().describe("Identities without a passwordless first factor"),
    })
    .optional()
    .describe(
      "Passwordless (passkey) adoption. Separate from mfaAdoption because passkeys are a first factor, not MFA. 'code' credentials appear only in credentialDistribution since they may act as first or second factor.",
    ),
});

// =============================================================================
// Error Schema
// =============================================================================

export const McpToolErrorSchema = z.object({
  code: z.string().describe("Error code (e.g., IDENTITY_NOT_FOUND)"),
  message: z.string().describe("Human-readable error description"),
  kratosStatus: z.number().int().optional().describe("Original HTTP status"),
  kratosCode: z.string().optional().describe("Original Kratos error code"),
  suggestion: z.string().optional().describe("Actionable guidance"),
});

// =============================================================================
// Type Exports
// =============================================================================

export type PaginationInput = z.infer<typeof PaginationInputSchema>;
export type ListIdentitiesInput = z.infer<typeof ListIdentitiesInputSchema>;
export type GetIdentityInput = z.infer<typeof GetIdentityInputSchema>;
export type GetIdentityByExternalIdInput = z.infer<typeof GetIdentityByExternalIdInputSchema>;
export type CreateIdentityInput = z.infer<typeof CreateIdentityInputSchema>;
export type UpdateIdentityInput = z.infer<typeof UpdateIdentityInputSchema>;
export type PatchIdentityInput = z.infer<typeof PatchIdentityInputSchema>;
export type DeleteIdentityInput = z.infer<typeof DeleteIdentityInputSchema>;
export type DeleteIdentityCredentialInput = z.infer<typeof DeleteIdentityCredentialInputSchema>;
export type BatchIdentityPatch = z.infer<typeof BatchIdentityPatchSchema>;
export type BatchPatchIdentitiesInput = z.infer<typeof BatchPatchIdentitiesInputSchema>;
export type SessionFilter = z.infer<typeof SessionFilterSchema>;
export type ListSessionsInput = z.infer<typeof ListSessionsInputSchema>;
export type ListIdentitySessionsInput = z.infer<typeof ListIdentitySessionsInputSchema>;
export type GetSessionInput = z.infer<typeof GetSessionInputSchema>;
export type DisableSessionInput = z.infer<typeof DisableSessionInputSchema>;
export type ExtendSessionInput = z.infer<typeof ExtendSessionInputSchema>;
export type DeleteIdentitySessionsInput = z.infer<typeof DeleteIdentitySessionsInputSchema>;
export type ListCourierMessagesInput = z.infer<typeof ListCourierMessagesInputSchema>;
export type GetCourierMessageInput = z.infer<typeof GetCourierMessageInputSchema>;
export type CreateRecoveryLinkInput = z.infer<typeof CreateRecoveryLinkInputSchema>;
export type CreateRecoveryCodeInput = z.infer<typeof CreateRecoveryCodeInputSchema>;
export type SessionAnalyticsInput = z.infer<typeof SessionAnalyticsInputSchema>;
export type SessionAnalyticsOutput = z.infer<typeof SessionAnalyticsOutputSchema>;
export type CredentialAnalyticsInput = z.infer<typeof CredentialAnalyticsInputSchema>;
export type CredentialAnalyticsOutput = z.infer<typeof CredentialAnalyticsOutputSchema>;
export type McpToolError = z.infer<typeof McpToolErrorSchema>;
