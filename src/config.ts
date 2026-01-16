/**
 * Configuration loading and validation for the Kratos MCP Server
 * @module config
 */

import { z } from "zod";

/**
 * Authentication configuration schema
 */
const AuthConfigSchema = z.discriminatedUnion("type", [
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
 * Complete configuration schema
 */
const ConfigSchema = z.object({
  kratosAdminUrl: z
    .string()
    .url("KRATOS_ADMIN_URL must be a valid URL")
    .describe("Kratos Admin API base URL"),
  auth: AuthConfigSchema.describe("Authentication configuration"),
  logLevel: z
    .enum(["trace", "debug", "info", "warn", "error"])
    .default("info")
    .describe("Minimum log level"),
  timeoutMs: z
    .number()
    .int()
    .min(1000)
    .max(300000)
    .default(30000)
    .describe("Request timeout in milliseconds"),
});

export type Config = z.infer<typeof ConfigSchema>;
export type AuthConfig = z.infer<typeof AuthConfigSchema>;

/**
 * Load and validate configuration from environment variables
 * @throws {z.ZodError} If configuration is invalid
 */
export function loadConfig(): Config {
  const kratosAdminUrl = process.env.KRATOS_ADMIN_URL;
  if (!kratosAdminUrl) {
    throw new Error("KRATOS_ADMIN_URL environment variable is required");
  }

  const authType = process.env.KRATOS_AUTH_TYPE ?? "none";
  let auth: AuthConfig;

  switch (authType) {
    case "none":
      auth = { type: "none" };
      break;
    case "api-key": {
      const key = process.env.KRATOS_API_KEY;
      if (!key) {
        throw new Error("KRATOS_API_KEY is required when KRATOS_AUTH_TYPE is api-key");
      }
      auth = { type: "api-key", key };
      break;
    }
    case "custom-headers": {
      const headersJson = process.env.KRATOS_CUSTOM_HEADERS;
      if (!headersJson) {
        throw new Error(
          "KRATOS_CUSTOM_HEADERS is required when KRATOS_AUTH_TYPE is custom-headers",
        );
      }
      try {
        const headers = JSON.parse(headersJson) as Record<string, string>;
        auth = { type: "custom-headers", headers };
      } catch {
        throw new Error("KRATOS_CUSTOM_HEADERS must be valid JSON");
      }
      break;
    }
    default:
      throw new Error(
        `Invalid KRATOS_AUTH_TYPE: ${authType}. Must be none, api-key, or custom-headers`,
      );
  }

  const logLevel = process.env.LOG_LEVEL ?? "info";
  const timeoutMs = process.env.KRATOS_TIMEOUT_MS
    ? Number.parseInt(process.env.KRATOS_TIMEOUT_MS, 10)
    : 30000;

  const config = ConfigSchema.parse({
    kratosAdminUrl,
    auth,
    logLevel,
    timeoutMs,
  });

  return config;
}
