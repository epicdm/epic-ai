"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Globe, MapPin, Clock, Sparkles } from "lucide-react";
import type { DistributeWizardData } from "@/lib/flywheel/types";

interface TimezoneStepProps {
  data: DistributeWizardData;
  updateData: (updates: Partial<DistributeWizardData>) => void;
}

const POPULAR_TIMEZONES = [
  { value: "America/New_York", label: "Eastern Time (ET)", offset: "UTC-5/UTC-4" },
  { value: "America/Chicago", label: "Central Time (CT)", offset: "UTC-6/UTC-5" },
  { value: "America/Denver", label: "Mountain Time (MT)", offset: "UTC-7/UTC-6" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)", offset: "UTC-8/UTC-7" },
  { value: "America/Phoenix", label: "Arizona (MST)", offset: "UTC-7" },
  { value: "America/Anchorage", label: "Alaska Time", offset: "UTC-9/UTC-8" },
  { value: "Pacific/Honolulu", label: "Hawaii Time", offset: "UTC-10" },
  { value: "Europe/London", label: "London (GMT/BST)", offset: "UTC+0/UTC+1" },
  { value: "Europe/Paris", label: "Central European", offset: "UTC+1/UTC+2" },
  { value: "Europe/Berlin", label: "Berlin", offset: "UTC+1/UTC+2" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)", offset: "UTC+9" },
  { value: "Asia/Shanghai", label: "China (CST)", offset: "UTC+8" },
  { value: "Asia/Singapore", label: "Singapore (SGT)", offset: "UTC+8" },
  { value: "Asia/Dubai", label: "Dubai (GST)", offset: "UTC+4" },
  { value: "Asia/Kolkata", label: "India (IST)", offset: "UTC+5:30" },
  { value: "Australia/Sydney", label: "Sydney (AEST)", offset: "UTC+10/UTC+11" },
  { value: "Australia/Melbourne", label: "Melbourne", offset: "UTC+10/UTC+11" },
  { value: "Pacific/Auckland", label: "New Zealand", offset: "UTC+12/UTC+13" },
];

export function TimezoneStep({ data, updateData }: TimezoneStepProps) {
  const [detectedTimezone, setDetectedTimezone] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<string>("");

  // Detect user's timezone on mount
  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      setDetectedTimezone(tz);

      // Auto-select if not already set
      if (!data.timezone) {
        updateData({ timezone: tz });
      }
    } catch {
      console.error("Could not detect timezone");
    }
  }, [data.timezone, updateData]);

  // Update current time display
  useEffect(() => {
    const updateTime = () => {
      if (data.timezone) {
        try {
          const time = new Date().toLocaleTimeString("en-US", {
            timeZone: data.timezone,
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          });
          setCurrentTime(time);
        } catch {
          setCurrentTime("");
        }
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [data.timezone]);

  const handleTimezoneChange = (value: string) => {
    updateData({ timezone: value });
  };

  const selectedTimezone = POPULAR_TIMEZONES.find(
    (tz) => tz.value === data.timezone
  );

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">
        Set your timezone so posts are scheduled at the right times for your
        audience. We&apos;ll use this for all scheduling.
      </p>

      {/* Auto-Detected Banner */}
      {detectedTimezone && (
        <Card className="border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-800">
                <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Timezone Detected
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  We detected your timezone as{" "}
                  <strong>{detectedTimezone}</strong>
                </p>
              </div>
              {data.timezone !== detectedTimezone && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => updateData({ timezone: detectedTimezone })}
                >
                  Use Detected
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timezone Selection */}
      <Card className="border border-gray-200 dark:border-gray-700">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
              <Globe className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">
                Select Your Timezone
              </h4>
              <p className="text-sm text-muted-foreground">
                Choose from popular timezones
              </p>
            </div>
          </div>

          <Select
            value={data.timezone}
            onValueChange={(value) => {
              if (value) handleTimezoneChange(value);
            }}
          >
            <SelectTrigger className="bg-white dark:bg-gray-800">
              <SelectValue placeholder="Select a timezone" />
            </SelectTrigger>
            <SelectContent>
              {POPULAR_TIMEZONES.map((tz) => (
                <SelectItem key={tz.value} value={tz.value}>
                  {tz.label} ({tz.offset})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Current Time Preview */}
      {data.timezone && (
        <Card className="border border-gray-200 dark:border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900">
                  <Clock className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    Current Time
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedTimezone?.label || data.timezone}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {currentTime}
                </p>
                {selectedTimezone && (
                  <p className="text-sm text-muted-foreground">
                    {selectedTimezone.offset}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Location Note */}
      <div className="flex items-start gap-2 text-sm text-muted-foreground">
        <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <p>
          Your timezone affects when scheduled posts are published. If your
          audience is in a different timezone, consider scheduling posts
          according to their local time.
        </p>
      </div>

      {/* Selected Status */}
      {data.timezone && (
        <div className="flex items-center justify-center">
          <Badge variant="outline">
            Timezone set: {selectedTimezone?.label || data.timezone}
          </Badge>
        </div>
      )}
    </div>
  );
}
