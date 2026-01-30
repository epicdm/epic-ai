"use client";

import { useState } from "react";
import { FeatureWizardWrapper } from "./feature-wizard-wrapper";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "next/navigation";
import { trackEvent } from "@/lib/analytics/track";

export function JourneyBuilderWizard({ brandId }: { brandId: string }) {
  const router = useRouter();
  
  // Step 1: Journey Type
  const TypeStep = ({ onComplete }: { onComplete: (data: any) => void }) => {
    const [journeyType, setJourneyType] = useState<string>("");
    
    return (
      <Card>
        <CardContent className="space-y-4">
          <h3 className="font-medium">Journey Type</h3>
          <Select value={journeyType} onValueChange={(v: string) => setJourneyType(v)}>
              <SelectTrigger><SelectValue placeholder="Select journey type" /></SelectTrigger>
              <SelectContent>
            <SelectItem value="onboarding">Customer Onboarding</SelectItem>
            <SelectItem value="education">Lead Education</SelectItem>
            <SelectItem value="retention">Customer Retention</SelectItem>
            <SelectItem value="custom">Custom Journey</SelectItem>
          </SelectContent>
            </Select>
          <Button 
            onClick={() => onComplete({ journeyType })}
            disabled={!journeyType}
          >
            Continue
          </Button>
        </CardContent>
      </Card>
    );
  };

  // Step 2: Touchpoints
  const TouchpointsStep = ({ onComplete }: { onComplete: (data: any) => void }) => {
    const [touchpoints, setTouchpoints] = useState<string[]>(["email"]);
    
    return (
      <Card>
        <CardContent className="space-y-4">
          <h3 className="font-medium">Touchpoints</h3>
          <Textarea 
            label="Touchpoints JSON" 
            defaultValue={JSON.stringify(["email", "sms", "in-app"], null, 2)}
            onChange={(e) => setTouchpoints(JSON.parse(e.target.value))}
          />
          <Button 
            onClick={() => onComplete({ touchpoints })}
            disabled={!touchpoints.length}
          >
            Continue
          </Button>
        </CardContent>
      </Card>
    );
  };

  // Step 3: Triggers
  const TriggersStep = ({ onComplete }: { onComplete: (data: any) => void }) => {
    const [triggers, setTriggers] = useState<string[]>(["signup"]);
    
    return (
      <Card>
        <CardContent className="space-y-4">
          <h3 className="font-medium">Triggers</h3>
          <Textarea 
            label="Triggers JSON" 
            defaultValue={JSON.stringify(["signup", "purchase", "inactivity"], null, 2)}
            onChange={(e) => setTriggers(JSON.parse(e.target.value))}
          />
          <Button 
            onClick={() => onComplete({ triggers })}
            disabled={!triggers.length}
          >
            Continue
          </Button>
        </CardContent>
      </Card>
    );
  };

  // Step 4: Activate
  const ActivateStep = ({ onComplete }: { onComplete: (data: any) => void }) => {
    return (
      <Card>
        <CardContent className="space-y-4">
          <h3 className="font-medium">Activate Journey</h3>
          <Button onClick={() => onComplete({ status: "active" })}>
            Activate
          </Button>
        </CardContent>
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
