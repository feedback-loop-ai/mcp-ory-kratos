/**
 * Test Fixtures
 *
 * Schema-aware test data factories for creating Kratos resources.
 * Dynamically generates valid traits based on JSON Schema definitions.
 */

import { generateTestEmail, generateTraitsFromSchema, generateUniqueId } from "./schema-generator";

/**
 * Input for creating a test identity
 */
export interface CreateIdentityInput {
  schemaId: string;
  traits: Record<string, unknown>;
  state?: "active" | "inactive";
  metadataPublic?: Record<string, unknown>;
  metadataAdmin?: Record<string, unknown>;
}

/**
 * Input for updating a test identity
 */
export interface UpdateIdentityInput {
  id: string;
  schemaId: string;
  traits: Record<string, unknown>;
  state: "active" | "inactive";
  metadataPublic?: Record<string, unknown>;
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
 * Create a test identity input with traits generated from schema
 *
 * @param schema - The JSON Schema for identity traits
 * @param schemaId - The schema ID to use
 * @param overrides - Optional overrides for the generated input
 */
export function createTestIdentityInput(
  schema: object,
  schemaId: string,
  overrides: Partial<CreateIdentityInput> = {},
): CreateIdentityInput {
  // Generate traits from schema
  const baseTraits = generateTraitsFromSchema(schema);

  return {
    schemaId,
    traits: {
      ...baseTraits,
      ...overrides.traits,
    },
    state: overrides.state ?? "active",
    metadataPublic: overrides.metadataPublic,
    metadataAdmin: overrides.metadataAdmin,
  };
}

/**
 * Create an update identity input from an existing identity
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
  updates: Partial<Omit<UpdateIdentityInput, "id" | "schemaId">> = {},
): UpdateIdentityInput {
  // Generate fresh traits from schema for the update
  const baseTraits = generateTraitsFromSchema(schema);

  return {
    id,
    schemaId,
    traits: updates.traits ?? baseTraits,
    state: updates.state ?? "active",
    metadataPublic: updates.metadataPublic,
    metadataAdmin: updates.metadataAdmin,
  };
}

/**
 * Create patch operations for common scenarios
 */
export const patchOperations = {
  /**
   * Replace the email in traits (if schema has email)
   */
  replaceEmail(email: string): PatchOperation[] {
    return [{ op: "replace", path: "/traits/email", value: email }];
  },

  /**
   * Add metadata
   */
  addMetadataPublic(metadata: Record<string, unknown>): PatchOperation[] {
    return [{ op: "replace", path: "/metadata_public", value: metadata }];
  },

  /**
   * Change identity state
   */
  changeState(state: "active" | "inactive"): PatchOperation[] {
    return [{ op: "replace", path: "/state", value: state }];
  },

  /**
   * Replace a specific trait field
   */
  replaceTrait(path: string, value: unknown): PatchOperation[] {
    return [{ op: "replace", path: `/traits/${path}`, value }];
  },
};

// Re-export generators for direct use in tests
export { generateTestEmail, generateUniqueId };
