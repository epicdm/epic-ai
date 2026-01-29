"use client";

import { useState } from "react";
import {
  Button,
  Card,
  CardBody,
  Accordion,
  AccordionItem,
  Chip,
  Spinner,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from "@heroui/react";
import {
  Brain,
  Palette,
  FileText,
  Share2,
  Calendar,
  BarChart3,
  Target,
  Settings,
  Rocket,
  Check,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import type { StreamlinedWizardData } from "../streamlined-flywheel-wizard";

interface ReviewActivateStepProps {
  data: Partial<StreamlinedWizardData>;
  updateData: (data: Partial<StreamlinedWizardData>) => void;
  onGoToStep: (step: number) => void;
}

interface SectionSummary {
  title: string;
  icon: React.ElementType;
  items: { label: string; value: string }[];
  step: number;
}

const APPROVAL_MODE_LABELS = {
  review: "Review Mode",
  auto_queue: "Auto-Queue Mode",
  auto_post: "Auto-Post (Autopilot)",
};

export function ReviewActivateStep({
  data,
  updateData,
  onGoToStep,
}: ReviewActivateStepProps) {
  const router = useRouter();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [isActivating, setIsActivating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateSummary = (): SectionSummary[] => {
    const sections: SectionSummary[] = [];

    // Brand Brain
    sections.push({
      title: "Brand Brain",
      icon: Brain,
      step: 0,
      items: [
        { label: "Brand", value: (data.brandName as string) || "Not set" },
        { label: "Industry", value: (data.industry as string) || "Not set" },
        {
          label: "Audiences",
          value: `${((data.targetAudiences as Array<unknown>) || []).length} defined`,
        },
        {
          label: "Content Pillars",
          value: `${((data.contentPillars as Array<unknown>) || []).length} defined`,
        },
      ],
    });

    // Voice & Tone
    sections.push({
      title: "Voice & Tone",
      icon: Palette,
      step: 1,
      items: [
        {
          label: "Formality",
          value:
            (data.formality as number) >= 4
              ? "Very Formal"
              : (data.formality as number) >= 3
              ? "Professional"
              : (data.formality as number) >= 2
              ? "Conversational"
              : "Casual",
        },
        {
          label: "Personality",
          value:
            ((data.personalityTraits as string[]) || []).slice(0, 3).join(", ") ||
            "Not set",
        },
        { label: "Style", value: (data.writingStyle as string) || "Not set" },
      ],
    });

    // Content
    sections.push({
      title: "Content Factory",
      icon: FileText,
      step: 3,
      items: [
        {
          label: "Content Types",
          value:
            ((data.enabledContentTypes as string[]) || []).join(", ") || "Not set",
        },
        {
          label: "Generated Posts",
          value: `${((data.generatedContent as Array<unknown>) || []).length} ready`,
        },
      ],
    });

    // Publishing
    sections.push({
      title: "Publishing Engine",
      icon: Share2,
      step: 5,
      items: [
        {
          label: "Connected Platforms",
          value:
            ((data.connectedAccounts as Array<{ platform: string }>) || [])
              .map((a) => a.platform)
              .join(", ") || "None connected",
        },
        {
          label: "Schedule",
          value: `${countScheduledSlots()} posts/week`,
        },
        {
          label: "First Post",
          value: data.firstPostAction === "skip"
            ? "Skipped"
            : data.firstPostAction === "publish_now"
            ? "Publishing now"
            : data.selectedPostId
            ? "Scheduled"
            : "Not selected",
        },
      ],
    });

    // Analytics
    sections.push({
      title: "Analytics",
      icon: BarChart3,
      step: 8,
      items: [
        {
          label: "Key Metrics",
          value:
            ((data.priorityMetrics as string[]) || []).slice(0, 3).join(", ") ||
            "Not set",
        },
        {
          label: "Reports",
          value: capitalizeFirst((data.reportFrequency as string) || "weekly"),
        },
      ],
    });

    // Optimization
    sections.push({
      title: "AI Optimization",
      icon: Target,
      step: 9,
      items: [
        {
          label: "Goal",
          value: capitalizeFirst((data.primaryGoal as string) || "engagement"),
        },
        {
          label: "Target",
          value: data.optimizationTarget
            ? `${data.optimizationTarget}/week`
            : "Not set",
        },
      ],
    });

    // Autopilot
    sections.push({
      title: "AI Autopilot",
      icon: Settings,
      step: 10,
      items: [
        {
          label: "Mode",
          value:
            APPROVAL_MODE_LABELS[
              (data.approvalMode as keyof typeof APPROVAL_MODE_LABELS) || "review"
            ],
        },
        {
          label: "Frequency",
          value: `${data.postsPerWeek || 7} posts/week`,
        },
        {
          label: "Content Mix",
          value: formatContentMix(data.contentMix as Record<string, number>),
        },
      ],
    });

    return sections;
  };

  function countScheduledSlots(): number {
    const schedule = data.postingSchedule as Record<
      string,
      Array<{ enabled: boolean }>
    >;
    if (!schedule) return 0;

    return Object.values(schedule).reduce(
      (total, daySlots) =>
        total + (daySlots || []).filter((s) => s.enabled).length,
      0
    );
  }

  function capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  function formatContentMix(mix: Record<string, number> | undefined): string {
    if (!mix) return "Default";
    const parts = [];
    if (mix.educational) parts.push(`${mix.educational}% edu`);
    if (mix.promotional) parts.push(`${mix.promotional}% promo`);
    if (mix.entertaining) parts.push(`${mix.entertaining}% ent`);
    if (mix.engaging) parts.push(`${mix.engaging}% eng`);
    return parts.slice(0, 2).join(", ") + "...";
  }

  const handleActivate = async () => {
    setIsActivating(true);
    setError(null);

    try {
      // Save all wizard data and activate flywheel
      const response = await fetch("/api/flywheel/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandId: data.brandId,
          wizardData: data,
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Failed to activate flywheel");
      }

      // Update the local state
      updateData({ activated: true, activatedAt: new Date().toISOString() });

      // Close modal and redirect
      onClose();
      router.push("/dashboard?flywheel=activated");
    } catch (err) {
      console.error("Activation error:", err);
      setError(err instanceof Error ? err.message : "Failed to activate. Please try again.");
    } finally {
      setIsActivating(false);
    }
  };

  const sections = generateSummary();

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
          <Rocket className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Ready to Launch! 🚀
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Review your settings and activate your AI-powered marketing flywheel
        </p>
      </div>

      {/* Summary Accordion */}
      <Accordion variant="bordered" selectionMode="multiple">
        {sections.map((section, index) => {
          const Icon = section.icon;

          return (
            <AccordionItem
              key={index}
              aria-label={section.title}
              title={
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <span className="font-medium">{section.title}</span>
                  <Check className="w-4 h-4 text-success ml-auto" />
                </div>
              }
            >
              <div className="space-y-3 pb-2">
                {section.items.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-gray-500 dark:text-gray-400">
                      {item.label}
                    </span>
                    <span className="text-gray-900 dark:text-white font-medium">
                      {item.value}
                    </span>
                  </div>
                ))}
                <Button
                  size="sm"
                  variant="flat"
                  endContent={<ChevronRight className="w-4 h-4" />}
                  onPress={() => onGoToStep(section.step)}
                  className="w-full mt-2"
                >
                  Edit {section.title}
                </Button>
              </div>
            </AccordionItem>
          );
        })}
      </Accordion>

      {/* Activation Card */}
      <Card className="bg-gradient-to-r from-primary/10 to-secondary/10 border-2 border-primary">
        <CardBody className="text-center space-y-4 py-8">
          <div className="flex items-center justify-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            <h4 className="text-xl font-bold text-gray-900 dark:text-white">
              Ready to Activate Your Flywheel
            </h4>
          </div>
          <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
            Once activated, AI will start generating content based on your
            settings. You can adjust settings anytime from the dashboard.
          </p>
          <Button
            color="primary"
            size="lg"
            startContent={<Rocket className="w-5 h-5" />}
            onPress={onOpen}
            className="font-bold px-8"
          >
            Activate Flywheel
          </Button>
        </CardBody>
      </Card>

      {/* Confirmation Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="md">
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Rocket className="w-5 h-5 text-primary" />
              Confirm Activation
            </div>
          </ModalHeader>
          <ModalBody>
            <p className="text-gray-600 dark:text-gray-400">
              You&apos;re about to activate your AI marketing flywheel. This will:
            </p>
            <ul className="mt-4 space-y-2">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-success" />
                <span>Enable AI content generation</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-success" />
                <span>Start your publishing schedule</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-success" />
                <span>Begin tracking analytics</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-success" />
                <span>Start the learning loop</span>
              </li>
            </ul>

            {error && (
              <div className="mt-4 p-3 bg-danger-50 dark:bg-danger-900/20 rounded-lg text-danger text-sm">
                {error}
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={onClose} isDisabled={isActivating}>
              Cancel
            </Button>
            <Button
              color="primary"
              onPress={handleActivate}
              isDisabled={isActivating}
              startContent={
                isActivating ? (
                  <Spinner size="sm" color="current" />
                ) : (
                  <Rocket className="w-4 h-4" />
                )
              }
            >
              {isActivating ? "Activating..." : "Activate Now"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Skip activation note */}
      <p className="text-center text-sm text-gray-500 dark:text-gray-400">
        Not ready yet? You can save your progress and activate later from the
        dashboard.
      </p>
    </div>
  );
}
