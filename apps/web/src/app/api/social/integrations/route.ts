import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getUserOrganization } from "@/lib/sync-user";
import { getPostizClient, PLATFORMS } from "@/lib/services/postiz";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const org = await getUserOrganization();
    if (!org) {
      return NextResponse.json({ error: "No organization" }, { status: 404 });
    }

    const client = await getPostizClient(org.id);
    if (!client) {
      return NextResponse.json({
        connected: false,
        integrations: [],
      });
    }

    const integrations = await client.getIntegrations();

    // Enrich with display info
    const enriched = integrations.map((i) => {
      const platformKey = i.identifier.toLowerCase() as keyof typeof PLATFORMS;
      const platformInfo = PLATFORMS[platformKey] || {
        name: i.identifier,
        icon: "share",
        color: "bg-gray-500",
      };

      return {
        id: i.id,
        name: i.name,
        platform: i.identifier,
        platformDisplay: platformInfo.name,
        platformColor: platformInfo.color,
        picture: i.picture,
        disabled: i.disabled,
      };
    });

    return NextResponse.json({
      connected: true,
      integrations: enriched,
    });
  } catch (error) {
    console.error("Error fetching integrations:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
