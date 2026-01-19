"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { FeatureUnlockCard } from "@/components/ui/feature-unlock-card";

type FeatureUnlockCardProps = {
  featureId: string;
  title: string;
  description: string;
  icon?: React.ReactNode;
  progress?: number;
  unlockStatus?: 'locked' | 'unlocked' | 'in_progress';
  cta?: {
    label: string;
    action: () => void;
  };
  onDismiss?: (featureId: string) => void;
};

type FeatureUnlockContextType = {
  unlockedFeatures: string[];
  inProgressFeatures: Record<string, number>;
  dismissFeature: (featureId: string) => void;
  unlockFeature: (featureId: string) => void;
  updateFeatureProgress: (featureId: string, progress: number) => void;
  showUnlockCard: (props: FeatureUnlockCardProps) => void;
};

const FeatureUnlockContext = createContext<FeatureUnlockContextType | undefined>(undefined);

export function FeatureUnlockProvider({ children }: { children: ReactNode }) {
  const [unlockedFeatures, setUnlockedFeatures] = useState<string[]>([]);
  const [inProgressFeatures, setInProgressFeatures] = useState<Record<string, number>>({});
  const [activeCards, setActiveCards] = useState<FeatureUnlockCardProps[]>([]);

  const dismissFeature = (featureId: string) => {
    setActiveCards(cards => cards.filter(card => card.featureId !== featureId));
  };

  const unlockFeature = (featureId: string) => {
    setUnlockedFeatures(prev => [...prev, featureId]);
    setInProgressFeatures(prev => {
      const { [featureId]: _, ...rest } = prev;
      return rest;
    });
  };

  const updateFeatureProgress = (featureId: string, progress: number) => {
    setInProgressFeatures(prev => ({
      ...prev,
      [featureId]: progress
    }));
  };

  const showUnlockCard = (props: FeatureUnlockCardProps) => {
    setActiveCards(cards => [...cards, props]);
  };

  return (
    <FeatureUnlockContext.Provider 
      value={{
        unlockedFeatures,
        inProgressFeatures,
        dismissFeature,
        unlockFeature,
        updateFeatureProgress,
        showUnlockCard
      }}
    >
      {children}
      <div className="fixed bottom-4 right-4 space-y-3 z-50">
        {activeCards.map(card => (
          <FeatureUnlockCard 
            key={card.featureId} 
            {...card} 
            unlockStatus={unlockedFeatures.includes(card.featureId) ? 'unlocked' : 
                         card.featureId in inProgressFeatures ? 'in_progress' : 'locked'}
            progress={inProgressFeatures[card.featureId] || 0}
            onDismiss={dismissFeature}
          />
        ))}
      </div>
    </FeatureUnlockContext.Provider>
  );
}

export function useFeatureUnlock() {
  const context = useContext(FeatureUnlockContext);
  if (!context) {
    throw new Error('useFeatureUnlock must be used within a FeatureUnlockProvider');
  }
  return context;
}
