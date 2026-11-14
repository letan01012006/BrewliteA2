import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    const backend = (
      process.env.BACKEND_API_URL || "http://127.0.0.1:4000/api"
    ).replace(/\/$/, "");
    return [{ source: "/api/:path*", destination: `${backend}/:path*` }];
  },
  cacheComponents: true,
  partialPrefetching: true,
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
