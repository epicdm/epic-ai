"use client";

/**
 * Channel Selector Component
 *
 * Allows users to select which channels to enable after Brand Brain setup.
 * Part of the "One Brain, Many Voices" architecture - Brand Brain powers
 * multiple channels (social, voice, email) with consistent brand voice.
 *
 * Can be used in:
 * - Onboarding flow (after Brand Brain setup)
 * - Dashboard settings (to enable/disable channels)
 */

import { useState } from "react";
import { Card, CardBody, Button, Chip, Switch } from "@heroui/react";
import {
  Phone,
  Share2,
  Mail,
  MessageSquare,
  CheckCircle,
  ArrowRight,
  Sparkles,
  Brain,
  ExternalLink,
} from "lucide-react";

export interface Channel {
  id: "social" | "voice" | "email" | "chat";
  name: string;
  description: string;
  icon: React.ReactNode;
  features: string[];
  status: "available" | "coming_soon" | "beta";
  enabled?: boolean;
  setupPath?: string;
}

interface ChannelSelectorProps {
  selectedChannels: string[];
  onChannelsChange: (channels: string[]) => void;
  onComplete?: () => void;
  showContinueButton?: boolean;
  brandName?: string;
  mode?: "onboarding" | "settings";
}

const DEFAULT_CHANNELS: Channel[] = [
  {
    id: "social",
    name: "Social Media",
    description: "AI-powered content creation and publishing across platforms",
    icon: <Share2 className="w-6 h-6" />,
    features: [
      "Auto-generate posts in your brand voice",
      "Schedule to Twitter, LinkedIn, Facebook, Instagram",
      "Analytics and engagement tracking",
      "AI learning from performance",
    ],
    status: "available",
    setupPath: "/dashboard/social/connect",
  },
  {
    id: "voice",
    name: "Voice AI",
    description: "Intelligent voice agents for phone calls and support",
    icon: <Phone className="w-6 h-6" />,
    features: [
      "24/7 AI phone agents",
      "Inbound & outbound calls",
      "Auto-configured from Brand Brain",
      "Call routing and escalation",
    ],
    status: "available",
    setupPath: "/dashboard/voice/agents/new",
  },
  {
    id: "email",
    name: "Email Campaigns",
    description: "AI-crafted email sequences for outreach and nurturing",
    icon: <Mail className="w-6 h-6" />,
    features: [
      "Personalized email content",
      "Drip campaigns",
      "Lead nurturing sequences",
      "A/B testing with AI optimization",
    ],
    status: "coming_soon",
  },
  {
    id: "chat",
    name: "Web Chat",
    description: "AI chat widget for your website with brand personality",
    icon: <MessageSquare className="w-6 h-6" />,
    features: [
      "Embeddable chat widget",
      "24/7 customer support",
      "Lead qualification",
      "Seamless handoff to human",
    ],
    status: "coming_soon",
  },
];

