/**
 * MCP Resource Schemas - Ory Kratos MCP Server
 *
 * Zod schemas for all MCP resources. Resources provide read-only
 * data access for identity schemas and configuration.
 *
 * @module contracts/resources
 */

import { z } from "zod";

// =============================================================================
// Schema Resources
// =============================================================================

/** Schema list item */
export const SchemaListItemSchema = z.object({
  id: z.string().describe("Schema identifier"),
  url: z.string().url().optional().describe("URL to schema definition"),
});

/** List of all identity schemas */
export const SchemasResourceSchema = z.object({
  schemas: z.array(SchemaListItemSchema),
});

/** Single identity schema definition */
export const SchemaResourceSchema = z.object({
  $id: z.string().optional().describe("Schema URI"),
  $schema: z.string().optional().describe("JSON Schema version"),
  title: z.string().optional().describe("Human-readable title"),
  type: z.literal("object"),
  properties: z.record(z.unknown()).describe("Schema properties"),
  required: z.array(z.string()).optional().describe("Required properties"),
});

// =============================================================================
// Configuration Resources
// =============================================================================

/** Connection configuration (non-sensitive) */
export const ConnectionConfigResourceSchema = z.object({
  baseUrl: z.string().url().describe("Kratos Admin API base URL"),
  authType: z.enum(["none", "api_key", "custom_headers"]).describe("Authentication type"),
  timeoutMs: z.number().int().describe("Request timeout in milliseconds"),
  connected: z.boolean().describe("Connection status"),
  kratosVersion: z.string().optional().describe("Kratos server version"),
});

// =============================================================================
// Resource Discovery
// =============================================================================

/** MCP resource descriptor */
export const ResourceDescriptorSchema = z.object({
  uri: z.string().describe("Resource URI"),
  name: z.string().describe("Human-readable name"),
  description: z.string().describe("Resource description"),
  mimeType: z.string().describe("Content MIME type"),
  uriTemplate: z.boolean().optional().describe("Whether URI contains template params"),
});

/** Resource list response */
export const ResourceListSchema = z.object({
  resources: z.array(ResourceDescriptorSchema),
});

// =============================================================================
// Resource URIs (Constants)
// =============================================================================

export const RESOURCE_URIS = {
  /** List all identity schemas */
  SCHEMAS: "kratos://schemas",
  /** Get specific schema by ID (template) */
  SCHEMA: "kratos://schemas/{schema_id}",
  /** Get connection configuration */
  CONNECTION_CONFIG: "kratos://config/connection",
} as const;

// =============================================================================
// Type Exports
// =============================================================================

export type SchemaListItem = z.infer<typeof SchemaListItemSchema>;
export type SchemasResource = z.infer<typeof SchemasResourceSchema>;
export type SchemaResource = z.infer<typeof SchemaResourceSchema>;
export type ConnectionConfigResource = z.infer<typeof ConnectionConfigResourceSchema>;
export type ResourceDescriptor = z.infer<typeof ResourceDescriptorSchema>;
export type ResourceList = z.infer<typeof ResourceListSchema>;
