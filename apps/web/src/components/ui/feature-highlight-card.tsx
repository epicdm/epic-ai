"use client";

import { useState } from "react";
import { Button, Card, CardBody, Tooltip } from "@heroui/react";
import { Info, ArrowRight, Sparkles, Lock } from "lucide-react";
import { AIBadge, AIConfidenceDots } from "@/components/ui/ai-badge";
import { trackEvent } from "@/lib/analytics";

interface FeatureHighlightCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  status?: "locked" | "unlocked" | "new";
  unlockRequirement?: string;
  learnMoreContent?: React.ReactNode;
  quickAction?: () => void;
  confidence?: number;
}

export function FeatureHighlightCard({
  title,
  description,
  icon,
  status = "unlocked",
  unlockRequirement,
  learnMoreContent,
  quickAction,
  confidence,
}: FeatureHighlightCardProps) {
  const [showLearnMore, setShowLearnMore] = useState(false);

  const handleQuickAction = () => {
    trackEvent("feature_card_clicked", {
      feature: title,
      status,
      confidence
    });
    quickAction?.();
  };

  const handleLearnMore = () => {
    setShowLearnMore(!showLearnMore);
    trackEvent("feature_card_learn_more", {
      feature: title,
      expanded: !showLearnMore
    });
  };

  return (
    <Card 
      className={`relative overflow-hidden ${status === "locked" ? "opacity-60" : ""}`}
      isPressable={status !== "locked" && !!quickAction}
      onPress={handleQuickAction}
    >
      {/* Status indicators */}
      <div className="absolute top-2 right-2 flex gap-1">
        {status === "new" && (
          <AIBadge type="new" size="sm" position="corner" />
        )}
        {confidence && (
          <AIConfidenceDots 
            confidence={confidence} 
            variant={confidence >= 85 ? "purple" : "blue"}
          />
        )}
      </div>

      <CardBody className="p-4">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg flex-shrink-0 ${status === "locked" ? "bg-default-100" : "bg-primary/10 text-primary"}`}>
            {status === "locked" ? <Lock className="w-4 h-4" /> : icon}
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-medium">{title}</h3>
              {learnMoreContent && (
                <Tooltip content="Learn more">
                  <Button 
                    isIconOnly 
                    variant="light" 
                    size="sm" 
                    onPress={handleLearnMore}
                  >
                    <Info className="w-3 h-3" />
                  </Button>
                </Tooltip>
              )}
            </div>
            
            <p className="text-sm text-muted-foreground">{description}</p>
            
            {showLearnMore && learnMoreContent && (
              <div className="mt-2 text-xs bg-default-50 rounded-lg p-2">
                {learnMoreContent}
              </div>
            )}

            {status === "locked" && unlockRequirement && (
              <p className="text-xs text-warning mt-1">
                Unlock by: {unlockRequirement}
              </p>
            )}
          </div>
        </div>

        {quickAction && status !== "locked" && (
          <Button 
            variant="flat" 
            size="sm" 
            className="mt-2 w-full"
            endContent={<ArrowRight className="w-3 h-3" />}
            onPress={handleQuickAction}
          >
            Try it now
          </Button>
        )}
      </CardBody>
    </Card>
  );
}
