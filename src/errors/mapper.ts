/**
 * Error mapping from Kratos HTTP errors to MCP tool errors
 *
 * Provides structured, actionable error responses for AI agents
 * @module errors/mapper
 */

import type { McpToolError } from "../schemas/tools.js";

interface AxiosLikeError {
  response?: {
    status?: number;
    data?: {
      error?: {
        code?: number;
        message?: string;
        reason?: string;
      };
    };
  };
  message?: string;
  code?: string;
}

/**
 * Error suggestions keyed by HTTP status code
 */
const ERROR_SUGGESTIONS: Record<number, { code: string; suggestion: string }> = {
  400: {
    code: "BAD_REQUEST",
    suggestion: "Check the request parameters for validation errors or missing required fields",
  },
  401: {
    code: "UNAUTHORIZED",
    suggestion: "Verify KRATOS_API_KEY is set correctly or check authentication configuration",
  },
  403: {
    code: "FORBIDDEN",
    suggestion: "The API key may lack required permissions, or the endpoint requires admin access",
  },
  404: {
    code: "NOT_FOUND",
    suggestion: "Verify the ID is correct and the resource exists in Kratos",
  },
  409: {
    code: "CONFLICT",
    suggestion:
      "The resource may already exist or be in a conflicting state. Check for duplicate identifiers",
  },
  410: {
    code: "GONE",
    suggestion: "The resource has been permanently deleted and cannot be recovered",
  },
  422: {
    code: "UNPROCESSABLE_ENTITY",
    suggestion:
      "The request was well-formed but contained semantic errors. Check trait validation rules",
  },
  429: {
    code: "RATE_LIMITED",
    suggestion: "Too many requests. Wait before retrying or reduce request frequency",
  },
  500: {
    code: "INTERNAL_ERROR",
    suggestion: "Kratos server error. Check Kratos logs for details",
  },
  502: {
    code: "BAD_GATEWAY",
    suggestion: "Kratos may be unreachable. Check network connectivity and Kratos health",
  },
  503: {
    code: "SERVICE_UNAVAILABLE",
    suggestion: "Kratos is temporarily unavailable. Wait and retry",
  },
  504: {
    code: "GATEWAY_TIMEOUT",
    suggestion: "Request timed out. Check Kratos responsiveness or increase timeout",
  },
};

/**
 * Handle HTTP errors from Axios-like error objects
 */
function mapHttpError(error: AxiosLikeError, context?: string): McpToolError | undefined {
  const status = error.response?.status;
  const kratosError = error.response?.data?.error;

  if (!status) {
    return undefined;
  }

  const errorInfo = ERROR_SUGGESTIONS[status];
  if (errorInfo) {
    return {
      code: errorInfo.code,
      message: kratosError?.message ?? error.message ?? `HTTP ${status} error`,
      kratosStatus: status,
      kratosCode: kratosError?.reason,
      suggestion: context ? `${errorInfo.suggestion} (context: ${context})` : errorInfo.suggestion,
    };
  }

  return {
    code: "HTTP_ERROR",
    message: kratosError?.message ?? error.message ?? `HTTP ${status} error`,
    kratosStatus: status,
    kratosCode: kratosError?.reason,
    suggestion: "Check Kratos documentation for this status code",
  };
}

/**
 * Handle network errors (connection refused, timeout)
 */
function mapNetworkError(error: AxiosLikeError): McpToolError | undefined {
  if (error.code === "ECONNREFUSED") {
    return {
      code: "CONNECTION_REFUSED",
      message: "Cannot connect to Kratos server",
      suggestion:
        "Verify KRATOS_ADMIN_URL is correct and Kratos is running. Check firewall and network settings",
    };
  }

  if (error.code === "ETIMEDOUT" || error.code === "ECONNABORTED") {
    return {
      code: "TIMEOUT",
      message: "Request to Kratos timed out",
      suggestion: "Increase KRATOS_TIMEOUT_MS or check Kratos server load",
    };
  }

  return undefined;
}

/**
 * Map an error (typically from Axios/Kratos client) to an McpToolError
 */
export function mapError(error: unknown, context?: string): McpToolError {
  if (isAxiosLikeError(error)) {
    const httpError = mapHttpError(error, context);
    if (httpError) return httpError;

    const networkError = mapNetworkError(error);
    if (networkError) return networkError;
  }

  if (error instanceof Error) {
    return {
      code: "UNKNOWN_ERROR",
      message: error.message,
      suggestion: "Check the error message for details",
    };
  }

  return {
    code: "UNKNOWN_ERROR",
    message: String(error),
    suggestion: "An unexpected error occurred",
  };
}

/**
 * Type guard for Axios-like error objects
 */
function isAxiosLikeError(error: unknown): error is AxiosLikeError {
  return (
    typeof error === "object" &&
    error !== null &&
    ("response" in error || "code" in error || "message" in error)
  );
}

/**
 * Create a not found error for a specific resource type
 */
export function notFoundError(
  resourceType: "identity" | "session" | "message" | "schema",
  id: string,
): McpToolError {
  return {
    code: `${resourceType.toUpperCase()}_NOT_FOUND`,
    message: `${resourceType.charAt(0).toUpperCase() + resourceType.slice(1)} with ID '${id}' not found`,
    kratosStatus: 404,
    suggestion: `Verify the ${resourceType} ID is correct and exists in Kratos`,
  };
}

/**
 * Create a validation error
 */
export function validationError(message: string, field?: string): McpToolError {
  return {
    code: "VALIDATION_ERROR",
    message: field ? `Invalid ${field}: ${message}` : message,
    suggestion: "Check the input parameters and try again",
  };
}
