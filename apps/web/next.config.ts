import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Workspace packages are shipped as TS source; let Next transpile them.
  transpilePackages: ["@annona/ui", "@annona/core", "@annona/sdk"],
};

export default nextConfig;
