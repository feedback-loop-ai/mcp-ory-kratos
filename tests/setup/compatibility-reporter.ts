/**
 * Compatibility Reporter
 *
 * Custom Vitest reporter that displays API compatibility percentage
 * and provides a clear summary of test results.
 */

import type { RunnerTestFile as File, RunnerTaskResultPack as TaskResultPack } from "vitest";
import type { Reporter } from "vitest/node";

interface TestSummary {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
}

interface SuiteSummary {
  [suiteName: string]: TestSummary;
}

export default class CompatibilityReporter implements Reporter {
  private suites: SuiteSummary = {};
  private startTime: number = 0;

  onInit(): void {
    this.startTime = Date.now();
    this.suites = {};
  }

  onCollected(files?: File[]): void {
    // Initialize suite tracking
    if (files) {
      for (const file of files) {
        const suiteName = this.extractSuiteName(file.name);
        if (!this.suites[suiteName]) {
          this.suites[suiteName] = { total: 0, passed: 0, failed: 0, skipped: 0 };
        }
      }
    }
  }

  onTaskUpdate(packs: TaskResultPack[]): void {
    for (const [id, result, _meta] of packs) {
      if (!result) continue;

      // Extract suite name from the task
      const suiteName = this.extractSuiteNameFromId(id);
      if (!this.suites[suiteName]) {
        this.suites[suiteName] = { total: 0, passed: 0, failed: 0, skipped: 0 };
      }

      const suite = this.suites[suiteName];
      suite.total++;

      switch (result.state) {
        case "pass":
          suite.passed++;
          break;
        case "fail":
          suite.failed++;
          break;
        case "skip":
          suite.skipped++;
          break;
      }
    }
  }

  onFinished(_files?: File[], errors?: unknown[]): void {
    const duration = Date.now() - this.startTime;
    this.printSummary(duration, errors);
  }

  private extractSuiteName(filePath: string): string {
    // Extract API name from file path (e.g., "api/identity.test.ts" -> "Identity")
    const match = filePath.match(/api\/(\w+)\.test\.ts$/);
    if (match) {
      return match[1].charAt(0).toUpperCase() + match[1].slice(1);
    }
    return "Other";
  }

  private extractSuiteNameFromId(id: string): string {
    // Task IDs contain file path info
    const match = id.match(/api\/(\w+)\.test\.ts/);
    if (match) {
      return match[1].charAt(0).toUpperCase() + match[1].slice(1);
    }
    return "Other";
  }

  private printSummary(durationMs: number, errors?: unknown[]): void {
    console.log("\n");
    console.log("═".repeat(70));
    console.log("  KRATOS API COMPATIBILITY TEST RESULTS");
    console.log("═".repeat(70));
    console.log("");

    // Calculate totals
    let totalTests = 0;
    let totalPassed = 0;
    let totalFailed = 0;
    let totalSkipped = 0;

    // Print per-suite summary
    console.log("  API Coverage by Domain:");
    console.log("  " + "─".repeat(66));
    console.log(
      "  " +
        "Suite".padEnd(15) +
        "Total".padStart(8) +
        "Passed".padStart(10) +
        "Failed".padStart(10) +
        "Skipped".padStart(10) +
        "Status".padStart(10),
    );
    console.log("  " + "─".repeat(66));

    for (const [suite, summary] of Object.entries(this.suites)) {
      totalTests += summary.total;
      totalPassed += summary.passed;
      totalFailed += summary.failed;
      totalSkipped += summary.skipped;

      const status = summary.failed === 0 ? "✓ PASS" : "✗ FAIL";
      console.log(
        "  " +
          suite.padEnd(15) +
          String(summary.total).padStart(8) +
          String(summary.passed).padStart(10) +
          String(summary.failed).padStart(10) +
          String(summary.skipped).padStart(10) +
          status.padStart(10),
      );
    }

    console.log("  " + "─".repeat(66));

    // Calculate compatibility percentage
    const effectiveTests = totalTests - totalSkipped;
    const compatibilityPercent =
      effectiveTests > 0 ? ((totalPassed / effectiveTests) * 100).toFixed(1) : "N/A";

    // Print totals
    console.log("");
    console.log("  Summary:");
    console.log(`    Total Tests:    ${totalTests}`);
    console.log(`    Passed:         ${totalPassed}`);
    console.log(`    Failed:         ${totalFailed}`);
    console.log(`    Skipped:        ${totalSkipped}`);
    console.log("");
    console.log(`    Duration:       ${(durationMs / 1000).toFixed(2)}s`);
    console.log("");

    // Print compatibility percentage
    if (totalFailed === 0 && effectiveTests > 0) {
      console.log(`  ╔${"═".repeat(48)}╗`);
      console.log(`  ║  API COMPATIBILITY: ${compatibilityPercent}%`.padEnd(50) + "║");
      console.log(`  ╚${"═".repeat(48)}╝`);
    } else if (effectiveTests > 0) {
      console.log(`  ╔${"═".repeat(48)}╗`);
      console.log(`  ║  API COMPATIBILITY: ${compatibilityPercent}% (INCOMPLETE)`.padEnd(50) + "║");
      console.log(`  ╚${"═".repeat(48)}╝`);
    }

    console.log("");

    // Print errors if any
    if (errors && errors.length > 0) {
      console.log("  Errors:");
      for (const error of errors) {
        console.log(`    - ${error}`);
      }
      console.log("");
    }

    console.log("═".repeat(70));
    console.log("");
  }
}
