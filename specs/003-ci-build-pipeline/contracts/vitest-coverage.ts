/**
 * Contract: Vitest Coverage Configuration
 *
 * This defines the expected coverage configuration structure.
 * Implementation in tests/vitest.config.ts should match.
 *
 * Requirements Traced:
 * - FR-012: Report code coverage metrics (non-blocking, informational only)
 */

import type { CoverageV8Options } from "vitest/config";

/**
 * Coverage configuration contract for Vitest 4.x with V8 provider
 */
export const coverageConfigContract: CoverageV8Options = {
  // Use V8 provider (faster for Bun projects)
  provider: "v8",

  // Enable via CLI: --coverage.enabled
  // Do not enable by default to keep normal test runs fast
  enabled: false,

  // Reporters for CI
  // - text: Console output for logs
  // - json-summary: Machine-readable for Job Summary parsing
  reporter: ["text", "json-summary"],

  // Output directory (relative to vitest root)
  reportsDirectory: "./coverage",

  // Include only source files
  include: ["src/**/*.ts"],

  // Exclude non-source files
  exclude: [
    "**/*.d.ts",
    "**/index.ts", // Entry points
    "**/__mocks__/**",
    "**/tests/**",
    "**/test/**",
  ],

  // Generate reports even if tests fail (for CI visibility)
  reportOnFailure: true,

  // No thresholds - coverage is informational only per FR-012
  // thresholds: undefined,
};
