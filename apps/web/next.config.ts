import type { NextConfig } from "next";

const configuredBackend = process.env.BACKEND_API_URL?.trim();
if (process.env.VERCEL && !configuredBackend) {
  throw new Error("Set BACKEND_API_URL on Vercel before building the web app.");
}
const backend = (configuredBackend || "http://127.0.0.1:4000/api").replace(/\/+$/, "");
const backendUrl = new URL(backend);
if (
  !["http:", "https:"].includes(backendUrl.protocol) ||
  backendUrl.username || backendUrl.password || backendUrl.search || backendUrl.hash ||
  backendUrl.pathname !== "/api"
) {
  throw new Error("BACKEND_API_URL must be an HTTP(S) URL ending in /api without credentials, query or fragment.");
}
if (process.env.VERCEL && (
  backendUrl.protocol !== "https:" ||
  ["localhost", "127.0.0.1", "[::1]", "api", "db"].includes(backendUrl.hostname)
)) {
  throw new Error("BACKEND_API_URL on Vercel must point to the public HTTPS backend.");
}

const nextConfig: NextConfig = {
  output: "standalone",
  // Next 16 chặn tài nguyên dev (HMR, client dev) khi mở bằng host khác "localhost".
  // Thiếu dòng này, mở http://127.0.0.1:3000 bằng `npm run dev` sẽ không hydrate được.
  allowedDevOrigins: ["127.0.0.1"],
  async rewrites() {
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
