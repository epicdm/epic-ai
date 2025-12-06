import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@epic-ai/database", "@epic-ai/shared", "@epic-ai/ui"],
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
