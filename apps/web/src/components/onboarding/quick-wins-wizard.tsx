"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Wizard, WizardStep } from "@/components/ui/wizard";
import { WizardStepContainer, WizardStepHeader, WizardStepContent } from "@/components/flywheel/shared/wizard-layout";
import { Sparkles, CheckCircle, ArrowRight } from "lucide-react";
import { trackEvent } from "@/lib/analytics/track";

type SetupPath = "social_first" | "voice_first" | "hybrid";

interface QuickWinsWizardProps {
  path: SetupPath;
  brandId?: string;
  organizationId?: string;
}

export function QuickWinsWizard({ path, brandId, organizationId }: QuickWinsWizardProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  // Define wizard steps based on path
  const getStepsForPath = useCallback((): WizardStep[] => {
    switch (path) {
      case "social_first":
        return [
          { id: "connect-channel", title: "Connect Channel", description: "Link your first social account" },
          { id: "generate-post", title: "Create Post", description: "Generate your first content" },
          { id: "schedule", title: "Schedule", description: "Pick the perfect time" },
        ];
      case "voice_first":
        return [
          { id: "phone-number", title: "Phone Number", description: "Get your voice number" },
          { id: "agent-template", title: "Voice Agent", description: "Choose your AI assistant" },
          { id: "greeting", title: "Greeting", description: "Set up your welcome message" },
        ];
      case "hybrid":
        return [
          { id: "connect-channel", title: "Connect Channel", description: "Link your first social account" },
          { id: "automation", title: "Automation", description: "Set up Welcome Series" },
          { id: "review", title: "Review", description: "You're all set!" },
        ];
      default:
        return [];
    }
  }, [path]);

  const steps = getStepsForPath();

  const handleComplete = useCallback(async () => {
    try {
      setIsLoading(true);

      // Mark quick wins as completed
      await fetch("/api/onboarding/quick-wins/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path }),
      });

      // Track completion
      trackEvent("quick_wins_completed", {
        setup_path: path,
        brand_id: brandId,
        organization_id: organizationId,
      });

      // Route to appropriate dashboard section based on path
      const redirectMap: Record<SetupPath, string> = {
        social_first: "/dashboard/content",
        voice_first: "/dashboard/voice",
        hybrid: "/dashboard/automations",
      };

      router.push(redirectMap[path]);
      router.refresh();
    } catch (error) {
      console.error("Failed to complete quick wins:", error);
      // Fallback to dashboard
      router.push("/dashboard");
    } finally {
      setIsLoading(false);
    }
  }, [path, brandId, organizationId, router]);

  const markStepComplete = useCallback((stepIndex: number) => {
    setCompletedSteps((prev) => new Set([...prev, stepIndex]));
  }, []);

  const canProceed = useCallback((stepIndex: number): boolean => {
    // For now, allow proceeding through all steps
    // In a real implementation, you'd check if the step's actions were completed
    return completedSteps.has(stepIndex);
  }, [completedSteps]);

  if (steps.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card>
          <CardContent className="text-center p-8">
            <p className="text-gray-600">Invalid setup path</p>
            <Button onClick={() => router.push("/dashboard")} className="mt-4">
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="w-6 h-6 text-purple-600" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Quick Wins Setup</h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Let's get you up and running in just a few minutes
          </p>
        </div>

        <Wizard
          steps={steps}
          currentStep={currentStep}
          onStepChange={setCurrentStep}
          variant="full"
        >
          {/* Step 0 - First step based on path */}
          {currentStep === 0 && (
            <WizardStepContainer>
              <WizardStepHeader
                title={steps[0].title}
                description={steps[0].description}
              />
              <WizardStepContent>
                {path === "social_first" && <SocialConnectStep onComplete={() => markStepComplete(0)} />}
                {path === "voice_first" && <PhoneNumberStep onComplete={() => markStepComplete(0)} />}
                {path === "hybrid" && <SocialConnectStep onComplete={() => markStepComplete(0)} />}
              </WizardStepContent>
            </WizardStepContainer>
          )}

          {/* Step 1 - Second step based on path */}
          {currentStep === 1 && (
            <WizardStepContainer>
              <WizardStepHeader
                title={steps[1].title}
                description={steps[1].description}
              />
              <WizardStepContent>
                {path === "social_first" && <GeneratePostStep brandId={brandId} onComplete={() => markStepComplete(1)} />}
                {path === "voice_first" && <AgentTemplateStep onComplete={() => markStepComplete(1)} />}
                {path === "hybrid" && <AutomationSetupStep onComplete={() => markStepComplete(1)} />}
              </WizardStepContent>
            </WizardStepContainer>
          )}

          {/* Step 2 - Final step based on path */}
          {currentStep === 2 && (
            <WizardStepContainer>
              <WizardStepHeader
                title={steps[2].title}
                description={steps[2].description}
              />
              <WizardStepContent>
                {path === "social_first" && <SchedulePostStep onComplete={() => markStepComplete(2)} />}
                {path === "voice_first" && <GreetingStep onComplete={() => markStepComplete(2)} />}
                {path === "hybrid" && <ReviewStep path={path} onComplete={() => markStepComplete(2)} />}
              </WizardStepContent>
            </WizardStepContainer>
          )}
        </Wizard>

        {/* Navigation */}
        <div className="flex justify-between items-center mt-8 max-w-4xl mx-auto">
          <Button
            variant="secondary"
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0 || isLoading}
          >
            Back
          </Button>

          {currentStep < steps.length - 1 ? (
            <Button
              
              onClick={() => setCurrentStep(currentStep + 1)}
              disabled={!canProceed(currentStep) || isLoading}
            >
              Next
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={handleComplete}
              disabled={isLoading || !canProceed(currentStep)}
            >
              Complete Setup
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// Step Components for Social First Path

function SocialConnectStep({ onComplete }: { onComplete: () => void }) {
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = useCallback(async (platform: string) => {
    setIsConnecting(true);
    try {
      // Open OAuth popup
      const popup = window.open(
        `/api/social/connect/${platform}?quick_wins=true`,
        "socialConnect",
        "width=600,height=700"
      );

      // Listen for connection success
      const handleMessage = (event: MessageEvent) => {
        if (event.data.type === "social-connect-success") {
          popup?.close();
          onComplete();
          window.removeEventListener("message", handleMessage);
        }
      };

      window.addEventListener("message", handleMessage);
    } catch (error) {
      console.error("Failed to connect:", error);
    } finally {
      setIsConnecting(false);
    }
  }, [onComplete]);

  return (
    <div className="space-y-6">
      <p className="text-gray-600 dark:text-gray-400">
        Connect your first social media account to start publishing AI-powered content.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="cursor-pointer"  onClick={() => handleConnect("facebook")}>
          <CardContent className="text-center p-6">
            <div className="text-4xl mb-2">📘</div>
            <h3 className="font-semibold">Facebook</h3>
            <p className="text-sm text-gray-500 mt-1">Connect Facebook Page</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer"  onClick={() => handleConnect("linkedin")}>
          <CardContent className="text-center p-6">
            <div className="text-4xl mb-2">💼</div>
            <h3 className="font-semibold">LinkedIn</h3>
            <p className="text-sm text-gray-500 mt-1">Connect LinkedIn Profile</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer"  onClick={() => handleConnect("twitter")}>
          <CardContent className="text-center p-6">
            <div className="text-4xl mb-2">🐦</div>
            <h3 className="font-semibold">Twitter/X</h3>
            <p className="text-sm text-gray-500 mt-1">Connect Twitter Account</p>
          </CardContent>
        </Card>
      </div>

      {isConnecting && (
        <div className="flex items-center justify-center gap-2 text-purple-600">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span>Connecting...</span>
        </div>
      )}
    </div>
  );
}

function GeneratePostStep({ brandId, onComplete }: { brandId?: string; onComplete: () => void }) {
  const [topic, setTopic] = useState("");
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = useCallback(async () => {
    if (!topic.trim()) return;

    setIsGenerating(true);
    try {
      const response = await fetch("/api/content/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          brandId,
          platforms: ["facebook"], // Start with one platform
        }),
      });

      const data = await response.json();
      setGeneratedContent(data.content || data.variations?.[0]?.content || "Your content will appear here...");
      onComplete();
    } catch (error) {
      console.error("Failed to generate content:", error);
    } finally {
      setIsGenerating(false);
    }
  }, [topic, brandId, onComplete]);

  return (
    <div className="space-y-6">
      <p className="text-gray-600 dark:text-gray-400">
        Let's create your first AI-powered post using your Brand Brain.
      </p>

      <div>
        <label className="block text-sm font-medium mb-2">
          What would you like to post about?
        </label>
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="e.g., Introducing our new product feature..."
          className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-purple-500 dark:bg-gray-800"
        />
      </div>

      <Button
        size="lg"
        onClick={handleGenerate}
        disabled={isGenerating || !topic.trim()}
        className="w-full"
      ><Sparkles className="w-5 h-5" /> 
        {isGenerating ? "Generating..." : "Generate Post"}
      </Button>

      {generatedContent && (
        <Card>
          <CardContent className="p-6">
            <h4 className="font-semibold mb-3">Your AI-Generated Post</h4>
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {generatedContent}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SchedulePostStep({ onComplete }: { onComplete: () => void }) {
  const [selectedTime, setSelectedTime] = useState<string>("optimal");

  const handleSchedule = useCallback(() => {
    // In real implementation, save the schedule
    onComplete();
  }, [onComplete]);

  return (
    <div className="space-y-6">
      <p className="text-gray-600 dark:text-gray-400">
        When should we publish your post? Our AI suggests the best time based on your audience.
      </p>

      <div className="space-y-3">
        <Card
          className={`cursor-pointer ${selectedTime === "optimal" ? "ring-2 ring-purple-500" : ""}`}
          onClick={() => setSelectedTime("optimal")}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <h4 className="font-semibold">AI Optimal Time</h4>
                </div>
                <p className="text-sm text-gray-500 mt-1">Tomorrow at 2:00 PM</p>
              </div>
              {selectedTime === "optimal" && <CheckCircle className="w-5 h-5 text-purple-600" />}
            </div>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer ${selectedTime === "now" ? "ring-2 ring-purple-500" : ""}`}
          onClick={() => setSelectedTime("now")}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold">Publish Now</h4>
                <p className="text-sm text-gray-500 mt-1">Send it immediately</p>
              </div>
              {selectedTime === "now" && <CheckCircle className="w-5 h-5 text-purple-600" />}
            </div>
          </CardContent>
        </Card>
      </div>

      <Button
        variant="outline"
        size="lg"
        onClick={handleSchedule}
        className="w-full"
        
      ><CheckCircle className="w-5 h-5" /> 
        Schedule Post
      </Button>
    </div>
  );
}

// Placeholder step components for other paths

function PhoneNumberStep({ onComplete }: { onComplete: () => void }) {
  return (
    <div className="space-y-6">
      <p className="text-gray-600 dark:text-gray-400">
        Get a phone number for your AI voice agent.
      </p>
      <Button onClick={onComplete} className="w-full">
        Get Phone Number (Coming Soon)
      </Button>
    </div>
  );
}

function AgentTemplateStep({ onComplete }: { onComplete: () => void }) {
  return (
    <div className="space-y-6">
      <p className="text-gray-600 dark:text-gray-400">
        Choose a voice agent template for your business.
      </p>
      <Button onClick={onComplete} className="w-full">
        Choose Template (Coming Soon)
      </Button>
    </div>
  );
}

function GreetingStep({ onComplete }: { onComplete: () => void }) {
  return (
    <div className="space-y-6">
      <p className="text-gray-600 dark:text-gray-400">
        Set up your AI voice agent's greeting message.
      </p>
      <Button onClick={onComplete} className="w-full">
        Record Greeting (Coming Soon)
      </Button>
    </div>
  );
}

function AutomationSetupStep({ onComplete }: { onComplete: () => void }) {
  return (
    <div className="space-y-6">
      <p className="text-gray-600 dark:text-gray-400">
        Set up your Welcome Series automation to nurture new leads.
      </p>
      <Button onClick={onComplete} className="w-full">
        Configure Automation (Coming Soon)
      </Button>
    </div>
  );
}

function ReviewStep({ path, onComplete }: { path: SetupPath; onComplete: () => void }) {
  return (
    <div className="space-y-6 text-center">
      <div className="text-6xl mb-4">🎉</div>
      <h3 className="text-2xl font-bold text-gray-900 dark:text-white">You're All Set!</h3>
      <p className="text-gray-600 dark:text-gray-400">
        Your {path === "hybrid" ? "cross-channel" : ""} setup is complete. Let's dive into your dashboard!
      </p>
      <Button variant="outline" size="lg" onClick={onComplete} className="mx-auto">
        Go to Dashboard
      </Button>
    </div>
  );
}
