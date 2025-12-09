"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Chip,
  Spinner,
  Switch,
  Select,
  SelectItem,
  Textarea,
  Checkbox,
  Input,
  Divider,
  addToast,
} from "@heroui/react";
import { PageHeader } from "@/components/layout/page-header";
import {
  Settings,
  Zap,
  Clock,
  MessageSquare,
  Target,
  Save,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";

interface AutopilotSettingsData {
  id?: string;
  enabled: boolean;
  onLeadConverted: boolean;
  onFiveStarCall: boolean;
  onWeeklySchedule: boolean;
  weeklyScheduleDay: number;
  weeklyScheduleHour: number;
  approvalMode: string;
  defaultPlatforms: string[];
  maxPostsPerDay: number;
  minHoursBetween: number;
  defaultTone: string;
  includeEmojis: boolean;
  includeHashtags: boolean;
  includeCTA: boolean;
  brandDescription: string | null;
}

interface Integration {
  id: string;
  name: string;
  identifier: string;
  disabled: boolean;
}

const DAYS = [
  { key: "0", label: "Sunday" },
  { key: "1", label: "Monday" },
  { key: "2", label: "Tuesday" },
  { key: "3", label: "Wednesday" },
  { key: "4", label: "Thursday" },
  { key: "5", label: "Friday" },
  { key: "6", label: "Saturday" },
];

const HOURS = Array.from({ length: 24 }, (_, i) => ({
  key: String(i),
  label: `${i === 0 ? "12" : i > 12 ? i - 12 : i}:00 ${i < 12 ? "AM" : "PM"}`,
}));

const TONES = [
  { key: "professional", label: "Professional" },
  { key: "casual", label: "Casual" },
  { key: "humorous", label: "Humorous" },
  { key: "inspirational", label: "Inspirational" },
];

const APPROVAL_MODES = [
  { key: "REVIEW", label: "Manual Review", description: "Review each suggestion before posting" },
  { key: "AUTO_QUEUE", label: "Auto-Queue", description: "Auto-schedule to next available slot" },
  { key: "AUTO_POST", label: "Auto-Post", description: "Post immediately (rate-limited)" },
];

const PLATFORMS: Record<string, { name: string; color: string }> = {
  x: { name: "X (Twitter)", color: "bg-black" },
  linkedin: { name: "LinkedIn", color: "bg-blue-600" },
  facebook: { name: "Facebook", color: "bg-blue-500" },
  instagram: { name: "Instagram", color: "bg-pink-500" },
};

export function AutopilotSettings() {
  const [settings, setSettings] = useState<AutopilotSettingsData | null>(null);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      const response = await fetch("/api/social/settings");
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error("Failed to fetch settings:", error);
    }
  }, []);

  const fetchIntegrations = useCallback(async () => {
    try {
      const response = await fetch("/api/social/integrations");
      if (response.ok) {
        const data = await response.json();
        setIntegrations(data.integrations || []);
      }
    } catch (error) {
      console.error("Failed to fetch integrations:", error);
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchSettings(), fetchIntegrations()]);
      setLoading(false);
    };
    load();
  }, [fetchSettings, fetchIntegrations]);

  const handleSave = async () => {
    if (!settings) return;

    setSaving(true);
    try {
      const response = await fetch("/api/social/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        addToast({ title: "Settings saved", color: "success" });
      } else {
        addToast({ title: "Failed to save settings", color: "danger" });
      }
    } catch (error) {
      console.error("Failed to save:", error);
      addToast({ title: "Failed to save settings", color: "danger" });
    } finally {
      setSaving(false);
    }
  };

  const updateSettings = (updates: Partial<AutopilotSettingsData>) => {
    setSettings((prev) => (prev ? { ...prev, ...updates } : null));
  };

  const togglePlatform = (platform: string) => {
    if (!settings) return;
    const platforms = settings.defaultPlatforms.includes(platform)
      ? settings.defaultPlatforms.filter((p) => p !== platform)
      : [...settings.defaultPlatforms, platform];
    updateSettings({ defaultPlatforms: platforms });
  };

  const availablePlatforms = integrations
    .filter((int) => !int.disabled)
    .map((int) => int.identifier)
    .filter((v, i, a) => a.indexOf(v) === i);

  if (loading || !settings) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          as={Link}
          href="/dashboard/social/suggestions"
          variant="flat"
          size="sm"
          startContent={<ArrowLeft className="w-4 h-4" />}
        >
          Back to Suggestions
        </Button>
      </div>

      <PageHeader
        title="Autopilot Settings"
        description="Configure how AI generates and posts social media content"
      />

      {/* Main Toggle */}
      <Card>
        <CardBody className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${settings.enabled ? "bg-success/10" : "bg-default-100"}`}>
              <Zap className={`w-5 h-5 ${settings.enabled ? "text-success" : "text-default-400"}`} />
            </div>
            <div>
              <h3 className="font-medium">Autopilot Mode</h3>
              <p className="text-sm text-default-500">
                {settings.enabled
                  ? "AI suggestions are actively being generated"
                  : "Enable to start generating AI content suggestions"}
              </p>
            </div>
          </div>
          <Switch
            isSelected={settings.enabled}
            onValueChange={(enabled) => updateSettings({ enabled })}
            size="lg"
            color="success"
          />
        </CardBody>
      </Card>

      {/* Triggers */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            <h3 className="font-medium">Triggers</h3>
          </div>
        </CardHeader>
        <CardBody className="space-y-4">
          <p className="text-sm text-default-500">
            Choose which events should trigger AI content generation
          </p>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-default-50 rounded-lg">
              <div>
                <p className="font-medium">Lead Converted</p>
                <p className="text-sm text-default-500">
                  Generate celebratory content when a lead becomes a customer
                </p>
              </div>
              <Switch
                isSelected={settings.onLeadConverted}
                onValueChange={(onLeadConverted) => updateSettings({ onLeadConverted })}
                isDisabled={!settings.enabled}
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-default-50 rounded-lg">
              <div>
                <p className="font-medium">5-Star Call</p>
                <p className="text-sm text-default-500">
                  Generate content highlighting great customer interactions
                </p>
              </div>
              <Switch
                isSelected={settings.onFiveStarCall}
                onValueChange={(onFiveStarCall) => updateSettings({ onFiveStarCall })}
                isDisabled={!settings.enabled}
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-default-50 rounded-lg">
              <div>
                <p className="font-medium">Weekly Content</p>
                <p className="text-sm text-default-500">
                  Generate weekly educational or tip content
                </p>
              </div>
              <Switch
                isSelected={settings.onWeeklySchedule}
                onValueChange={(onWeeklySchedule) => updateSettings({ onWeeklySchedule })}
                isDisabled={!settings.enabled}
              />
            </div>

            {settings.onWeeklySchedule && (
              <div className="flex gap-4 pl-4">
                <Select
                  label="Day"
                  selectedKeys={[String(settings.weeklyScheduleDay)]}
                  onSelectionChange={(keys) => {
                    const day = Array.from(keys)[0];
                    if (day) updateSettings({ weeklyScheduleDay: parseInt(day as string) });
                  }}
                  className="max-w-xs"
                  isDisabled={!settings.enabled}
                >
                  {DAYS.map((day) => (
                    <SelectItem key={day.key}>{day.label}</SelectItem>
                  ))}
                </Select>
                <Select
                  label="Time"
                  selectedKeys={[String(settings.weeklyScheduleHour)]}
                  onSelectionChange={(keys) => {
                    const hour = Array.from(keys)[0];
                    if (hour) updateSettings({ weeklyScheduleHour: parseInt(hour as string) });
                  }}
                  className="max-w-xs"
                  isDisabled={!settings.enabled}
                >
                  {HOURS.map((hour) => (
                    <SelectItem key={hour.key}>{hour.label}</SelectItem>
                  ))}
                </Select>
              </div>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Approval Mode */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            <h3 className="font-medium">Approval Mode</h3>
          </div>
        </CardHeader>
        <CardBody className="space-y-4">
          <p className="text-sm text-default-500">
            Choose how suggestions are handled after generation
          </p>

          <div className="space-y-2">
            {APPROVAL_MODES.map((mode) => (
              <div
                key={mode.key}
                className={`p-3 rounded-lg cursor-pointer border-2 transition-colors ${
                  settings.approvalMode === mode.key
                    ? "border-primary bg-primary/5"
                    : "border-transparent bg-default-50 hover:bg-default-100"
                }`}
                onClick={() => updateSettings({ approvalMode: mode.key })}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`w-4 h-4 rounded-full border-2 ${
                      settings.approvalMode === mode.key
                        ? "border-primary bg-primary"
                        : "border-default-300"
                    }`}
                  />
                  <p className="font-medium">{mode.label}</p>
                </div>
                <p className="text-sm text-default-500 ml-6">{mode.description}</p>
              </div>
            ))}
          </div>

          {settings.approvalMode !== "REVIEW" && (
            <div className="space-y-4 pt-4">
              <Divider />
              <p className="text-sm font-medium">Rate Limits</p>
              <div className="flex gap-4">
                <Input
                  type="number"
                  label="Max posts per day"
                  value={String(settings.maxPostsPerDay)}
                  onValueChange={(v) => updateSettings({ maxPostsPerDay: parseInt(v) || 3 })}
                  min={1}
                  max={20}
                  className="max-w-[150px]"
                />
                <Input
                  type="number"
                  label="Min hours between posts"
                  value={String(settings.minHoursBetween)}
                  onValueChange={(v) => updateSettings({ minHoursBetween: parseInt(v) || 4 })}
                  min={1}
                  max={24}
                  className="max-w-[180px]"
                />
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Default Platforms */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            <h3 className="font-medium">Default Platforms</h3>
          </div>
        </CardHeader>
        <CardBody className="space-y-4">
          <p className="text-sm text-default-500">
            Select which platforms to post to by default (for auto-post mode)
          </p>

          {availablePlatforms.length === 0 ? (
            <p className="text-default-400 text-sm">
              No social accounts connected. Connect accounts in the Social Dashboard first.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {availablePlatforms.map((platform) => (
                <Chip
                  key={platform}
                  className={`cursor-pointer transition-all ${
                    settings.defaultPlatforms.includes(platform)
                      ? `${PLATFORMS[platform]?.color || "bg-gray-500"} text-white`
                      : "bg-default-100"
                  }`}
                  onClick={() => togglePlatform(platform)}
                >
                  {PLATFORMS[platform]?.name || platform}
                </Chip>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Brand Voice */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            <h3 className="font-medium">Brand Voice</h3>
          </div>
        </CardHeader>
        <CardBody className="space-y-4">
          <p className="text-sm text-default-500">
            Customize how AI generates content for your brand
          </p>

          <Select
            label="Tone"
            selectedKeys={[settings.defaultTone]}
            onSelectionChange={(keys) => {
              const tone = Array.from(keys)[0];
              if (tone) updateSettings({ defaultTone: tone as string });
            }}
            className="max-w-xs"
          >
            {TONES.map((tone) => (
              <SelectItem key={tone.key}>{tone.label}</SelectItem>
            ))}
          </Select>

          <div className="flex flex-wrap gap-4">
            <Checkbox
              isSelected={settings.includeEmojis}
              onValueChange={(includeEmojis) => updateSettings({ includeEmojis })}
            >
              Include emojis
            </Checkbox>
            <Checkbox
              isSelected={settings.includeHashtags}
              onValueChange={(includeHashtags) => updateSettings({ includeHashtags })}
            >
              Include hashtags
            </Checkbox>
            <Checkbox
              isSelected={settings.includeCTA}
              onValueChange={(includeCTA) => updateSettings({ includeCTA })}
            >
              Include call-to-action
            </Checkbox>
          </div>

          <Textarea
            label="Brand Description (optional)"
            placeholder="Describe your brand, target audience, and any specific guidelines for content generation..."
            value={settings.brandDescription || ""}
            onValueChange={(brandDescription) => updateSettings({ brandDescription })}
            minRows={3}
            maxRows={6}
          />
        </CardBody>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          color="primary"
          size="lg"
          startContent={!saving && <Save className="w-5 h-5" />}
          onPress={handleSave}
          isLoading={saving}
        >
          Save Settings
        </Button>
      </div>
    </div>
  );
}
