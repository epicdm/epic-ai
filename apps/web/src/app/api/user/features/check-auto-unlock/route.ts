import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  const { userId } = await req.json();
  
  if (!userId) {
    return NextResponse.json(
      { error: "User ID is required" },
      { status: 400 }
    );
  }

  try {
    // Get all locked features for this user
    const lockedFeatures = await prisma.userFeature.findMany({
      where: { 
        userId,
        unlockedAt: null
      },
      include: { feature: true }
    });

    // Check each feature's unlock conditions
    const unlockedFeatures = [];
    
    for (const uf of lockedFeatures) {
      const shouldUnlock = await checkUnlockConditions(uf.feature, userId);
      if (shouldUnlock) {
        const unlocked = await prisma.userFeature.update({
          where: { id: uf.id },
          data: { unlockedAt: new Date() },
          include: { feature: true }
        });
        unlockedFeatures.push(unlocked.feature);
      }
    }

    return NextResponse.json({ unlockedFeatures });
  } catch (error) {
    console.error("Failed to check auto-unlocks:", error);
    return NextResponse.json(
      { error: "Failed to check feature unlocks" },
      { status: 500 }
    );
  }
}

async function checkUnlockConditions(feature: any, userId: string) {
  switch (feature.unlockConditions.type) {
    case 'event_count':
      const count = await prisma.userEvent.count({
        where: { 
          userId,
          type: feature.unlockConditions.value.eventType
        }
      });
      return count >= feature.unlockConditions.value.count;
      
    case 'time_elapsed':
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });
      if (!user?.createdAt) return false;
      
      const daysSinceSignup = Math.floor(
        (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysSinceSignup >= feature.unlockConditions.value.days;
      
    case 'prerequisite':
      const prereqs = await prisma.userFeature.count({
        where: {
          userId,
          featureId: { in: feature.unlockConditions.value },
          NOT: { unlockedAt: null }
        }
      });
      return prereqs === feature.unlockConditions.value.length;
      
    default:
      return false;
  }
}
