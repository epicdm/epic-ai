"use client";

import { ReactNode } from "react";
import { Button, Card, CardBody, Chip } from "@heroui/react";
import {
  PlusIcon,
  ArrowRightIcon,
  SparklesIcon,
  PlayIcon,
} from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";

export interface EmptyStateAction {
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "demo";
  icon?: ReactNode;
}

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  actions?: EmptyStateAction[];
  features?: string[];
  showDemo?: boolean;
  onStartDemo?: () => void;
  variant?: "default" | "compact" | "card";
  className?: string;
  children?: ReactNode;
}

export function EmptyState({
  icon,
  title,
  description,
  actions = [],
  features,
  showDemo = false,
  onStartDemo,
  variant = "default",
  className,
  children,
}: EmptyStateProps) {
  const renderActions = () => {
    if (actions.length === 0 && !showDemo) return null;

    return (
      <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-3 mt-6 w-full sm:w-auto">
        {actions.map((action, index) => (
          <Button
            key={index}
            color={action.variant === "primary" ? "primary" : "default"}
            variant={action.variant === "secondary" ? "bordered" : "solid"}
            size={variant === "compact" ? "sm" : "md"}
            className={cn(
              "w-full sm:w-auto",
              variant !== "compact" && "min-w-[160px]"
            )}
            startContent={
              action.icon || (action.variant === "primary" ? <PlusIcon className="w-4 h-4" /> : null)
            }
            endContent={action.variant !== "primary" ? <ArrowRightIcon className="w-4 h-4" /> : null}
            onPress={action.onClick}
            as={action.href ? "a" : "button"}
            href={action.href}
          >
            {action.label}
          </Button>
        ))}
        {showDemo && onStartDemo && (
          <Button
            variant="flat"
            color="secondary"
            size={variant === "compact" ? "sm" : "md"}
            className="w-full sm:w-auto"
            startContent={<PlayIcon className="w-4 h-4" />}
            onPress={onStartDemo}
          >
            Try Demo Mode
          </Button>
        )}
      </div>
    );
  };

  const renderFeatures = () => {
    if (!features || features.length === 0) return null;

    return (
      <div className="flex flex-wrap items-center justify-center gap-2 mt-4 px-2">
        {features.map((feature, index) => (
          <Chip
            key={index}
            size="sm"
            variant="flat"
            color="default"
            startContent={<SparklesIcon className="w-3 h-3" />}
          >
            {feature}
          </Chip>
        ))}
      </div>
    );
  };

  const content = (
    <>
      {icon && (
        <div className={cn(
          "mx-auto mb-4 flex items-center justify-center rounded-full bg-default-100",
          variant === "compact" ? "w-12 h-12" : "w-14 h-14 sm:w-16 sm:h-16"
        )}>
          <div className={cn(
            "text-default-500",
            variant === "compact" ? "w-6 h-6" : "w-7 h-7 sm:w-8 sm:h-8"
          )}>
            {icon}
          </div>
        </div>
      )}
      <h3 className={cn(
        "font-semibold text-center px-2",
        variant === "compact" ? "text-lg" : "text-lg sm:text-xl"
      )}>
        {title}
      </h3>
      <p className={cn(
        "text-default-500 text-center mt-2 max-w-md mx-auto px-4",
        variant === "compact" ? "text-sm" : "text-sm sm:text-base"
      )}>
        {description}
      </p>
      {renderFeatures()}
      {renderActions()}
      {children}
    </>
  );

  if (variant === "card") {
    return (
      <Card className={cn("w-full", className)}>
        <CardBody className="py-8 px-4 sm:py-12 sm:px-8">
          {content}
        </CardBody>
      </Card>
    );
  }

  return (
    <div className={cn(
      "flex flex-col items-center justify-center",
      variant === "compact" ? "py-6 sm:py-8" : "py-10 sm:py-16",
      className
    )}>
      {content}
    </div>
  );
}

// Pre-configured empty states for common scenarios
export const emptyStates = {
  brands: {
    icon: <SparklesIcon className="w-full h-full" />,
    title: "Create Your First Brand",
    description: "Brands are the foundation of your AI marketing. Set up your brand voice, audience, and content pillars to get started.",
    features: ["AI-powered voice", "Target audiences", "Content pillars"],
    actions: [
      { label: "Create Brand", variant: "primary" as const, href: "/dashboard/brand/new" },
      { label: "Learn More", variant: "secondary" as const, href: "/docs/brand-brain" },
    ],
    showDemo: true,
  },
  content: {
    icon: <SparklesIcon className="w-full h-full" />,
    title: "Generate Your First Content",
    description: "Let AI create engaging content tailored to your brand voice and optimized for each social platform.",
    features: ["Multi-platform", "Brand voice", "AI-optimized"],
    actions: [
      { label: "Create Content", variant: "primary" as const, href: "/dashboard/content/new" },
    ],
    showDemo: true,
  },
  voiceAgents: {
    icon: <SparklesIcon className="w-full h-full" />,
    title: "Create Your First Voice Agent",
    description: "Voice agents can make calls, handle inquiries, and automate your sales and support workflows.",
    features: ["Outbound calls", "Inbound support", "Campaign automation"],
    actions: [
      { label: "Create Agent", variant: "primary" as const, href: "/dashboard/voice/agents/new" },
      { label: "Browse Templates", variant: "secondary" as const, href: "/dashboard/voice/templates" },
    ],
    showDemo: true,
  },
  campaigns: {
    icon: <SparklesIcon className="w-full h-full" />,
    title: "Launch Your First Campaign",
    description: "Create outbound calling campaigns with your voice agents to reach leads at scale.",
    features: ["Lead import", "Auto-dialing", "Call analytics"],
    actions: [
      { label: "Create Campaign", variant: "primary" as const, href: "/dashboard/voice/campaigns/new" },
    ],
    showDemo: true,
  },
  analytics: {
    icon: <SparklesIcon className="w-full h-full" />,
    title: "No Data Yet",
    description: "Once you start publishing content and running campaigns, you'll see your performance metrics here.",
    features: ["Engagement tracking", "AI insights", "Performance trends"],
    actions: [
      { label: "Create Content", variant: "primary" as const, href: "/dashboard/content/new" },
      { label: "Set Up Tracking", variant: "secondary" as const, href: "/dashboard/analytics/setup" },
    ],
  },
  social: {
    icon: <SparklesIcon className="w-full h-full" />,
    title: "Connect Your Social Accounts",
    description: "Link your social media accounts to publish content and track engagement directly from Epic AI.",
    features: ["Twitter/X", "LinkedIn", "Facebook & Instagram"],
    actions: [
      { label: "Connect Accounts", variant: "primary" as const, href: "/dashboard/social/connect" },
    ],
  },
};

// Type-safe empty state getter
export function getEmptyState(key: keyof typeof emptyStates): EmptyStateProps {
  return emptyStates[key];
}
