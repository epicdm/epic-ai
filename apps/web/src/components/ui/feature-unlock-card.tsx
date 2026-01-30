"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, X, CheckCircle, Lock, Unlock } from "lucide-react";
import { useState } from "react";

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

export function FeatureUnlockCard({
  featureId,
  title,
  description,
  icon = <Sparkles className="w-5 h-5" />,
  progress = 0,
  unlockStatus = 'locked',
  cta,
  onDismiss,
}: FeatureUnlockCardProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.(featureId);
  };

  if (isDismissed) return null;

  const statusBorderClass =
    unlockStatus === 'unlocked' ? 'border-green-500' :
    unlockStatus === 'in_progress' ? 'border-primary' :
    'border-border';

  const statusBadgeVariant: "default" | "secondary" | "outline" =
    unlockStatus === 'unlocked' ? 'default' :
    unlockStatus === 'in_progress' ? 'default' :
    'secondary';

  const statusIconBgClass =
    unlockStatus === 'unlocked' ? 'bg-green-500/10 text-green-500' :
    unlockStatus === 'in_progress' ? 'bg-primary/10 text-primary' :
    'bg-muted text-muted-foreground';

  return (
    <Card className={`border-2 ${statusBorderClass}`}>
      <CardContent className="relative p-4">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg flex-shrink-0 ${statusIconBgClass}`}>
            {unlockStatus === 'locked' ? <Lock className="w-5 h-5" /> : unlockStatus === 'unlocked' ? <Unlock className="w-5 h-5" /> : icon}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-medium">{title}</h3>
              <Badge variant={statusBadgeVariant}>
                {unlockStatus === 'unlocked' ? 'Unlocked' : unlockStatus === 'in_progress' ? 'In Progress' : 'New'}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{description}</p>

            {unlockStatus === 'in_progress' && (
              <div className="mt-2">
                <div className="h-2 w-full rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">{progress}% complete</p>
              </div>
            )}

            {cta && (
              <Button
                size="sm"
                className="mt-3"
                onClick={cta.action}
                variant={unlockStatus === 'unlocked' ? 'default' : 'default'}
              >
                {cta.label}
                {unlockStatus === 'unlocked' ? <CheckCircle className="w-4 h-4 ml-2" /> : <Sparkles className="w-4 h-4 ml-2" />}
              </Button>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2"
          onClick={handleDismiss}
        >
          <X className="w-4 h-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
