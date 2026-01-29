"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { generateFullDemoData } from "./sample-data";
import { trackEvent } from "@/lib/analytics";

interface DemoState {
  isDemo: boolean;
  isLoading: boolean;
  data: ReturnType<typeof generateFullDemoData> | null;
  brandName: string;
}

interface DemoContextType extends DemoState {
  enterDemoMode: (brandName?: string) => Promise<void>;
  exitDemoMode: () => Promise<void>;
  refreshDemoData: () => void;
}

const DemoContext = createContext<DemoContextType | null>(null);

export function DemoModeProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoState>({
    isDemo: false,
    isLoading: true,
    data: null,
    brandName: "Demo Company",
  });

  // Check demo mode status on mount
  useEffect(() => {
    checkDemoStatus();
  }, []);

  const checkDemoStatus = async () => {
    try {
      const res = await fetch("/api/demo/status");
      if (res.ok) {
        const data = await res.json();
        if (data.isDemo) {
          setState({
            isDemo: true,
            isLoading: false,
            data: data.demoData,
            brandName: data.brandName || "Demo Company",
          });
          return;
        }
      }
    } catch (error) {
      console.error("Error checking demo status:", error);
    }
    setState((prev) => ({ ...prev, isLoading: false }));
  };

  const enterDemoMode = useCallback(async (brandName: string = "Demo Company") => {
    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      const res = await fetch("/api/demo/enter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandName }),
      });

      if (res.ok) {
        const data = await res.json();
        setState({
          isDemo: true,
          isLoading: false,
          data: data.demoData,
          brandName,
        });
        
        // Track demo mode started
        trackEvent("demo_mode_started", { brand_name: brandName });
      } else {
        throw new Error("Failed to enter demo mode");
      }
    } catch (error) {
      console.error("Error entering demo mode:", error);
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, []);

  const exitDemoMode = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      const res = await fetch("/api/demo/exit", {
        method: "POST",
      });

      if (res.ok) {
        // Track demo mode ended before state reset
        trackEvent("demo_mode_ended", {});
        
        setState({
          isDemo: false,
          isLoading: false,
          data: null,
          brandName: "",
        });
        // Redirect to dashboard
        window.location.href = "/dashboard";
      } else {
        throw new Error("Failed to exit demo mode");
      }
    } catch (error) {
      console.error("Error exiting demo mode:", error);
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, []);

  const refreshDemoData = useCallback(() => {
    if (!state.isDemo) return;
    const freshData = generateFullDemoData(state.brandName);
    setState((prev) => ({ ...prev, data: freshData }));
  }, [state.isDemo, state.brandName]);

  return (
    <DemoContext.Provider
      value={{
        ...state,
        enterDemoMode,
        exitDemoMode,
        refreshDemoData,
      }}
    >
      {children}
    </DemoContext.Provider>
  );
}

export function useDemo() {
  const context = useContext(DemoContext);
  if (!context) {
    throw new Error("useDemo must be used within a DemoModeProvider");
  }
  return context;
}

// Hook to get demo data with fallback for non-demo mode
export function useDemoData<T>(realData: T | null | undefined, demoDataKey: keyof ReturnType<typeof generateFullDemoData>): T | null {
  const { isDemo, data } = useDemo();

  if (isDemo && data) {
    return data[demoDataKey] as T;
  }

  return realData ?? null;
}
