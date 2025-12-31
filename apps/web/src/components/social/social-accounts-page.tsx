"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Spinner,
  Chip,
  Avatar,
  Divider,
} from "@heroui/react";
import {
  Twitter,
  Linkedin,
  Facebook,
  Instagram,
  Plus,
  Trash2,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

interface SocialAccount {
  id: string;
  platform: "TWITTER" | "LINKEDIN" | "FACEBOOK" | "INSTAGRAM";
  platformId: string | null;
  username: string | null;
  displayName: string | null;
  avatar: string | null;
  profileUrl: string | null;
  status: "PENDING" | "CONNECTED" | "EXPIRED" | "ERROR" | "DISCONNECTED";
  lastUsed: string | null;
  lastError: string | null;
  followerCount: number | null;
  connectedAt: string;
}

interface AccountsData {
  accounts: SocialAccount[];
  brandId: string;
}

const platformConfig = {
  TWITTER: {
    name: "Twitter / X",
    icon: Twitter,
    color: "bg-black",
    connectPath: "/api/social/connect/twitter",
  },
  LINKEDIN: {
    name: "LinkedIn",
    icon: Linkedin,
    color: "bg-[#0077B5]",
    connectPath: "/api/social/connect/linkedin",
  },
  FACEBOOK: {
    name: "Facebook",
    icon: Facebook,
    color: "bg-[#1877F2]",
    connectPath: "/api/social/connect/meta?platform=facebook",
  },
  INSTAGRAM: {
    name: "Instagram",
    icon: Instagram,
    color: "bg-gradient-to-br from-[#833AB4] via-[#FD1D1D] to-[#F77737]",
    connectPath: "/api/social/connect/meta?platform=instagram",
  },
};

const statusColors = {
  CONNECTED: "success",
  PENDING: "warning",
  EXPIRED: "warning",
  ERROR: "danger",
  DISCONNECTED: "default",
} as const;

export function SocialAccountsPage() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<AccountsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [mockMode, setMockMode] = useState(false);
  const [creatingMock, setCreatingMock] = useState(false);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const successParam = searchParams.get("success");
  const errorParam = searchParams.get("error");
  const errorDetails = searchParams.get("details");

  useEffect(() => {
    if (successParam) {
      setToast({
        type: "success",
        message: `Successfully connected ${successParam} account!`,
      });
      // Clear the URL param
      window.history.replaceState({}, "", "/dashboard/social/accounts");
    } else if (errorParam) {
      const errorMessage = errorDetails
        ? `Failed to connect: ${errorDetails}`
        : `Failed to connect: ${errorParam.replace(/_/g, " ")}`;
      setToast({
        type: "error",
        message: errorMessage,
      });
      window.history.replaceState({}, "", "/dashboard/social/accounts");
    }
  }, [successParam, errorParam, errorDetails]);

  useEffect(() => {
    fetchAccounts();
    checkMockMode();
  }, []);

  async function checkMockMode() {
    try {
      const response = await fetch("/api/social/mock");
      if (response.ok) {
        const result = await response.json();
        setMockMode(result.mockMode === true);
      }
    } catch {
      // Ignore errors
    }
  }

  async function createMockAccounts() {
    setCreatingMock(true);
    try {
      const response = await fetch("/api/social/mock", { method: "POST" });
      if (response.ok) {
        const result = await response.json();
        setToast({ type: "success", message: result.message });
        fetchAccounts();
      } else {
        const error = await response.json();
        setToast({ type: "error", message: error.error || "Failed to create mock accounts" });
      }
    } catch {
      setToast({ type: "error", message: "Failed to create mock accounts" });
    } finally {
      setCreatingMock(false);
    }
  }

  async function fetchAccounts() {
    try {
      const response = await fetch("/api/social/accounts");
      if (response.ok) {
        const result = await response.json();
        setData(result);
      }
    } catch (err) {
      console.error("Error fetching accounts:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDisconnect(accountId: string) {
    if (!confirm("Are you sure you want to disconnect this account?")) return;

    setActionLoading(accountId);
    try {
      const response = await fetch(`/api/social/accounts/${accountId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setToast({ type: "success", message: "Account disconnected" });
        fetchAccounts();
      } else {
        setToast({ type: "error", message: "Failed to disconnect account" });
      }
    } catch (err) {
      setToast({ type: "error", message: "Failed to disconnect account" });
    } finally {
      setActionLoading(null);
    }
  }

  function handleConnect(platform: keyof typeof platformConfig) {
    if (!data?.brandId) {
      setToast({ type: "error", message: "Brand not found" });
      return;
    }

    const config = platformConfig[platform];
    const separator = config.connectPath.includes("?") ? "&" : "?";
    window.location.href = `${config.connectPath}${separator}brandId=${data.brandId}`;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  const connectedAccounts = data?.accounts.filter(
    (a) => a.status !== "DISCONNECTED"
  ) || [];
  const connectedPlatforms = new Set(connectedAccounts.map((a) => a.platform));

  return (
    <div className="space-y-8">
      {/* Toast notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg ${
            toast.type === "success"
              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
              : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span>{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="ml-2 hover:opacity-70"
          >
            ×
          </button>
        </div>
      )}

      {/* Mock Mode Banner */}
      {mockMode && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🧪</span>
              <div>
                <h3 className="font-semibold text-yellow-800 dark:text-yellow-200">
                  Mock Mode Enabled
                </h3>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  Social publishing will be simulated. No real posts will be made.
                </p>
              </div>
            </div>
            <Button
              color="warning"
              variant="flat"
              onPress={createMockAccounts}
              isLoading={creatingMock}
              startContent={!creatingMock && <Plus className="w-4 h-4" />}
            >
              Create Mock Accounts
            </Button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <Link href="/dashboard/social" className="hover:text-gray-700">
              Social
            </Link>
            <span>/</span>
            <span>Accounts</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Connected Accounts
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Connect and manage your social media accounts for publishing.
          </p>
        </div>
      </div>

      {/* Connect New Account */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Connect New Account
          </h2>
        </CardHeader>
        <Divider />
        <CardBody>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {(
              Object.keys(platformConfig) as Array<keyof typeof platformConfig>
            ).map((platform) => {
              const config = platformConfig[platform];
              const Icon = config.icon;
              const isConnected = connectedPlatforms.has(platform);

              return (
                <Button
                  key={platform}
                  variant={isConnected ? "bordered" : "flat"}
                  className="h-auto py-4 flex flex-col gap-2"
                  onPress={() => handleConnect(platform)}
                  isDisabled={isConnected}
                >
                  <div
                    className={`w-10 h-10 rounded-lg ${config.color} flex items-center justify-center`}
                  >
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-sm font-medium">{config.name}</span>
                  {isConnected && (
                    <Chip size="sm" color="success" variant="flat">
                      Connected
                    </Chip>
                  )}
                </Button>
              );
            })}
          </div>
        </CardBody>
      </Card>

      {/* Connected Accounts */}
      {connectedAccounts.length > 0 ? (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">
              Your Accounts ({connectedAccounts.length})
            </h2>
          </CardHeader>
          <Divider />
          <CardBody className="p-0">
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {connectedAccounts.map((account) => {
                const config = platformConfig[account.platform];
                const Icon = config.icon;

                return (
                  <div
                    key={account.id}
                    className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  >
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <Avatar
                          src={account.avatar || undefined}
                          name={account.displayName || account.username || "?"}
                          size="lg"
                        />
                        <div
                          className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full ${config.color} flex items-center justify-center`}
                        >
                          <Icon className="w-3 h-3 text-white" />
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {account.displayName || account.username}
                          </span>
                          <Chip
                            size="sm"
                            color={statusColors[account.status]}
                            variant="flat"
                          >
                            {account.status.toLowerCase()}
                          </Chip>
                        </div>
                        <div className="text-sm text-gray-500 flex items-center gap-2">
                          <span>@{account.username}</span>
                          {account.followerCount !== null && (
                            <>
                              <span>•</span>
                              <span>
                                {account.followerCount.toLocaleString()}{" "}
                                followers
                              </span>
                            </>
                          )}
                        </div>
                        {account.lastError && (
                          <p className="text-sm text-red-500 mt-1">
                            {account.lastError}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {account.profileUrl && (
                        <Button
                          as="a"
                          href={account.profileUrl}
                          target="_blank"
                          variant="light"
                          size="sm"
                          isIconOnly
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      )}
                      {account.status === "EXPIRED" && (
                        <Button
                          variant="flat"
                          size="sm"
                          color="warning"
                          startContent={<RefreshCw className="w-4 h-4" />}
                          onPress={() => handleConnect(account.platform)}
                        >
                          Reconnect
                        </Button>
                      )}
                      <Button
                        variant="flat"
                        size="sm"
                        color="danger"
                        isIconOnly
                        isLoading={actionLoading === account.id}
                        onPress={() => handleDisconnect(account.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardBody className="py-16 text-center">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-3xl">🔗</span>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No Accounts Connected
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
              Connect your social media accounts to start scheduling and publishing posts.
            </p>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
