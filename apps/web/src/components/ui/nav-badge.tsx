"use client";

import { Badge } from "@heroui/react";
import { useFeatureUnlocks } from "@/hooks/use-feature-unlocks";

type NavBadgeProps = {
  featureId: string;
  className?: string;
};

export function NavBadge({ featureId, className }: NavBadgeProps) {
  const { isUnlocked, isNew } = useFeatureUnlocks(featureId);

  if (!isUnlocked) {
    return (
      <Badge 
        variant="flat" 
        color="default" 
        size="sm" 
        className={className}
      />
    );
  }

  if (isNew) {
    return (
      <Badge 
        color="primary" 
        variant="solid" 
        size="sm" 
        className={className}
      >
        New
      </Badge>
    );
  }

  return null;
}
