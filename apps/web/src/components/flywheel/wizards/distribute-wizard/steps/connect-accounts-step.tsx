"use client";

import { useState, useEffect } from "react";
import { Card, CardBody, Button, Chip, Spinner } from "@heroui/react";
import { Twitter, Linkedin, Facebook, Instagram, CheckCircle, XCircle, ExternalLink } from "lucide-react";
import type { DistributeWizardData, ConnectedAccountData } from "@/lib/flywheel/types";

interface ConnectAccountsStepProps {
  data: DistributeWizardData;
  updateData: (updates: Partial<DistributeWizardData>) => void;
}

const PLATFORMS = [
  {
    id: "twitter",
    name: "Twitter / X",
    icon: Twitter,
    color: "#1DA1F2",
    description: "Share quick updates and engage with your audience",
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    icon: Linkedin,
    color: "#0A66C2",
    description: "Professional networking and thought leadership",
  },
  {
    id: "facebook",
    name: "Facebook",
    icon: Facebook,
    color: "#1877F2",
    description: "Connect with your community and share updates",
  },
  {
    id: "instagram",
    name: "Instagram",
    icon: Instagram,
    color: "#E4405F",
    description: "Visual storytelling and brand aesthetics",
  },
];

export function ConnectAccountsStep({ data, updateData }: ConnectAccountsStepProps) {
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({});
  const [existingAccounts, setExistingAccounts] = useState<ConnectedAccountData[]>([]);

  // Fetch existing connected accounts on mount
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const response = await fetch("/api/social/accounts");
        if (response.ok) {
          const result = await response.json();
          const accounts: ConnectedAccountData[] = (result.accounts || []).map(
            (acc: { id: string; platform: string; handle: string; connectedAt?: string }) => ({
              id: acc.id,
              platform: acc.platform,
              handle: acc.handle,
              connected: true,
              connectedAt: acc.connectedAt ? new Date(acc.connectedAt) : undefined,
            })
          );
          setExistingAccounts(accounts);
          updateData({ connectedAccounts: accounts });
        }
      } catch (error) {
        console.error("Error fetching accounts:", error);
      }
    };

    fetchAccounts();
  }, [updateData]);

  const connectedAccounts = data.connectedAccounts || existingAccounts;

  const isConnected = (platformId: string) => {
    return connectedAccounts.some((a) => a.platform === platformId && a.connected);
  };

  const getAccountHandle = (platformId: string) => {
    const account = connectedAccounts.find((a) => a.platform === platformId);
    return account?.handle;
  };

  const handleConnect = async (platformId: string) => {
    setIsLoading((prev) => ({ ...prev, [platformId]: true }));
    try {
      // Open OAuth popup/redirect
      const response = await fetch(`/api/social/connect/${platformId}`);
      if (response.ok) {
        const { authUrl } = await response.json();
        // Open OAuth in new window
        const popup = window.open(authUrl, "_blank", "width=600,height=700");

        // Listen for OAuth completion
        const checkClosed = setInterval(() => {
          if (popup?.closed) {
            clearInterval(checkClosed);
            // Refresh accounts
            window.location.reload();
          }
        }, 500);
      }
    } catch (error) {
      console.error("Error connecting:", error);
    } finally {
      setIsLoading((prev) => ({ ...prev, [platformId]: false }));
    }
  };

  const handleDisconnect = async (platformId: string) => {
    setIsLoading((prev) => ({ ...prev, [platformId]: true }));
    try {
      const response = await fetch(`/api/social/disconnect/${platformId}`, {
        method: "POST",
      });
      if (response.ok) {
        // Update local state
        const updated = connectedAccounts.filter((a) => a.platform !== platformId);
        updateData({ connectedAccounts: updated });
        setExistingAccounts(updated);
      }
    } catch (error) {
      console.error("Error disconnecting:", error);
    } finally {
      setIsLoading((prev) => ({ ...prev, [platformId]: false }));
    }
  };

  const connectedCount = connectedAccounts.filter((a) => a.connected).length;

  return (
    <div className="space-y-6">
      <p className="text-gray-600 dark:text-gray-400">
        Connect your social media accounts to enable automatic publishing.
        You need at least one connected account to continue.
      </p>

      {/* Connection Status */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500 dark:text-gray-400">
          Connected accounts:
        </span>
        <Chip
          size="sm"
          color={connectedCount > 0 ? "success" : "warning"}
          variant="flat"
        >
          {connectedCount} of {PLATFORMS.length}
        </Chip>
      </div>

      {/* Platform Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PLATFORMS.map((platform) => {
          const Icon = platform.icon;
          const connected = isConnected(platform.id);
          const loading = isLoading[platform.id];
          const handle = getAccountHandle(platform.id);

          return (
            <Card
              key={platform.id}
              className={`border transition-all ${
                connected
                  ? "border-green-300 dark:border-green-700 bg-green-50/30 dark:bg-green-900/20"
                  : "border-gray-200 dark:border-gray-700"
              }`}
            >
              <CardBody className="p-4">
                <div className="flex items-start gap-4">
                  <div
                    className="p-3 rounded-xl"
                    style={{ backgroundColor: `${platform.color}20` }}
                  >
                    <Icon
                      className="w-6 h-6"
                      style={{ color: platform.color }}
                    />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {platform.name}
                      </h4>
                      {connected ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {platform.description}
                    </p>

                    {connected && handle && (
                      <p className="text-sm text-green-600 dark:text-green-400 mt-2">
                        @{handle}
                      </p>
                    )}

                    <div className="mt-3">
                      {connected ? (
                        <div className="flex gap-2">
                          <Chip size="sm" color="success" variant="flat">
                            Connected
                          </Chip>
                          <Button
                            size="sm"
                            variant="light"
                            color="danger"
                            onPress={() => handleDisconnect(platform.id)}
                            isDisabled={loading}
                          >
                            Disconnect
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          color="primary"
                          variant="flat"
                          startContent={
                            loading ? (
                              <Spinner size="sm" color="current" />
                            ) : (
                              <ExternalLink className="w-3 h-3" />
                            )
                          }
                          onPress={() => handleConnect(platform.id)}
                          isDisabled={loading}
                        >
                          {loading ? "Connecting..." : "Connect"}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>

      {connectedCount === 0 && (
        <div className="text-center py-4">
          <p className="text-sm text-amber-600 dark:text-amber-400">
            Please connect at least one social account to continue.
          </p>
        </div>
      )}

      {/* Security Note */}
      <Card className="border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <CardBody className="p-4">
          <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Security Note
          </h5>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            We use secure OAuth to connect your accounts. We never store your
            passwords and you can revoke access at any time.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
