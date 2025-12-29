"use client";

import { useState } from "react";
import { Card, CardBody, Button, Chip } from "@heroui/react";
import { Clock, Plus, X, Sparkles, Loader2 } from "lucide-react";
import type { DistributeWizardData, ScheduleData, TimeSlot } from "@/lib/flywheel/types";

interface ScheduleStepProps {
  data: DistributeWizardData;
  updateData: (updates: Partial<DistributeWizardData>) => void;
}

const DAYS = [
  { key: "monday", label: "Mon" },
  { key: "tuesday", label: "Tue" },
  { key: "wednesday", label: "Wed" },
  { key: "thursday", label: "Thu" },
  { key: "friday", label: "Fri" },
  { key: "saturday", label: "Sat" },
  { key: "sunday", label: "Sun" },
] as const;

const TIME_OPTIONS = [
  "06:00", "07:00", "08:00", "09:00", "10:00", "11:00",
  "12:00", "13:00", "14:00", "15:00", "16:00", "17:00",
  "18:00", "19:00", "20:00", "21:00",
];

const DEFAULT_SCHEDULE: ScheduleData = {
  monday: [{ time: "09:00", platforms: ["twitter", "linkedin"] }],
  tuesday: [{ time: "12:00", platforms: ["twitter"] }],
  wednesday: [{ time: "09:00", platforms: ["linkedin"] }],
  thursday: [{ time: "15:00", platforms: ["twitter"] }],
  friday: [{ time: "10:00", platforms: ["twitter", "linkedin"] }],
  saturday: [],
  sunday: [],
};

export function ScheduleStep({ data, updateData }: ScheduleStepProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedDay, setSelectedDay] = useState<keyof ScheduleData>("monday");
  const [selectedTime, setSelectedTime] = useState("09:00");

  const schedule = data.schedule || {};
  const connectedAccounts = data.connectedAccounts || [];
  const connectedPlatformIds = connectedAccounts
    .filter((a) => a.connected)
    .map((a) => a.platform);

  const getDaySlots = (day: keyof ScheduleData): TimeSlot[] => {
    return schedule[day] || [];
  };

  const addTimeSlot = (day: keyof ScheduleData, time: string) => {
    const daySlots = getDaySlots(day);
    if (daySlots.some((slot) => slot.time === time)) return;

    const newSlot: TimeSlot = {
      time,
      platforms: connectedPlatformIds.slice(0, 2), // Default to first 2 connected platforms
    };

    updateData({
      schedule: {
        ...schedule,
        [day]: [...daySlots, newSlot].sort((a, b) => a.time.localeCompare(b.time)),
      },
    });
  };

  const removeTimeSlot = (day: keyof ScheduleData, time: string) => {
    const daySlots = getDaySlots(day);
    updateData({
      schedule: {
        ...schedule,
        [day]: daySlots.filter((slot) => slot.time !== time),
      },
    });
  };

  const useDefaultSchedule = () => {
    // Filter default schedule to only include connected platforms
    const filteredSchedule: ScheduleData = {};
    for (const [day, slots] of Object.entries(DEFAULT_SCHEDULE)) {
      filteredSchedule[day as keyof ScheduleData] = slots.map((slot) => ({
        ...slot,
        platforms: slot.platforms.filter((p) => connectedPlatformIds.includes(p)),
      }));
    }
    updateData({ schedule: filteredSchedule });
  };

  const generateOptimalSchedule = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch("/api/flywheel/phases/distribute/optimal-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platforms: connectedPlatformIds,
          timezone: data.timezone || "UTC",
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.schedule) {
          updateData({ schedule: result.schedule });
        }
      }
    } catch (error) {
      console.error("Error generating schedule:", error);
      // Fallback to default
      useDefaultSchedule();
    } finally {
      setIsGenerating(false);
    }
  };

  const totalSlots = DAYS.reduce(
    (sum, day) => sum + getDaySlots(day.key).length,
    0
  );

  return (
    <div className="space-y-6">
      <p className="text-gray-600 dark:text-gray-400">
        Set up your weekly posting schedule. Choose the days and times when
        content will be published.
      </p>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="bordered"
          size="sm"
          startContent={<Clock className="w-4 h-4" />}
          onPress={useDefaultSchedule}
        >
          Use Default Schedule
        </Button>
        <Button
          variant="bordered"
          size="sm"
          color="secondary"
          startContent={
            isGenerating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )
          }
          onPress={generateOptimalSchedule}
          isDisabled={isGenerating}
        >
          AI Optimal Times
        </Button>
      </div>

      {/* Schedule Grid */}
      <div className="grid grid-cols-7 gap-2">
        {DAYS.map((day) => {
          const slots = getDaySlots(day.key);
          const isSelected = selectedDay === day.key;

          return (
            <div key={day.key} className="flex flex-col">
              <button
                onClick={() => setSelectedDay(day.key)}
                className={`p-2 text-center rounded-lg text-sm font-medium transition-all ${
                  isSelected
                    ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                {day.label}
                {slots.length > 0 && (
                  <span className="block text-xs mt-1">
                    {slots.length} slot{slots.length !== 1 ? "s" : ""}
                  </span>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Selected Day Details */}
      <Card className="border border-gray-200 dark:border-gray-700">
        <CardBody className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium text-gray-900 dark:text-white capitalize">
              {selectedDay}
            </h4>
            <div className="flex items-center gap-2">
              <select
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1"
              >
                {TIME_OPTIONS.map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
              <Button
                size="sm"
                color="primary"
                variant="flat"
                startContent={<Plus className="w-3 h-3" />}
                onPress={() => addTimeSlot(selectedDay, selectedTime)}
              >
                Add
              </Button>
            </div>
          </div>

          {getDaySlots(selectedDay).length > 0 ? (
            <div className="space-y-2">
              {getDaySlots(selectedDay).map((slot) => (
                <div
                  key={slot.time}
                  className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-800"
                >
                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="font-medium text-gray-900 dark:text-white">
                      {slot.time}
                    </span>
                    <div className="flex gap-1">
                      {slot.platforms.map((p) => (
                        <Chip key={p} size="sm" variant="flat">
                          {p}
                        </Chip>
                      ))}
                    </div>
                  </div>
                  <Button
                    isIconOnly
                    size="sm"
                    variant="light"
                    color="danger"
                    onPress={() => removeTimeSlot(selectedDay, slot.time)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
              No posting times scheduled for {selectedDay}
            </p>
          )}
        </CardBody>
      </Card>

      {/* Summary */}
      <div className="flex items-center justify-center gap-4 text-sm">
        <div className="text-gray-500 dark:text-gray-400">
          Total scheduled posts:
        </div>
        <Chip color={totalSlots > 0 ? "success" : "warning"} variant="flat">
          {totalSlots} per week
        </Chip>
      </div>
    </div>
  );
}
