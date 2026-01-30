"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles, Clock, Globe } from "lucide-react";
import type { StreamlinedWizardData } from "../streamlined-flywheel-wizard";

interface PostingScheduleStepProps {
  data: Partial<StreamlinedWizardData>;
  updateData: (data: Partial<StreamlinedWizardData>) => void;
}

interface TimeSlot {
  time: string;
  enabled: boolean;
}

interface WeeklySchedule {
  [day: string]: TimeSlot[];
}

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

const DAY_LABELS: Record<string, string> = {
  monday: "Mon", tuesday: "Tue", wednesday: "Wed", thursday: "Thu", friday: "Fri", saturday: "Sat", sunday: "Sun",
};

const DEFAULT_TIMES = ["09:00", "12:00", "17:00"];

const COMMON_TIMEZONES = [
  { key: "America/New_York", label: "Eastern Time (ET)" },
  { key: "America/Chicago", label: "Central Time (CT)" },
  { key: "America/Denver", label: "Mountain Time (MT)" },
  { key: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { key: "America/Phoenix", label: "Arizona Time" },
  { key: "Europe/London", label: "London (GMT/BST)" },
  { key: "Europe/Paris", label: "Central European Time" },
  { key: "Asia/Tokyo", label: "Japan Time" },
  { key: "Asia/Shanghai", label: "China Time" },
  { key: "Australia/Sydney", label: "Sydney Time" },
];

function getDefaultSchedule(): WeeklySchedule {
  const schedule: WeeklySchedule = {};
  DAYS.forEach((day) => {
    schedule[day] = DEFAULT_TIMES.map((time) => ({
      time,
      enabled: ["monday", "tuesday", "wednesday", "thursday", "friday"].includes(day) && (time === "09:00" || time === "17:00"),
    }));
  });
  return schedule;
}

export function PostingScheduleStep({ data, updateData }: PostingScheduleStepProps) {
  const [timezone, setTimezone] = useState<string>(
    (data.timezone as string) || Intl.DateTimeFormat().resolvedOptions().timeZone
  );
  const [schedule, setSchedule] = useState<WeeklySchedule>(
    (data.postingSchedule as WeeklySchedule) || getDefaultSchedule()
  );
  const [isOptimizing, setIsOptimizing] = useState(false);

  useEffect(() => {
    updateData({ timezone, postingSchedule: schedule });
  }, [timezone, schedule, updateData]);

  const handleToggleSlot = (day: string, timeIndex: number) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: prev[day].map((slot, i) => i === timeIndex ? { ...slot, enabled: !slot.enabled } : slot),
    }));
  };

  const handleAISuggest = async () => {
    setIsOptimizing(true);
    try {
      const response = await fetch("/api/ai/suggest-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          industry: data.industry,
          platforms: (data.connectedAccounts as Array<{platform: string}>)?.map((a) => a.platform) || [],
        }),
      });
      if (response.ok) {
        const result = await response.json();
        if (result.optimalTimes) { setSchedule(result.optimalTimes); } else { applyOptimalDefaults(); }
      } else { applyOptimalDefaults(); }
    } catch (error) {
      console.error("Error getting AI suggestions:", error);
      applyOptimalDefaults();
    } finally { setIsOptimizing(false); }
  };

  const applyOptimalDefaults = () => {
    const optimalSchedule: WeeklySchedule = {};
    DAYS.forEach((day) => {
      const isWeekday = ["monday", "tuesday", "wednesday", "thursday", "friday"].includes(day);
      optimalSchedule[day] = DEFAULT_TIMES.map((time) => ({
        time,
        enabled: isWeekday && (time === "08:00" || time === "12:00" || time === "17:00"),
      }));
      // Re-match to actual DEFAULT_TIMES
      optimalSchedule[day] = DEFAULT_TIMES.map((time) => ({
        time,
        enabled: isWeekday,
      }));
    });
    setSchedule(optimalSchedule);
  };

  const totalPostsPerWeek = Object.values(schedule).reduce(
    (total, daySlots) => total + daySlots.filter((s) => s.enabled).length, 0
  );

  const formatTime = (time24: string) => {
    const [hours, minutes] = time24.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const hours12 = hours % 12 || 12;
    return `${hours12}:${minutes.toString().padStart(2, "0")} ${period}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Posting Schedule</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Set when you want to publish content each week</p>
        </div>
        <Button variant="secondary" onClick={handleAISuggest} disabled={isOptimizing}>
          {isOptimizing ? <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <Sparkles className="mr-2 w-4 h-4" />}
          {isOptimizing ? "Optimizing..." : "AI Optimal Times"}
        </Button>
      </div>

      {/* Timezone Selector */}
      <Card>
        <CardContent className="flex flex-row items-center gap-4 py-4 px-4">
          <div className="p-2 rounded-lg bg-primary/10"><Globe className="w-5 h-5 text-primary" /></div>
          <div className="flex-1">
            <p className="font-medium text-gray-900 dark:text-white">Timezone</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">All times shown in your local timezone</p>
          </div>
          <Select value={timezone} onValueChange={setTimezone}>
            <SelectTrigger className="max-w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COMMON_TIMEZONES.map((tz) => (
                <SelectItem key={tz.key} value={tz.key}>{tz.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Weekly Schedule Grid */}
      <Card>
        <CardContent className="overflow-x-auto py-4 px-4">
          <table className="w-full min-w-[400px]">
            <thead>
              <tr>
                <th className="text-left py-2 px-3 text-sm font-medium text-gray-500 dark:text-gray-400">Day</th>
                {DEFAULT_TIMES.map((time) => (
                  <th key={time} className="text-center py-2 px-3 text-sm font-medium text-gray-500 dark:text-gray-400">
                    <div className="flex items-center justify-center gap-1"><Clock className="w-3 h-3" />{formatTime(time)}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DAYS.map((day) => (
                <tr key={day} className="border-t border-gray-100 dark:border-gray-800">
                  <td className="py-3 px-3"><span className="font-medium text-gray-900 dark:text-white">{DAY_LABELS[day]}</span></td>
                  {schedule[day]?.map((slot, index) => (
                    <td key={index} className="py-3 px-3 text-center">
                      <Checkbox
                        checked={slot.enabled}
                        onCheckedChange={() => handleToggleSlot(day, index)}
                        className="h-5 w-5"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-4">
          <Badge variant="default" className="text-base px-3 py-1">{totalPostsPerWeek} posts/week</Badge>
          <span className="text-sm text-gray-500 dark:text-gray-400">Approximately {Math.ceil(totalPostsPerWeek / 7)} per day</span>
        </div>
        {totalPostsPerWeek === 0 && <span className="text-sm text-amber-600 dark:text-amber-400">Select at least one time slot</span>}
      </div>
    </div>
  );
}
