/**
 * MCP Tool Schemas - Ory Kratos MCP Server
 *
 * Zod schemas for all MCP tools. These define the contract between
 * AI agents and the Kratos Admin API operations.
 *
 * @module schemas/tools
 */

import { z } from "zod";
import { ALL_CREDENTIAL_TYPES, CREDENTIAL_TYPES } from "../kratos/types.js";

// =============================================================================
// Common Types
// =============================================================================

/** Any JSON object passed through from Kratos unchanged (Kratos adds fields over time) */
export const PassthroughObjectSchema = z.object({}).passthrough();

/** Standard pagination input for list operations */
export const PaginationInputSchema = z.object({
  pageSize: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20)
    .describe("Number of items per page (1-100, default 20)"),
  pageToken: z.string().optional().describe("Cursor from a previous response's nextPageToken"),
});

/** Standard pagination output for list operations */
export const PaginatedOutputSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    count: z.number().int().describe("Items in this page"),
    nextPageToken: z
      .string()
      .optional()
      .describe("Cursor for the next page; absent on the last page"),
  });

/** Output of tools that walk many pages */
export const ScanSummarySchema = z.object({
  pagesScanned: z.number().int().describe("Pages fetched from Kratos"),
  truncated: z
    .boolean()
    .describe("True when the page cap was hit before the end; raise maxPages or resume"),
  nextPageToken: z.string().optional().describe("Cursor to resume from when truncated"),
});

export const MaxPagesInputSchema = z.object({
  maxPages: z
    .number()
    .int()
    .min(1)
    .max(1000)
    .optional()
    .describe("Maximum pages to scan (default from KRATOS_MAX_SCAN_PAGES, 20)"),
});

/** Go duration accepted by Kratos (e.g. 1h, 30m, 1.5h, 1h30m) */
export const GoDurationSchema = z
  .string()
  .regex(/^([0-9]+([.][0-9]+)?(ns|us|µs|ms|s|m|h))+$/, "Must be a Go duration like '1h' or '30m'");

export const MutationResultSchema = z.object({
  success: z.literal(true),
  message: z.string(),
});

// =============================================================================
// Identity Tools
// =============================================================================

export const IdentitySummarySchema = z
  .object({
    id: z.string(),
    schema_id: z.string().optional(),
    state: z.string().optional(),
    traits: z.unknown().optional(),
    external_id: z.string().nullable().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
  })
  .passthrough();

export const ListIdentitiesInputSchema = PaginationInputSchema.extend({
  credentialsIdentifier: z
    .string()
    .optional()
    .describe("Exact credential identifier match (e.g. email or username)"),
  previewCredentialsIdentifierSimilar: z
    .string()
    .optional()
    .describe("Fuzzy/partial credential identifier match (Kratos preview feature)"),
  ids: z
    .array(z.string().uuid())
    .max(500)
    .optional()
    .describe("Only return identities with these IDs"),
  organizationId: z
    .string()
    .uuid()
    .optional()
    .describe("Only return identities in this organization"),
  includeCredential: z
    .array(z.enum(ALL_CREDENTIAL_TYPES))
    .optional()
    .describe(
      "Credential types to include (metadata only unless KRATOS_ALLOW_CREDENTIAL_EXPOSURE is set)",
    ),
  consistency: z
    .enum(["strong", "eventual"])
    .optional()
    .describe("Read consistency (eventual is faster on large deployments)"),
});

export const ListIdentitiesOutputSchema = PaginatedOutputSchema(IdentitySummarySchema);

export const GetIdentityInputSchema = z.object({
  id: z.string().uuid().describe("Identity UUID"),
  includeCredential: z
    .array(z.enum(ALL_CREDENTIAL_TYPES))
    .optional()
    .describe(
      "Credential types to include, e.g. ['oidc']. Secret config is redacted unless KRATOS_ALLOW_CREDENTIAL_EXPOSURE is set",
    ),
  includeCredentials: z
    .boolean()
    .optional()
    .describe("Deprecated: include all credential types. Prefer includeCredential"),
});

export const GetIdentityByExternalIdInputSchema = z.object({
  externalId: z
    .string()
    .min(1)
    .describe("The identity's external_id field value (exact match, Kratos 25.4.0+)"),
});

