import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Self-contained server for the Docker image (see apps/web/Dockerfile).
  output: "standalone",
  // Monorepo: trace files from the workspace root so workspace packages are included.
  outputFileTracingRoot: path.join(__dirname, "../../"),
  reactStrictMode: true,
  poweredByHeader: false,
  // Keep the dev overlay out of the sidebar's user menu.
  devIndicators: { position: "bottom-right" },
};

export default nextConfig;
