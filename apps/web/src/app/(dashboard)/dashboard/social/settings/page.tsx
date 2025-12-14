import { Suspense } from "react";
import { AutopilotSettings } from "@/components/social/autopilot-settings";

export default function SettingsRoute() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      }
    >
      <AutopilotSettings />
    </Suspense>
  );
}
