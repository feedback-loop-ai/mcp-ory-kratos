/**
 * Test Setup File
 *
 * This file runs before each test file in the same process,
 * allowing us to initialize the test context with schema discovery.
 * This is separate from global-setup.ts which runs in a separate process
 * and handles pre-flight validation (connectivity, auth, version).
 */

import { beforeAll, expect } from "vitest";
import { loadConfig } from "./config";
import { initializeTestContext } from "./context";

let initialized = false;

/**
 * Initialize the test context once before any tests run
 *
 * Skipped for unit tests (tests/unit/), which are self-contained and must run
 * without a live Kratos instance.
 */
beforeAll(async () => {
  if (initialized) {
    return;
  }

  const testPath = expect.getState().testPath?.replace(/\\/g, "/");
  if (testPath?.includes("/tests/unit/")) {
    return;
  }

  // Load config and initialize context with schema discovery
  const config = loadConfig();
  await initializeTestContext(config);
  initialized = true;
});
