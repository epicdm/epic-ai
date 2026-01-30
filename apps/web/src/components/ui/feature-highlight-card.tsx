"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
      className={`relative overflow-hidden ${status === "locked" ? "opacity-60" : ""} ${status !== "locked" && quickAction ? "cursor-pointer hover:shadow-md transition-shadow" : ""}`}
      onClick={status !== "locked" && quickAction ? handleQuickAction : undefined}
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

      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg flex-shrink-0 ${status === "locked" ? "bg-muted" : "bg-primary/10 text-primary"}`}>
            {status === "locked" ? <Lock className="w-4 h-4" /> : icon}
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-medium">{title}</h3>
              {learnMoreContent && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLearnMore();
                        }}
                      >
                        <Info className="w-3 h-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Learn more</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>

            <p className="text-sm text-muted-foreground">{description}</p>

            {showLearnMore && learnMoreContent && (
              <div className="mt-2 text-xs bg-muted rounded-lg p-2">
                {learnMoreContent}
              </div>
            )}

            {status === "locked" && unlockRequirement && (
              <p className="text-xs text-yellow-600 mt-1">
                Unlock by: {unlockRequirement}
              </p>
            )}
          </div>
        </div>

        {quickAction && status !== "locked" && (
          <Button
            variant="secondary"
            size="sm"
            className="mt-2 w-full"
            onClick={(e) => {
              e.stopPropagation();
              handleQuickAction();
            }}
          >
            Try it now
            <ArrowRight className="w-3 h-3 ml-2" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
