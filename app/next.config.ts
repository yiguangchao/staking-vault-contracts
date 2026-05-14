import type { NextConfig } from "next";

const isWindows = process.platform === "win32";

const nextConfig: NextConfig = {
  // Default to a throwaway build dir to avoid Windows file-lock issues on repeated builds.
  // Can be overridden by setting NEXT_BUILD_DIR.
  distDir: process.env.NEXT_BUILD_DIR || ".next-ci-test",
  // Turbopack build output can hit intermittent EPERM rename/unlink issues on Windows
  // (often due to file locks/antivirus). Webpack builds are more stable there.
  ...(isWindows
    ? {}
    : {
        turbopack: {
          root: process.cwd(),
        },
      }),
};

export default nextConfig;
