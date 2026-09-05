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

export const TOOLSETS = [
  "identities",
  "sessions",
  "courier",
  "recovery",
  "health",
  "analytics",
] as const;
export const ToolsetSchema = z.enum(TOOLSETS);
export type Toolset = z.infer<typeof ToolsetSchema>;

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
  toolsets: z
    .array(ToolsetSchema)
    .default([...TOOLSETS])
    .describe("Enabled toolsets (KRATOS_TOOLSETS, comma-separated or 'all')"),
  readOnly: z.boolean().default(false).describe("Expose only read-only tools (KRATOS_READ_ONLY=1)"),
  confirmDestructive: z
    .boolean()
    .default(true)
    .describe(
      "Ask the client to confirm destructive tools via elicitation (KRATOS_CONFIRM_DESTRUCTIVE=0 to disable)",
    ),
  allowCredentialExposure: z
    .boolean()
    .default(false)
    .describe(
      "Allow tools to return raw credential config (password hashes, OIDC tokens, TOTP secrets). Off by default; KRATOS_ALLOW_CREDENTIAL_EXPOSURE=1 to enable",
    ),
  maxScanPages: z
    .number()
    .int()
    .min(1)
    .max(1000)
    .default(20)
    .describe("Default page cap for tools that scan across many pages (KRATOS_MAX_SCAN_PAGES)"),
});

export type Config = z.infer<typeof ConfigSchema>;
export type AuthConfig = z.infer<typeof AuthConfigSchema>;

const BOOL_TRUE = new Set(["1", "true", "yes", "on"]);

function parseBool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === "") return fallback;
  return BOOL_TRUE.has(value.trim().toLowerCase());
}

function parseToolsets(value: string | undefined): Toolset[] {
  if (!value || value.trim() === "" || value.trim().toLowerCase() === "all") {
    return [...TOOLSETS];
  }
  const parsed = z.array(ToolsetSchema).safeParse(
    value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
  if (!parsed.success) {
    throw new Error(`Invalid KRATOS_TOOLSETS: ${value}. Valid values: ${TOOLSETS.join(", ")}, all`);
  }
  return parsed.data;
}

function parseAuth(env: NodeJS.ProcessEnv): AuthConfig {
  const authType = env.KRATOS_AUTH_TYPE ?? "none";
  switch (authType) {
    case "none":
      return { type: "none" };
    case "api-key": {
      const key = env.KRATOS_API_KEY;
      if (!key) {
        throw new Error("KRATOS_API_KEY is required when KRATOS_AUTH_TYPE is api-key");
      }
      return { type: "api-key", key };
    }
    case "custom-headers": {
      const headersJson = env.KRATOS_CUSTOM_HEADERS;
      if (!headersJson) {
        throw new Error(
          "KRATOS_CUSTOM_HEADERS is required when KRATOS_AUTH_TYPE is custom-headers",
        );
      }
      let raw: unknown;
      try {
        raw = JSON.parse(headersJson);
      } catch {
        throw new Error("KRATOS_CUSTOM_HEADERS must be valid JSON");
      }
      const headers = z.record(z.string()).safeParse(raw);
      if (!headers.success) {
        throw new Error("KRATOS_CUSTOM_HEADERS must be a JSON object of string values");
      }
      return { type: "custom-headers", headers: headers.data };
    }
    default:
      throw new Error(
        `Invalid KRATOS_AUTH_TYPE: ${authType}. Must be none, api-key, or custom-headers`,
      );
  }
}

/**
 * Load and validate configuration from environment variables
 * @throws {Error|z.ZodError} If configuration is invalid
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const kratosAdminUrl = env.KRATOS_ADMIN_URL;
  if (!kratosAdminUrl) {
    throw new Error("KRATOS_ADMIN_URL environment variable is required");
  }

  return ConfigSchema.parse({
    kratosAdminUrl,
    auth: parseAuth(env),
    logLevel: env.LOG_LEVEL ?? "info",
    timeoutMs: env.KRATOS_TIMEOUT_MS ? Number(env.KRATOS_TIMEOUT_MS) : undefined,
    toolsets: parseToolsets(env.KRATOS_TOOLSETS),
    readOnly: parseBool(env.KRATOS_READ_ONLY, false),
    confirmDestructive: parseBool(env.KRATOS_CONFIRM_DESTRUCTIVE, true),
    allowCredentialExposure: parseBool(env.KRATOS_ALLOW_CREDENTIAL_EXPOSURE, false),
    maxScanPages: env.KRATOS_MAX_SCAN_PAGES ? Number(env.KRATOS_MAX_SCAN_PAGES) : undefined,
  });
}
