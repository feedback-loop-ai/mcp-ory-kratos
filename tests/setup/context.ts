/**
 * Test Context
 *
 * Runtime context for tracking test resources and enabling cleanup.
 * Includes schema discovery and caching for dynamic test data generation.
 */

import {
  Configuration,
  CourierApi,
  IdentityApi,
  MetadataApi,
} from "@ory/kratos-client";
import type { TestConfig } from "./config";
import { getAuthHeaders } from "./config";

/**
 * Kratos client instances used by tests
 */
export interface TestKratosClients {
  identity: IdentityApi;
  courier: CourierApi;
  metadata: MetadataApi;
}

/**
 * Result of cleanup operation
 */
export interface CleanupResult {
  identitiesDeleted: number;
  failedDeletions: string[];
  success: boolean;
}

/**
 * Cached identity schema
 */
export interface CachedSchema {
  id: string;
  schema: object;
}

/**
 * Test context for resource tracking, cleanup, and schema access
 */
export interface TestContext {
  clients: TestKratosClients;
  createdIdentityIds: string[];

  // Schema management
  schemas: Map<string, object>;
  defaultSchemaId: string;

  // Methods
  trackIdentity(id: string): void;
  cleanup(): Promise<CleanupResult>;
  getSchema(schemaId?: string): object;
  getDefaultSchemaId(): string;
}

/**
 * Create Kratos API clients for testing
 *
 * Note: Different APIs may need different base URLs depending on proxy configuration.
 * - IdentityApi uses paths like /admin/identities
 * - MetadataApi uses paths like /health/alive
 *
 * If the base URL already ends with /admin, MetadataApi needs that base,
 * but IdentityApi needs the base without /admin (since it adds /admin itself).
 */
export function createKratosClients(config: TestConfig): TestKratosClients {
  const authHeaders = getAuthHeaders(config);

  // Detect if base URL ends with /admin and create appropriate configurations
  const baseUrl = config.kratosAdminUrl.replace(/\/$/, ""); // Remove trailing slash
  const endsWithAdmin = baseUrl.endsWith("/admin");

  // For IdentityApi: if URL ends with /admin, remove it (client adds /admin)
  // For MetadataApi: use URL as-is (health endpoints are at root or /admin/health)
  const identityBaseUrl = endsWithAdmin ? baseUrl.replace(/\/admin$/, "") : baseUrl;
  const metadataBaseUrl = baseUrl;

  const identityConfig = new Configuration({
    basePath: identityBaseUrl,
    baseOptions: {
      headers: authHeaders,
      timeout: config.timeoutMs,
    },
  });

  const metadataConfig = new Configuration({
    basePath: metadataBaseUrl,
    baseOptions: {
      headers: authHeaders,
      timeout: config.timeoutMs,
    },
  });

  // CourierApi uses /admin/courier paths, same as identity
  const courierConfig = new Configuration({
    basePath: identityBaseUrl,
    baseOptions: {
      headers: authHeaders,
      timeout: config.timeoutMs,
    },
  });

  return {
    identity: new IdentityApi(identityConfig),
    courier: new CourierApi(courierConfig),
    metadata: new MetadataApi(metadataConfig),
  };
}

/**
 * Fetch all identity schemas from Kratos
 *
 * Note: The listIdentitySchemas API may redirect to a public endpoint.
 * We handle this by checking the response type and making a direct request if needed.
 */
export async function fetchIdentitySchemas(
  clients: TestKratosClients,
  config: TestConfig
): Promise<CachedSchema[]> {
  try {
    const response = await clients.identity.listIdentitySchemas({
      pageSize: 100, // Fetch up to 100 schemas
    });

    // Check if response is actually an array (not redirect HTML)
    if (Array.isArray(response.data)) {
      return response.data.map((schemaContainer) => ({
        id: schemaContainer.id || "unknown",
        schema: schemaContainer.schema || {},
      }));
    }
  } catch {
    // Fall through to direct fetch
  }

  // Fallback: fetch schemas directly using axios
  // The schemas endpoint may redirect, so we use the admin URL with proper headers
  const axios = (await import("axios")).default;
  const authHeaders = getAuthHeaders(config);
  const baseUrl = config.kratosAdminUrl.replace(/\/$/, "");

  // Try various endpoints - Kratos may expose schemas at different paths
  // depending on proxy configuration
  const endpoints = [
    `${baseUrl}/schemas`,
    `${baseUrl.replace("/admin", "")}/schemas`,
    `${baseUrl.replace("/admin", "/public")}/schemas`,
    `${baseUrl.replace("/admin", "")}/public/schemas`,
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await axios.get(endpoint, {
        headers: {
          Accept: "application/json",
          ...authHeaders,
        },
        timeout: config.timeoutMs,
        maxRedirects: 0, // Don't follow redirects to proxies
        validateStatus: (status) => status === 200,
      });

      if (Array.isArray(response.data)) {
        return response.data.map(
          (schemaContainer: { id?: string; schema?: object }) => ({
            id: schemaContainer.id || "unknown",
            schema: schemaContainer.schema || {},
          })
        );
      }
    } catch {
      // Try next endpoint
    }
  }

  throw new Error(
    "Could not fetch identity schemas from Kratos. " +
      "Ensure the Kratos instance is running and accessible."
  );
}

