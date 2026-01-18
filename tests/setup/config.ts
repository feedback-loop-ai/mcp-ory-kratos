/**
 * Test Configuration
 *
 * Loads and validates test configuration from environment variables.
 * Based on contracts/test-config.ts
 */

import { z } from "zod";
import { ConfigurationError } from "./errors";

/**
 * Environment variable names
 */
export const ENV_VARS = {
  KRATOS_ADMIN_URL: "KRATOS_ADMIN_URL",
  KRATOS_AUTH_TYPE: "KRATOS_AUTH_TYPE",
  KRATOS_API_KEY: "KRATOS_API_KEY",
  KRATOS_CUSTOM_HEADERS: "KRATOS_CUSTOM_HEADERS",
  KRATOS_EXPECTED_VERSION: "KRATOS_EXPECTED_VERSION",
  KRATOS_TIMEOUT_MS: "KRATOS_TIMEOUT_MS",
  KRATOS_TEST_SCHEMA_ID: "KRATOS_TEST_SCHEMA_ID",
} as const;

/**
 * Authentication configuration for tests
 */
export const TestAuthConfigSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("none") }),
  z.object({
    type: z.literal("api-key"),
    key: z.string().min(1, "API key is required"),
  }),
  z.object({
    type: z.literal("custom-headers"),
    headers: z.record(z.string()),
  }),
]);

/**
 * Complete test configuration schema
 */
export const TestConfigSchema = z.object({
  kratosAdminUrl: z.string().url("KRATOS_ADMIN_URL must be a valid URL"),
  auth: TestAuthConfigSchema,
  expectedVersion: z.string().min(1, "Expected version is required"),
  timeoutMs: z.number().int().min(1000).max(300000).default(30000),
  testSchemaId: z.string().optional(),
});

export type TestConfig = z.infer<typeof TestConfigSchema>;
export type TestAuthConfig = z.infer<typeof TestAuthConfigSchema>;

/**
 * Parse authentication configuration from environment variables
 */
function parseAuthConfig(): TestAuthConfig {
  const authType = process.env[ENV_VARS.KRATOS_AUTH_TYPE] || "none";

  switch (authType) {
    case "none":
      return { type: "none" };

    case "api-key": {
      const key = process.env[ENV_VARS.KRATOS_API_KEY];
      if (!key) {
        throw new ConfigurationError(
          `${ENV_VARS.KRATOS_API_KEY} is required when auth type is "api-key"`,
          `Set ${ENV_VARS.KRATOS_API_KEY} in your .env.test.local file`
        );
      }
      return { type: "api-key", key };
    }

    case "custom-headers": {
      const headersJson = process.env[ENV_VARS.KRATOS_CUSTOM_HEADERS];
      if (!headersJson) {
        throw new ConfigurationError(
          `${ENV_VARS.KRATOS_CUSTOM_HEADERS} is required when auth type is "custom-headers"`,
          `Set ${ENV_VARS.KRATOS_CUSTOM_HEADERS} as JSON in your .env.test.local file`
        );
      }
      try {
        const headers = JSON.parse(headersJson);
        return { type: "custom-headers", headers };
      } catch {
        throw new ConfigurationError(
          `${ENV_VARS.KRATOS_CUSTOM_HEADERS} must be valid JSON`,
          `Example: ${ENV_VARS.KRATOS_CUSTOM_HEADERS}='{"X-Custom-Header": "value"}'`
        );
      }
    }

    default:
      throw new ConfigurationError(
        `Invalid auth type: ${authType}`,
        `Valid options are: none, api-key, custom-headers`
      );
  }
}

/**
 * Load and validate test configuration from environment variables
 */
export function loadConfig(): TestConfig {
  const kratosAdminUrl = process.env[ENV_VARS.KRATOS_ADMIN_URL];
  if (!kratosAdminUrl) {
    throw new ConfigurationError(
      `${ENV_VARS.KRATOS_ADMIN_URL} is required`,
      `Set ${ENV_VARS.KRATOS_ADMIN_URL} in your .env.test.local file (e.g., http://localhost:4434)`
    );
  }

  const expectedVersion = process.env[ENV_VARS.KRATOS_EXPECTED_VERSION];
  if (!expectedVersion) {
    throw new ConfigurationError(
      `${ENV_VARS.KRATOS_EXPECTED_VERSION} is required`,
      `Set ${ENV_VARS.KRATOS_EXPECTED_VERSION} in your .env.test.local file (e.g., v1.3.0)`
    );
  }

  const timeoutStr = process.env[ENV_VARS.KRATOS_TIMEOUT_MS];
  const timeoutMs = timeoutStr ? Number.parseInt(timeoutStr, 10) : 30000;

  if (timeoutStr && Number.isNaN(timeoutMs)) {
    throw new ConfigurationError(
      `${ENV_VARS.KRATOS_TIMEOUT_MS} must be a valid number`,
      `Example: ${ENV_VARS.KRATOS_TIMEOUT_MS}=30000`
    );
  }

  // Optional: specify which schema to use for test data generation
  const testSchemaId = process.env[ENV_VARS.KRATOS_TEST_SCHEMA_ID] || undefined;

  const rawConfig = {
    kratosAdminUrl,
    auth: parseAuthConfig(),
    expectedVersion,
    timeoutMs,
    testSchemaId,
  };

  const result = TestConfigSchema.safeParse(rawConfig);
  if (!result.success) {
    const errors = result.error.errors
      .map((e) => `${e.path.join(".")}: ${e.message}`)
      .join("; ");
    throw new ConfigurationError(
      `Invalid test configuration: ${errors}`,
      "Review your .env.test.local file"
    );
  }

  return result.data;
}

/**
 * Get authentication headers based on config
 */
export function getAuthHeaders(config: TestConfig): Record<string, string> {
  switch (config.auth.type) {
    case "none":
      return {};
    case "api-key":
      return { Authorization: `Bearer ${config.auth.key}` };
    case "custom-headers":
      return config.auth.headers;
  }
}

let cachedConfig: TestConfig | null = null;

/**
 * Get or load the test configuration (cached)
 */
export function getConfig(): TestConfig {
  if (!cachedConfig) {
    cachedConfig = loadConfig();
  }
  return cachedConfig;
}

/**
 * Clear cached config (useful for testing)
 */
export function clearConfigCache(): void {
  cachedConfig = null;
}
