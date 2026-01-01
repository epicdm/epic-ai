"use client";

import { useState, useEffect, useCallback } from "react";
import { Button, Card, CardBody, Chip, Spinner } from "@heroui/react";
import {
  Twitter,
  Linkedin,
  Facebook,
  Instagram,
  Check,
  ExternalLink,
  AlertCircle,
} from "lucide-react";
import type { StreamlinedWizardData } from "../streamlined-flywheel-wizard";
import { AIAssistCard } from "../ai-assist-button";

interface ConnectAccountsStepProps {
  data: Partial<StreamlinedWizardData>;
  updateData: (data: Partial<StreamlinedWizardData>) => void;
}

interface ConnectedAccount {
  platform: string;
  handle: string;
  accountId: string;
  connectedAt: string;
}

interface PlatformConfig {
  id: string;
  name: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  description: string;
}

const PLATFORMS: PlatformConfig[] = [
  {
    id: "twitter",
    name: "Twitter / X",
    icon: Twitter,
    color: "text-gray-900 dark:text-white",
    bgColor: "bg-gray-100 dark:bg-gray-800",
    description: "Share short updates and engage with your audience",
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    icon: Linkedin,
    color: "text-blue-600",
    bgColor: "bg-blue-50 dark:bg-blue-900/20",
    description: "Professional networking and B2B content",
  },
  {
    id: "facebook",
    name: "Facebook",
    icon: Facebook,
    color: "text-blue-500",
    bgColor: "bg-blue-50 dark:bg-blue-900/20",
    description: "Reach a broad audience with varied content",
  },
  {
    id: "instagram",
    name: "Instagram",
    icon: Instagram,
    color: "text-pink-500",
    bgColor: "bg-pink-50 dark:bg-pink-900/20",
    description: "Visual storytelling and brand aesthetics",
  },
];

