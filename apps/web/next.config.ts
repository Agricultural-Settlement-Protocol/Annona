import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Two dev servers (demo E2E on 3100, real-mode E2E on 3101) or a concurrent
  // `next build` writing one .next dir corrupt each other (clientReferenceManifest
  // invariants, truncated manifest JSON). Give any parallel instance its own
  // dist dir via NEXT_DIST_DIR.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Workspace packages ship TS source; let Next transpile them.
  transpilePackages: ["@annona/ui", "@annona/core", "@annona/sdk"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
  webpack: (config) => {
    // Resolve ".js" import specifiers to ".ts"/".tsx" source (Bundler-style imports).
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js"],
      ".jsx": [".tsx", ".jsx"],
    };
    return config;
  },
};

export default nextConfig;
