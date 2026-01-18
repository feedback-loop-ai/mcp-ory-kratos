/**
 * Test Context Contract
 *
 * Defines the runtime context for tracking test resources, schema management, and cleanup.
 *
 * @module contracts/test-context
 */

import type { CourierApi, IdentityApi, MetadataApi } from "@ory/kratos-client";

/**
 * Kratos client instances used by tests
 */
export interface TestKratosClients {
  identity: IdentityApi;
  courier: CourierApi;
  metadata: MetadataApi;
}

/**
 * Cached identity schema
 */
export interface CachedSchema {
  id: string;
  schema: object;
}

/**
 * Test context for resource tracking, schema management, and cleanup
 *
 * This context is shared across tests in a suite and tracks all created
 * resources for automatic cleanup in afterAll hooks. It also provides
 * access to identity schemas for dynamic test data generation.
 */
export interface TestContext {
  /**
   * Kratos API clients
   */
  clients: TestKratosClients;

  /**
   * IDs of identities created during test execution.
   * Used for cleanup in afterAll.
   * Note: Sessions are automatically invalidated when parent identity is deleted,
   * so explicit session tracking is not required per FR-017.
   */
  createdIdentityIds: string[];

  /**
   * Cached identity schemas from Kratos
   * Key is schema ID, value is the JSON Schema definition
   */
  schemas: Map<string, object>;

  /**
   * Default schema ID to use for test data generation
   */
  defaultSchemaId: string;

  /**
   * Track a created identity for cleanup
   */
  trackIdentity(id: string): void;

  /**
   * Clean up all tracked resources
   * Should be called in afterAll
   */
  cleanup(): Promise<CleanupResult>;

  /**
   * Get a schema by ID, or the default schema if no ID provided
   * @param schemaId - Optional schema ID (uses defaultSchemaId if not provided)
   * @throws Error if schema not found
   */
  getSchema(schemaId?: string): object;

  /**
   * Get the default schema ID
   */
  getDefaultSchemaId(): string;
}

/**
 * Result of cleanup operation
 */
export interface CleanupResult {
  /**
   * Number of identities successfully deleted
   */
  identitiesDeleted: number;

  /**
   * IDs of resources that failed to delete
   */
  failedDeletions: string[];

  /**
   * Overall success (true if no failures)
   */
  success: boolean;
}

/**
 * Factory function signature for creating test context
 */
export type CreateTestContext = (clients: TestKratosClients) => TestContext;
