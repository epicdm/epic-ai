import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "OpenClaw",
    short_name: "OpenClaw",
    description:
      "Build, deploy, and manage AI agents across voice, chat, and messaging. Open source AI Agent Platform.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#030712",
    theme_color: "#0ea5e9",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
