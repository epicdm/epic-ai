"use client";

import { Card, CardBody, Checkbox, Chip } from "@heroui/react";
import {
  Share2,
  CheckCircle,
  XCircle,
  Clock,
  Globe,
  Calendar,
  Settings,
  Send,
} from "lucide-react";
import type { DistributeWizardData, TimeSlot } from "@/lib/flywheel/types";

interface DistributeReviewStepProps {
  data: DistributeWizardData;
  updateData: (updates: Partial<DistributeWizardData>) => void;
}

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;

export function DistributeReviewStep({ data, updateData }: DistributeReviewStepProps) {
  const connectedAccounts = data.connectedAccounts?.filter((a) => a.connected) || [];
  const platformSettings = data.platformSettings || {};
  const schedule = data.schedule || {};

  // Calculate total weekly posts
  const totalWeeklySlots = DAYS.reduce((sum, day) => {
    const slots = schedule[day] || [];
    return sum + slots.length;
  }, 0);

  // Get enabled platforms
  const enabledPlatforms = connectedAccounts.filter(
    (a) => platformSettings[a.platform]?.enabled !== false
  );

  // Check completion status
  const hasConnectedAccounts = connectedAccounts.length > 0;
  const hasSchedule = totalWeeklySlots > 0;
  const hasTimezone = !!data.timezone;

  const completionItems = [
    {
      label: "Social Accounts Connected",
      complete: hasConnectedAccounts,
      detail: hasConnectedAccounts
        ? `${connectedAccounts.length} account${connectedAccounts.length !== 1 ? "s" : ""} connected`
        : "No accounts connected",
      icon: Share2,
    },
    {
      label: "Platform Settings",
      complete: enabledPlatforms.length > 0,
      detail: `${enabledPlatforms.length} platform${enabledPlatforms.length !== 1 ? "s" : ""} enabled`,
      icon: Settings,
    },
    {
      label: "Publishing Schedule",
      complete: hasSchedule,
      detail: hasSchedule
        ? `${totalWeeklySlots} time slot${totalWeeklySlots !== 1 ? "s" : ""} per week`
        : "No schedule configured",
      icon: Calendar,
    },
    {
      label: "Timezone Set",
      complete: hasTimezone,
      detail: hasTimezone ? data.timezone : "Not set",
      icon: Globe,
    },
  ];

  const getSchedulePreview = () => {
    const preview: { day: string; slots: TimeSlot[] }[] = [];
    for (const day of DAYS) {
      const slots = schedule[day] || [];
      if (slots.length > 0) {
        preview.push({ day, slots });
      }
    }
    return preview.slice(0, 5); // Show first 5 days with posts
  };

  return (
    <div className="space-y-6">
      <p className="text-gray-600 dark:text-gray-400">
        Review your publishing setup before activating. You can always change
        these settings later from your dashboard.
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

      {/* Connected Accounts Summary */}
      {connectedAccounts.length > 0 && (
        <Card className="border border-gray-200 dark:border-gray-700">
          <CardBody className="p-4">
            <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Share2 className="w-4 h-4" />
              Connected Accounts
            </h4>
            <div className="flex flex-wrap gap-2">
              {connectedAccounts.map((account) => {
                const settings = platformSettings[account.platform];
                const isEnabled = settings?.enabled !== false;
                const autoPost = settings?.autoPost;

                return (
                  <div
                    key={account.platform}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
                      isEnabled
                        ? "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20"
                        : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 opacity-60"
                    }`}
                  >
                    <span className="font-medium capitalize">{account.platform}</span>
                    {account.handle && (
                      <span className="text-sm text-gray-500">@{account.handle}</span>
                    )}
                    {autoPost && (
                      <Chip size="sm" color="success" variant="flat">
                        Auto
                      </Chip>
                    )}
                  </div>
                );
              })}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Schedule Preview */}
      {hasSchedule && (
        <Card className="border border-gray-200 dark:border-gray-700">
          <CardBody className="p-4">
            <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Weekly Schedule Preview
            </h4>
            <div className="space-y-2">
              {getSchedulePreview().map(({ day, slots }) => (
                <div
                  key={day}
                  className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0"
                >
                  <span className="font-medium capitalize text-gray-700 dark:text-gray-300">
                    {day}
                  </span>
                  <div className="flex gap-2">
                    {slots.map((slot) => (
                      <Chip key={slot.time} size="sm" variant="flat">
                        {slot.time}
                      </Chip>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Total weekly posts:</span>
                <Chip color="success" variant="flat">
                  {totalWeeklySlots} posts/week
                </Chip>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* First Post Summary */}
      {data.firstPostOption && data.firstPostOption !== "skip" && (
        <Card className="border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/30">
          <CardBody className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-800">
                <Send className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="font-medium text-blue-900 dark:text-blue-100">
                  First Post Ready
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  {data.firstPostOption === "publish"
                    ? "Your first post will be published immediately after setup"
                    : "Your first post will be scheduled for the next optimal time"}
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

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
              I confirm that my publishing settings are correct and I&apos;m ready
              to start distributing content to my connected social accounts.
            </span>
          </Checkbox>
        </CardBody>
      </Card>

      {/* What's Next */}
      <Card className="border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/30">
        <CardBody className="p-4">
          <h5 className="text-sm font-medium text-green-900 dark:text-green-100 mb-2">
            What happens next?
          </h5>
          <ul className="text-sm text-green-800 dark:text-green-200 space-y-1">
            <li>• Your publishing schedule will be activated</li>
            <li>• Content will be published at your scheduled times</li>
            <li>• You can manage your queue from the Content page</li>
            <li>• Analytics will start tracking after your first post</li>
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}
