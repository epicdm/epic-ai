"use client";

import { Card, CardBody, Checkbox, Chip } from "@heroui/react";
import {
  Zap,
  CheckCircle,
  XCircle,
  Shield,
  Clock,
  Bot,
  PieChart,
  Calendar,
  Bell,
  Rocket,
} from "lucide-react";
import type { AutomateWizardData } from "@/lib/flywheel/types";

interface AutomateReviewStepProps {
  data: AutomateWizardData;
  updateData: (updates: Partial<AutomateWizardData>) => void;
}

const APPROVAL_MODE_LABELS = {
  review: { label: "Review Mode", icon: Shield, color: "blue" },
  auto_queue: { label: "Auto-Queue", icon: Clock, color: "purple" },
  auto_post: { label: "Autopilot", icon: Bot, color: "orange" },
};

export function AutomateReviewStep({ data, updateData }: AutomateReviewStepProps) {
  const mix = data.contentMix || { educational: 0, promotional: 0, entertaining: 0, engaging: 0 };
  const notifications = data.notifications;

  // Check completion status
  const hasApprovalMode = !!data.approvalMode;
  const hasContentMix = mix.educational + mix.promotional + mix.entertaining + mix.engaging === 100;
  const hasFrequency = (data.postsPerWeek ?? 0) >= 1;
  const hasNotifications = notifications !== undefined;

  const completionItems = [
    {
      label: "Approval Mode",
      complete: hasApprovalMode,
      detail: hasApprovalMode
        ? APPROVAL_MODE_LABELS[data.approvalMode!].label
        : "Not selected",
      icon: Shield,
    },
    {
      label: "Content Mix",
      complete: hasContentMix,
      detail: hasContentMix ? "100% allocated" : "Incomplete allocation",
      icon: PieChart,
    },
    {
      label: "Posting Frequency",
      complete: hasFrequency,
      detail: hasFrequency
        ? `${data.postsPerWeek} posts/week`
        : "Not configured",
      icon: Calendar,
    },
    {
      label: "Notifications",
      complete: hasNotifications,
      detail: hasNotifications
        ? `${Object.values(notifications!).filter(Boolean).length} enabled`
        : "Not configured",
      icon: Bell,
    },
  ];

  const enabledNotifications = notifications
    ? Object.entries(notifications)
        .filter(([_, enabled]) => enabled)
        .map(([key]) => key)
    : [];

  const approvalConfig = data.approvalMode
    ? APPROVAL_MODE_LABELS[data.approvalMode]
    : null;

  return (
    <div className="space-y-6">
      <p className="text-gray-600 dark:text-gray-400">
        Review your automation settings. Once activated, your AI-powered flywheel
        will begin generating and publishing content automatically.
      </p>

      {/* Completion Checklist */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {completionItems.map((item) => {
          const Icon = item.icon;
          return (
            <Card
              key={item.label}
              className={`border ${
                item.complete
                  ? "border-green-200 dark:border-green-800"
                  : "border-amber-200 dark:border-amber-800"
              }`}
            >
              <CardBody className="p-4">
                <div className="flex items-start gap-3">
                  <div
                    className={`p-2 rounded-lg ${
                      item.complete
                        ? "bg-green-100 dark:bg-green-900"
                        : "bg-amber-100 dark:bg-amber-900"
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 ${
                        item.complete
                          ? "text-green-600 dark:text-green-400"
                          : "text-amber-600 dark:text-amber-400"
                      }`}
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {item.label}
                      </p>
                      {item.complete ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-amber-600" />
                      )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {item.detail}
                    </p>
                  </div>
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>

      {/* Approval Mode Summary */}
      {approvalConfig && (
        <Card className="border border-gray-200 dark:border-gray-700">
          <CardBody className="p-4">
            <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Approval Mode
            </h4>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
              {(() => {
                const Icon = approvalConfig.icon;
                return (
                  <>
                    <Icon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {approvalConfig.label}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {data.approvalMode === "review" &&
                          "Every post requires your approval before publishing"}
                        {data.approvalMode === "auto_queue" &&
                          "AI queues content for weekly batch approval"}
                        {data.approvalMode === "auto_post" &&
                          "AI handles everything automatically"}
                      </p>
                    </div>
                  </>
                );
              })()}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Content Mix Summary */}
      <Card className="border border-gray-200 dark:border-gray-700">
        <CardBody className="p-4">
          <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <PieChart className="w-4 h-4" />
            Content Mix
          </h4>
          <div className="h-4 rounded-full overflow-hidden flex mb-3">
            <div className="bg-blue-500" style={{ width: `${mix.educational}%` }} />
            <div className="bg-green-500" style={{ width: `${mix.promotional}%` }} />
            <div className="bg-yellow-500" style={{ width: `${mix.entertaining}%` }} />
            <div className="bg-purple-500" style={{ width: `${mix.engaging}%` }} />
          </div>
          <div className="grid grid-cols-4 gap-2 text-sm">
            <div className="text-center">
              <div className="w-2 h-2 rounded-full bg-blue-500 mx-auto mb-1" />
              <p className="font-medium">{mix.educational}%</p>
              <p className="text-xs text-gray-500">Educational</p>
            </div>
            <div className="text-center">
              <div className="w-2 h-2 rounded-full bg-green-500 mx-auto mb-1" />
              <p className="font-medium">{mix.promotional}%</p>
              <p className="text-xs text-gray-500">Promotional</p>
            </div>
            <div className="text-center">
              <div className="w-2 h-2 rounded-full bg-yellow-500 mx-auto mb-1" />
              <p className="font-medium">{mix.entertaining}%</p>
              <p className="text-xs text-gray-500">Entertaining</p>
            </div>
            <div className="text-center">
              <div className="w-2 h-2 rounded-full bg-purple-500 mx-auto mb-1" />
              <p className="font-medium">{mix.engaging}%</p>
              <p className="text-xs text-gray-500">Engaging</p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Frequency & Notifications */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border border-gray-200 dark:border-gray-700">
          <CardBody className="p-4">
            <h4 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Posting Frequency
            </h4>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {data.postsPerWeek || 0}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              posts per week
            </p>
          </CardBody>
        </Card>

        <Card className="border border-gray-200 dark:border-gray-700">
          <CardBody className="p-4">
            <h4 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Notifications
            </h4>
            <div className="flex flex-wrap gap-1">
              {enabledNotifications.slice(0, 3).map((notif) => (
                <Chip key={notif} size="sm" variant="flat">
                  {notif.replace(/([A-Z])/g, " $1").trim()}
                </Chip>
              ))}
              {enabledNotifications.length > 3 && (
                <Chip size="sm" variant="flat">
                  +{enabledNotifications.length - 3} more
                </Chip>
              )}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Activation Notice */}
      <Card className="border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/30">
        <CardBody className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-800">
              <Rocket className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="font-medium text-orange-900 dark:text-orange-100">
                Ready for Liftoff!
              </p>
              <p className="text-sm text-orange-700 dark:text-orange-300">
                Once activated, your flywheel will start spinning. The AI will
                begin creating content based on your Brand Brain and the settings
                you&apos;ve configured.
              </p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Confirmation */}
      <Card className="border border-gray-200 dark:border-gray-700">
        <CardBody className="p-4">
          <Checkbox
            isSelected={data.confirmed}
            onValueChange={(value) => updateData({ confirmed: value })}
            classNames={{
              label: "text-gray-700 dark:text-gray-300",
            }}
          >
            <span>
              I confirm my automation settings and I&apos;m ready to activate the
              Epic AI flywheel.
            </span>
          </Checkbox>
        </CardBody>
      </Card>
    </div>
  );
}
