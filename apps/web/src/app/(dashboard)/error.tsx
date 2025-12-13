"use client";

import { useEffect } from "react";
import { Button } from "@heroui/react";
import { useRouter } from "next/navigation";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    // Log the error for debugging
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-danger/10 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-danger"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-bold mb-2">Something went wrong</h2>
        <p className="text-default-500 mb-6">
          We encountered an error loading this page. This has been logged for investigation.
        </p>
        {error.digest && (
          <p className="text-xs text-default-400 mb-4">
            Error ID: {error.digest}
          </p>
        )}
        <div className="flex gap-3 justify-center">
          <Button variant="bordered" onPress={() => router.push("/")}>
            Go Home
          </Button>
          <Button color="primary" onPress={() => reset()}>
            Try Again
          </Button>
        </div>
      </div>
    </div>
  );
}
