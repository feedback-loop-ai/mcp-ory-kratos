import { defineConfig } from "vitest/config";

/**
 * Detect a unit-scoped invocation (the exact command CI uses):
 *   bun x vitest run --config tests/vitest.config.ts --dir tests/unit
 *
 * Unit tests are hermetic (no live Kratos), so Kratos-dependent global setup,
 * per-file setup, and integration-oriented reporters/timeouts are skipped.
 * Integration runs (`bun run test`, scoped to the whole tests/ tree) keep the
 * full pre-flight validation behavior.
 */
const dirFlagIndex = process.argv.indexOf("--dir");
const dirFlagValue = dirFlagIndex === -1 ? "" : (process.argv[dirFlagIndex + 1] ?? "");
const isUnitRun = /(^|[\\/])tests[\\/]unit[\\/]?$/.test(dirFlagValue);

const integrationOnly = isUnitRun
  ? {}
  : {
      globalSetup: "./setup/global-setup.ts",
      // Integration tests share one Kratos (SQLite in CI is single-writer): run files serially
      fileParallelism: false,
      setupFiles: ["./setup/test-setup.ts"],
      testTimeout: 30000,
      hookTimeout: 60000,
      bail: 1,
      reporters: ["verbose", "./setup/compatibility-reporter.ts"],
      outputFile: {
        json: "./test-results.json",
      },
    };

export default defineConfig({
  test: {
    root: "./tests",
    include: ["**/*.test.ts"],
    globals: true,
    environment: "node",
    sequence: {
      shuffle: false,
    },
    passWithNoTests: false,
    coverage: {
      provider: "v8",
      enabled: false,
      reporter: ["text", "json-summary"],
      reportsDirectory: "./coverage",
      // root is ./tests, so source globs must climb one level
      allowExternal: true,
      include: ["**/src/**/*.ts"],
      exclude: ["**/src/index.ts", "**/node_modules/**"],
      reportOnFailure: true,
      thresholds: { lines: 80, functions: 80, branches: 70, statements: 80 },
    },
    ...integrationOnly,
  },
});
