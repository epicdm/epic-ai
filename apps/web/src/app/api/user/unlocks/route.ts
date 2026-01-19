import { NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { userId } = getAuth(req);
  
  if (!userId) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const userUnlockModel = (prisma as { userUnlock?: { findMany: Function } }).userUnlock;
    if (!userUnlockModel) {
      console.warn("User unlock model missing; returning empty unlocks.");
      return NextResponse.json({ unlocks: [] });
    }

    const unlocks = await userUnlockModel.findMany({
      where: { userId },
      select: {
        featureId: true,
        unlockedAt: true,
        dismissedAt: true
      }
    });

    return NextResponse.json({ unlocks });
  } catch (error) {
    console.error("Failed to get user unlocks:", error);
    return NextResponse.json(
      { error: "Failed to load unlock data" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const { userId, featureId, dismissed } = await req.json();
  
  if (!userId || !featureId) {
    return NextResponse.json(
      { error: "User ID and Feature ID are required" },
      { status: 400 }
    );
  }

  try {
    const userUnlockModel = (prisma as { userUnlock?: { upsert: Function } }).userUnlock;
    if (!userUnlockModel) {
      console.warn("User unlock model missing; skipping persistence.");
      return NextResponse.json({ userId, featureId, dismissed: !!dismissed });
    }

    const data = {
      userId,
      featureId,
      unlockedAt: new Date()
    };
    
    if (dismissed) {
      data.dismissedAt = new Date();
    }

    const unlock = await userUnlockModel.upsert({
      where: { userId_featureId: { userId, featureId } },
      update: data,
      create: data
    });

    return NextResponse.json(unlock);
  } catch (error) {
    console.error("Failed to update unlock status:", error);
    return NextResponse.json(
      { error: "Failed to update unlock" },
      { status: 500 }
    );
  }
}
