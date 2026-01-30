"use client";

import { useState } from "react";
import { FeatureWizardWrapper } from "./feature-wizard-wrapper";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "next/navigation";
import { useAnalytics } from "@/lib/analytics";
import { AIBadge, AIConfidenceDots } from "@/components/ui/ai-badge";

type WorkflowTemplate = {
  id: string;
  name: string;
  recommended?: boolean;
  confidence?: number;
  reason?: string;
  actions?: string[];
};

export function AutomationWizard({ brandId }: { brandId: string }) {
  const router = useRouter();
  const { track } = useAnalytics();
  
  // Step 1: Choose workflow type
  const WorkflowTypeStep = ({ onComplete }: { onComplete: (data: any) => void }) => {
    const [workflowType, setWorkflowType] = useState<string>("");
    
    return (
      <Card>
        <CardContent className="space-y-4">
          <h3 className="font-medium">Workflow Type</h3>
          <Select value={workflowType} onValueChange={(v: string) => setWorkflowType(v)}>
              <SelectTrigger><SelectValue placeholder="Select workflow type" /></SelectTrigger>
              <SelectContent>
            <SelectItem value="welcome">Welcome Series</SelectItem>
            <SelectItem value="nurture">Lead Nurture</SelectItem>
            <SelectItem value="winback">Win-back</SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
            </Select>
          <Button 
            onClick={() => onComplete({ workflowType })}
            disabled={!workflowType}
          >
            Continue
          </Button>
        </CardContent>
      </Card>
    );
  };

  // Step 2: Choose template or blank
  const TemplateStep = ({ onComplete }: { onComplete: (data: any) => void }) => {
    const [template, setTemplate] = useState<WorkflowTemplate | null>(null);
    const [previewTemplate, setPreviewTemplate] = useState<WorkflowTemplate | null>(null);
    
    const templates = [
      { id: "welcome", name: "Welcome", recommended: true, confidence: 92, reason: "Best for new customer onboarding" },
      { id: "nurture", name: "Nurture", recommended: false, confidence: 85, reason: "Effective for lead education" },
      { id: "winback", name: "Win-back", recommended: false, confidence: 78, reason: "Helps re-engage inactive users" }
    ];

    const handlePreview = async (templateId: string) => {
      // TODO: Call API to get template preview
      // const response = await fetch(`/api/automations/templates/${templateId}`);
      // const template = await response.json();
      // if (template) setPreviewTemplate(template);
      console.log('Preview template:', templateId);
    };
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardContent className="space-y-4">
            <h3 className="font-medium">Workflow Template</h3>
            <div className="grid grid-cols-1 gap-4">
              {templates.map((t) => (
                <Card 
                  key={t.id} 
                  className="cursor-pointer" 
                  onClick={() => setTemplate(t)}
                  className={template?.id === t.id ? "border-primary" : ""}
                >
                  <CardContent className="relative">
                    {t.recommended && (
                      <AIBadge 
                        type="recommended" 
                        size="sm"
                        reason={t.reason}
                        confidence={t.confidence}
                        position="corner"
                        className="absolute top-2 right-2"
                      />
                    )}
                    <div className="flex items-center justify-between">
                      <h4 className="capitalize">{t.name} Series</h4>
                      <Button 
                        size="sm" 
                        variant="secondary"
                        onClick={() => handlePreview(t.id)}
                      >
                        Preview
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {t.id === "welcome" ? "New lead onboarding" : 
                       t.id === "nurture" ? "Lead education" : "Re-engage inactive leads"}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
        
        {previewTemplate && (
          <Card>
            <CardContent>
              <h3 className="font-medium mb-4">Template Preview</h3>
              <pre className="bg-muted p-4 rounded-lg overflow-auto">
                {JSON.stringify(previewTemplate, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}
        
        <div className="md:col-span-2">
          <Button 
            onClick={() => onComplete({ template })}
            disabled={!template}
            className="w-full"
          >
            Continue
          </Button>
        </div>
      </div>
    );
  };

  // Step 3: Configure actions
  const ActionsStep = ({ onComplete }: { onComplete: (data: any) => void }) => {
    const [actions, setActions] = useState<string[]>(["email", "wait"]);
    
    return (
      <Card>
        <CardContent className="space-y-4">
          <h3 className="font-medium">Workflow Actions</h3>
          <Textarea 
            label="Actions JSON" 
            defaultValue={JSON.stringify(["email", "wait"], null, 2)}
            onChange={(e) => setActions(JSON.parse(e.target.value))}
          />
          <Button 
            onClick={() => onComplete({ actions })}
            disabled={!actions.length}
          >
            Continue
          </Button>
        </CardContent>
      </Card>
    );
  };

  // Step 4: Test & activate
  const ActivateStep = ({ onComplete }: { onComplete: (data: any) => void }) => {
    return (
      <Card>
        <CardContent className="space-y-4">
          <h3 className="font-medium">Activate Workflow</h3>
          <p>Review your settings and activate the workflow</p>
          <Button onClick={() => onComplete({ status: "active" })}>
            Activate
          </Button>
        </CardContent>
      </Card>
    );
  };

  const handleComplete = async (data: any) => {
    try {
      await fetch(`/api/automations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, brandId })
      });
      
      track("workflow_created", { 
        workflowType: data.workflowType,
        brandId 
      });
      
      router.push(`/dashboard/automations`);
    } catch (error) {
      console.error("Failed to create workflow:", error);
    }
  };

  return (
    <FeatureWizardWrapper
      featureName="Automation"
      steps={[
        { id: "type", title: "Workflow Type", content: <WorkflowTypeStep onComplete={(data) => handleComplete(data)} /> },
        { id: "template", title: "Template", content: <TemplateStep onComplete={(data) => handleComplete(data)} /> },
        { id: "actions", title: "Actions", content: <ActionsStep onComplete={(data) => handleComplete(data)} /> },
        { id: "activate", title: "Activate", content: <ActivateStep onComplete={(data) => handleComplete(data)} /> }
      ]}
      onComplete={handleComplete}
      mode="fullpage"
    />
  );
}
