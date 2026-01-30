"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Twitter, Linkedin, Facebook, Instagram, LucideIcon } from "lucide-react";
import type { DistributeWizardData, PlatformSettings } from "@/lib/flywheel/types";

interface PlatformSettingsStepProps {
  data: DistributeWizardData;
  updateData: (updates: Partial<DistributeWizardData>) => void;
}

const PLATFORMS: { id: string; name: string; icon: LucideIcon; color: string }[] = [
  { id: "twitter", name: "Twitter / X", icon: Twitter, color: "#1DA1F2" },
  { id: "linkedin", name: "LinkedIn", icon: Linkedin, color: "#0A66C2" },
  { id: "facebook", name: "Facebook", icon: Facebook, color: "#1877F2" },
  { id: "instagram", name: "Instagram", icon: Instagram, color: "#E4405F" },
];

const DEFAULT_SETTINGS: PlatformSettings = {
  enabled: true,
  autoPost: false,
  postingFrequency: 3,
};

export function PlatformSettingsStep({ data, updateData }: PlatformSettingsStepProps) {
  const connectedAccounts = data.connectedAccounts || [];
  const platformSettings = data.platformSettings || {};

  // Normalize platform IDs to lowercase for case-insensitive comparison
  // DB stores uppercase (FACEBOOK) but UI uses lowercase (facebook)
  const connectedPlatformIds = connectedAccounts
    .filter((a) => a.connected)
    .map((a) => a.platform.toLowerCase());

  const getSettings = (platformId: string): PlatformSettings => {
    return platformSettings[platformId] || { ...DEFAULT_SETTINGS };
  };

  const updatePlatformSettings = (
    platformId: string,
    updates: Partial<PlatformSettings>
  ) => {
    updateData({
      platformSettings: {
        ...platformSettings,
        [platformId]: {
          ...getSettings(platformId),
          ...updates,
        },
      },
    });
  };

  const connectedPlatforms = PLATFORMS.filter((p) =>
    connectedPlatformIds.includes(p.id.toLowerCase())
  );

  if (connectedPlatforms.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">
          No connected accounts. Please go back and connect at least one
          social account.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">
        Configure how Epic AI posts to each of your connected platforms. These
        settings can be changed at any time.
      </p>

      <div className="space-y-4">
        {connectedPlatforms.map((platform) => {
          const Icon = platform.icon;
          const settings = getSettings(platform.id);

          return (
            <Card
              key={platform.id}
              className={`border transition-all ${
                settings.enabled
                  ? "border-gray-200 dark:border-gray-700"
                  : "border-gray-200 dark:border-gray-800 opacity-60"
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4 mb-4">
                  <div
                    className="p-2 rounded-lg"
                    style={{ backgroundColor: `${platform.color}20` }}
                  >
                    <Icon
                      className="w-5 h-5"
                      style={{ color: platform.color }}
                    />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {platform.name}
                    </h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Enabled</span>
                    <Switch
                      checked={settings.enabled}
                      onCheckedChange={(value) =>
                        updatePlatformSettings(platform.id, { enabled: value })
                      }
                    />
                  </div>
                </div>

                {settings.enabled && (
                  <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                    {/* Auto Post Toggle */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Auto-Post
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Automatically publish scheduled content
                        </p>
                      </div>
                      <Switch
                        checked={settings.autoPost}
                        onCheckedChange={(value) =>
                          updatePlatformSettings(platform.id, { autoPost: value })
                        }
                      />
                    </div>

                    {/* Posting Frequency */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Posts per week
                        </p>
                        <span className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                          {settings.postingFrequency || 3}
                        </span>
                      </div>
                      <input
                        type="range"
                        className="w-full accent-primary"
                        value={settings.postingFrequency || 3}
                        onChange={(e) =>
                          updatePlatformSettings(platform.id, {
                            postingFrequency: Number(e.target.value),
                          })
                        }
                        min={1}
                        max={14}
                        step={1}
                      />
                      <div className="flex justify-between text-xs text-gray-400 mt-1">
                        <span>1/week</span>
                        <span>2/day</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Info Box */}
      <Card className="border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/30">
        <CardContent className="p-4">
          <h5 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
            Posting Tips
          </h5>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
            <li>• <strong>Twitter:</strong> 1-3 posts/day optimal for engagement</li>
            <li>• <strong>LinkedIn:</strong> 3-5 posts/week for thought leadership</li>
            <li>• <strong>Facebook:</strong> 1-2 posts/day for community building</li>
            <li>• <strong>Instagram:</strong> 1 post/day + stories for visibility</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
