"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Twitter, Linkedin, Facebook, Instagram, CheckCircle, XCircle, ExternalLink, Plus } from "lucide-react";
import type { UnderstandWizardData, ConnectedAccountData } from "@/lib/flywheel/types";

interface SocialProfilesStepProps {
  data: UnderstandWizardData;
  updateData: (updates: Partial<UnderstandWizardData>) => void;
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

export function SocialProfilesStep({ data, updateData }: SocialProfilesStepProps) {
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({});
  const [existingAccounts, setExistingAccounts] = useState<ConnectedAccountData[]>([]);
  const [isFetching, setIsFetching] = useState(true);

  // Fetch accounts helper
  const fetchAccounts = async () => {
    try {
      const response = await fetch("/api/social/accounts");
      if (response.ok) {
        const result = await response.json();
        const accounts: ConnectedAccountData[] = (result.accounts || []).map(
          (acc: { id: string; platform: string; username?: string; displayName?: string; connectedAt?: string }) => ({
            id: acc.id,
            platform: acc.platform,
            handle: acc.username || acc.displayName || "Connected",
            connected: true,
            connectedAt: acc.connectedAt ? new Date(acc.connectedAt) : undefined,
          })
        );
        setExistingAccounts(accounts);
        updateData({ socialProfiles: accounts });
      }
    } catch (error) {
      console.error("Error fetching accounts:", error);
    }
  };

  // Fetch existing connected accounts on mount
  useEffect(() => {
    const initFetch = async () => {
      await fetchAccounts();
      setIsFetching(false);
    };
    initFetch();
  }, [updateData]);

  // Listen for postMessage from OAuth popup
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.data?.type === "SOCIAL_CONNECT_SUCCESS") {
        // Refresh accounts when OAuth completes
        await fetchAccounts();
        setIsLoading({});
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const connectedAccounts = data.socialProfiles || existingAccounts;

  const isConnected = (platformId: string) => {
    return connectedAccounts.some((a) => a.platform.toLowerCase() === platformId.toLowerCase() && a.connected);
  };

  const getAccountHandle = (platformId: string) => {
    const account = connectedAccounts.find((a) => a.platform.toLowerCase() === platformId.toLowerCase());
    return account?.handle;
  };

  const handleConnect = async (platformId: string) => {
    setIsLoading((prev) => ({ ...prev, [platformId]: true }));
    try {
      const platformMap: Record<string, string> = {
        twitter: "twitter",
        linkedin: "linkedin",
        facebook: "facebook",
        instagram: "instagram",
      };
      const platform = platformMap[platformId] || platformId;

      const returnUrl = encodeURIComponent(window.location.pathname);
      const response = await fetch(`/api/social/connect?platform=${platform}&returnUrl=${returnUrl}`);

      if (response.ok) {
        const { url } = await response.json();
        const popup = window.open(url, "_blank", "width=600,height=700");

        const checkClosed = setInterval(async () => {
          if (popup?.closed) {
            clearInterval(checkClosed);
            const accountsResponse = await fetch("/api/social/accounts");
            if (accountsResponse.ok) {
              const result = await accountsResponse.json();
              const accounts: ConnectedAccountData[] = (result.accounts || []).map(
                (acc: { id: string; platform: string; username?: string; displayName?: string; connectedAt?: string }) => ({
                  id: acc.id,
                  platform: acc.platform,
                  handle: acc.username || acc.displayName || "Connected",
                  connected: true,
                  connectedAt: acc.connectedAt ? new Date(acc.connectedAt) : undefined,
                })
              );
              setExistingAccounts(accounts);
              updateData({ socialProfiles: accounts });
            }
          }
        }, 500);
      } else {
        const errorData = await response.json();
        console.error("Error getting connect URL:", errorData);
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
        const updated = connectedAccounts.filter((a) => a.platform.toLowerCase() !== platformId.toLowerCase());
        updateData({ socialProfiles: updated });
        setExistingAccounts(updated);
      }
    } catch (error) {
      console.error("Error disconnecting:", error);
    } finally {
      setIsLoading((prev) => ({ ...prev, [platformId]: false }));
    }
  };

  const connectedCount = connectedAccounts.filter((a) => a.connected).length;

  if (isFetching) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <span className="ml-3 text-muted-foreground">Loading connected accounts...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-muted-foreground">
          Connect your social media accounts now to enable publishing later.
          This step is <span className="font-medium text-purple-600 dark:text-purple-400">optional</span> - you can also connect accounts in the Distribute phase.
        </p>
      </div>

      {/* Connection Status */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">
          Connected accounts:
        </span>
        <Badge variant={connectedCount > 0 ? "default" : "secondary"}>
          {connectedCount} of {PLATFORMS.length}
        </Badge>
        {connectedCount === 0 && (
          <span className="text-sm text-muted-foreground italic">
            (Skip if you prefer to connect later)
          </span>
        )}
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
                  : "border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700"
              }`}
            >
              <CardContent className="p-4">
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
                        <XCircle className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
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
                          <Badge variant="outline">
                            Connected
                          </Badge>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDisconnect(platform.id)}
                            disabled={loading}
                            className="text-destructive hover:text-destructive"
                          >
                            Disconnect
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleConnect(platform.id)}
                          disabled={loading}
                        >
                          {loading ? (
                            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                          ) : (
                            <Plus className="mr-2 w-3 h-3" />
                          )}
                          {loading ? "Connecting..." : "Connect Account"}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Helpful Note */}
      <Card className="border border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-900/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <ExternalLink className="w-5 h-5 text-purple-600 dark:text-purple-400 mt-0.5" />
            <div>
              <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Why connect now?
              </h5>
              <p className="text-sm text-muted-foreground">
                Connecting your accounts early helps us tailor content suggestions to your existing social presence.
                You can always add more accounts later in the Distribute phase.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
