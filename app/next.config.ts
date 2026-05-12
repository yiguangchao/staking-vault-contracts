import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Default to a throwaway build dir to avoid Windows file-lock issues on repeated builds.
  // Can be overridden by setting NEXT_BUILD_DIR.
  distDir: process.env.NEXT_BUILD_DIR || ".next-ci-test",
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
