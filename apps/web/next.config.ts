import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@epic-ai/database",
    "@epic-ai/shared",
    "@epic-ai/ui",
    "next-themes",
    "posthog-js",
  ],
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "img.clerk.com" },
      { protocol: "https", hostname: "images.clerk.dev" },
      { protocol: "https", hostname: "**" },
    ],
  },
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
