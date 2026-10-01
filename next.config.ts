import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/budgets",
        destination: "/api/budgets",
      },
      {
        source: "/budgets/:path*",
        destination: "/api/budgets/:path*",
      },
    ];
  },
};

export default nextConfig;
