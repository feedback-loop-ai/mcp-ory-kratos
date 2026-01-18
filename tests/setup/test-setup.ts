/**
 * Test Setup File
 *
 * This file runs before each test file in the same process,
 * allowing us to initialize the test context with schema discovery.
 * This is separate from global-setup.ts which runs in a separate process
 * and handles pre-flight validation (connectivity, auth, version).
 */

import { beforeAll } from "vitest";
import { loadConfig } from "./config";
import { initializeTestContext } from "./context";

let initialized = false;

/**
 * Initialize the test context once before any tests run
 */
beforeAll(async () => {
  if (initialized) {
    return;
  }

  // Load config and initialize context with schema discovery
  const config = loadConfig();
  await initializeTestContext(config);
  initialized = true;
});