/** Credential import payload (mirrors Kratos identityWithCredentials) */
export const IdentityCredentialsImportSchema = z
  .object({
    password: z
      .object({
        config: z.object({
          password: z.string().optional().describe("Plaintext password (hashed by Kratos)"),
          hashed_password: z
            .string()
            .optional()
            .describe("Pre-hashed password (bcrypt, argon2id, pbkdf2, scrypt, md5, ...)"),
          use_password_migration_hook: z.boolean().optional(),
        }),
      })
      .optional(),
    oidc: z
      .object({
        config: z.object({
          providers: z.array(
            z.object({
              provider: z.string().describe("OIDC provider ID as configured in Kratos"),
              subject: z.string().describe("Subject at the provider"),
              organization: z.string().optional(),
              use_auto_link: z.boolean().optional(),
            }),
          ),
        }),
      })
      .optional(),
    saml: z
      .object({
        config: z.object({
          providers: z.array(
            z.object({
              provider: z.string(),
              subject: z.string(),
              organization: z.string().optional(),
            }),
          ),
        }),
      })
      .optional(),
  })
  .describe("Existing credentials to import with the identity");

export const AddressImportSchema = z.object({
  value: z.string().describe("Email address or phone number"),
  via: z.enum(["email", "sms"]).describe("Delivery channel"),
});

export const VerifiableAddressImportSchema = AddressImportSchema.extend({
  verified: z.boolean().default(false),
  status: z.enum(["pending", "sent", "completed"]).optional(),
});

const IdentityBodySchema = {
  schemaId: z.string().min(1).describe("Identity schema to use"),
  traits: z.record(z.unknown()).describe("Identity traits (must match schema)"),
  state: z.enum(["active", "inactive"]).default("active").describe("Initial identity state"),
  metadataPublic: z.record(z.unknown()).optional().describe("Public metadata"),
  metadataAdmin: z.record(z.unknown()).optional().describe("Admin-only metadata"),
  externalId: z.string().optional().describe("External system ID (unique across identities)"),
  organizationId: z.string().uuid().optional().describe("Organization to place the identity in"),
  credentials: IdentityCredentialsImportSchema.optional(),
  verifiableAddresses: z
    .array(VerifiableAddressImportSchema)
    .optional()
    .describe("Pre-verified (or pending) addresses"),
  recoveryAddresses: z.array(AddressImportSchema).optional().describe("Recovery addresses"),
};

export const CreateIdentityInputSchema = z.object(IdentityBodySchema);

export const UpdateIdentityInputSchema = z.object({
  id: z.string().uuid().describe("Identity UUID"),
  schemaId: z.string().min(1).describe("Identity schema"),
  traits: z.record(z.unknown()).describe("Updated traits (full replacement)"),
  state: z.enum(["active", "inactive"]).describe("Identity state"),
  metadataPublic: z
    .record(z.unknown())
    .optional()
    .describe("Public metadata; omitting it clears existing public metadata"),
  metadataAdmin: z
    .record(z.unknown())
    .optional()
    .describe("Admin metadata; omitting it clears existing admin metadata"),
  externalId: z.string().optional(),
  credentials: IdentityCredentialsImportSchema.optional(),
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
    .min(1)
    .describe("JSON Patch operations"),
});

export const SetIdentityStateInputSchema = z.object({
  id: z.string().uuid().describe("Identity UUID"),
  state: z.enum(["active", "inactive"]).describe("New state (inactive = suspended)"),
  revokeSessions: z
    .boolean()
    .default(false)
    .describe("Also delete all of the identity's sessions (log out everywhere)"),
});

export const DeleteIdentityInputSchema = z.object({
  id: z.string().uuid().describe("Identity UUID"),
});

export const DeleteIdentityCredentialInputSchema = z.object({
  id: z.string().uuid().describe("Identity UUID"),
  type: z.enum(ALL_CREDENTIAL_TYPES).describe("Credential type to delete"),
  identifier: z
    .string()
    .optional()
    .describe(
      "For oidc/saml: which linked provider to unlink, formatted as '<provider>:<subject>' (see kratos_get_identity with includeCredential=['oidc'])",
    ),
});

