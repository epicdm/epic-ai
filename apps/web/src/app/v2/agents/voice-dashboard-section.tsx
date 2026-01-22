"use client";

import { DemoModeProvider } from "@/lib/demo";
import { VoiceDashboard } from "@/components/voice/voice-dashboard";

export function VoiceDashboardSection() {
  return (
    <DemoModeProvider>
      <VoiceDashboard />
    </DemoModeProvider>
  );
}
