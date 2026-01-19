"use client";

import { Card, CardBody, Button, Tooltip } from "@heroui/react";
import { Lock } from "lucide-react";
import { useFeatureGates } from "@/hooks/use-feature-gates";
import type { FeatureGate } from "@/lib/features/feature-gates";

export function FeatureLock({ feature, children }: { feature: FeatureGate, children: React.ReactNode }) {
  const { isLocked, getUnlockRequirements, unlockFeature } = useFeatureGates();
  const requirements = getUnlockRequirements(feature);
  
  const handleUnlock = async () => {
    const success = await unlockFeature(feature);
    if (success) {
      // Show celebration
    }
  };

  if (!isLocked(feature)) return <>{children}</>;

  return (
    <div className="relative">
      <div className="blur-sm">
        {children}
      </div>
      <Card className="absolute inset-0 flex items-center justify-center bg-background/80">
        <CardBody className="flex flex-col items-center gap-4 text-center">
          <Lock className="w-8 h-8 text-primary" />
          <h3 className="font-medium">Feature Locked</h3>
          <p className="text-sm text-muted-foreground">
            {requirements}
          </p>
          <Button 
            variant="flat" 
            color="primary"
            onPress={handleUnlock}
          >
            Unlock Feature
          </Button>
        </CardBody>
      </Card>
    </div>
  );
}
