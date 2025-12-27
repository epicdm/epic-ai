"use client";

import { ReactNode, useState } from "react";
import {
  Card,
  CardBody,
  Chip,
  Progress,
  Tooltip,
  Button,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from "@heroui/react";
import {
  CurrencyDollarIcon,
  InformationCircleIcon,
  ChartBarIcon,
  ClockIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";

// Pricing constants (in USD)
export const PRICING = {
  voice: {
    perMinute: 0.15, // $0.15 per minute
    breakdown: {
      stt: 0.04, // Speech-to-text
      llm: 0.06, // LLM processing
      tts: 0.03, // Text-to-speech
      telephony: 0.02, // Phone line
    },
  },
  content: {
    perGeneration: 0.02, // $0.02 per content piece
    perImage: 0.04, // $0.04 per AI image
  },
  analytics: {
    perQuery: 0.001, // $0.001 per analytics query
  },
};

export interface CostEstimate {
  action: string;
  estimatedCost: number;
  estimatedDuration?: number; // in minutes for voice
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
  const { isOpen, onOpen, onClose } = useDisclosure();

  const formatCost = (cost: number) => {
    if (cost < 0.01) return "< $0.01";
    return `$${cost.toFixed(2)}`;
  };

  const breakdownContent = estimate.breakdown && (
    <div className="space-y-2 mt-3">
      <p className="text-xs text-default-500 uppercase font-medium">
        Cost Breakdown
      </p>
      {estimate.breakdown.map((item, i) => (
        <div key={i} className="flex justify-between text-sm">
          <span className="text-default-600">{item.label}</span>
          <span className="text-default-800 font-medium">
            {formatCost(item.cost)}
          </span>
        </div>
      ))}
    </div>
  );

  if (variant === "inline") {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Chip
          size="sm"
          variant="flat"
          color="warning"
          startContent={<CurrencyDollarIcon className="w-3 h-3" />}
        >
          Est. {formatCost(estimate.estimatedCost)}
        </Chip>
        {showBreakdown && estimate.breakdown && (
          <Tooltip content={breakdownContent}>
            <button className="text-default-400 hover:text-default-600">
              <InformationCircleIcon className="w-4 h-4" />
            </button>
          </Tooltip>
        )}
      </div>
    );
  }

  if (variant === "modal") {
    return (
      <>
        <Button
          color="primary"
          onPress={onOpen}
          isLoading={isLoading}
          className={className}
        >
          {estimate.action}
        </Button>

        <Modal isOpen={isOpen} onClose={onClose} size="sm">
          <ModalContent>
            <ModalHeader className="flex items-center gap-2">
              <CurrencyDollarIcon className="w-5 h-5 text-warning" />
              Confirm Action
            </ModalHeader>
            <ModalBody>
              <div className="text-center py-4">
                <div className="w-16 h-16 mx-auto mb-4 bg-warning-100 dark:bg-warning-900/30 rounded-full flex items-center justify-center">
                  <CurrencyDollarIcon className="w-8 h-8 text-warning-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{estimate.action}</h3>
                <p className="text-3xl font-bold text-warning-600">
                  {formatCost(estimate.estimatedCost)}
                </p>
                <p className="text-sm text-default-500 mt-1">
                  Estimated cost
                </p>
                {estimate.estimatedDuration && (
                  <p className="text-sm text-default-500 mt-2 flex items-center justify-center gap-1">
                    <ClockIcon className="w-4 h-4" />
                    ~{estimate.estimatedDuration} min
                  </p>
                )}
              </div>
              {showBreakdown && breakdownContent}
            </ModalBody>
            <ModalFooter>
              <Button variant="flat" onPress={onClose}>
                Cancel
              </Button>
              <Button
                color="primary"
                onPress={() => {
                  onClose();
                  onProceed?.();
                }}
                isLoading={isLoading}
              >
                Proceed
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </>
    );
  }

  // Card variant (default)
  return (
    <Card className={cn("border-warning-200 dark:border-warning-800", className)}>
      <CardBody className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-warning-100 dark:bg-warning-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
            <CurrencyDollarIcon className="w-5 h-5 text-warning-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <h4 className="font-medium text-sm">{estimate.action}</h4>
              <span className="text-lg font-bold text-warning-600">
                {formatCost(estimate.estimatedCost)}
              </span>
            </div>
            {estimate.estimatedDuration && (
              <p className="text-xs text-default-500 flex items-center gap-1">
                <ClockIcon className="w-3 h-3" />
                Estimated duration: ~{estimate.estimatedDuration} min
              </p>
            )}
            {showBreakdown && breakdownContent}
          </div>
        </div>
        {(onProceed || onCancel) && (
          <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-divider">
            {onCancel && (
              <Button size="sm" variant="flat" onPress={onCancel}>
                Cancel
              </Button>
            )}
            {onProceed && (
              <Button
                size="sm"
                color="primary"
                onPress={onProceed}
                isLoading={isLoading}
              >
                Proceed
              </Button>
            )}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

// Usage Meter Component
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

  return (
    <Card className={className}>
      <CardBody className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {icon && (
              <div className="w-8 h-8 bg-default-100 rounded-lg flex items-center justify-center">
                {icon}
              </div>
            )}
            <span className="font-medium text-sm">{label}</span>
          </div>
          {cost !== undefined && (
            <Chip size="sm" variant="flat" color="default">
              ${cost.toFixed(2)}
            </Chip>
          )}
        </div>

        <div className="flex items-baseline gap-1 mb-2">
          <span className="text-2xl font-bold">{used.toLocaleString()}</span>
          {limit && (
            <span className="text-default-500 text-sm">
              / {limit.toLocaleString()} {unit}
            </span>
          )}
          {!limit && <span className="text-default-500 text-sm">{unit}</span>}
        </div>

        {limit && (
          <Progress
            value={percentage}
            size="sm"
            color={isDanger ? "danger" : isWarning ? "warning" : "primary"}
            className="mb-2"
          />
        )}

        {limit && percentage > 80 && (
          <p className="text-xs text-warning-600">
            {100 - Math.round(percentage)}% remaining
          </p>
        )}
      </CardBody>
    </Card>
  );
}

// Cost Summary Card
interface CostSummaryProps {
  title?: string;
  totalCost: number;
  periodLabel?: string;
  breakdown?: {
    label: string;
    cost: number;
    icon?: ReactNode;
  }[];
  comparedToPrevious?: number; // percentage change
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
      <CardBody className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">{title}</h3>
          <Chip size="sm" variant="flat" color="default">
            {periodLabel}
          </Chip>
        </div>

        <div className="flex items-baseline gap-2 mb-4">
          <span className="text-3xl font-bold">${totalCost.toFixed(2)}</span>
          {comparedToPrevious !== undefined && (
            <Chip
              size="sm"
              variant="flat"
              color={comparedToPrevious > 0 ? "danger" : "success"}
            >
              {comparedToPrevious > 0 ? "+" : ""}
              {comparedToPrevious.toFixed(1)}%
            </Chip>
          )}
        </div>

        {breakdown && breakdown.length > 0 && (
          <div className="space-y-3 pt-4 border-t border-divider">
            {breakdown.map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {item.icon && (
                    <div className="w-6 h-6 bg-default-100 rounded flex items-center justify-center">
                      {item.icon}
                    </div>
                  )}
                  <span className="text-sm text-default-600">{item.label}</span>
                </div>
                <span className="font-medium">${item.cost.toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

// Pricing Info Tooltip
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
            <p className="text-sm">${PRICING.voice.perMinute.toFixed(2)}/minute</p>
            <div className="text-xs text-default-500 space-y-1">
              <p>• Speech-to-text: ${PRICING.voice.breakdown.stt.toFixed(2)}/min</p>
              <p>• AI processing: ${PRICING.voice.breakdown.llm.toFixed(2)}/min</p>
              <p>• Text-to-speech: ${PRICING.voice.breakdown.tts.toFixed(2)}/min</p>
              <p>• Telephony: ${PRICING.voice.breakdown.telephony.toFixed(2)}/min</p>
            </div>
          </div>
        );
      case "content":
        return (
          <div className="space-y-2 p-2">
            <p className="font-medium">Content Generation Pricing</p>
            <p className="text-sm">${PRICING.content.perGeneration.toFixed(2)}/generation</p>
            <p className="text-xs text-default-500">
              Includes multi-platform variations
            </p>
          </div>
        );
      case "image":
        return (
          <div className="space-y-2 p-2">
            <p className="font-medium">AI Image Pricing</p>
            <p className="text-sm">${PRICING.content.perImage.toFixed(2)}/image</p>
            <p className="text-xs text-default-500">
              Powered by DALL-E 3
            </p>
          </div>
        );
      case "analytics":
        return (
          <div className="space-y-2 p-2">
            <p className="font-medium">Analytics Pricing</p>
            <p className="text-sm">${PRICING.analytics.perQuery.toFixed(3)}/query</p>
            <p className="text-xs text-default-500">
              AI-powered insights included
            </p>
          </div>
        );
    }
  };

  return (
    <Tooltip content={getPricingInfo()}>
      <span className="inline-flex items-center gap-1 cursor-help">
        {children}
        <InformationCircleIcon className="w-4 h-4 text-default-400" />
      </span>
    </Tooltip>
  );
}

// Estimate helpers
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
