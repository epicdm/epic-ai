"use client";

import { Suspense } from "react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { TourProvider } from "@/context/tour-context";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <TourProvider>
      <Suspense fallback={<LoadingSpinner />}>
        {children}
      </Suspense>
    </TourProvider>
  );
}
