/**
 * Global Test Setup
 *
 * Validates connectivity, authentication, and version before any tests run.
 * Implements fail-fast behavior per FR-015, FR-016, and FR-003.
 */

import { loadConfig, type TestConfig } from "./config";
import {
  AuthenticationError,
  ConnectionError,
  isAxiosError,
  VersionMismatchError,
} from "./errors";
import {
  createKratosClients,
  type TestKratosClients,
} from "./context";

/**
 * Load .env.test.local file if it exists
 */
async function loadEnvFile(): Promise<void> {
  try {
    // Use dynamic import with top-level await for Bun's dotenv loading
    const fs = await import("node:fs");
    const path = await import("node:path");

    const envPath = path.resolve(process.cwd(), ".env.test.local");

    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf-8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("#")) {
          const [key, ...valueParts] = trimmed.split("=");
          if (key && valueParts.length > 0) {
            const value = valueParts.join("=").trim();
            // Remove surrounding quotes if present
            const unquoted = value.replace(/^["']|["']$/g, "");
            process.env[key.trim()] = unquoted;
          }
        }
      }
      console.log(`  Loaded test configuration from ${envPath}`);
    }
  } catch {
    // Ignore env loading errors - we'll catch missing config later
  }
}

/**
 * Test connectivity to the Kratos instance
 */
async function testConnectivity(
  config: TestConfig,
  clients: TestKratosClients
): Promise<void> {
  console.log(`  Testing connectivity to ${config.kratosAdminUrl}...`);

  try {
    const response = await clients.metadata.isAlive();

    if (response.data.status !== "ok") {
      throw new ConnectionError(
        config.kratosAdminUrl,
        new Error(`Unexpected status: ${response.data.status}`)
      );
    }

    console.log("  Connection successful");
  } catch (error) {
    if (error instanceof ConnectionError) {
      throw error;
    }

    if (isAxiosError(error)) {
      const status = error.response?.status;
      if (status === 401 || status === 403) {
        throw new AuthenticationError(status);
      }
      if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
        throw new ConnectionError(config.kratosAdminUrl, error as Error);
      }
    }

    throw new ConnectionError(config.kratosAdminUrl, error as Error);
  }
}

/**
 * Validate authentication by making an authenticated request
 */
async function testAuthentication(
  config: TestConfig,
  clients: TestKratosClients
): Promise<void> {
  console.log("  Testing authentication...");

  try {
    // Try to list identities with a small page size to test auth
    await clients.identity.listIdentities({ pageSize: 1 });
    console.log("  Authentication successful");
  } catch (error) {
    if (isAxiosError(error)) {
      const status = error.response?.status;
      if (status === 401 || status === 403) {
        throw new AuthenticationError(status);
      }
    }
    throw error;
  }
}

/**
 * Validate Kratos version matches expected
 */
async function testVersion(
  config: TestConfig,
  clients: TestKratosClients
): Promise<void> {
  console.log(`  Checking Kratos version (expected: ${config.expectedVersion})...`);

  try {
    const response = await clients.metadata.getVersion();
    const actualVersion = response.data.version;

    if (actualVersion !== config.expectedVersion) {
      throw new VersionMismatchError(config.expectedVersion, actualVersion);
    }

    console.log(`  Version match: ${actualVersion}`);
  } catch (error) {
    if (error instanceof VersionMismatchError) {
      throw error;
    }

    if (isAxiosError(error)) {
      const status = error.response?.status;
      if (status === 401 || status === 403) {
        throw new AuthenticationError(status);
      }
    }

    throw error;
  }
}

/**
 * Format error message for display
 */
function formatError(error: unknown): string {
  if (error instanceof Error) {
    const setupError = error as {
      code?: string;
      suggestion?: string;
    };

    let message = `\n  ERROR: ${error.message}`;

    if (setupError.code) {
      message += `\n  Code: ${setupError.code}`;
    }

    if (setupError.suggestion) {
      message += `\n  Suggestion: ${setupError.suggestion}`;
    }

    return message;
  }

  return `\n  ERROR: ${String(error)}`;
}

/**
 * Detect a unit-test-only invocation (e.g. `vitest run --dir tests/unit`).
 *
 * Unit tests are self-contained and must run without a live Kratos instance
 * (CI runs them this way), so the pre-flight validation is skipped.
 */
function isUnitTestOnlyRun(): boolean {
  const argv = process.argv;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--dir" && argv[i + 1]?.replace(/\\/g, "/").includes("tests/unit")) {
      return true;
    }
    if (argv[i]?.startsWith("--dir=") && argv[i].replace(/\\/g, "/").includes("tests/unit")) {
      return true;
    }
  }
  return false;
}

/**
 * Global setup function called by Vitest before all tests
 */
export async function setup(): Promise<void> {
  if (isUnitTestOnlyRun()) {
    console.log("\n--- Unit Test Run - Skipping Kratos Pre-flight Validation ---\n");
    return;
  }

  console.log("\n--- Kratos API Test Suite Setup ---\n");

  try {
    // Step 1: Load environment file
    await loadEnvFile();

    // Step 2: Load and validate configuration
    console.log("  Loading configuration...");
    const config = loadConfig();
    console.log("  Configuration valid");

    // Step 3: Create Kratos clients (for initial validation)
    const clients = createKratosClients(config);

    // Step 4: Test connectivity (fail-fast on network error)
    await testConnectivity(config, clients);

    // Step 5: Test authentication (fail-fast on 401/403)
    await testAuthentication(config, clients);

    // Step 6: Validate version (fail-fast on mismatch)
    await testVersion(config, clients);

    // Note: Test context initialization (including schema discovery) is handled
    // by test-setup.ts which runs in the same process as test files

    console.log("\n--- Setup Complete - Running Tests ---\n");
  } catch (error) {
    console.error(formatError(error));
    console.error("\n--- Setup Failed - Aborting Tests ---\n");

    // Re-throw to fail the test suite
    throw error;
  }
}

/**
 * Global teardown function called by Vitest after all tests
 */
export async function teardown(): Promise<void> {
  console.log("\n--- Test Suite Complete ---\n");
}
