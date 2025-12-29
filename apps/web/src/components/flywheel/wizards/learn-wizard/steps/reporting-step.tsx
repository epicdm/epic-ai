"use client";

import { Card, CardBody, RadioGroup, Radio, Switch, Select, SelectItem } from "@heroui/react";
import { Calendar, Mail, Clock, FileText } from "lucide-react";
import type { LearnWizardData } from "@/lib/flywheel/types";

interface ReportingStepProps {
  data: LearnWizardData;
  updateData: (updates: Partial<LearnWizardData>) => void;
}

const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

export function ReportingStep({ data, updateData }: ReportingStepProps) {
  const handleFrequencyChange = (value: string) => {
    updateData({
      reportFrequency: value as "daily" | "weekly" | "monthly",
    });
  };

  return (
    <div className="space-y-6">
      <p className="text-gray-600 dark:text-gray-400">
        Set up automated performance reports. We&apos;ll analyze your metrics and
        send you a summary with AI-powered insights.
      </p>

      {/* Report Frequency */}
      <Card className="border border-gray-200 dark:border-gray-700">
        <CardBody className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900">
              <Calendar className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">
                Report Frequency
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                How often should we send you reports?
              </p>
            </div>
          </div>

          <RadioGroup
            value={data.reportFrequency || ""}
            onValueChange={handleFrequencyChange}
            classNames={{
              wrapper: "gap-3",
            }}
          >
            <Radio
              value="daily"
              description="Get a quick daily snapshot of your performance"
              classNames={{
                base: "border border-gray-200 dark:border-gray-700 rounded-lg p-4 m-0 max-w-full data-[selected=true]:border-purple-500",
              }}
            >
              Daily Digest
            </Radio>
            <Radio
              value="weekly"
              description="Weekly summary with trends and recommendations"
              classNames={{
                base: "border border-gray-200 dark:border-gray-700 rounded-lg p-4 m-0 max-w-full data-[selected=true]:border-purple-500",
              }}
            >
              Weekly Report (Recommended)
            </Radio>
            <Radio
              value="monthly"
              description="Comprehensive monthly analysis with deep insights"
              classNames={{
                base: "border border-gray-200 dark:border-gray-700 rounded-lg p-4 m-0 max-w-full data-[selected=true]:border-purple-500",
              }}
            >
              Monthly Summary
            </Radio>
          </RadioGroup>
        </CardBody>
      </Card>

      {/* Day Selection (for weekly/monthly) */}
      {(data.reportFrequency === "weekly" || data.reportFrequency === "monthly") && (
        <Card className="border border-gray-200 dark:border-gray-700">
          <CardBody className="p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
                <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">
                  {data.reportFrequency === "weekly" ? "Report Day" : "Report Date"}
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {data.reportFrequency === "weekly"
                    ? "Which day should we send your weekly report?"
                    : "Which day of the month for your report?"}
                </p>
              </div>
            </div>

            <Select
              label="Select day"
              selectedKeys={data.reportDay !== undefined ? [String(data.reportDay)] : []}
              onSelectionChange={(keys) => {
                const selected = Array.from(keys)[0] as string;
                if (selected) {
                  updateData({ reportDay: parseInt(selected, 10) });
                }
              }}
              classNames={{
                trigger: "bg-white dark:bg-gray-800",
              }}
            >
              {DAYS_OF_WEEK.map((day) => (
                <SelectItem key={String(day.value)} textValue={day.label}>
                  {day.label}
                </SelectItem>
              ))}
            </Select>
          </CardBody>
        </Card>
      )}

      {/* Email Notifications */}
      <Card className="border border-gray-200 dark:border-gray-700">
        <CardBody className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900">
                <Mail className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">
                  Email Reports
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Receive reports directly in your inbox
                </p>
              </div>
            </div>
            <Switch
              isSelected={data.reportEmail ?? true}
              onValueChange={(value) => updateData({ reportEmail: value })}
              size="sm"
            />
          </div>
        </CardBody>
      </Card>

      {/* Sample Report Preview */}
      <Card className="border border-gray-200 dark:border-gray-700">
        <CardBody className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
              <FileText className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </div>
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">
                Sample Report Preview
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                What your reports will look like
              </p>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-gray-700">
              <span className="font-medium text-gray-700 dark:text-gray-300">
                Weekly Performance Report
              </span>
              <span className="text-sm text-gray-500">Dec 23 - Dec 29</span>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  12.4K
                </p>
                <p className="text-xs text-gray-500">Impressions</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">+23%</p>
                <p className="text-xs text-gray-500">Engagement</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  142
                </p>
                <p className="text-xs text-gray-500">New Followers</p>
              </div>
            </div>
            <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <strong>AI Insight:</strong> Your Tuesday posts perform 40%
                better. Consider posting more on Tuesdays!
              </p>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
