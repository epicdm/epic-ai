"use client";

import { useState, useEffect } from "react";

declare global {
  interface Window {
    analytics?: {
      track: (event: string, data?: Record<string, any>) => void;
    };
  }
}

type AnalyticsOptions = {
  brandId?: string;
  timeRange?: string;
  metric?: string;
};

export function useAnalytics(options?: AnalyticsOptions) {
  // Guard against callers that omit the options object (e.g. tracking-only usage).
  const { brandId, timeRange, metric } = options ?? {};
  const [data, setData] = useState<any[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!brandId || !timeRange || !metric) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[useAnalytics] brandId, timeRange, and metric are required.");
      }
      setData(null);
      setIsLoading(false);
      return;
    }

    // Mock data for now - replace with actual API call
    const mockData = metric === "engagement" 
      ? Array.from({ length: 7 }, (_, i) => ({ date: `Day ${i + 1}`, value: Math.random() * 100 }))
      : Array.from({ length: 5 }, (_, i) => ({ label: `Content ${i + 1}`, value: Math.random() * 100 }));
    
    setTimeout(() => {
      setData(mockData);
      setIsLoading(false);
    }, 500);
  }, [brandId, timeRange, metric]);

  const track = (event: string, eventData?: Record<string, any>) => {
    if (typeof window !== "undefined" && window.analytics) {
      window.analytics.track(event, eventData);
    }
  };

  return { data, isLoading, track };
}
