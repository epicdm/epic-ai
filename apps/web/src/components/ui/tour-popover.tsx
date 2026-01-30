"use client";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useTour } from "@/context/tour-context";

export function TourPopover({
  tourId,
  step,
  title,
  content,
  children
}: {
  tourId: string;
  step: number;
  title: string;
  content: string;
  children: React.ReactNode;
}) {
  const { currentTour, currentStep } = useTour();
  const isActive = currentTour === tourId && currentStep === step;

  return (
    <Popover open={isActive}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      {isActive && (
        <PopoverContent className="w-80">
          <div className="space-y-2">
            <h4 className="font-medium">{title}</h4>
            <p className="text-sm text-muted-foreground">{content}</p>
          </div>
        </PopoverContent>
      )}
    </Popover>
  );
}
