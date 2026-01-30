"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Calendar, Mail, Clock, FileText } from "lucide-react";
import type { LearnWizardData } from "@/lib/flywheel/types";

interface ReportingStepProps {
  data: LearnWizardData;
  updateData: (updates: Partial<LearnWizardData>) => void;
}

const DAYS_OF_WEEK = [
  { value: "0", label: "Sunday" },
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
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
        <CardContent className="p-4">
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
            className="space-y-3"
          >
            <div
              className={`border rounded-lg p-4 cursor-pointer transition-all ${
                data.reportFrequency === "daily"
                  ? "border-purple-500"
                  : "border-gray-200 dark:border-gray-700"
              }`}
              onClick={() => handleFrequencyChange("daily")}
            >
              <div className="flex items-center gap-3">
                <RadioGroupItem value="daily" id="freq-daily" />
                <Label htmlFor="freq-daily" className="flex-1 cursor-pointer">
                  <p className="font-medium">Daily Digest</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Get a quick daily snapshot of your performance
                  </p>
                </Label>
              </div>
            </div>
            <div
              className={`border rounded-lg p-4 cursor-pointer transition-all ${
                data.reportFrequency === "weekly"
                  ? "border-purple-500"
                  : "border-gray-200 dark:border-gray-700"
              }`}
              onClick={() => handleFrequencyChange("weekly")}
            >
              <div className="flex items-center gap-3">
                <RadioGroupItem value="weekly" id="freq-weekly" />
                <Label htmlFor="freq-weekly" className="flex-1 cursor-pointer">
                  <p className="font-medium">Weekly Report (Recommended)</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Weekly summary with trends and recommendations
                  </p>
                </Label>
              </div>
            </div>
            <div
              className={`border rounded-lg p-4 cursor-pointer transition-all ${
                data.reportFrequency === "monthly"
                  ? "border-purple-500"
                  : "border-gray-200 dark:border-gray-700"
              }`}
              onClick={() => handleFrequencyChange("monthly")}
            >
              <div className="flex items-center gap-3">
                <RadioGroupItem value="monthly" id="freq-monthly" />
                <Label htmlFor="freq-monthly" className="flex-1 cursor-pointer">
                  <p className="font-medium">Monthly Summary</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Comprehensive monthly analysis with deep insights
                  </p>
                </Label>
              </div>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Day Selection (for weekly/monthly) */}
      {(data.reportFrequency === "weekly" || data.reportFrequency === "monthly") && (
        <Card className="border border-gray-200 dark:border-gray-700">
          <CardContent className="p-4">
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
              value={String(data.reportDay ?? "")}
              onValueChange={(value) => {
                updateData({ reportDay: parseInt(value, 10) });
              }}
            >
              <SelectTrigger className="bg-white dark:bg-gray-800">
                <SelectValue placeholder="Select day" />
              </SelectTrigger>
              <SelectContent>
                {DAYS_OF_WEEK.map((day) => (
                  <SelectItem key={day.value} value={day.value}>
                    {day.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {/* Email Notifications */}
      <Card className="border border-gray-200 dark:border-gray-700">
        <CardContent className="p-4">
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
              checked={data.reportEmail ?? true}
              onCheckedChange={(value) => updateData({ reportEmail: value })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Sample Report Preview */}
      <Card className="border border-gray-200 dark:border-gray-700">
        <CardContent className="p-4">
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
        </CardContent>
      </Card>
    </div>
  );
}