/**
 * Create a test context for tracking resources
 */
export function createTestContext(
  clients: TestKratosClients,
  schemas: CachedSchema[] = [],
  defaultSchemaId = "default"
): TestContext {
  const createdIdentityIds: string[] = [];

  // Build schema map
  const schemaMap = new Map<string, object>();
  for (const { id, schema } of schemas) {
    schemaMap.set(id, schema);
  }

  return {
    clients,
    createdIdentityIds,
    schemas: schemaMap,
    defaultSchemaId,

    trackIdentity(id: string): void {
      if (!createdIdentityIds.includes(id)) {
        createdIdentityIds.push(id);
      }
    },

    /**
     * Get a schema by ID, or the default schema if no ID provided
     */
    getSchema(schemaId?: string): object {
      const id = schemaId || this.defaultSchemaId;
      const schema = this.schemas.get(id);
      if (!schema) {
        throw new Error(
          `Schema '${id}' not found. Available schemas: ${[...this.schemas.keys()].join(", ")}`
        );
      }
      return schema;
    },

    /**
     * Get the default schema ID
     */
    getDefaultSchemaId(): string {
      return this.defaultSchemaId;
    },

    async cleanup(): Promise<CleanupResult> {
      const failedDeletions: string[] = [];
      let identitiesDeleted = 0;

      // Delete identities in reverse order of creation
      for (const id of [...createdIdentityIds].reverse()) {
        try {
          await clients.identity.deleteIdentity({ id });
          identitiesDeleted++;
        } catch (error) {
          // Only track as failure if it's not a 404 (already deleted)
          const status = (error as { response?: { status: number } })?.response
            ?.status;
          if (status !== 404) {
            failedDeletions.push(id);
          } else {
            identitiesDeleted++;
          }
        }
      }

      // Clear the tracking array
      createdIdentityIds.length = 0;

      return {
        identitiesDeleted,
        failedDeletions,
        success: failedDeletions.length === 0,
      };
    },
  };
}

// Global test context singleton
let globalContext: TestContext | null = null;

/**
 * Get the global test context
 */
export function getTestContext(): TestContext {
  if (!globalContext) {
    throw new Error(
      "Test context not initialized. Call initializeTestContext first."
    );
  }
  return globalContext;
}

/**
 * Initialize the global test context with schema discovery
 */
export async function initializeTestContext(
  config: TestConfig,
  overrideSchemaId?: string
): Promise<TestContext> {
  const clients = createKratosClients(config);

  // Fetch schemas from Kratos
  const schemas = await fetchIdentitySchemas(clients, config);

  // Determine default schema ID
  // Priority: 1. Override from config, 2. Schema named "default", 3. First available schema
  let defaultSchemaId = overrideSchemaId || config.testSchemaId || "default";

  // If no schema with the default ID exists, use the first available
  const schemaIds = schemas.map((s) => s.id);
  if (!schemaIds.includes(defaultSchemaId) && schemas.length > 0) {
    defaultSchemaId = schemas[0].id;
    console.log(`  Note: Using schema '${defaultSchemaId}' (specified schema not found)`);
  }

  globalContext = createTestContext(clients, schemas, defaultSchemaId);
  return globalContext;
}

/**
 * Initialize the global test context synchronously (for backward compatibility)
 * Note: This does not load schemas - use initializeTestContext for full functionality
 */
export function initializeTestContextSync(config: TestConfig): TestContext {
  const clients = createKratosClients(config);
  globalContext = createTestContext(clients, [], "default");
  return globalContext;
}

/**
 * Clear the global test context (for testing)
 */
export function clearTestContext(): void {
  globalContext = null;
}
