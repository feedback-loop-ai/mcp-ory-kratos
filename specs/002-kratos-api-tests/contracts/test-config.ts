/**
 * Test Configuration Contract
 *
 * Defines the configuration schema for the Kratos API compatibility test suite.
 * This schema validates environment variables and provides type-safe configuration.
 *
 * @module contracts/test-config
 */

import { z } from "zod";

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
  /**
   * Target Kratos Admin API endpoint
   * @example "http://localhost:4434"
   */
  kratosAdminUrl: z.string().url("KRATOS_ADMIN_URL must be a valid URL"),

  /**
   * Authentication configuration
   */
  auth: TestAuthConfigSchema,

  /**
   * Expected Kratos version (strict match required)
   * Tests fail immediately if target version doesn't match
   * @example "v1.3.0"
   */
  expectedVersion: z.string().min(1, "Expected version is required"),

  /**
   * Request timeout in milliseconds
   * @default 30000
   */
  timeoutMs: z.number().int().min(1000).max(300000).default(30000),

  /**
   * Optional schema ID for test data generation
   * If not specified, uses the first available schema from Kratos
   */
  testSchemaId: z.string().optional(),
});

export type TestConfig = z.infer<typeof TestConfigSchema>;
export type TestAuthConfig = z.infer<typeof TestAuthConfigSchema>;

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
