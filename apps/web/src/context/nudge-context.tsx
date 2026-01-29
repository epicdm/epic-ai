"use client";

import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { SmartNudgeProps } from "@/components/ui/smart-nudge";
import { NudgeType } from "@/lib/nudges/nudge-config";

type NudgeContextType = {
  nudges: SmartNudgeProps['nudge'][];
  addNudge: (nudge: SmartNudgeProps['nudge']) => void;
  dismissNudge: (id: string) => void;
  triggerNudge: (type: NudgeType, message: string, action?: { label: string; onClick: () => void }) => void;
};

const NudgeContext = createContext<NudgeContextType | undefined>(undefined);

export function NudgeProvider({ children }: { children: ReactNode }) {
  const [nudges, setNudges] = useState<SmartNudgeProps['nudge'][]>([]);

  const addNudge = (nudge: SmartNudgeProps['nudge']) => {
    setNudges(prev => [...prev, nudge]);
  };

  const dismissNudge = (id: string) => {
    setNudges(prev => prev.filter(n => n.id !== id));
  };

  const triggerNudge = (type: NudgeType, message: string, action?: { label: string; onClick: () => void }) => {
    addNudge({
      id: Date.now().toString(),
      type,
      title: type.charAt(0).toUpperCase() + type.slice(1),
      message,
      action
    });
  };

  return (
    <NudgeContext.Provider value={{ nudges, addNudge, dismissNudge, triggerNudge }}>
      {children}
    </NudgeContext.Provider>
  );
}

export function useNudge() {
  const context = useContext(NudgeContext);
  if (!context) {
    throw new Error('useNudge must be used within a NudgeProvider');
  }
  return context;
}
