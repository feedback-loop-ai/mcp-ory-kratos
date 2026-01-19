/**
 * Bun build configuration for npm distribution
 *
 * Produces a single JavaScript bundle that runs on both Node.js 18+ and Bun 1.x
 */
import { readFile, writeFile } from "node:fs/promises";

const result = await Bun.build({
  entrypoints: ["./src/index.ts"],
  outdir: "./dist",
  target: "node",
  format: "esm",
  packages: "external",
  minify: false,
});

if (!result.success) {
  console.error("Build failed:");
  for (const log of result.logs) {
    console.error(log);
  }
  process.exit(1);
}

// Post-process: Add Node.js shebang to built output
// Bun preserves the source shebang (#!/usr/bin/env bun), so we replace it
const outputPath = "./dist/index.js";
let content = await readFile(outputPath, "utf-8");

// Remove any existing shebangs and Bun-specific comments at the start
content = content.replace(/^(#!.*\n|\/\/ @bun\n)+/, "");

// Add Node.js-compatible shebang
content = `#!/usr/bin/env node\n${content}`;

await writeFile(outputPath, content);

console.log("Build successful: dist/index.js");