export function ConnectAccountsStep({
  data,
  updateData,
}: ConnectAccountsStepProps) {
  const [connectedAccounts, setConnectedAccounts] = useState<ConnectedAccount[]>(
    (data.connectedAccounts as ConnectedAccount[]) || []
  );
  const [connecting, setConnecting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingAISuggestions, setIsLoadingAISuggestions] = useState(false);
  const [aiSuggestion, setAISuggestion] = useState<string | null>(null);

  // Load connected accounts from API
  useEffect(() => {
    loadConnectedAccounts();
  }, []);

  const loadConnectedAccounts = async () => {
    try {
      const response = await fetch("/api/social/accounts");
      if (response.ok) {
        const accounts = await response.json();
        const formatted = accounts.map((acc: { platform: string; username: string; id: string; connectedAt: string }) => ({
          platform: acc.platform?.toLowerCase(),
          handle: acc.username || acc.platform,
          accountId: acc.id,
          connectedAt: acc.connectedAt,
        }));
        setConnectedAccounts(formatted);
      }
    } catch (error) {
      console.error("Error loading accounts:", error);
    }
  };

  const updateDataCallback = useCallback((accounts: ConnectedAccount[]) => {
    updateData({ connectedAccounts: accounts });
  }, [updateData]);

  // AI-powered platform suggestions based on brand/industry
  const handleAISuggest = async () => {
    setIsLoadingAISuggestions(true);
    setAISuggestion(null);
    try {
      // Get brand context for AI suggestion
      const industry = data.industry || "general business";
      const brandName = data.brandName || "your brand";

      // Simulate AI suggestion (in production, call an AI endpoint)
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Generate suggestion based on industry
      let suggestion = "";
      const industryLower = industry.toLowerCase();

      if (industryLower.includes("tech") || industryLower.includes("saas")) {
        suggestion = `For ${brandName} in the tech industry, we recommend starting with Twitter/X for real-time engagement and LinkedIn for professional credibility. These platforms have the highest ROI for B2B tech brands.`;
      } else if (industryLower.includes("retail") || industryLower.includes("ecommerce")) {
        suggestion = `For ${brandName} in retail/e-commerce, Instagram and Facebook are your best starting points. Visual content performs exceptionally well for product-based businesses.`;
      } else if (industryLower.includes("professional") || industryLower.includes("consulting")) {
        suggestion = `For ${brandName} in professional services, prioritize LinkedIn for thought leadership and Twitter/X for industry conversations. Build authority through consistent, valuable content.`;
      } else {
        suggestion = `Based on your industry, we recommend starting with 2-3 platforms where your audience is most active. Twitter/X is great for engagement, LinkedIn for professional reach, and Instagram for visual storytelling.`;
      }

      setAISuggestion(suggestion);
    } catch (error) {
      console.error("Error getting AI suggestions:", error);
      setAISuggestion("Unable to generate suggestions. Connect the platforms that best match your audience.");
    } finally {
      setIsLoadingAISuggestions(false);
    }
  };

  useEffect(() => {
    updateDataCallback(connectedAccounts);
  }, [connectedAccounts, updateDataCallback]);

  const handleConnect = (platform: string) => {
    setConnecting(platform);
    setError(null);

    // Redirect to OAuth flow with return URL
    const returnUrl = encodeURIComponent(
      `${window.location.origin}/setup?mode=guided&step=6`
    );
    window.location.href = `/api/social/connect/${platform}?redirect=${returnUrl}`;
  };

  const handleDisconnect = async (platform: string) => {
    try {
      const account = connectedAccounts.find((a) => a.platform === platform);
      if (!account) return;

      const response = await fetch(`/api/social/accounts/${account.accountId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setConnectedAccounts((prev) =>
          prev.filter((a) => a.platform !== platform)
        );
      } else {
        setError("Failed to disconnect account. Please try again.");
      }
    } catch (error) {
      console.error("Error disconnecting:", error);
      setError("Failed to disconnect account. Please try again.");
    }
  };

  const isConnected = (platform: string) =>
    connectedAccounts.some((a) => a.platform === platform);

  const getConnectedAccount = (platform: string) =>
    connectedAccounts.find((a) => a.platform === platform);

  const hasAtLeastOneConnection = connectedAccounts.length >= 1;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Connect Your Social Accounts
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Link at least one platform to start publishing. You can add more later.
        </p>
      </div>

      {/* AI Assist Card */}
      {!aiSuggestion && (
        <AIAssistCard
          title="Not sure which to connect first?"
          description="AI can help you prioritize based on your industry"
          buttonLabel="Get Suggestions"
          loading={isLoadingAISuggestions}
          onSuggest={handleAISuggest}
        />
      )}

      {/* AI Suggestion Display */}
      {aiSuggestion && (
        <div className="p-4 bg-secondary-50 dark:bg-secondary-950/30 border border-secondary-200 dark:border-secondary-800 rounded-lg">
          <p className="text-sm text-foreground">{aiSuggestion}</p>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 bg-danger-50 dark:bg-danger-900/20 rounded-lg text-danger text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="space-y-3">
        {PLATFORMS.map((platform) => {
          const Icon = platform.icon;
          const connected = isConnected(platform.id);
          const account = getConnectedAccount(platform.id);
          const isConnecting = connecting === platform.id;

          return (
            <Card
              key={platform.id}
              className={`transition-all ${
                connected
                  ? "border-2 border-success bg-success/5"
                  : "border-2 border-transparent"
              }`}
            >
              <CardBody className="flex flex-row items-center gap-4 py-4">
                <div className={`p-3 rounded-lg ${platform.bgColor}`}>
                  <Icon className={`w-6 h-6 ${platform.color}`} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {platform.name}
                    </p>
                    {connected && (
                      <Chip size="sm" color="success" variant="flat" startContent={<Check className="w-3 h-3" />}>
                        Connected
                      </Chip>
                    )}
                  </div>
                  {connected && account ? (
                    <p className="text-sm text-success truncate">
                      @{account.handle}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {platform.description}
                    </p>
                  )}
                </div>

                <div className="flex-shrink-0">
                  {connected ? (
                    <Button
                      size="sm"
                      variant="flat"
                      color="danger"
                      onPress={() => handleDisconnect(platform.id)}
                    >
                      Disconnect
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      color="primary"
                      variant={isConnecting ? "flat" : "solid"}
                      endContent={
                        isConnecting ? (
                          <Spinner size="sm" />
                        ) : (
                          <ExternalLink className="w-4 h-4" />
                        )
                      }
                      onPress={() => handleConnect(platform.id)}
                      isDisabled={isConnecting}
                    >
                      {isConnecting ? "Connecting..." : "Connect"}
                    </Button>
                  )}
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>

      {/* Status */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {connectedAccounts.length} account
          {connectedAccounts.length !== 1 ? "s" : ""} connected
        </span>
        {!hasAtLeastOneConnection && (
          <span className="text-sm text-warning">
            Connect at least one account to continue
          </span>
        )}
      </div>
    </div>
  );
}
