"use client";

/**
 * Publishing Settings Component - PKG-024
 * Configure publishing schedules per platform
 */

import { useState, useEffect } from "react";
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Switch,
  Chip,
  Spinner,
  Select,
  SelectItem,
  Input,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from "@heroui/react";
import {
  Clock,
  Plus,
  Trash2,
  Settings,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import {
  getPlatformColor,
  getPlatformName,
  type SocialPlatform,
} from "@/lib/utils/platform";

interface PublishingSchedule {
  id: string;
  platform: string;
  activeDays: number[];
  postingTimes: string[];
  timezone: string;
  maxPostsPerDay: number;
  isActive: boolean;
}

interface Props {
  orgId: string;
}

const PLATFORMS: SocialPlatform[] = [
  "TWITTER",
  "LINKEDIN",
  "FACEBOOK",
  "INSTAGRAM",
  "TIKTOK",
  "YOUTUBE",
  "THREADS",
  "BLUESKY",
];

const DAYS = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

const TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Australia/Sydney",
];

export function PublishingSettings({ orgId }: Props) {
  const [schedules, setSchedules] = useState<PublishingSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();

  const [editingSchedule, setEditingSchedule] = useState<{
    platform: SocialPlatform;
    activeDays: number[];
    postingTimes: string[];
    timezone: string;
    maxPostsPerDay: number;
    isActive: boolean;
  }>({
    platform: "TWITTER",
    activeDays: [1, 2, 3, 4, 5],
    postingTimes: ["09:00", "12:00", "17:00"],
    timezone: "UTC",
    maxPostsPerDay: 3,
    isActive: true,
  });

  // Fetch schedules
  useEffect(() => {
    const fetchSchedules = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/publishing/schedule?orgId=${orgId}`);
        if (!response.ok) throw new Error("Failed to fetch schedules");

        const data = await response.json();
        setSchedules(data.schedules);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchSchedules();
  }, [orgId]);

  // Save schedule
  const saveSchedule = async () => {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/publishing/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId,
          ...editingSchedule,
        }),
      });

      if (!response.ok) throw new Error("Failed to save schedule");

      const data = await response.json();

      // Update local state
      setSchedules((prev) => {
        const existing = prev.findIndex(
          (s) => s.platform === editingSchedule.platform
        );
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = data.schedule;
          return updated;
        }
        return [...prev, data.schedule];
      });

      setSuccess("Schedule saved successfully");
      setTimeout(() => setSuccess(null), 3000);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  // Delete schedule
  const deleteSchedule = async (platform: string) => {
    if (!confirm("Delete this publishing schedule?")) return;

    try {
      const response = await fetch(
        `/api/publishing/schedule?orgId=${orgId}&platform=${platform}`,
        { method: "DELETE" }
      );

      if (!response.ok) throw new Error("Failed to delete schedule");

      setSchedules((prev) => prev.filter((s) => s.platform !== platform));
      setSuccess("Schedule deleted");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  // Toggle schedule active state
  const toggleSchedule = async (schedule: PublishingSchedule) => {
    try {
      const response = await fetch("/api/publishing/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId,
          platform: schedule.platform,
          activeDays: schedule.activeDays,
          postingTimes: schedule.postingTimes,
          timezone: schedule.timezone,
          maxPostsPerDay: schedule.maxPostsPerDay,
          isActive: !schedule.isActive,
        }),
      });

      if (!response.ok) throw new Error("Failed to update schedule");

      setSchedules((prev) =>
        prev.map((s) =>
          s.platform === schedule.platform
            ? { ...s, isActive: !s.isActive }
            : s
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update");
    }
  };

  // Open edit modal
  const openEditModal = (schedule?: PublishingSchedule) => {
    if (schedule) {
      setEditingSchedule({
        platform: schedule.platform as SocialPlatform,
        activeDays: schedule.activeDays,
        postingTimes: schedule.postingTimes,
        timezone: schedule.timezone,
        maxPostsPerDay: schedule.maxPostsPerDay,
        isActive: schedule.isActive,
      });
    } else {
      // Find a platform that doesn't have a schedule yet
      const usedPlatforms = new Set(schedules.map((s) => s.platform));
      const availablePlatform =
        PLATFORMS.find((p) => !usedPlatforms.has(p)) || "TWITTER";

      setEditingSchedule({
        platform: availablePlatform,
        activeDays: [1, 2, 3, 4, 5],
        postingTimes: ["09:00", "12:00", "17:00"],
        timezone: "UTC",
        maxPostsPerDay: 3,
        isActive: true,
      });
    }
    onOpen();
  };

  // Add/remove posting time
  const addPostingTime = () => {
    setEditingSchedule((prev) => ({
      ...prev,
      postingTimes: [...prev.postingTimes, "12:00"],
    }));
  };

  const removePostingTime = (index: number) => {
    setEditingSchedule((prev) => ({
      ...prev,
      postingTimes: prev.postingTimes.filter((_, i) => i !== index),
    }));
  };

  const updatePostingTime = (index: number, value: string) => {
    setEditingSchedule((prev) => ({
      ...prev,
      postingTimes: prev.postingTimes.map((t, i) => (i === index ? value : t)),
    }));
  };

  // Toggle day
  const toggleDay = (day: number) => {
    setEditingSchedule((prev) => ({
      ...prev,
      activeDays: prev.activeDays.includes(day)
        ? prev.activeDays.filter((d) => d !== day)
        : [...prev.activeDays, day].sort(),
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <Settings className="w-5 h-5" />
            <h2 className="text-xl font-semibold">Publishing Schedules</h2>
          </div>
          <Button color="primary" startContent={<Plus className="w-4 h-4" />} onPress={() => openEditModal()}>
            Add Schedule
          </Button>
        </CardHeader>
      </Card>

      {/* Messages */}
      {error && (
        <Card className="bg-red-50 dark:bg-red-900/20">
          <CardBody className="flex flex-row items-center gap-2 text-red-600">
            <AlertCircle className="w-4 h-4" />
            {error}
          </CardBody>
        </Card>
      )}

      {success && (
        <Card className="bg-green-50 dark:bg-green-900/20">
          <CardBody className="flex flex-row items-center gap-2 text-green-600">
            <CheckCircle className="w-4 h-4" />
            {success}
          </CardBody>
        </Card>
      )}

      {/* Schedules List */}
      {schedules.length === 0 ? (
        <Card>
          <CardBody className="text-center py-12">
            <Clock className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">No publishing schedules configured</p>
            <p className="text-sm text-gray-400 mt-1">
              Add a schedule to automate your content publishing
            </p>
          </CardBody>
        </Card>
      ) : (
        <div className="grid gap-4">
          {schedules.map((schedule) => (
            <Card key={schedule.id}>
              <CardBody>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${getPlatformColor(
                        schedule.platform
                      )}`}
                    >
                      <span className="text-white text-sm font-bold">
                        {schedule.platform.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-medium">
                        {getPlatformName(schedule.platform)}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm text-gray-500">
                          {schedule.postingTimes.join(", ")}
                        </span>
                        <span className="text-gray-300">•</span>
                        <span className="text-sm text-gray-500">
                          {schedule.activeDays
                            .map((d) => DAYS.find((day) => day.value === d)?.label)
                            .join(", ")}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <Chip
                      color={schedule.isActive ? "success" : "default"}
                      variant="flat"
                      size="sm"
                    >
                      {schedule.isActive ? "Active" : "Paused"}
                    </Chip>

                    <Switch
                      isSelected={schedule.isActive}
                      onValueChange={() => toggleSchedule(schedule)}
                      size="sm"
                    />

                    <Button
                      variant="light"
                      size="sm"
                      onPress={() => openEditModal(schedule)}
                    >
                      Edit
                    </Button>

                    <Button
                      isIconOnly
                      variant="light"
                      size="sm"
                      color="danger"
                      onPress={() => deleteSchedule(schedule.platform)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="2xl">
        <ModalContent>
          <ModalHeader>
            {schedules.find((s) => s.platform === editingSchedule.platform)
              ? "Edit Schedule"
              : "Add Schedule"}
          </ModalHeader>
          <ModalBody>
            <div className="space-y-6">
              {/* Platform */}
              <Select
                label="Platform"
                selectedKeys={[editingSchedule.platform]}
                onChange={(e) =>
                  setEditingSchedule((prev) => ({
                    ...prev,
                    platform: e.target.value as SocialPlatform,
                  }))
                }
                isDisabled={schedules.some(
                  (s) => s.platform === editingSchedule.platform
                )}
              >
                {PLATFORMS.map((platform) => (
                  <SelectItem key={platform} value={platform}>
                    {getPlatformName(platform)}
                  </SelectItem>
                ))}
              </Select>

              {/* Active Days */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Active Days
                </label>
                <div className="flex gap-2">
                  {DAYS.map((day) => (
                    <Button
                      key={day.value}
                      size="sm"
                      variant={
                        editingSchedule.activeDays.includes(day.value)
                          ? "solid"
                          : "bordered"
                      }
                      color={
                        editingSchedule.activeDays.includes(day.value)
                          ? "primary"
                          : "default"
                      }
                      onPress={() => toggleDay(day.value)}
                    >
                      {day.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Posting Times */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">Posting Times</label>
                  <Button
                    size="sm"
                    variant="light"
                    startContent={<Plus className="w-3 h-3" />}
                    onPress={addPostingTime}
                  >
                    Add Time
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {editingSchedule.postingTimes.map((time, index) => (
                    <div key={index} className="flex gap-1">
                      <Input
                        type="time"
                        value={time}
                        onChange={(e) =>
                          updatePostingTime(index, e.target.value)
                        }
                        size="sm"
                      />
                      {editingSchedule.postingTimes.length > 1 && (
                        <Button
                          isIconOnly
                          size="sm"
                          variant="light"
                          color="danger"
                          onPress={() => removePostingTime(index)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Timezone */}
              <Select
                label="Timezone"
                selectedKeys={[editingSchedule.timezone]}
                onChange={(e) =>
                  setEditingSchedule((prev) => ({
                    ...prev,
                    timezone: e.target.value,
                  }))
                }
              >
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz} value={tz}>
                    {tz}
                  </SelectItem>
                ))}
              </Select>

              {/* Max Posts Per Day */}
              <Input
                type="number"
                label="Max Posts Per Day"
                value={editingSchedule.maxPostsPerDay.toString()}
                onChange={(e) =>
                  setEditingSchedule((prev) => ({
                    ...prev,
                    maxPostsPerDay: parseInt(e.target.value) || 1,
                  }))
                }
                min={1}
                max={20}
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={onClose}>
              Cancel
            </Button>
            <Button color="primary" onPress={saveSchedule} isLoading={saving}>
              Save Schedule
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
