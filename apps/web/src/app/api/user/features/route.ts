import { NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

interface FeatureGate {
  id: string;
  name: string;
  description: string;
  unlockConditions: any;
  unlockedAt?: Date;
}

const DEFAULT_FEATURES = [
  {
    id: "content_generator",
    name: "AI Content Generator",
    description: "Create posts optimized for each platform",
    unlockConditions: { type: "wizard", value: "onboarding" }
  },
  {
    id: "workflows",
    name: "Cross-Channel Workflows",
    description: "Automate content across platforms",
    unlockConditions: { type: "event_count", value: 3 }
  },
  {
    id: "advanced_analytics",
    name: "Advanced Analytics",
    description: "Measure performance and insights",
    unlockConditions: { type: "wizard", value: "analytics" }
  },
  {
    id: "voice_agents",
    name: "AI Voice Agents",
    description: "Automated phone calls with AI",
    unlockConditions: { type: "wizard", value: "voice_setup" }
  },
  {
    id: "brand_brain",
    name: "Brand Brain",
    description: "Centralized brand context and tone",
    unlockConditions: { type: "wizard", value: "brand_setup" }
  }
];

export async function GET(req: Request) {
  const { userId } = getAuth(req);
  
  if (!userId) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    let [allFeatures, userFeatures] = await Promise.all([
      prisma.feature.findMany(),
      prisma.userFeature.findMany({
        where: { userId },
        include: { feature: true }
      })
    ]);

    if (allFeatures.length === 0) {
      await prisma.feature.createMany({
        data: DEFAULT_FEATURES,
        skipDuplicates: true
      });
      allFeatures = await prisma.feature.findMany();
    }

    const unlockedById = new Map(
      userFeatures.map(uf => [uf.featureId, uf.unlockedAt] as const)
    );

    const features: Record<string, FeatureGate> = allFeatures.reduce(
      (acc: Record<string, FeatureGate>, feature) => ({
        ...acc,
        [feature.id]: {
          id: feature.id,
          name: feature.name,
          description: feature.description ?? undefined,
          unlockConditions: feature.unlockConditions,
          unlockedAt: unlockedById.get(feature.id)
        }
      }),
      {}
    );

    return NextResponse.json({ features });
  } catch (error) {
    console.error("Failed to get user features:", error);
    return NextResponse.json(
      { error: "Failed to load feature gates" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const { featureId, userId } = await req.json();
  
  if (!featureId || !userId) {
    return NextResponse.json(
      { error: "Feature ID and User ID are required" },
      { status: 400 }
    );
  }

  try {
    // Check if user already has this feature unlocked
    const existing = await prisma.userFeature.findFirst({
      where: { 
        userId, 
        featureId 
      }
    });

    if (existing?.unlockedAt) {
      return NextResponse.json(existing);
    }

    // Unlock the feature
    const unlockedFeature = await prisma.userFeature.upsert({
      where: { 
        userId_featureId: { 
          userId, 
          featureId 
        } 
      },
      update: { unlockedAt: new Date() },
      create: { 
        userId, 
        featureId, 
        unlockedAt: new Date() 
      },
      include: { feature: true }
    });

    return NextResponse.json(unlockedFeature);
  } catch (error) {
    console.error("Failed to unlock feature:", error);
    return NextResponse.json(
      { error: "Failed to unlock feature" },
      { status: 500 }
    );
  }
}
