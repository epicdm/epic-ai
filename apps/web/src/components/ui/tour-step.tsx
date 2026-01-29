"use client";

import { Card, CardBody, Button } from "@heroui/react";
import { useTour } from "@/hooks/use-tour";

export function TourStep({ step }: { step: TourStep }) {
  const { nextStep, prevStep, endTour } = useTour();
  
  return (
    <Card className="max-w-xs">
      <CardBody className="space-y-4">
        <p>{step.content}</p>
        <div className="flex justify-between">
          <Button size="sm" variant="flat" onPress={prevStep}>Back</Button>
          <div className="flex gap-2">
            <Button size="sm" variant="flat" onPress={endTour}>Skip</Button>
            <Button size="sm" onPress={nextStep}>Next</Button>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
