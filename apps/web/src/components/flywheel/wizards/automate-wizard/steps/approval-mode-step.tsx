"use client";

import { Card, CardBody, RadioGroup, Radio } from "@heroui/react";
import { Shield, Clock, Bot, CheckCircle, AlertTriangle } from "lucide-react";
import type { AutomateWizardData } from "@/lib/flywheel/types";

interface ApprovalModeStepProps {
  data: AutomateWizardData;
  updateData: (updates: Partial<AutomateWizardData>) => void;
}

const APPROVAL_MODES = [
  {
    value: "review",
    icon: Shield,
    title: "Review Mode",
    subtitle: "Full Control",
    description: "Every piece of content requires your approval before posting",
    pros: [
      "Complete control over what gets posted",
      "Review each post individually",
      "Perfect for learning the system",
    ],
    cons: [
      "Requires daily attention",
      "May miss optimal posting times",
    ],
    recommended: false,
    color: "blue",
  },
  {
    value: "auto_queue",
    icon: Clock,
    title: "Auto-Queue Mode",
    subtitle: "Balanced Approach",
    description: "AI generates and queues content, you approve batches weekly",
    pros: [
      "Content ready when you need it",
      "Batch approve multiple posts",
      "Weekly time commitment",
    ],
    cons: [
      "Slight delay in posting",
    ],
    recommended: true,
    color: "purple",
  },
  {
    value: "auto_post",
    icon: Bot,
    title: "Autopilot Mode",
    subtitle: "Maximum Automation",
    description: "AI handles everything—generates, schedules, and posts automatically",
    pros: [
      "Zero daily maintenance",
      "Never miss posting schedule",
      "AI optimizes timing",
    ],
    cons: [
      "Less direct control",
      "Requires trust in AI",
    ],
    recommended: false,
    color: "orange",
  },
];

export function ApprovalModeStep({ data, updateData }: ApprovalModeStepProps) {
  const handleChange = (value: string) => {
    updateData({ approvalMode: value as "review" | "auto_queue" | "auto_post" });
  };

  return (
    <div className="space-y-6">
      <p className="text-gray-600 dark:text-gray-400">
        Choose how much control you want over your content. You can always change
        this later as you get more comfortable with the system.
      </p>

      <RadioGroup
        value={data.approvalMode || ""}
        onValueChange={handleChange}
        classNames={{
          wrapper: "gap-4",
        }}
      >
        {APPROVAL_MODES.map((mode) => {
          const Icon = mode.icon;
          const isSelected = data.approvalMode === mode.value;
          const colorClasses = {
            blue: {
              border: isSelected ? "border-blue-500" : "border-gray-200 dark:border-gray-700",
              bg: "bg-blue-100 dark:bg-blue-900/30",
              text: "text-blue-600 dark:text-blue-400",
            },
            purple: {
              border: isSelected ? "border-purple-500" : "border-gray-200 dark:border-gray-700",
              bg: "bg-purple-100 dark:bg-purple-900/30",
              text: "text-purple-600 dark:text-purple-400",
            },
            orange: {
              border: isSelected ? "border-orange-500" : "border-gray-200 dark:border-gray-700",
              bg: "bg-orange-100 dark:bg-orange-900/30",
              text: "text-orange-600 dark:text-orange-400",
            },
          }[mode.color];

          return (
            <Radio
              key={mode.value}
              value={mode.value}
              classNames={{
                base: `border-2 rounded-xl p-0 m-0 max-w-full ${colorClasses.border} transition-all`,
                wrapper: "hidden",
                labelWrapper: "w-full",
              }}
            >
              <Card className="border-0 shadow-none bg-transparent">
                <CardBody className="p-4">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl ${colorClasses.bg}`}>
                      <Icon className={`w-6 h-6 ${colorClasses.text}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-gray-900 dark:text-white">
                          {mode.title}
                        </h4>
                        <span className="text-sm text-gray-500">
                          ({mode.subtitle})
                        </span>
                        {mode.recommended && (
                          <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 text-xs rounded-full">
                            Recommended
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        {mode.description}
                      </p>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase mb-2">
                            Pros
                          </p>
                          <ul className="space-y-1">
                            {mode.pros.map((pro) => (
                              <li
                                key={pro}
                                className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400"
                              >
                                <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                                {pro}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase mb-2">
                            Cons
                          </p>
                          <ul className="space-y-1">
                            {mode.cons.map((con) => (
                              <li
                                key={con}
                                className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400"
                              >
                                <AlertTriangle className="w-3 h-3 text-amber-500 flex-shrink-0" />
                                {con}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </Radio>
          );
        })}
      </RadioGroup>

      {/* Selected Mode Summary */}
      {data.approvalMode && (
        <Card className="border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <CardBody className="p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <strong>Your choice:</strong>{" "}
              {data.approvalMode === "review" && (
                <>
                  You&apos;ll review each post before it goes live. Check your queue
                  daily to approve content.
                </>
              )}
              {data.approvalMode === "auto_queue" && (
                <>
                  AI will prepare content for you. Log in weekly to review and
                  approve batched posts.
                </>
              )}
              {data.approvalMode === "auto_post" && (
                <>
                  Sit back and relax! The AI will handle everything. Monitor your
                  dashboard for performance.
                </>
              )}
            </p>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
