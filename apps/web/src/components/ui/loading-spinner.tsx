"use client";

import { Spinner } from "@heroui/react";

export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-screen">
      <Spinner size="lg" />
    </div>
  );
}
