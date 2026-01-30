"use client";

/**
 * Mode Switcher Component
 *
 * Allows users to switch between setup modes:
 * - AI Express: One-click AI-powered setup
 * - Guided: Streamlined step-by-step wizard
 * - Expert: Full control over all configuration options
 */

import { Button } from "@/components/ui/button";
import { Zap, Sparkles, Settings2 } from "lucide-react";
import { useRouter } from "next/navigation";

export type SetupMode = "ai" | "guided" | "expert";

interface ModeSwitcherProps {
  currentMode?: SetupMode;
}

export function ModeSwitcher({ currentMode = "expert" }: ModeSwitcherProps) {
  const router = useRouter();

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={currentMode === "ai" ? "default" : "outline"}
        size="sm"
        onClick={() => router.push("/setup/ai")}
      >
        <Zap className="w-4 h-4 mr-1" />
        AI Express
      </Button>

      <Button
        variant={currentMode === "guided" ? "default" : "outline"}
        size="sm"
        onClick={() => router.push("/setup?mode=guided")}
      >
        <Sparkles className="w-4 h-4 mr-1" />
        Guided
      </Button>

      <Button
        variant={currentMode === "expert" ? "default" : "outline"}
        size="sm"
        onClick={() => router.push("/setup")}
      >
        <Settings2 className="w-4 h-4 mr-1" />
        Expert
      </Button>
    </div>
  );
}