/** One item in a batch identity patch (mirrors the Kratos IdentityPatch shape) */
export const BatchIdentityPatchSchema = z.object({
  create: z
    .object(IdentityBodySchema)
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

export const BatchPatchIdentitiesOutputSchema = z.object({
  results: z.array(
    z.object({
      action: z.enum(["create", "error", "unknown"]),
      identity: z.string().optional(),
      patchId: z.string().optional(),
      error: z.unknown().optional(),
    }),
  ),
  summary: z.object({
    total: z.number().int(),
    succeeded: z.number().int(),
    failed: z.number().int(),
  }),
});

export const ListIdentitySchemasInputSchema = PaginationInputSchema;

export const GetIdentitySchemaInputSchema = z.object({
  id: z.string().min(1).describe("Schema ID, e.g. 'default'"),
});

// =============================================================================
// Session Tools
// =============================================================================

export const SessionSummarySchema = z
  .object({
    id: z.string(),
    active: z.boolean().optional(),
    authenticated_at: z.string().optional(),
    expires_at: z.string().optional(),
    authenticator_assurance_level: z.string().optional(),
  })
  .passthrough();

/** Filters applied client-side after fetching (scans multiple pages) */
export const SessionFilterSchema = z.object({
  authMethod: z
    .enum([
      "password",
      "oidc",
      "totp",
      "webauthn",
      "passkey",
      "lookup_secret",
      "code",
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

export const ListSessionsInputSchema = PaginationInputSchema.extend({
  active: z.boolean().optional().describe("Filter by active status"),
  expand: z
    .array(z.enum(["identity", "devices"]))
    .optional()
    .describe("Include related data"),
  filter: SessionFilterSchema.optional().describe(
    "Client-side filters. When set, the tool scans up to maxPages pages to fill pageSize results",
  ),
  maxPages: MaxPagesInputSchema.shape.maxPages,
});

export const ListSessionsOutputSchema = PaginatedOutputSchema(SessionSummarySchema).extend({
  pagesScanned: z.number().int().optional(),
  truncated: z.boolean().optional(),
});

export const ListIdentitySessionsInputSchema = PaginationInputSchema.extend({
  identityId: z.string().uuid().describe("Identity UUID"),
  active: z.boolean().optional().describe("Filter by active status"),
});

export const ListIdentitySessionsOutputSchema = PaginatedOutputSchema(SessionSummarySchema).extend({
  identityId: z.string(),
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

export const ListCourierMessagesOutputSchema = z.object({
  messages: z.array(PassthroughObjectSchema),
  count: z.number().int(),
  nextPageToken: z.string().optional(),
});

export const GetCourierMessageInputSchema = z.object({
  id: z.string().uuid().describe("Message UUID"),
});

// =============================================================================
// Recovery Tools
// =============================================================================

export const CreateRecoveryLinkInputSchema = z.object({
  identityId: z.string().uuid().describe("Identity UUID"),
  expiresIn: GoDurationSchema.optional().describe("Link validity duration (e.g., '1h', '24h')"),
  returnTo: z
    .string()
    .url()
    .optional()
    .describe("URL to redirect to after the recovery flow completes"),
});

export const RecoveryLinkOutputSchema = z.object({
  identityId: z.string(),
  recoveryLink: z.string(),
  expiresAt: z.string().optional(),
  warning: z.string(),
});

export const CreateRecoveryCodeInputSchema = z.object({
  identityId: z.string().uuid().describe("Identity UUID"),
  expiresIn: GoDurationSchema.optional().describe("Code validity duration (e.g., '15m')"),
  flowType: z.enum(["browser", "api"]).optional().describe("Flow type the code will be used with"),
});

export const RecoveryCodeOutputSchema = z.object({
  identityId: z.string(),
  recoveryCode: z.string(),
  recoveryLink: z.string().optional(),
  expiresAt: z.string().optional(),
  warning: z.string(),
});

// =============================================================================
// Health Tools
// =============================================================================

export const EmptyInputSchema = z.object({});

export const HealthOutputSchema = z.object({
  status: z.string(),
  checkedAt: z.string(),
});

export const VersionOutputSchema = z.object({
  version: z.string(),
});

// =============================================================================
// Analytics Tools
// =============================================================================

export const SessionAnalyticsInputSchema = MaxPagesInputSchema.extend({
  from: z.string().datetime().optional().describe("Start of time range (ISO 8601)"),
  to: z.string().datetime().optional().describe("End of time range (ISO 8601)"),
  includeAuthMethods: z.boolean().default(true).describe("Include auth method distribution"),
  includeDevices: z.boolean().default(true).describe("Include device/browser breakdown"),
});

export const SessionAnalyticsOutputSchema = ScanSummarySchema.extend({
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

export const CredentialAnalyticsInputSchema = MaxPagesInputSchema.extend({
  includeMfa: z
    .boolean()
    .default(true)
    .describe("Include adoption stats (MFA and passwordless/passkey)"),
});

export const CredentialAnalyticsOutputSchema = ScanSummarySchema.extend({
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
export type SetIdentityStateInput = z.infer<typeof SetIdentityStateInputSchema>;
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
export type CredentialTypeAll = (typeof ALL_CREDENTIAL_TYPES)[number];
export { CREDENTIAL_TYPES };
