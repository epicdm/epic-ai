"use client";

import { Card, CardBody, Button, Badge, Progress } from "@heroui/react";
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

  return (
    <Card className={`border-2 ${unlockStatus === 'unlocked' ? 'border-success' : unlockStatus === 'in_progress' ? 'border-primary' : 'border-default'}`}>
      <CardBody className="relative p-4">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg flex-shrink-0 ${unlockStatus === 'unlocked' ? 'bg-success/10 text-success' : unlockStatus === 'in_progress' ? 'bg-primary/10 text-primary' : 'bg-default/10 text-default'}`}>
            {unlockStatus === 'locked' ? <Lock className="w-5 h-5" /> : unlockStatus === 'unlocked' ? <Unlock className="w-5 h-5" /> : icon}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-medium">{title}</h3>
              <Badge 
                color={unlockStatus === 'unlocked' ? 'success' : unlockStatus === 'in_progress' ? 'primary' : 'default'}
                variant="flat" 
                size="sm"
              >
                {unlockStatus === 'unlocked' ? 'Unlocked' : unlockStatus === 'in_progress' ? 'In Progress' : 'New'}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
            
            {unlockStatus === 'in_progress' && (
              <div className="mt-2">
                <Progress 
                  value={progress} 
                  size="sm" 
                  color="primary"
                  className="h-2"
                />
                <p className="text-xs text-muted-foreground mt-1">{progress}% complete</p>
              </div>
            )}
            
            {cta && (
              <Button 
                size="sm" 
                className="mt-3"
                onPress={cta.action}
                color={unlockStatus === 'unlocked' ? 'success' : 'primary'}
                endContent={unlockStatus === 'unlocked' ? <CheckCircle className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
              >
                {cta.label}
              </Button>
            )}
          </div>
        </div>
        <Button 
          isIconOnly 
          variant="light" 
          size="sm" 
          className="absolute top-2 right-2"
          onPress={handleDismiss}
        >
          <X className="w-4 h-4" />
        </Button>
      </CardBody>
    </Card>
  );
}
