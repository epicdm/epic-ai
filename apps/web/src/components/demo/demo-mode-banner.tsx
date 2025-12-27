"use client";

import { Button, Chip } from "@heroui/react";
import { BeakerIcon, XMarkIcon, SparklesIcon } from "@heroicons/react/24/outline";
import { useDemo } from "@/lib/demo/demo-context";
import { cn } from "@/lib/utils";

interface DemoModeBannerProps {
  className?: string;
}

export function DemoModeBanner({ className }: DemoModeBannerProps) {
  const { isDemo, isLoading, exitDemoMode, brandName } = useDemo();

  if (isLoading || !isDemo) {
    return null;
  }

  return (
    <div
      className={cn(
        "sticky top-0 z-50 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 text-white",
        className
      )}
    >
      {/* Desktop layout */}
      <div className="hidden sm:flex container mx-auto items-center justify-between gap-4 py-2 px-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <BeakerIcon className="w-5 h-5" />
            <span className="font-semibold text-sm">Demo Mode</span>
          </div>
          <Chip
            size="sm"
            variant="flat"
            className="bg-white/20 text-white border-white/30"
          >
            {brandName}
          </Chip>
          <span className="text-sm text-white/90">
            Exploring with sample data • No real actions
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="flat"
            className="bg-white/20 text-white hover:bg-white/30"
            startContent={<SparklesIcon className="w-4 h-4" />}
            onPress={() => {
              window.location.href = "/onboarding?from=demo";
            }}
          >
            Start for Real
          </Button>
          <Button
            size="sm"
            variant="flat"
            className="bg-white/20 text-white hover:bg-white/30"
            startContent={<XMarkIcon className="w-4 h-4" />}
            onPress={exitDemoMode}
          >
            Exit Demo
          </Button>
        </div>
      </div>

      {/* Mobile layout */}
      <div className="sm:hidden px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <BeakerIcon className="w-4 h-4 flex-shrink-0" />
            <span className="font-semibold text-xs">Demo</span>
            <div className="w-1.5 h-1.5 rounded-full bg-white/50 animate-pulse" />
            <span className="text-xs text-white/80 truncate">{brandName}</span>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            <Button
              size="sm"
              variant="flat"
              className="bg-white/20 text-white hover:bg-white/30 min-w-0 px-2"
              onPress={() => {
                window.location.href = "/onboarding?from=demo";
              }}
            >
              <SparklesIcon className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="flat"
              className="bg-white/20 text-white hover:bg-white/30 min-w-0 px-2"
              onPress={exitDemoMode}
            >
              <XMarkIcon className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Compact demo indicator for specific sections
export function DemoIndicator({ label }: { label?: string }) {
  const { isDemo } = useDemo();

  if (!isDemo) {
    return null;
  }

  return (
    <Chip
      size="sm"
      color="warning"
      variant="flat"
      startContent={<BeakerIcon className="w-3 h-3" />}
    >
      {label || "Demo Data"}
    </Chip>
  );
}
