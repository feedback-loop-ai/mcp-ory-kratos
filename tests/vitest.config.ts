import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    root: "./tests",
    include: ["**/*.test.ts"],
    globals: true,
    environment: "node",
    globalSetup: "./setup/global-setup.ts",
    setupFiles: ["./setup/test-setup.ts"],
    testTimeout: 30000,
    hookTimeout: 60000,
    bail: 1,
    reporters: ["verbose", "./setup/compatibility-reporter.ts"],
    sequence: {
      shuffle: false,
    },
    passWithNoTests: false,
    outputFile: {
      json: "./test-results.json",
    },
  },
});
