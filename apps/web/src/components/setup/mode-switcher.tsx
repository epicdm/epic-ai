"use client";

/**
 * Mode Switcher Component
 *
 * Allows users to switch between setup modes:
 * - AI Express: One-click AI-powered setup
 * - Guided: Streamlined step-by-step wizard
 * - Expert: Full control over all configuration options
 */

import { Button } from "@heroui/react";
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
        variant={currentMode === "ai" ? "solid" : "bordered"}
        color={currentMode === "ai" ? "secondary" : "default"}
        size="sm"
        startContent={<Zap className="w-4 h-4" />}
        onPress={() => router.push("/setup/ai")}
      >
        AI Express
      </Button>

      <Button
        variant={currentMode === "guided" ? "solid" : "bordered"}
        color={currentMode === "guided" ? "primary" : "default"}
        size="sm"
        startContent={<Sparkles className="w-4 h-4" />}
        onPress={() => router.push("/setup?mode=guided")}
      >
        Guided
      </Button>

      <Button
        variant={currentMode === "expert" ? "solid" : "bordered"}
        color={currentMode === "expert" ? "default" : "default"}
        size="sm"
        startContent={<Settings2 className="w-4 h-4" />}
        onPress={() => router.push("/setup")}
      >
        Expert
      </Button>
    </div>
  );
}
