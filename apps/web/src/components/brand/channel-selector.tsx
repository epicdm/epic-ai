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
 *
 * Industry-Aware Recommendations:
 * - When industryId is provided, shows "Recommended" badges for high-priority channels
 * - Auto-selects high-priority channels on initial render
 * - Shows tooltip with reason for recommendation on hover
 */

import { useState, useEffect, useCallback } from "react";
import { Card, CardBody, Button, Chip, Switch, Tooltip } from "@heroui/react";
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
  Star,
  Info,
} from "lucide-react";
import {
  getChannelRecommendation,
  getHighPriorityChannels,
  type ChannelId,
  type ChannelPriority,
} from "@/lib/brand-brain/industry-channels";
import { AIBadge } from "@/components/ui/ai-badge";
import { AIConfidence } from "@/components/ui/ai-confidence";

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
  /** Industry ID for showing recommendations (e.g., "tech-startup", "healthcare") */
  industryId?: string;
  /** Whether to auto-select recommended channels on mount */
  autoSelectRecommended?: boolean;
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
  industry,
  multiple = true,
  showRecommendations = true,
  className,
}: ChannelSelectorProps) {
  const [selected, setSelected] = useState<string[]>(selectedChannels || []);

  // Auto-select high-priority channels on mount
  useEffect(() => {
    if (
      showRecommendations &&
      industry &&
      (!selectedChannels || selectedChannels.length === 0)
    ) {
      const highPriorityChannels = getHighPriorityChannels(industry);
      const highPriorityIds = highPriorityChannels.map((c) => c.id);

      if (highPriorityIds.length > 0) {
        setSelected(highPriorityIds);
        onChannelsChange(highPriorityIds);
      }
    }
  }, [industry, selectedChannels, showRecommendations, onChannelsChange]);

  const getRecommendation = (
    channelId: ChannelId
  ): { priority: ChannelPriority; reason: string } | null => {
    if (!showRecommendations || !industry) return null;
    return getChannelRecommendation(channelId, industry);
  };

  const handleChannelToggle = (channelId: string) => {
    if (!multiple) {
      // Single selection mode
      const newSelected = [channelId];
      setSelected(newSelected);
      onChannelsChange(newSelected);
    } else {
      // Multiple selection mode
      const newSelected = selected.includes(channelId)
        ? selected.filter((id) => id !== channelId)
        : [...selected, channelId];
      setSelected(newSelected);
      onChannelsChange(newSelected);
    }
  };

  const selectAll = () => {
    const allIds = SOCIAL_CHANNELS.map((c) => c.id);
    setSelected(allIds);
    onChannelsChange(allIds);
  };

  const deselectAll = () => {
    setSelected([]);
    onChannelsChange([]);
  };

  const isChannelSelected = (channelId: string) =>
    selected.includes(channelId);

  // Map priority to confidence score
  const getConfidenceScore = (priority: ChannelPriority): number => {
    switch (priority) {
      case "high":
        return 92;
      case "medium":
        return 78;
      case "low":
        return 65;
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header with bulk actions */}
      {multiple && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Select the platforms where you want to publish content
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="bordered" onPress={selectAll}>
              Select All
            </Button>
            <Button size="sm" variant="bordered" onPress={deselectAll}>
              Deselect All
            </Button>
          </div>
        </div>
      )}

      {/* Channel Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {SOCIAL_CHANNELS.map((channel) => {
          const isSelected = isChannelSelected(channel.id);
          const recommendation = getRecommendation(channel.id as ChannelId);
          const Icon = channel.icon;

          return (
            <Card
              key={channel.id}
              isPressable
              isHoverable
              className={cn(
                "transition-all cursor-pointer",
                isSelected
                  ? "border-2 border-brand-500 bg-brand-50 dark:bg-brand-900/20"
                  : "border border-gray-200 dark:border-gray-700 hover:border-brand-300"
              )}
              onPress={() => handleChannelToggle(channel.id)}
            >
              <CardBody className="p-4">
                <div className="flex items-start justify-between gap-3">
                  {/* Channel Icon & Info */}
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                        channel.color
                      )}
                    >
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                          {channel.name}
                        </h4>
                        {/* Add confidence dots inline */}
                        {recommendation && (
                          <AIConfidence
                            score={getConfidenceScore(recommendation.priority)}
                            variant="dots"
                          />
                        )}
                        {/* Visual indicator for high-priority (keep star) */}
                        {recommendation?.priority === "high" && (
                          <Star className="w-4 h-4 text-green-600 dark:text-green-400 fill-green-600 dark:fill-green-400" />
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {channel.description}
                      </p>
                      
                      {/* AI Recommendation Badge */}
                      {recommendation && (
                        <div className="mt-2">
                          {recommendation.priority === "high" && (
                            <AIBadge 
                              type="recommended" 
                              reason={recommendation.reason}
                              confidence={getConfidenceScore(recommendation.priority)}
                              size="sm"
                            />
                          )}
                          {recommendation.priority === "medium" && (
                            <AIBadge 
                              type="suggestion" 
                              reason={recommendation.reason}
                              confidence={getConfidenceScore(recommendation.priority)}
                              size="sm"
                            />
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Selection Indicator */}
                  <div className="flex-shrink-0">
                    <Switch
                      isSelected={isSelected}
                      size="sm"
                      color="success"
                      aria-label={`Toggle ${channel.name}`}
                    />
                  </div>
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>

      {/* Summary */}
      {multiple && selected.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <span>
            {selected.length} {selected.length === 1 ? "channel" : "channels"}{" "}
            selected
          </span>
        </div>
      )}
    </div>
  );
}

export function ChannelSelectorWrapper() {
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
          const recommendation = getRecommendation(channel.id);

          return (
            <Card
              key={channel.id}
              className={`
                cursor-pointer transition-all duration-200
                ${isSelected ? "border-2 border-purple-500 bg-purple-50 dark:bg-purple-900/20" : "border border-gray-200 dark:border-gray-700"}
                ${!isAvailable ? "opacity-60" : "hover:shadow-md"}
                ${recommendation?.priority === "high" && !isSelected ? "ring-2 ring-green-200 dark:ring-green-800" : ""}
              `}
              isPressable={isAvailable}
              onPress={() => isAvailable && toggleChannel(channel.id)}
            >
              <CardBody className="p-4">
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div
                    className={`
                      w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 relative
                      ${isSelected
                        ? "bg-purple-600 text-white"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"}
                    `}
                  >
                    {channel.icon}
                    {/* Recommendation indicator */}
                    {recommendation?.priority === "high" && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                        <Star className="w-2.5 h-2.5 text-white fill-white" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {channel.name}
                        </h3>
                        {/* Recommendation badge with tooltip */}
                        {recommendation && (
                          <Tooltip
                            content={
                              <div className="max-w-xs p-1">
                                <p className="text-sm">{recommendation.reason}</p>
                              </div>
                            }
                            placement="top"
                          >
                            <div className="flex items-center">
                              {recommendation.priority === "high" && (
                                <Chip
                                  size="sm"
                                  color="success"
                                  variant="flat"
                                  startContent={<Star className="w-3 h-3" />}
                                >
                                  Recommended
                                </Chip>
                              )}
                              {recommendation.priority === "medium" && (
                                <Chip size="sm" color="warning" variant="flat">
                                  Good Fit
                                </Chip>
                              )}
                            </div>
                          </Tooltip>
                        )}
                      </div>
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
