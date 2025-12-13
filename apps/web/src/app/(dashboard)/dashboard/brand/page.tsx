import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getUserOrganization } from "@/lib/sync-user";
import { prisma } from "@epic-ai/database";
import { BrandBrainPage } from "@/components/brand/brand-brain-page";
import { BrandOverview } from "@/components/brand/brand-overview";

export const metadata = {
  title: "Brand Brain | Epic AI",
};

export default async function BrandPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const organization = await getUserOrganization();
  if (!organization) {
    redirect("/onboarding");
  }

  // Get brand with brain and context sources
  const brand = await prisma.brand.findFirst({
    where: { organizationId: organization.id },
    include: {
      brandBrain: {
        include: {
          audiences: {
            orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
          },
          pillars: {
            orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
          },
          brandCompetitors: {
            orderBy: { createdAt: "asc" },
          },
        },
      },
      contextSources: {
        orderBy: { updatedAt: "desc" },
        take: 5,
      },
      _count: {
        select: {
          contextSources: true,
          contentQueue: true,
        },
      },
    },
  });

  // If no brand exists, show setup wizard
  if (!brand) {
    return (
      <BrandOverview
        brand={null}
        organizationId={organization.id}
      />
    );
  }

  // If brand exists, show the Brand Brain configuration page
  return (
    <BrandBrainPage
      brandId={brand.id}
      brandName={brand.name}
      initialBrain={brand.brandBrain ? {
        id: brand.brandBrain.id,
        companyName: brand.brandBrain.companyName,
        description: brand.brandBrain.description,
        mission: brand.brandBrain.mission,
        values: brand.brandBrain.values,
        uniqueSellingPoints: brand.brandBrain.uniqueSellingPoints,
        industry: brand.brandBrain.industry,
        targetMarket: brand.brandBrain.targetMarket,
        voiceTone: brand.brandBrain.voiceTone,
        voiceToneCustom: brand.brandBrain.voiceToneCustom,
        formalityLevel: brand.brandBrain.formalityLevel,
        writingStyle: brand.brandBrain.writingStyle,
        doNotMention: brand.brandBrain.doNotMention,
        mustMention: brand.brandBrain.mustMention,
        useEmojis: brand.brandBrain.useEmojis,
        emojiFrequency: brand.brandBrain.emojiFrequency,
        useHashtags: brand.brandBrain.useHashtags,
        hashtagStyle: brand.brandBrain.hashtagStyle,
        preferredHashtags: brand.brandBrain.preferredHashtags,
        bannedHashtags: brand.brandBrain.bannedHashtags,
        ctaStyle: brand.brandBrain.ctaStyle,
        brandSummary: brand.brandBrain.brandSummary,
        setupComplete: brand.brandBrain.setupComplete,
        setupStep: brand.brandBrain.setupStep,
        audiences: brand.brandBrain.audiences.map((a) => ({
          id: a.id,
          name: a.name,
          description: a.description,
          isPrimary: a.isPrimary,
          ageRange: a.ageRange,
          interests: a.interests,
          painPoints: a.painPoints,
          goals: a.goals,
        })),
        pillars: brand.brandBrain.pillars.map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          color: p.color,
          topics: p.topics,
          frequency: p.frequency, // number in schema, matches Pillar interface
          isActive: p.isActive,
        })),
        brandCompetitors: brand.brandBrain.brandCompetitors.map((c) => ({
          id: c.id,
          name: c.name,
          website: c.website,
          description: c.description,
          strengths: c.strengths,
          weaknesses: c.weaknesses,
          differentiators: c.differentiators,
        })),
      } : null}
    />
  );
}
