"use client";

import { useState } from "react";
import { FeatureWizardWrapper } from "./feature-wizard-wrapper";
import { Button, Card, CardBody, Input, Select, SelectItem, Slider, Textarea } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useAnalytics } from "@/hooks/use-analytics";

type WizardStep = {
  id: string;
  title: string;
  content: React.ComponentType<any>;
};

export function AdCampaignWizard({ brandId }: { brandId: string }) {
  const router = useRouter();
  const { track } = useAnalytics();
  
  // Step 1: Choose platform
  const PlatformStep = ({ onComplete }: { onComplete: (data: any) => void }) => {
    const [platform, setPlatform] = useState<string>("");
    
    return (
      <Card>
        <CardBody className="space-y-4">
          <h3 className="font-medium">Ad Platform</h3>
          <Select 
            label="Select platform"
            selectedKeys={[platform]}
            onSelectionChange={(keys) => setPlatform(Array.from(keys)[0] as string)}
          >
            <SelectItem key="facebook">Facebook & Instagram</SelectItem>
            <SelectItem key="google">Google Ads</SelectItem>
            <SelectItem key="linkedin">LinkedIn</SelectItem>
          </Select>
          <Button 
            onPress={() => onComplete({ platform })}
            isDisabled={!platform}
          >
            Continue
          </Button>
        </CardBody>
      </Card>
    );
  };

  // Step 2: Connect ad account
  const AccountStep = ({ onComplete }: { onComplete: (data: any) => void }) => {
    const [accountId, setAccountId] = useState<string>("");
    
    return (
      <Card>
        <CardBody className="space-y-4">
          <h3 className="font-medium">Ad Account</h3>
          <Input 
            label="Account ID" 
            value={accountId} 
            onChange={(e) => setAccountId(e.target.value)} 
          />
          <Button 
            onPress={() => onComplete({ accountId })}
            isDisabled={!accountId}
          >
            Connect Account
          </Button>
        </CardBody>
      </Card>
    );
  };

  // Step 3: Choose objective
  const ObjectiveStep = ({ onComplete }: { onComplete: (data: any) => void }) => {
    const [objective, setObjective] = useState<string>("");
    
    return (
      <Card>
        <CardBody className="space-y-4">
          <h3 className="font-medium">Campaign Objective</h3>
          <Select 
            label="Select objective"
            selectedKeys={[objective]}
            onSelectionChange={(keys) => setObjective(Array.from(keys)[0] as string)}
          >
            <SelectItem key="traffic">Website Traffic</SelectItem>
            <SelectItem key="leads">Lead Generation</SelectItem>
            <SelectItem key="conversions">Conversions</SelectItem>
          </Select>
          <Button 
            onPress={() => onComplete({ objective })}
            isDisabled={!objective}
          >
            Continue
          </Button>
        </CardBody>
      </Card>
    );
  };

  // Step 4: Set budget & schedule
  const BudgetStep = ({ onComplete }: { onComplete: (data: any) => void }) => {
    const [budget, setBudget] = useState<number>(50);
    const [duration, setDuration] = useState<number>(7);
    const [isValid, setIsValid] = useState(true);
    
    const handleBudgetChange = (value: number | number[]) => {
      const newBudget = Array.isArray(value) ? value[0] : value;
      setBudget(newBudget);
      setIsValid(newBudget >= 5);
    };
    
    const handleDurationChange = (value: number | number[]) => {
      setDuration(Array.isArray(value) ? value[0] : value);
    };

    return (
      <Card>
        <CardBody className="space-y-4">
          <h3 className="font-medium">Budget & Schedule</h3>
          <Slider 
            label="Daily Budget ($)"
            value={budget}
            onChange={handleBudgetChange}
            minValue={5}
            maxValue={500}
            step={5}
            color={isValid ? "primary" : "danger"}
          />
          {!isValid && (
            <p className="text-danger-500 text-sm">Minimum budget is $5/day</p>
          )}
          <Slider 
            label="Duration (days)"
            value={duration}
            onChange={handleDurationChange}
            minValue={1}
            maxValue={30}
          />
          <Button 
            onPress={() => onComplete({ budget, duration })}
            isDisabled={!isValid}
          >
            Continue
          </Button>
        </CardBody>
      </Card>
    );
  };

  // Step 5: Review & launch
  const ReviewStep = ({ onComplete, wizardData }: { onComplete: (data: any) => void, wizardData: any }) => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardBody className="space-y-4">
            <h3 className="font-medium">Campaign Summary</h3>
            <div className="space-y-2">
              <p><strong>Platform:</strong> {wizardData.platform}</p>
              <p><strong>Objective:</strong> {wizardData.objective}</p>
              <p><strong>Daily Budget:</strong> ${wizardData.budget}</p>
              <p><strong>Duration:</strong> {wizardData.duration} days</p>
            </div>
            <Textarea 
              label="Notes" 
              placeholder="Add any campaign notes..."
            />
            <Button onPress={() => onComplete({ status: "active" })}>
              Launch Campaign
            </Button>
          </CardBody>
        </Card>
        
        <Card>
          <CardBody>
            <h3 className="font-medium mb-4">Creative Preview</h3>
            <div className="bg-default-100 p-4 rounded-lg">
              <p className="text-muted-foreground text-sm">
                Ad preview will appear here based on your creative assets
              </p>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  };

  const handleComplete = async (data: any) => {
    try {
      // API call to create campaign
      await fetch(`/api/ads/campaigns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, brandId })
      });
      
      track("campaign_created", { 
        platform: data.platform,
        objective: data.objective,
        brandId
      });
      
      router.push(`/dashboard/ads`);
    } catch (error) {
      console.error("Failed to create campaign:", error);
    }
  };

  return (
    <FeatureWizardWrapper
      featureName="Ad Campaign"
      steps={[
        { id: "platform", title: "Platform", content: PlatformStep },
        { id: "account", title: "Account", content: AccountStep },
        { id: "objective", title: "Objective", content: ObjectiveStep },
        { id: "budget", title: "Budget", content: BudgetStep },
        { id: "review", title: "Review", content: ReviewStep }
      ]}
      onComplete={handleComplete}
      mode="fullpage"
    />
  );
}
