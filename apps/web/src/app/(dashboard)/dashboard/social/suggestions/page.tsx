import { Suspense } from "react";
import { SuggestionsPage } from "@/components/social/suggestions-page";
import { Spinner } from "@heroui/react";

export default function SuggestionsRoute() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center h-64">
          <Spinner size="lg" />
        </div>
      }
    >
      <SuggestionsPage />
    </Suspense>
  );
}
