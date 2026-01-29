"use client";

import { cn } from "@/lib/utils";
import { useSidebarStore } from "@/stores/sidebar-store";
import { AppSidebar } from "./app-sidebar";
import { AppHeader } from "./app-header";
import { DemoModeProvider } from "@/lib/demo";
import { DemoModeBanner } from "@/components/demo";
import { AssistantProvider, AIAssistant } from "@/components/ai-assistant";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const collapsed = useSidebarStore((s) => s.collapsed);

  return (
    <DemoModeProvider>
      <AssistantProvider>
        <div className="min-h-screen bg-background">
          <DemoModeBanner />
          <AppSidebar />

          <div
            className={cn(
              "transition-all duration-200",
              "lg:ml-60",
              collapsed && "lg:ml-[52px]"
            )}
          >
            <AppHeader />
            <main className="p-4 lg:p-6">{children}</main>
          </div>

          <AIAssistant />
        </div>
      </AssistantProvider>
    </DemoModeProvider>
  );
}
