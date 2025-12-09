import { Suspense } from "react";
import { AutopilotSettings } from "@/components/social/autopilot-settings";
import { Spinner } from "@heroui/react";

export default function SettingsRoute() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center h-64">
          <Spinner size="lg" />
        </div>
      }
    >
      <AutopilotSettings />
    </Suspense>
  );
}
