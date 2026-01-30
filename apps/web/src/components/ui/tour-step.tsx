"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTour } from "@/hooks/use-tour";

export function TourStep({ step }: { step: TourStep }) {
  const { nextStep, prevStep, endTour } = useTour();

  return (
    <Card className="max-w-xs">
      <CardContent className="space-y-4 p-4">
        <p>{step.content}</p>
        <div className="flex justify-between">
          <Button size="sm" variant="secondary" onClick={prevStep}>Back</Button>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={endTour}>Skip</Button>
            <Button size="sm" onClick={nextStep}>Next</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