export function ChannelSelector({
  selectedChannels,
  onChannelsChange,
  onComplete,
  showContinueButton = true,
  brandName,
  mode = "onboarding",
}: ChannelSelectorProps) {
  const [expandedChannel, setExpandedChannel] = useState<string | null>(null);

  const toggleChannel = (channelId: string) => {
    const channel = DEFAULT_CHANNELS.find((c) => c.id === channelId);
    if (channel?.status !== "available") return;

    if (selectedChannels.includes(channelId)) {
      onChannelsChange(selectedChannels.filter((id) => id !== channelId));
    } else {
      onChannelsChange([...selectedChannels, channelId]);
    }
  };

  const getStatusChip = (status: Channel["status"]) => {
    switch (status) {
      case "available":
        return (
          <Chip size="sm" color="success" variant="flat">
            Available
          </Chip>
        );
      case "beta":
        return (
          <Chip size="sm" color="warning" variant="flat">
            Beta
          </Chip>
        );
      case "coming_soon":
        return (
          <Chip size="sm" color="default" variant="flat">
            Coming Soon
          </Chip>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      {mode === "onboarding" && (
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Brain className="w-8 h-8 text-purple-600" />
            <ArrowRight className="w-5 h-5 text-gray-400" />
            <Sparkles className="w-8 h-8 text-indigo-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Choose Your Channels
          </h2>
          <p className="text-gray-600 dark:text-gray-400 max-w-lg mx-auto">
            {brandName ? (
              <>
                Your <span className="font-semibold text-purple-600">{brandName}</span> Brand Brain
                is ready. Select which channels to power with your brand voice.
              </>
            ) : (
              <>
                Your Brand Brain is ready. Select which channels to power with your brand voice.
              </>
            )}
          </p>
        </div>
      )}

      {/* Channel Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {DEFAULT_CHANNELS.map((channel) => {
          const isSelected = selectedChannels.includes(channel.id);
          const isAvailable = channel.status === "available";
          const isExpanded = expandedChannel === channel.id;

          return (
            <Card
              key={channel.id}
              className={`
                cursor-pointer transition-all duration-200
                ${isSelected ? "border-2 border-purple-500 bg-purple-50 dark:bg-purple-900/20" : "border border-gray-200 dark:border-gray-700"}
                ${!isAvailable ? "opacity-60" : "hover:shadow-md"}
              `}
              isPressable={isAvailable}
              onPress={() => isAvailable && toggleChannel(channel.id)}
            >
              <CardBody className="p-4">
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div
                    className={`
                      w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0
                      ${isSelected
                        ? "bg-purple-600 text-white"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"}
                    `}
                  >
                    {channel.icon}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {channel.name}
                      </h3>
                      <div className="flex items-center gap-2">
                        {getStatusChip(channel.status)}
                        {isAvailable && (
                          <div
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                              isSelected
                                ? "bg-purple-600 border-purple-600"
                                : "border-gray-300 dark:border-gray-600"
                            }`}
                          >
                            {isSelected && <CheckCircle className="w-3 h-3 text-white" />}
                          </div>
                        )}
                      </div>
                    </div>

                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      {channel.description}
                    </p>

                    {/* Features */}
                    <div
                      className={`space-y-1.5 transition-all duration-200 ${
                        isExpanded ? "max-h-40" : "max-h-0"
                      } overflow-hidden`}
                    >
                      {channel.features.map((feature, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs text-gray-500">
                          <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                          {feature}
                        </div>
                      ))}
                    </div>

                    {/* Expand/Collapse */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedChannel(isExpanded ? null : channel.id);
                      }}
                      className="text-xs text-purple-600 dark:text-purple-400 hover:underline mt-2"
                    >
                      {isExpanded ? "Show less" : "See features →"}
                    </button>
                  </div>
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>

      {/* Selection Summary */}
      {selectedChannels.length > 0 && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">
              {selectedChannels.length} channel{selectedChannels.length !== 1 ? "s" : ""} selected
            </span>
          </div>
          <p className="text-sm text-green-600 dark:text-green-500 mt-1">
            Your Brand Brain will power{" "}
            {selectedChannels
              .map((id) => DEFAULT_CHANNELS.find((c) => c.id === id)?.name)
              .join(" and ")}
            {" "}with consistent brand voice and personality.
          </p>
        </div>
      )}

      {/* Continue Button */}
      {showContinueButton && (
        <div className="flex justify-end">
          <Button
            color="primary"
            size="lg"
            isDisabled={selectedChannels.length === 0}
            onPress={onComplete}
            endContent={<ArrowRight className="w-5 h-5" />}
          >
            Continue with {selectedChannels.length} Channel
            {selectedChannels.length !== 1 ? "s" : ""}
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * Compact Channel Toggle for Settings Pages
 */
interface ChannelToggleProps {
  channel: Channel;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  onSetup?: () => void;
}

export function ChannelToggle({ channel, enabled, onToggle, onSetup }: ChannelToggleProps) {
  const isAvailable = channel.status === "available";

  return (
    <div
      className={`
        p-4 rounded-lg border transition-colors
        ${enabled
          ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20"
          : "border-gray-200 dark:border-gray-700"}
        ${!isAvailable ? "opacity-60" : ""}
      `}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`
              w-10 h-10 rounded-lg flex items-center justify-center
              ${enabled
                ? "bg-purple-600 text-white"
                : "bg-gray-100 dark:bg-gray-800 text-gray-500"}
            `}
          >
            {channel.icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-gray-900 dark:text-white">{channel.name}</h4>
              {!isAvailable && (
                <Chip size="sm" variant="flat">
                  Coming Soon
                </Chip>
              )}
            </div>
            <p className="text-sm text-gray-500">{channel.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {enabled && isAvailable && onSetup && (
            <Button
              size="sm"
              variant="flat"
              onPress={onSetup}
              endContent={<ExternalLink className="w-3 h-3" />}
            >
              Setup
            </Button>
          )}
          <Switch isSelected={enabled} onValueChange={onToggle} isDisabled={!isAvailable} />
        </div>
      </div>
    </div>
  );
}

export { DEFAULT_CHANNELS };
