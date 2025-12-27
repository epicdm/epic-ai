"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { cn } from "@/lib/utils";
import { DemoModeProvider } from "@/lib/demo";
import { DemoModeBanner } from "@/components/demo";
import { AssistantProvider, AIAssistant } from "@/components/ai-assistant";

interface DashboardShellProps {
  children: React.ReactNode;
  organizationName?: string;
  userName?: string;
}

export function DashboardShell({
  children,
  organizationName,
  userName,
}: DashboardShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Load saved preference
  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved) {
      setSidebarCollapsed(JSON.parse(saved));
    }
  }, []);

  // Save preference
  useEffect(() => {
    if (mounted) {
      localStorage.setItem("sidebar-collapsed", JSON.stringify(sidebarCollapsed));
    }
  }, [sidebarCollapsed, mounted]);

  return (
    <DemoModeProvider>
      <AssistantProvider>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
          {/* Demo Mode Banner */}
          <DemoModeBanner />

          {/* Sidebar - Desktop only */}
          <div className="hidden lg:block">
            <Sidebar
              collapsed={sidebarCollapsed}
              onCollapsedChange={setSidebarCollapsed}
            />
          </div>

          {/* Main Content */}
          <div
            className={cn(
              "transition-all duration-300",
              "lg:ml-64",
              mounted && sidebarCollapsed && "lg:ml-16"
            )}
          >
            <Header organizationName={organizationName} userName={userName} />

            <main className="p-4 lg:p-6">
              {children}
            </main>
          </div>

          {/* AI Assistant */}
          <AIAssistant />
        </div>
      </AssistantProvider>
    </DemoModeProvider>
  );
}
