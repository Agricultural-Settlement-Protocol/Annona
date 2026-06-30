import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Workspace packages ship TS source; let Next transpile them.
  transpilePackages: ["@annona/ui", "@annona/core", "@annona/sdk"],
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
