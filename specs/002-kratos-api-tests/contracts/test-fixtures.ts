/**
 * Test Fixtures Contract
 *
 * Defines schema-aware test data factories for creating Kratos resources.
 * Dynamically generates valid traits based on JSON Schema definitions.
 *
 * @module contracts/test-fixtures
 */

/**
 * Input for creating a test identity
 */
export interface CreateIdentityInput {
  /**
   * Identity schema ID (required - obtained from TestContext)
   */
  schemaId: string;

  /**
   * Identity traits (dynamically generated from schema)
   */
  traits: Record<string, unknown>;

  /**
   * Initial identity state
   * @default "active"
   */
  state?: "active" | "inactive";

  /**
   * Public metadata
   */
  metadataPublic?: Record<string, unknown>;

  /**
   * Admin metadata
   */
  metadataAdmin?: Record<string, unknown>;
}

/**
 * Input for updating a test identity
 */
export interface UpdateIdentityInput {
  /**
   * Identity ID to update
   */
  id: string;

  /**
   * Schema ID
   */
  schemaId: string;

  /**
   * Updated traits (dynamically generated from schema)
   */
  traits: Record<string, unknown>;

  /**
   * Updated state
   */
  state: "active" | "inactive";

  /**
   * Updated public metadata
   */
  metadataPublic?: Record<string, unknown>;

  /**
   * Updated admin metadata
   */
  metadataAdmin?: Record<string, unknown>;
}

/**
 * JSON Patch operation for patching identities
 */
export interface PatchOperation {
  op: "add" | "remove" | "replace";
  path: string;
  value?: unknown;
}

/**
 * Factory for generating unique test emails
 */
export function generateTestEmail(prefix = "test"): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
}

/**
 * Factory for generating unique identifiers
 */
export function generateUniqueId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Factory for generating a test identity input with schema-aware traits
 *
 * @param schema - The JSON Schema for identity traits (from TestContext.getSchema())
 * @param schemaId - The schema ID to use (from TestContext.getDefaultSchemaId())
 * @param overrides - Optional overrides for the generated input
 */
export function createTestIdentityInput(
  schema: object,
  schemaId: string,
  overrides: Partial<CreateIdentityInput> = {}
): CreateIdentityInput;

/**
 * Factory for creating an update identity input
 *
 * @param id - The identity ID to update
 * @param schema - The JSON Schema for identity traits
 * @param schemaId - The schema ID to use
 * @param updates - The updates to apply
 */
export function createUpdateIdentityInput(
  id: string,
  schema: object,
  schemaId: string,
  updates?: Partial<Omit<UpdateIdentityInput, "id" | "schemaId">>
): UpdateIdentityInput;

/**
 * Pre-built patch operations for common scenarios
 */
export const patchOperations: {
  replaceEmail(email: string): PatchOperation[];
  addMetadataPublic(metadata: Record<string, unknown>): PatchOperation[];
  changeState(state: "active" | "inactive"): PatchOperation[];
  replaceTrait(path: string, value: unknown): PatchOperation[];
};
