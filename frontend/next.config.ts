import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker ships the traced runtime; local builds still support `npm start`.
  output: process.env.BUILD_STANDALONE === "1" ? "standalone" : undefined,
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  experimental: {
    // The /api rewrite buffers bodies (default 10 MB). Recordings up to 5 min
    // (~50 MB at 1.2 Mbit/s) and source files (25 MB) must pass unchanged.
    proxyClientMaxBodySize: "100mb",
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.API_INTERNAL_URL ?? "http://localhost:8000"}/:path*`,
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
