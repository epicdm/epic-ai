import { redirect } from "next/navigation";
import { getAuthWithBypass, getCurrentOrganization } from "@/lib/auth";
import { prisma } from "@epic-ai/database";
import { AIContentWizard } from "@/components/content/ai-content-wizard";

export const metadata = {
  title: "Create Content | Epic AI",
};

export default async function Page() {
  const { userId } = await getAuthWithBypass();

  if (!userId) {
    redirect("/sign-in");
  }

  const organization = await getCurrentOrganization();
  if (!organization) {
    throw new Error("Organization not found - please contact support");
  }

  const brand = await prisma.brand.findFirst({
    where: { organizationId: organization.id },
    include: {
      brandBrain: {
        include: {
          pillars: {
            where: { isActive: true },
            orderBy: { priority: "asc" },
          },
        },
      },
      socialAccounts: {
        where: { status: "CONNECTED" },
      },
    },
  });

  if (!brand) {
    redirect("/dashboard/brand");
  }

  // Get recent content to help AI suggest which pillar to focus on
  const recentContent = await prisma.contentItem.findMany({
    where: { brandId: brand.id },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      category: true,
      createdAt: true,
    },
  });

  // Calculate pillar usage for AI suggestion
  const pillarUsage: Record<string, number> = {};
  recentContent.forEach((item) => {
    if (item.category) {
      pillarUsage[item.category] = (pillarUsage[item.category] || 0) + 1;
    }
  });

  // Transform data for the wizard
  const contentPillars = brand.brandBrain?.pillars.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    color: p.color || "#7C3AED",
    icon: p.icon,
    topics: p.topics,
    hashtags: p.hashtags,
    recentUsageCount: pillarUsage[p.name] || 0,
  })) || [];

  const connectedPlatforms = brand.socialAccounts.map((acc) => ({
    id: acc.id,
    platform: acc.platform,
    displayName: acc.displayName || acc.username || "Unknown",
    avatar: acc.avatar,
    username: acc.username,
  }));

  const brandVoice = brand.brandBrain ? {
    voiceTone: brand.brandBrain.voiceTone,
    writingStyle: brand.brandBrain.writingStyle,
    emojiFrequency: brand.brandBrain.emojiFrequency,
    useHashtags: brand.brandBrain.useHashtags,
  } : null;

  return (
    <AIContentWizard
      brandId={brand.id}
      brandName={brand.name}
      contentPillars={contentPillars}
      connectedPlatforms={connectedPlatforms}
      brandVoice={brandVoice}
    />
  );
}
