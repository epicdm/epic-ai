"use client";

import { useState } from "react";
import { FeatureWizardWrapper } from "./feature-wizard-wrapper";
import { Button, Card, CardBody, Select, SelectItem, Textarea } from "@heroui/react";
import { useRouter } from "next/navigation";
import { trackEvent } from "@/lib/analytics/track";

export function JourneyBuilderWizard({ brandId }: { brandId: string }) {
  const router = useRouter();
  
  // Step 1: Journey Type
  const TypeStep = ({ onComplete }: { onComplete: (data: any) => void }) => {
    const [journeyType, setJourneyType] = useState<string>("");
    
    return (
      <Card>
        <CardBody className="space-y-4">
          <h3 className="font-medium">Journey Type</h3>
          <Select 
            label="Select journey type"
            selectedKeys={[journeyType]}
            onSelectionChange={(keys) => setJourneyType(Array.from(keys)[0] as string)}
          >
            <SelectItem key="onboarding">Customer Onboarding</SelectItem>
            <SelectItem key="education">Lead Education</SelectItem>
            <SelectItem key="retention">Customer Retention</SelectItem>
            <SelectItem key="custom">Custom Journey</SelectItem>
          </Select>
          <Button 
            onPress={() => onComplete({ journeyType })}
            isDisabled={!journeyType}
          >
            Continue
          </Button>
        </CardBody>
      </Card>
    );
  };

  // Step 2: Touchpoints
  const TouchpointsStep = ({ onComplete }: { onComplete: (data: any) => void }) => {
    const [touchpoints, setTouchpoints] = useState<string[]>(["email"]);
    
    return (
      <Card>
        <CardBody className="space-y-4">
          <h3 className="font-medium">Touchpoints</h3>
          <Textarea 
            label="Touchpoints JSON" 
            defaultValue={JSON.stringify(["email", "sms", "in-app"], null, 2)}
            onChange={(e) => setTouchpoints(JSON.parse(e.target.value))}
          />
          <Button 
            onPress={() => onComplete({ touchpoints })}
            isDisabled={!touchpoints.length}
          >
            Continue
          </Button>
        </CardBody>
      </Card>
    );
  };

  // Step 3: Triggers
  const TriggersStep = ({ onComplete }: { onComplete: (data: any) => void }) => {
    const [triggers, setTriggers] = useState<string[]>(["signup"]);
    
    return (
      <Card>
        <CardBody className="space-y-4">
          <h3 className="font-medium">Triggers</h3>
          <Textarea 
            label="Triggers JSON" 
            defaultValue={JSON.stringify(["signup", "purchase", "inactivity"], null, 2)}
            onChange={(e) => setTriggers(JSON.parse(e.target.value))}
          />
          <Button 
            onPress={() => onComplete({ triggers })}
            isDisabled={!triggers.length}
          >
            Continue
          </Button>
        </CardBody>
      </Card>
    );
  };

  // Step 4: Activate
  const ActivateStep = ({ onComplete }: { onComplete: (data: any) => void }) => {
    return (
      <Card>
        <CardBody className="space-y-4">
          <h3 className="font-medium">Activate Journey</h3>
          <Button onPress={() => onComplete({ status: "active" })}>
            Activate
          </Button>
        </CardBody>
      </Card>
    );
  };

  const handleComplete = async (data: any) => {
    try {
      // API call to create journey
      await fetch(`/api/journeys`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, brandId })
      });
      
      trackEvent("journey_created", { 
        journeyType: data.journeyType,
        brandId 
      });
      
      router.push(`/dashboard/journeys`);
    } catch (error) {
      console.error("Failed to create journey:", error);
    }
  };

  return (
    <FeatureWizardWrapper
      featureName="Journey Builder"
      steps={[
        { id: "type", title: "Journey Type", component: TypeStep },
        { id: "touchpoints", title: "Touchpoints", component: TouchpointsStep },
        { id: "triggers", title: "Triggers", component: TriggersStep },
        { id: "activate", title: "Activate", component: ActivateStep }
      ]}
      onComplete={handleComplete}
      mode="fullpage"
    />
  );
}
