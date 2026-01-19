"use client";

declare global {
  interface Window {
    analytics?: {
      track: (event: string, data?: Record<string, any>) => void;
    };
  }
}

export function useAnalytics() {
  const track = (event: string, data?: Record<string, any>) => {
    if (typeof window !== "undefined" && window.analytics) {
      window.analytics.track(event, data);
    }
  };

  return { track };
}
