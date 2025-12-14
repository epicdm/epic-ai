import { Suspense } from "react";
import { SuggestionsPage } from "@/components/social/suggestions-page";

export default function SuggestionsRoute() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      }
    >
      <SuggestionsPage />
    </Suspense>
  );
}
