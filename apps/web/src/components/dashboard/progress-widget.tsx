"use client";

import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
      <CardContent>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-medium">Feature Progress</h3>
          <span className="text-sm text-muted-foreground">
            {unlockedCount}/{totalFeatures} unlocked
          </span>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="h-2 w-full rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{progressPercent}% of features unlocked</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
