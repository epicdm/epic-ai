"use client";

import { useState } from "react";
import { FeatureWizardWrapper } from "./feature-wizard-wrapper";
import { Button, Card, CardBody, Slider, Select, SelectItem, Textarea } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useAnalytics } from "@/hooks/use-analytics";

export function ContentBatchWizard({ brandId }: { brandId: string }) {
  const router = useRouter();
  const { track } = useAnalytics();
  
  // Step 1: Number of posts
  const CountStep = ({ onComplete }: { onComplete: (data: any) => void }) => {
    const [count, setCount] = useState<number>(5);
    
    const handleCountChange = (value: number | number[]) => {
      setCount(Array.isArray(value) ? value[0] : value);
    };

    return (
      <Card>
        <CardBody className="space-y-4">
          <h3 className="font-medium">Content Batch Size</h3>
          <Slider 
            label="Number of posts"
            defaultValue={count}
            onChange={handleCountChange}
            minValue={5}
            maxValue={30}
            step={5}
          />
          <Button onPress={() => onComplete({ count })}>
            Continue
          </Button>
        </CardBody>
      </Card>
    );
  };

  // Step 2: Content mix
  const MixStep = ({ onComplete }: { onComplete: (data: any) => void }) => {
    const [mix, setMix] = useState({ 
      education: 50, 
      engagement: 30, 
      promo: 20 
    });
    
    const handleEducationChange = (value: number | number[]) => {
      setMix(prev => ({ ...prev, education: Array.isArray(value) ? value[0] : value }));
    };
    
    const handleEngagementChange = (value: number | number[]) => {
      setMix(prev => ({ ...prev, engagement: Array.isArray(value) ? value[0] : value }));
    };
    
    const handlePromoChange = (value: number | number[]) => {
      setMix(prev => ({ ...prev, promo: Array.isArray(value) ? value[0] : value }));
    };

    return (
      <Card>
        <CardBody className="space-y-4">
          <h3 className="font-medium">Content Mix</h3>
          <Slider 
            label="Educational Content %"
            defaultValue={mix.education}
            onChange={handleEducationChange}
            minValue={0}
            maxValue={100}
          />
          <Slider 
            label="Engagement Content %"
            defaultValue={mix.engagement}
            onChange={handleEngagementChange}
            minValue={0}
            maxValue={100}
          />
          <Slider 
            label="Promotional Content %"
            defaultValue={mix.promo}
            onChange={handlePromoChange}
            minValue={0}
            maxValue={100}
          />
          <Button onPress={() => onComplete({ mix })}>
            Continue
          </Button>
        </CardBody>
      </Card>
    );
  };

  // Step 3: Review & schedule
  const ReviewStep = ({ onComplete }: { onComplete: (data: any) => void }) => {
    return (
      <Card>
        <CardBody className="space-y-4">
          <h3 className="font-medium">Review & Schedule</h3>
          <Select 
            label="Schedule Option"
            defaultSelectedKeys={["auto"]}
          >
            <SelectItem key="auto">Auto-schedule optimally</SelectItem>
            <SelectItem key="manual">Schedule manually</SelectItem>
            <SelectItem key="draft">Save as drafts</SelectItem>
          </Select>
          <Button onPress={() => onComplete({ schedule: "auto" })}>
            Generate & Schedule
          </Button>
        </CardBody>
      </Card>
    );
  };

  const handleComplete = async (data: any) => {
    try {
      const response = await fetch(`/api/content/batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, brandId })
      });
      
      if (!response.ok) throw new Error("Failed to create batch");
      
      track("content_batch_created", { 
        count: data.count,
        brandId 
      });
      
      router.push(`/dashboard/content`);
    } catch (error) {
      console.error("Failed to create content batch:", error);
      track("content_batch_error", { error: error.message });
    }
  };

  return (
    <FeatureWizardWrapper
      featureName="Content Batch"
      steps={[
        { id: "count", title: "Batch Size", content: CountStep },
        { id: "mix", title: "Content Mix", content: MixStep },
        { id: "review", title: "Schedule", content: ReviewStep }
      ]}
      onComplete={handleComplete}
      mode="modal"
    />
  );
}
