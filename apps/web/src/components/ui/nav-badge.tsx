"use client";

import { Badge } from "@/components/ui/badge";
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
        variant="secondary"
        className={className}
      />
    );
  }

  if (isNew) {
    return (
      <Badge
        variant="default"
        className={className}
      >
        New
      </Badge>
    );
  }

  return null;
}
