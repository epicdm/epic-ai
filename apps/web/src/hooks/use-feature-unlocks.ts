"use client";

import { useEffect, useState } from "react";
import { useSession } from "@clerk/nextjs";

export function useFeatureUnlocks(featureId: string) {
  const { session } = useSession();
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isNew, setIsNew] = useState(false);

  useEffect(() => {
    const checkUnlockStatus = async () => {
      if (!session?.user?.id) return;
      
      try {
        const response = await fetch(`/api/user/unlocks?userId=${session.user.id}`);
        const { unlocks } = await response.json();
        
        const featureUnlock = unlocks.find((u: any) => u.featureId === featureId);
        setIsUnlocked(!!featureUnlock?.unlockedAt);
        setIsNew(!featureUnlock?.dismissedAt);
      } catch (error) {
        console.error("Failed to check unlock status:", error);
      }
    };

    checkUnlockStatus();
  }, [session?.user?.id, featureId]);

  return { isUnlocked, isNew };
}
