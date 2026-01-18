/**
 * Test Error Classes
 *
 * Custom error types for test suite failure scenarios.
 * Based on contracts/test-errors.ts
 */

/**
 * Base class for test setup errors
 */
export class TestSetupError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly suggestion?: string
  ) {
    super(message);
    this.name = "TestSetupError";
  }
}

/**
 * Thrown when test configuration is invalid or missing
 */
export class ConfigurationError extends TestSetupError {
  constructor(message: string, suggestion?: string) {
    super(message, "CONFIGURATION_ERROR", suggestion);
    this.name = "ConfigurationError";
  }
}

/**
 * Thrown when Kratos endpoint is unreachable
 * Triggers fail-fast behavior per FR-015
 */
export class ConnectionError extends TestSetupError {
  constructor(url: string, cause?: Error) {
    super(
      `Cannot connect to Kratos at ${url}`,
      "CONNECTION_ERROR",
      "Verify the KRATOS_ADMIN_URL is correct and the server is running"
    );
    this.name = "ConnectionError";
    this.cause = cause;
  }
}

/**
 * Thrown when authentication fails (401/403)
 * Triggers fail-fast behavior per FR-016
 */
export class AuthenticationError extends TestSetupError {
  constructor(statusCode: number) {
    super(
      `Authentication failed with status ${statusCode}`,
      "AUTHENTICATION_ERROR",
      "Verify your authentication credentials (KRATOS_AUTH_TYPE, KRATOS_API_KEY, or KRATOS_CUSTOM_HEADERS)"
    );
    this.name = "AuthenticationError";
  }
}

/**
 * Thrown when Kratos version doesn't match expected version
 * Triggers fail-fast behavior per FR-003
 */
export class VersionMismatchError extends TestSetupError {
  constructor(
    public readonly expected: string,
    public readonly actual: string
  ) {
    super(
      `Kratos version mismatch: expected ${expected}, got ${actual}`,
      "VERSION_MISMATCH",
      "Update KRATOS_EXPECTED_VERSION or use a compatible Kratos instance"
    );
    this.name = "VersionMismatchError";
  }
}

/**
 * Type guard to check if error is an Axios error with response
 */
export function isAxiosError(error: unknown): error is {
  response?: { status: number; data?: unknown };
  code?: string;
} {
  return (
    typeof error === "object" &&
    error !== null &&
    ("response" in error || "code" in error)
  );
}
