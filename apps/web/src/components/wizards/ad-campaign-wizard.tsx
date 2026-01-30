"use client";

import { useState } from "react";
import { FeatureWizardWrapper } from "./feature-wizard-wrapper";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "next/navigation";
import { useAnalytics } from "@/lib/analytics";

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
        <CardContent className="space-y-4">
          <h3 className="font-medium">Ad Platform</h3>
          <Select value={platform} onValueChange={(v: string) => setPlatform(v)}>
              <SelectTrigger><SelectValue placeholder="Select platform" /></SelectTrigger>
              <SelectContent>
            <SelectItem value="facebook">Facebook & Instagram</SelectItem>
            <SelectItem value="google">Google Ads</SelectItem>
            <SelectItem value="linkedin">LinkedIn</SelectItem>
          </SelectContent>
            </Select>
          <Button 
            onClick={() => onComplete({ platform })}
            disabled={!platform}
          >
            Continue
          </Button>
        </CardContent>
      </Card>
    );
  };

  // Step 2: Connect ad account
  const AccountStep = ({ onComplete }: { onComplete: (data: any) => void }) => {
    const [accountId, setAccountId] = useState<string>("");
    
    return (
      <Card>
        <CardContent className="space-y-4">
          <h3 className="font-medium">Ad Account</h3>
          <Input 
            label="Account ID" 
            value={accountId} 
            onChange={(e) => setAccountId(e.target.value)} 
          />
          <Button 
            onClick={() => onComplete({ accountId })}
            disabled={!accountId}
          >
            Connect Account
          </Button>
        </CardContent>
      </Card>
    );
  };

  // Step 3: Choose objective
  const ObjectiveStep = ({ onComplete }: { onComplete: (data: any) => void }) => {
    const [objective, setObjective] = useState<string>("");
    
    return (
      <Card>
        <CardContent className="space-y-4">
          <h3 className="font-medium">Campaign Objective</h3>
          <Select value={objective} onValueChange={(v: string) => setObjective(v)}>
              <SelectTrigger><SelectValue placeholder="Select objective" /></SelectTrigger>
              <SelectContent>
            <SelectItem value="traffic">Website Traffic</SelectItem>
            <SelectItem value="leads">Lead Generation</SelectItem>
            <SelectItem value="conversions">Conversions</SelectItem>
          </SelectContent>
            </Select>
          <Button 
            onClick={() => onComplete({ objective })}
            disabled={!objective}
          >
            Continue
          </Button>
        </CardContent>
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
        <CardContent className="space-y-4">
          <h3 className="font-medium">Budget & Schedule</h3>
          <div>
              <label className="text-sm font-medium">Daily Budget ($)</label>
              <input type="range" className="w-full" value={budget} onChange={(e) => handleBudgetChange(Number(e.target.value))} min={5} max={500} step={5} />
            </div>
          {!isValid && (
            <p className="text-danger-500 text-sm">Minimum budget is $5/day</p>
          )}
          <div>
              <label className="text-sm font-medium">Duration (days)</label>
              <input type="range" className="w-full" value={duration} onChange={(e) => handleDurationChange(Number(e.target.value))} min={1} max={30} step={1} />
            </div>
          <Button 
            onClick={() => onComplete({ budget, duration })}
            disabled={!isValid}
          >
            Continue
          </Button>
        </CardContent>
      </Card>
    );
  };

  // Step 5: Review & launch
  const ReviewStep = ({ onComplete, wizardData }: { onComplete: (data: any) => void, wizardData: any }) => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardContent className="space-y-4">
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
            <Button onClick={() => onComplete({ status: "active" })}>
              Launch Campaign
            </Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent>
            <h3 className="font-medium mb-4">Creative Preview</h3>
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-muted-foreground text-sm">
                Ad preview will appear here based on your creative assets
              </p>
            </div>
          </CardContent>
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
