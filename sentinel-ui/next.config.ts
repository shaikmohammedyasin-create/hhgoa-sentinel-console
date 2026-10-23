import type { NextConfig } from "next";
import type { Rewrite } from "next/dist/lib/load-custom-routes";

// The UI is same-origin by default; when the backend is not on this port,
// set NEXT_PUBLIC_API_BASE and the Next server proxies `/api/*` there.
// In production (single-URL demo) the backend runs on the same origin, so
// the rewrite never engages.
const API_TARGET = process.env.NEXT_PUBLIC_API_PROXY_TARGET?.replace(/\/$/, "");

const config: NextConfig = {
  reactStrictMode: true,
  typescript: { ignoreBuildErrors: false },
  eslint: { ignoreDuringBuilds: false },
  output: "standalone",
  outputFileTracingRoot: process.cwd(),
  async rewrites(): Promise<Rewrite[] | Array<Rewrite>> {
    if (!API_TARGET) return [];
    return [
      { source: "/api/:path*", destination: `${API_TARGET}/api/:path*` },
      { source: "/investigations/:path*", destination: `${API_TARGET}/investigations/:path*` },
      { source: "/benchmark/:path*", destination: `${API_TARGET}/benchmark/:path*` },
      { source: "/health", destination: `${API_TARGET}/health` },
    ];
  },
};

export default config;
