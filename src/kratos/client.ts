/**
 * Kratos API client factory
 *
 * Creates configured instances of Kratos API clients with authentication
 * @module kratos/client
 */

import { Configuration, CourierApi, IdentityApi, MetadataApi } from "@ory/kratos-client";
import type { Config } from "../config.js";

/**
 * Normalize the Kratos admin URL by removing trailing slashes
 */
function normalizeUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

/**
 * Build auth headers from config
 */
function buildAuthHeaders(config: Config): Record<string, string> {
  const headers: Record<string, string> = {};

  switch (config.auth.type) {
    case "api-key":
      headers.Authorization = `Bearer ${config.auth.key}`;
      break;
    case "custom-headers":
      Object.assign(headers, config.auth.headers);
      break;
    case "none":
      break;
  }

  return headers;
}

/**
 * Simple HTTP client for direct Kratos API calls
 * Used for endpoints where the SDK path doesn't match the proxy path
 */
export interface KratosHttpClient {
  /** Base URL for direct API calls (e.g., http://localhost:3000/ory/kratos/admin) */
  baseUrl: string;
  /** Make a GET request to the Kratos API */
  get: <T = unknown>(path: string) => Promise<T>;
}

/**
 * Container for all Kratos API clients
 */
export interface KratosClients {
  /** SDK client for identity operations */
  identity: IdentityApi;
  /** SDK client for courier/messaging operations */
  courier: CourierApi;
  /** SDK client for metadata operations (note: paths may not work with all proxies) */
  metadata: MetadataApi;
  /** Direct HTTP client for endpoints where SDK paths don't match proxy */
  http: KratosHttpClient;
}

/**
 * Create configured Kratos API clients based on configuration
 */
export function createKratosClients(config: Config): KratosClients {
  const headers = buildAuthHeaders(config);
  const adminUrl = normalizeUrl(config.kratosAdminUrl);

  // The Ory Kratos SDK internally appends /admin/... paths to the basePath.
  // If the configured URL already ends with /admin, we need to strip it to avoid
  // double /admin paths (e.g., /ory/kratos/admin/admin/sessions).
  const sdkBasePath = adminUrl.replace(/\/admin$/, "");

  const configuration = new Configuration({
    basePath: sdkBasePath,
    baseOptions: {
      headers,
      timeout: config.timeoutMs,
    },
  });

  // Direct HTTP client for endpoints where SDK paths don't match
  const http: KratosHttpClient = {
    baseUrl: adminUrl,
    get: async <T = unknown>(path: string): Promise<T> => {
      const url = `${adminUrl}${path.startsWith("/") ? path : `/${path}`}`;
      const response = await fetch(url, {
        method: "GET",
        headers,
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json() as Promise<T>;
    },
  };

  return {
    identity: new IdentityApi(configuration),
    courier: new CourierApi(configuration),
    metadata: new MetadataApi(configuration),
    http,
  };
}
