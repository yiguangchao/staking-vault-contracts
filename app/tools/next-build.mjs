#!/usr/bin/env node

import { spawnSync } from "node:child_process";

const env = { ...process.env };

// On Windows, Next can intermittently fail when overwriting build artifacts due to file locks.
// Using a unique build directory per run avoids most unlink/rename failures.
if (process.platform === "win32" && !env.NEXT_BUILD_DIR) {
  env.NEXT_BUILD_DIR = `.next-ci-test-${Date.now()}`;
}

const result = spawnSync("next", ["build"], {
  stdio: "inherit",
  env,
  shell: true,
});

process.exit(result.status ?? 1);
