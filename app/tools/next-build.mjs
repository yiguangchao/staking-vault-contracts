#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const env = { ...process.env };

const args = ["build"];

// Windows builds can hit EPERM rename/unlink issues with Turbopack output.
// Force Webpack builds by default to keep local build checks reliable.
if (process.platform === "win32") {
  args.push("--webpack");
}

const isWindows = process.platform === "win32";
const maxAttempts = isWindows ? 3 : 1;

const require = createRequire(import.meta.url);
const nextBin = require.resolve("next/dist/bin/next");

for (let attempt = 1; attempt <= maxAttempts; attempt++) {
  // On Windows, Next can intermittently fail when overwriting build artifacts due to file locks.
  // Using a unique build directory per attempt avoids most unlink/rename failures.
  if (isWindows && !env.NEXT_BUILD_DIR) {
    env.NEXT_BUILD_DIR = `.next-ci-test-${Date.now()}-${attempt}`;
  }

  // Use the Node entrypoint for Next.js to avoid PATH/shell issues on Windows.
  const result = spawnSync(process.execPath, [nextBin, ...args], {
    stdio: "inherit",
    env,
  });

  if ((result.status ?? 1) === 0) {
    process.exit(0);
  }

  if (!isWindows || attempt === maxAttempts) {
    process.exit(result.status ?? 1);
  }

  // Reset build dir so the next attempt uses a fresh directory.
  delete env.NEXT_BUILD_DIR;
  console.error(`Next build failed on Windows (attempt ${attempt}/${maxAttempts}). Retrying...`);
}
