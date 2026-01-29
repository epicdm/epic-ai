import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@epic-ai/database",
    "@epic-ai/shared",
    "@epic-ai/ui",
    "next-themes",
    "posthog-js",
  ],
  serverExternalPackages: ["@prisma/client"],
  productionBrowserSourceMaps: true,
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
  async redirects() {
    return [
      // Old voice routes → new phone/agents routes
      {
        source: "/dashboard/voice/agents",
        destination: "/dashboard/agents",
        permanent: true,
      },
      {
        source: "/dashboard/voice/agents/:path*",
        destination: "/dashboard/agents/:path*",
        permanent: true,
      },
      {
        source: "/dashboard/voice/calls",
        destination: "/dashboard/phone/calls",
        permanent: true,
      },
      {
        source: "/dashboard/voice/numbers",
        destination: "/dashboard/phone/numbers",
        permanent: true,
      },
      {
        source: "/dashboard/voice/flows",
        destination: "/dashboard/phone/flows",
        permanent: true,
      },
      {
        source: "/dashboard/voice/flows/:path*",
        destination: "/dashboard/phone/flows/:path*",
        permanent: true,
      },
      {
        source: "/dashboard/voice/routing",
        destination: "/dashboard/phone/routing",
        permanent: true,
      },
      {
        source: "/dashboard/voice/routing/:path*",
        destination: "/dashboard/phone/routing/:path*",
        permanent: true,
      },
      // Old agent-os routes → new agents routes
      {
        source: "/dashboard/agent-os",
        destination: "/dashboard/agents",
        permanent: true,
      },
      {
        source: "/dashboard/agent-os/:path*",
        destination: "/dashboard/agents/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
