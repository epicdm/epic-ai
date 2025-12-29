"use client";

import { Card, CardBody, Switch } from "@heroui/react";
import {
  Bell,
  Mail,
  Smartphone,
  FileText,
  Send,
  BarChart3,
  AlertTriangle,
} from "lucide-react";
import type { AutomateWizardData, NotificationSettings } from "@/lib/flywheel/types";

interface NotificationsStepProps {
  data: AutomateWizardData;
  updateData: (updates: Partial<AutomateWizardData>) => void;
}

const NOTIFICATION_CHANNELS = [
  {
    id: "email",
    name: "Email Notifications",
    description: "Receive updates in your inbox",
    icon: Mail,
  },
  {
    id: "inApp",
    name: "In-App Notifications",
    description: "See alerts in the dashboard",
    icon: Smartphone,
  },
];

const NOTIFICATION_TYPES = [
  {
    id: "contentGenerated",
    name: "Content Generated",
    description: "When AI creates new content ready for review",
    icon: FileText,
    category: "Content",
  },
  {
    id: "postPublished",
    name: "Post Published",
    description: "When scheduled content goes live",
    icon: Send,
    category: "Publishing",
  },
  {
    id: "weeklyReport",
    name: "Weekly Report",
    description: "Performance summary every week",
    icon: BarChart3,
    category: "Reports",
  },
  {
    id: "performanceAlerts",
    name: "Performance Alerts",
    description: "When posts perform exceptionally well or poorly",
    icon: AlertTriangle,
    category: "Alerts",
  },
];

const DEFAULT_NOTIFICATIONS: NotificationSettings = {
  email: true,
  inApp: true,
  contentGenerated: true,
  postPublished: true,
  weeklyReport: true,
  performanceAlerts: true,
};

export function NotificationsStep({ data, updateData }: NotificationsStepProps) {
  const notifications = data.notifications || DEFAULT_NOTIFICATIONS;

  const handleChange = (key: keyof NotificationSettings, value: boolean) => {
    updateData({
      notifications: {
        ...notifications,
        [key]: value,
      },
    });
  };

  const enabledCount = Object.values(notifications).filter(Boolean).length;

  return (
    <div className="space-y-6">
      <p className="text-gray-600 dark:text-gray-400">
        Configure how you want to stay informed about your content and performance.
        You can always adjust these settings later.
      </p>

      {/* Summary */}
      <div className="flex items-center gap-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
        <Bell className="w-4 h-4 text-gray-500" />
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {enabledCount} notification{enabledCount !== 1 ? "s" : ""} enabled
        </span>
      </div>

      {/* Notification Channels */}
      <Card className="border border-gray-200 dark:border-gray-700">
        <CardBody className="p-4">
          <h4 className="font-medium text-gray-900 dark:text-white mb-4">
            Notification Channels
          </h4>
          <div className="space-y-4">
            {NOTIFICATION_CHANNELS.map((channel) => {
              const Icon = channel.icon;
              const isEnabled = notifications[channel.id as keyof NotificationSettings];

              return (
                <div
                  key={channel.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      isEnabled
                        ? "bg-orange-100 dark:bg-orange-900/30"
                        : "bg-gray-100 dark:bg-gray-800"
                    }`}>
                      <Icon className={`w-4 h-4 ${
                        isEnabled
                          ? "text-orange-600 dark:text-orange-400"
                          : "text-gray-400"
                      }`} />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {channel.name}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {channel.description}
                      </p>
                    </div>
                  </div>
                  <Switch
                    isSelected={isEnabled}
                    onValueChange={(value) =>
                      handleChange(channel.id as keyof NotificationSettings, value)
                    }
                    size="sm"
                  />
                </div>
              );
            })}
          </div>
        </CardBody>
      </Card>

      {/* Notification Types */}
      <Card className="border border-gray-200 dark:border-gray-700">
        <CardBody className="p-4">
          <h4 className="font-medium text-gray-900 dark:text-white mb-4">
            What to Notify About
          </h4>
          <div className="space-y-3">
            {NOTIFICATION_TYPES.map((type) => {
              const Icon = type.icon;
              const isEnabled = notifications[type.id as keyof NotificationSettings];

              return (
                <div
                  key={type.id}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                    isEnabled
                      ? "border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-900/10"
                      : "border-gray-200 dark:border-gray-700"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${
                      isEnabled
                        ? "text-orange-600 dark:text-orange-400"
                        : "text-gray-400"
                    }`} />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {type.name}
                        </p>
                        <span className="text-xs text-gray-500 px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">
                          {type.category}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {type.description}
                      </p>
                    </div>
                  </div>
                  <Switch
                    isSelected={isEnabled}
                    onValueChange={(value) =>
                      handleChange(type.id as keyof NotificationSettings, value)
                    }
                    size="sm"
                  />
                </div>
              );
            })}
          </div>
        </CardBody>
      </Card>

      {/* Quiet Mode Note */}
      <Card className="border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <CardBody className="p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <strong>Pro tip:</strong> Start with all notifications enabled to
            understand the system. Once comfortable, you can disable some to
            reduce noise while staying informed about what matters most.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
