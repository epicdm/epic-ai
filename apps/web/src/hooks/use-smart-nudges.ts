"use client";

import { useState, useEffect } from "react";
import { NudgeConfig } from "@/lib/nudges/nudge-config";

export function useSmartNudges(configs: NudgeConfig[]) {
  const [activeNudge, setActiveNudge] = useState<NudgeConfig | null>(null);
  const [lastActionTime, setLastActionTime] = useState(Date.now());
  
  // Check for idle time
  useEffect(() => {
    const idleConfig = configs.find(c => c.triggers.idle);
    if (!idleConfig) return;
    
    const interval = setInterval(() => {
      const idleSeconds = (Date.now() - lastActionTime) / 1000;
      if (idleSeconds >= (idleConfig.triggers.idle || 0)) {
        setActiveNudge(idleConfig);
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [configs, lastActionTime]);

  // Track user actions
  const trackAction = () => {
    setLastActionTime(Date.now());
    setActiveNudge(null); // Dismiss nudge on any action
  };

  return {
    activeNudge,
    trackAction,
    dismissNudge: () => setActiveNudge(null)
  };
}
