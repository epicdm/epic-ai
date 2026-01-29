"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "@clerk/nextjs";
import { FeatureGate } from "@/lib/features/feature-gates";
import { FEATURE_DEPENDENCIES, FEATURE_UNLOCK_CONDITIONS } from "@/lib/features/feature-gates";

type FeatureGateStatus = {
  isUnlocked: boolean;
  unlockRequirements: string;
  isDependencyMet: boolean;
};

export function useFeatureGates() {
  const { session } = useSession();
  const [featureStates, setFeatureStates] = useState<Record<FeatureGate, FeatureGateStatus>>();
  const [isLoading, setIsLoading] = useState(true);

  // Load initial feature states
  useEffect(() => {
    const loadFeatureStates = async () => {
      if (!session?.user?.id) return;
      
      try {
        const response = await fetch(`/api/user/unlocks?userId=${session.user.id}`);
        if (!response.ok) {
          throw new Error(`Failed to load unlocks: ${response.status}`);
        }
        const { unlocks } = await response.json();
        const safeUnlocks = Array.isArray(unlocks) ? unlocks : [];
        
        const states = Object.values(FeatureGate).reduce((acc, gate) => {
          const unlock = safeUnlocks.find((u: any) => u.featureId === gate);
          const dependencies = FEATURE_DEPENDENCIES[gate];
          
          acc[gate] = {
            isUnlocked: !!unlock?.unlockedAt,
            unlockRequirements: getUnlockDescription(gate),
            isDependencyMet: dependencies.every(dep => 
              safeUnlocks.some((u: any) => u.featureId === dep && u.unlockedAt)
            )
          };
          return acc;
        }, {} as Record<FeatureGate, FeatureGateStatus>);
        
        setFeatureStates(states);
      } catch (error) {
        console.error("Failed to load feature states:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadFeatureStates();
  }, [session?.user?.id]);

  const getUnlockDescription = useCallback((gate: FeatureGate): string => {
    const condition = FEATURE_UNLOCK_CONDITIONS[gate];
    
    switch (condition.type) {
      case 'wizard':
        return `Complete ${condition.value} wizard`;
      case 'event_count':
        return `Perform ${condition.value} actions`;
      default:
        return "Complete prerequisites to unlock";
    }
  }, []);

  const isLocked = useCallback((gate: FeatureGate): boolean => {
    if (!featureStates) return true;
    return !featureStates[gate]?.isUnlocked;
  }, [featureStates]);

  const isFeatureUnlocked = useCallback((gate: FeatureGate): boolean => {
    if (!featureStates) return false;
    return !!featureStates[gate]?.isUnlocked;
  }, [featureStates]);

  const unlockFeature = useCallback(async (gate: FeatureGate) => {
    try {
      const response = await fetch(`/api/user/unlocks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          userId: session?.user?.id,
          featureId: gate 
        })
      });
      
      if (!response.ok) throw new Error("Failed to unlock feature");
      
      setFeatureStates(prev => ({
        ...prev,
        [gate]: {
          ...prev?.[gate],
          isUnlocked: true
        }
      }));
      
      return true;
    } catch (error) {
      console.error("Failed to unlock feature:", error);
      return false;
    }
  }, [session?.user?.id]);

  return {
    featureStates,
    isLoading,
    isLocked,
    isFeatureUnlocked,
    getUnlockRequirements: getUnlockDescription,
    unlockFeature
  };
}
