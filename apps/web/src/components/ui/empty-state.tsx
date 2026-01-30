"use client";

import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Plus as PlusIcon,
  ArrowRight as ArrowRightIcon,
  Sparkles as SparklesIcon,
  Play as PlayIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

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
        {actions.map((action, index) => {
          const buttonVariant = action.variant === "secondary" ? "outline" : "default";
          const buttonSize = variant === "compact" ? "sm" : "default";
          const buttonContent = (
            <>
              {action.icon || (action.variant === "primary" ? <PlusIcon className="w-4 h-4 mr-2" /> : null)}
              {action.label}
              {action.variant !== "primary" ? <ArrowRightIcon className="w-4 h-4 ml-2" /> : null}
            </>
          );

          if (action.href) {
            return (
              <Button
                key={index}
                variant={buttonVariant}
                size={buttonSize}
                className={cn("w-full sm:w-auto", variant !== "compact" && "min-w-[160px]")}
                asChild
              >
                <Link href={action.href}>{buttonContent}</Link>
              </Button>
            );
          }

          return (
            <Button
              key={index}
              variant={buttonVariant}
              size={buttonSize}
              className={cn("w-full sm:w-auto", variant !== "compact" && "min-w-[160px]")}
              onClick={action.onClick}
            >
              {buttonContent}
            </Button>
          );
        })}
        {showDemo && onStartDemo && (
          <Button
            variant="secondary"
            size={variant === "compact" ? "sm" : "default"}
            className="w-full sm:w-auto"
            onClick={onStartDemo}
          >
            <PlayIcon className="w-4 h-4 mr-2" />
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
          <Badge key={index} variant="secondary">
            <SparklesIcon className="w-3 h-3 mr-1" />
            {feature}
          </Badge>
        ))}
      </div>
    );
  };

  const content = (
    <>
      {icon && (
        <div className={cn(
          "mx-auto mb-4 flex items-center justify-center rounded-full bg-muted",
          variant === "compact" ? "w-12 h-12" : "w-14 h-14 sm:w-16 sm:h-16"
        )}>
          <div className={cn(
            "text-muted-foreground",
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
        "text-muted-foreground text-center mt-2 max-w-md mx-auto px-4",
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
        <CardContent className="py-8 px-4 sm:py-12 sm:px-8">
          {content}
        </CardContent>
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
