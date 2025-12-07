"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Chip,
  Spinner,
} from "@heroui/react";
import { PageHeader } from "@/components/layout/page-header";

interface PostizStatus {
  configured: boolean;
  status: "connected" | "unreachable" | "not_configured";
  postizAvailable: boolean;
  postizUrl: string;
  message: string;
}

const SUPPORTED_PLATFORMS = [
  { id: "facebook", name: "Facebook", icon: "📘", color: "primary" },
  { id: "instagram", name: "Instagram", icon: "📸", color: "secondary" },
  { id: "x", name: "X (Twitter)", icon: "🐦", color: "default" },
  { id: "linkedin", name: "LinkedIn", icon: "💼", color: "primary" },
  { id: "tiktok", name: "TikTok", icon: "🎵", color: "danger" },
  { id: "youtube", name: "YouTube", icon: "▶️", color: "danger" },
  { id: "threads", name: "Threads", icon: "🧵", color: "default" },
  { id: "bluesky", name: "Bluesky", icon: "🦋", color: "primary" },
  { id: "pinterest", name: "Pinterest", icon: "📌", color: "danger" },
  { id: "reddit", name: "Reddit", icon: "🤖", color: "warning" },
];

export function SocialDashboard() {
  const [status, setStatus] = useState<PostizStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkStatus() {
      try {
        const response = await fetch("/api/social/status");
        if (!response.ok) throw new Error("Failed to check status");
        const data = await response.json();
        setStatus(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    checkStatus();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Social Media"
        description="Manage your social media presence across all platforms."
        actions={
          status?.postizAvailable && (
            <Button as="a" href={status.postizUrl} target="_blank" color="primary">
              Open Social Manager →
            </Button>
          )
        }
      />

      {/* Status Card */}
      <Card>
        <CardBody className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div
                className={`w-3 h-3 rounded-full ${
                  status?.status === "connected"
                    ? "bg-green-500"
                    : status?.status === "unreachable"
                    ? "bg-yellow-500"
                    : "bg-gray-400"
                }`}
              />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  Social Media Engine
                </p>
                <p className="text-sm text-gray-500">
                  {status?.message || "Checking status..."}
                </p>
              </div>
            </div>
            <Chip
              color={
                status?.status === "connected"
                  ? "success"
                  : status?.status === "unreachable"
                  ? "warning"
                  : "default"
              }
              variant="flat"
            >
              {status?.status === "connected"
                ? "Online"
                : status?.status === "unreachable"
                ? "Unreachable"
                : "Not Configured"}
            </Chip>
          </div>
        </CardBody>
      </Card>

      {/* Error State */}
      {error && (
        <Card className="border-red-200 dark:border-red-800">
          <CardBody className="p-6">
            <p className="text-red-600">{error}</p>
          </CardBody>
        </Card>
      )}

      {/* Not Configured State */}
      {status?.status === "not_configured" && (
        <Card>
          <CardBody className="py-16 text-center">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-3xl">⚙️</span>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Social Media Not Configured
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
              The social media service (Postiz) has not been configured for production yet.
              This feature requires the POSTIZ_URL environment variable to be set.
            </p>
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 max-w-md mx-auto">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Social media management is coming soon. We&apos;re working on deploying
                the Postiz integration.
              </p>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Unreachable State */}
      {status?.status === "unreachable" && (
        <Card>
          <CardBody className="py-16 text-center">
            <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-3xl">⚠️</span>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Social Media Engine Unreachable
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
              The social media service (Postiz) is configured but not responding.
              The service may be starting up or experiencing issues.
            </p>
            <Button
              color="primary"
              variant="flat"
              onPress={() => window.location.reload()}
            >
              Retry Connection
            </Button>
          </CardBody>
        </Card>
      )}

      {/* Available State */}
      {status?.postizAvailable && (
        <>
          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card isPressable as="a" href={`${status.postizUrl}/launches`} target="_blank">
              <CardBody className="p-6 text-center">
                <span className="text-3xl mb-3 block">✍️</span>
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Create Post
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Schedule content across platforms
                </p>
              </CardBody>
            </Card>

            <Card isPressable as="a" href={`${status.postizUrl}/calendar`} target="_blank">
              <CardBody className="p-6 text-center">
                <span className="text-3xl mb-3 block">📅</span>
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Content Calendar
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  View and manage scheduled posts
                </p>
              </CardBody>
            </Card>

            <Card isPressable as="a" href={`${status.postizUrl}/settings`} target="_blank">
              <CardBody className="p-6 text-center">
                <span className="text-3xl mb-3 block">🔗</span>
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Connect Accounts
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Link your social media accounts
                </p>
              </CardBody>
            </Card>
          </div>

          {/* Supported Platforms */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">Supported Platforms</h2>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {SUPPORTED_PLATFORMS.map((platform) => (
                  <div
                    key={platform.id}
                    className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                  >
                    <span className="text-2xl">{platform.icon}</span>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {platform.name}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-sm text-gray-500 mt-4">
                + Mastodon, Discord, Slack, Telegram, Dribbble, and more
              </p>
            </CardBody>
          </Card>

          {/* Getting Started Guide */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">Getting Started</h2>
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                <div className="flex items-start gap-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="w-8 h-8 bg-brand-500 text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                    1
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      Create a Postiz Account
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Open the Social Manager and create your account. This is
                      separate from your Epic AI account for now.
                    </p>
                    <Button
                      as="a"
                      href={status.postizUrl}
                      target="_blank"
                      size="sm"
                      variant="flat"
                      className="mt-2"
                    >
                      Open Social Manager →
                    </Button>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                    2
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      Connect Social Accounts
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Link your Facebook, Instagram, LinkedIn, X, and other
                      accounts.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                    3
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      Schedule Your First Post
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Create and schedule content to post across all your
                      connected platforms.
                    </p>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Note about Integration */}
          <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
            <CardBody className="p-6">
              <div className="flex items-start gap-4">
                <span className="text-2xl">💡</span>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    Deeper Integration Coming Soon
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    We&apos;re working on tighter integration between Epic AI and
                    the social media engine. Soon you&apos;ll be able to manage
                    everything from within Epic AI, including:
                  </p>
                  <ul className="text-sm text-gray-600 dark:text-gray-400 mt-2 list-disc list-inside">
                    <li>Single sign-on (no separate account needed)</li>
                    <li>
                      AI-powered post generation using your brand&apos;s persona
                    </li>
                    <li>Social engagement → Lead capture automation</li>
                    <li>Unified analytics dashboard</li>
                  </ul>
                </div>
              </div>
            </CardBody>
          </Card>
        </>
      )}
    </div>
  );
}
