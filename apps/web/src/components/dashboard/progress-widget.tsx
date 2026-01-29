"use client";

import { Progress, Card, CardBody, Tooltip } from "@heroui/react";
import { useFeatureUnlocks } from "@/hooks/use-feature-unlocks";
import { UNLOCKABLE_FEATURES } from "@/lib/features/unlockable-features";

export function ProgressWidget() {
  const unlockedCount = UNLOCKABLE_FEATURES.filter(
    f => useFeatureUnlocks(f.id).isUnlocked
  ).length;
  
  const totalFeatures = UNLOCKABLE_FEATURES.length;
  const progressPercent = Math.round((unlockedCount / totalFeatures) * 100);

  return (
    <Card className="border-2 border-primary/20">
      <CardBody>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-medium">Feature Progress</h3>
          <span className="text-sm text-muted-foreground">
            {unlockedCount}/{totalFeatures} unlocked
          </span>
        </div>
        <Tooltip content={`${progressPercent}% of features unlocked`}>
          <Progress value={progressPercent} className="h-2" />
        </Tooltip>
      </CardBody>
    </Card>
  );
}
