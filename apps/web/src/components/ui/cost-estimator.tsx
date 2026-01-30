"use client";

import { ReactNode, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DollarSign as CurrencyDollarIcon,
  Info as InformationCircleIcon,
  BarChart3 as ChartBarIcon,
  Clock as ClockIcon,
  Sparkles as SparklesIcon,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const PRICING = {
  voice: {
    perMinute: 0.15,
    breakdown: {
      stt: 0.04,
      llm: 0.06,
      tts: 0.03,
      telephony: 0.02,
    },
  },
  content: {
    perGeneration: 0.02,
    perImage: 0.04,
  },
  analytics: {
    perQuery: 0.001,
  },
};

export interface CostEstimate {
  action: string;
  estimatedCost: number;
  estimatedDuration?: number;
  breakdown?: {
    label: string;
    cost: number;
  }[];
}

interface CostEstimatorProps {
  estimate: CostEstimate;
  onProceed?: () => void;
  onCancel?: () => void;
  showBreakdown?: boolean;
  variant?: "inline" | "card" | "modal";
  className?: string;
  isLoading?: boolean;
}

export function CostEstimator({
  estimate,
  onProceed,
  onCancel,
  showBreakdown = true,
  variant = "card",
  className,
  isLoading,
}: CostEstimatorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const formatCost = (cost: number) => {
    if (cost < 0.01) return "< $0.01";
    return "$" + cost.toFixed(2);
  };

  const breakdownContent = estimate.breakdown && (
    <div className="space-y-2 mt-3">
      <p className="text-xs text-muted-foreground uppercase font-medium">
        Cost Breakdown
      </p>
      {estimate.breakdown.map((item, i) => (
        <div key={i} className="flex justify-between text-sm">
          <span className="text-muted-foreground">{item.label}</span>
          <span className="font-medium">
            {formatCost(item.cost)}
          </span>
        </div>
      ))}
    </div>
  );

  if (variant === "inline") {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Badge variant="secondary">
          <CurrencyDollarIcon className="w-3 h-3 mr-1" />
          Est. {formatCost(estimate.estimatedCost)}
        </Badge>
        {showBreakdown && estimate.breakdown && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="text-muted-foreground hover:text-foreground">
                  <InformationCircleIcon className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>{breakdownContent}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    );
  }

  if (variant === "modal") {
    return (
      <>
        <Button
          onClick={() => setIsOpen(true)}
          disabled={isLoading}
          className={className}
        >
          {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {estimate.action}
        </Button>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CurrencyDollarIcon className="w-5 h-5 text-yellow-600" />
                Confirm Action
              </DialogTitle>
            </DialogHeader>
            <div className="text-center py-4">
              <div className="w-16 h-16 mx-auto mb-4 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
                <CurrencyDollarIcon className="w-8 h-8 text-yellow-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{estimate.action}</h3>
              <p className="text-3xl font-bold text-yellow-600">
                {formatCost(estimate.estimatedCost)}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Estimated cost
              </p>
              {estimate.estimatedDuration && (
                <p className="text-sm text-muted-foreground mt-2 flex items-center justify-center gap-1">
                  <ClockIcon className="w-4 h-4" />
                  ~{estimate.estimatedDuration} min
                </p>
              )}
            </div>
            {showBreakdown && breakdownContent}
            <DialogFooter>
              <Button variant="secondary" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setIsOpen(false);
                  onProceed?.();
                }}
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Proceed
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <Card className={cn("border-yellow-200 dark:border-yellow-800", className)}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
            <CurrencyDollarIcon className="w-5 h-5 text-yellow-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <h4 className="font-medium text-sm">{estimate.action}</h4>
              <span className="text-lg font-bold text-yellow-600">
                {formatCost(estimate.estimatedCost)}
              </span>
            </div>
            {estimate.estimatedDuration && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <ClockIcon className="w-3 h-3" />
                Estimated duration: ~{estimate.estimatedDuration} min
              </p>
            )}
            {showBreakdown && breakdownContent}
          </div>
        </div>
        {(onProceed || onCancel) && (
          <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-border">
            {onCancel && (
              <Button size="sm" variant="secondary" onClick={onCancel}>
                Cancel
              </Button>
            )}
            {onProceed && (
              <Button
                size="sm"
                onClick={onProceed}
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Proceed
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface UsageMeterProps {
  label: string;
  used: number;
  limit?: number;
  unit: string;
  cost?: number;
  icon?: ReactNode;
  className?: string;
}

export function UsageMeter({
  label,
  used,
  limit,
  unit,
  cost,
  icon,
  className,
}: UsageMeterProps) {
  const percentage = limit ? Math.min((used / limit) * 100, 100) : 0;
  const isWarning = percentage > 75;
  const isDanger = percentage > 90;

  const barColor = isDanger ? "bg-destructive" : isWarning ? "bg-yellow-500" : "bg-primary";

  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {icon && (
              <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center">
                {icon}
              </div>
            )}
            <span className="font-medium text-sm">{label}</span>
          </div>
          {cost !== undefined && (
            <Badge variant="secondary">
              {"$" + cost.toFixed(2)}
            </Badge>
          )}
        </div>

        <div className="flex items-baseline gap-1 mb-2">
          <span className="text-2xl font-bold">{used.toLocaleString()}</span>
          {limit && (
            <span className="text-muted-foreground text-sm">
              / {limit.toLocaleString()} {unit}
            </span>
          )}
          {!limit && <span className="text-muted-foreground text-sm">{unit}</span>}
        </div>

        {limit && (
          <div className="h-2 w-full rounded-full bg-muted mb-2">
            <div
              className={cn("h-full rounded-full transition-all", barColor)}
              style={{ width: percentage + "%" }}
            />
          </div>
        )}

        {limit && percentage > 80 && (
          <p className="text-xs text-yellow-600">
            {100 - Math.round(percentage)}% remaining
          </p>
        )}
      </CardContent>
    </Card>
  );
}

interface CostSummaryProps {
  title?: string;
  totalCost: number;
  periodLabel?: string;
  breakdown?: {
    label: string;
    cost: number;
    icon?: ReactNode;
  }[];
  comparedToPrevious?: number;
  className?: string;
}

export function CostSummary({
  title = "Cost Summary",
  totalCost,
  periodLabel = "This Month",
  breakdown,
  comparedToPrevious,
  className,
}: CostSummaryProps) {
  return (
    <Card className={className}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">{title}</h3>
          <Badge variant="secondary">
            {periodLabel}
          </Badge>
        </div>

        <div className="flex items-baseline gap-2 mb-4">
          <span className="text-3xl font-bold">{"$" + totalCost.toFixed(2)}</span>
          {comparedToPrevious !== undefined && (
            <Badge variant={comparedToPrevious > 0 ? "destructive" : "default"}>
              {comparedToPrevious > 0 ? "+" : ""}
              {comparedToPrevious.toFixed(1)}%
            </Badge>
          )}
        </div>

        {breakdown && breakdown.length > 0 && (
          <div className="space-y-3 pt-4 border-t border-border">
            {breakdown.map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {item.icon && (
                    <div className="w-6 h-6 bg-muted rounded flex items-center justify-center">
                      {item.icon}
                    </div>
                  )}
                  <span className="text-sm text-muted-foreground">{item.label}</span>
                </div>
                <span className="font-medium">{"$" + item.cost.toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface PricingTooltipProps {
  type: "voice" | "content" | "image" | "analytics";
  children: ReactNode;
}

export function PricingTooltip({ type, children }: PricingTooltipProps) {
  const getPricingInfo = () => {
    switch (type) {
      case "voice":
        return (
          <div className="space-y-2 p-2">
            <p className="font-medium">Voice AI Pricing</p>
            <p className="text-sm">{"$" + PRICING.voice.perMinute.toFixed(2)}/minute</p>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>Speech-to-text: {"$" + PRICING.voice.breakdown.stt.toFixed(2)}/min</p>
              <p>AI processing: {"$" + PRICING.voice.breakdown.llm.toFixed(2)}/min</p>
              <p>Text-to-speech: {"$" + PRICING.voice.breakdown.tts.toFixed(2)}/min</p>
              <p>Telephony: {"$" + PRICING.voice.breakdown.telephony.toFixed(2)}/min</p>
            </div>
          </div>
        );
      case "content":
        return (
          <div className="space-y-2 p-2">
            <p className="font-medium">Content Generation Pricing</p>
            <p className="text-sm">{"$" + PRICING.content.perGeneration.toFixed(2)}/generation</p>
            <p className="text-xs text-muted-foreground">Includes multi-platform variations</p>
          </div>
        );
      case "image":
        return (
          <div className="space-y-2 p-2">
            <p className="font-medium">AI Image Pricing</p>
            <p className="text-sm">{"$" + PRICING.content.perImage.toFixed(2)}/image</p>
            <p className="text-xs text-muted-foreground">Powered by DALL-E 3</p>
          </div>
        );
      case "analytics":
        return (
          <div className="space-y-2 p-2">
            <p className="font-medium">Analytics Pricing</p>
            <p className="text-sm">{"$" + PRICING.analytics.perQuery.toFixed(3)}/query</p>
            <p className="text-xs text-muted-foreground">AI-powered insights included</p>
          </div>
        );
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center gap-1 cursor-help">
            {children}
            <InformationCircleIcon className="w-4 h-4 text-muted-foreground" />
          </span>
        </TooltipTrigger>
        <TooltipContent>{getPricingInfo()}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function estimateVoiceCallCost(durationMinutes: number): CostEstimate {
  const cost = durationMinutes * PRICING.voice.perMinute;
  return {
    action: "Voice Call",
    estimatedCost: cost,
    estimatedDuration: durationMinutes,
    breakdown: [
      { label: "Speech-to-text", cost: durationMinutes * PRICING.voice.breakdown.stt },
      { label: "AI processing", cost: durationMinutes * PRICING.voice.breakdown.llm },
      { label: "Text-to-speech", cost: durationMinutes * PRICING.voice.breakdown.tts },
      { label: "Telephony", cost: durationMinutes * PRICING.voice.breakdown.telephony },
    ],
  };
}

export function estimateContentCost(count: number, includeImages: boolean = false): CostEstimate {
  let cost = count * PRICING.content.perGeneration;
  const breakdown = [
    { label: "Content generation", cost: count * PRICING.content.perGeneration },
  ];

  if (includeImages) {
    const imageCost = count * PRICING.content.perImage;
    cost += imageCost;
    breakdown.push({ label: "AI images", cost: imageCost });
  }

  return {
    action: "Generate Content",
    estimatedCost: cost,
    breakdown,
  };
}
