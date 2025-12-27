"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Textarea,
  Spinner,
  Chip,
  Avatar,
  Checkbox,
  Input,
} from "@heroui/react";
import Link from "next/link";
import { Send, Calendar, Sparkles } from "lucide-react";
import { trackEvent } from "@/lib/analytics/analytics";

interface SocialAccount {
  id: string;
  platform: string;
  platformUsername?: string;
  displayName?: string;
  avatarUrl?: string;
  isActive: boolean;
}

interface SetupStatus {
  connected: boolean;
  hasBrand: boolean;
  accounts: SocialAccount[];
  message?: string;
}

export function PostComposer() {
  const [status, setStatus] = useState<SetupStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [postNow, setPostNow] = useState(true);
  const [scheduleDate, setScheduleDate] = useState("");
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    async function checkStatus() {
      try {
        const response = await fetch("/api/social/setup");
        if (response.ok) {
          const data = await response.json();
          setStatus(data);
        }
      } catch (err) {
        console.error("Error checking status:", err);
      } finally {
        setLoading(false);
      }
    }

    checkStatus();
  }, []);

  const toggleAccount = (id: string) => {
    setSelectedAccounts((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  const handlePost = async () => {
    if (!content.trim() || selectedAccounts.length === 0) return;
    setPosting(true);

    try {
      const res = await fetch("/api/social/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: content.trim(),
          accountIds: selectedAccounts,
          scheduleDate: postNow ? undefined : scheduleDate,
          postNow,
        }),
      });

      if (!res.ok) throw new Error("Failed to create post");

      trackEvent("social_post_created", {
        platforms_count: selectedAccounts.length,
        scheduled: !postNow,
        content_length: content.length,
      });

      // Reset form
      setContent("");
      setSelectedAccounts([]);
      setScheduleDate("");
    } catch (error) {
      console.error("Post failed:", error);
    } finally {
      setPosting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  const activeAccounts = status?.accounts?.filter((a) => a.isActive) || [];

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <Link href="/dashboard/social" className="hover:text-gray-700">
            Social
          </Link>
          <span>/</span>
          <span>Create Post</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Create Post
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Schedule content across your social media platforms.
        </p>
      </div>

      {!status?.hasBrand ? (
        <Card>
          <CardBody className="py-16 text-center">
            <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-3xl">⚠️</span>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No Brand Configured
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Create a brand first to start posting to social media.
            </p>
            <Button as={Link} href="/dashboard/brand" color="primary">
              Create Brand
            </Button>
          </CardBody>
        </Card>
      ) : activeAccounts.length === 0 ? (
        <Card>
          <CardBody className="py-16 text-center">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-6">
              <Sparkles className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Connect Your Social Accounts
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Connect Twitter, LinkedIn, or Meta to start posting.
            </p>
            <Button as={Link} href="/dashboard/social" color="primary">
              Connect Accounts
            </Button>
          </CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Composer */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold">Compose</h2>
              </CardHeader>
              <CardBody className="space-y-4">
                <Textarea
                  label="What's on your mind?"
                  placeholder="Write your post content here..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  minRows={6}
                  maxRows={12}
                />

                {/* Platform selection */}
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    Post to
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {activeAccounts.map((account) => (
                      <Chip
                        key={account.id}
                        variant={
                          selectedAccounts.includes(account.id)
                            ? "solid"
                            : "bordered"
                        }
                        color={
                          selectedAccounts.includes(account.id)
                            ? "primary"
                            : "default"
                        }
                        className="cursor-pointer"
                        onClick={() => toggleAccount(account.id)}
                        avatar={
                          account.avatarUrl ? (
                            <Avatar
                              src={account.avatarUrl}
                              size="sm"
                              className="w-5 h-5"
                            />
                          ) : undefined
                        }
                      >
                        {account.displayName || account.platformUsername || account.platform}
                      </Chip>
                    ))}
                  </div>
                </div>

                {/* Schedule options */}
                <div className="flex items-center gap-4">
                  <Checkbox
                    isSelected={postNow}
                    onValueChange={setPostNow}
                    size="sm"
                  >
                    Post immediately
                  </Checkbox>
                  {!postNow && (
                    <Input
                      type="datetime-local"
                      value={scheduleDate}
                      onValueChange={setScheduleDate}
                      size="sm"
                      className="max-w-xs"
                      label="Schedule for"
                    />
                  )}
                </div>

                <div className="flex items-center justify-between pt-4">
                  <div className="text-sm text-gray-500">
                    {content.length} characters
                  </div>
                  <div className="flex gap-3">
                    <Button variant="bordered">Save Draft</Button>
                    <Button
                      color="primary"
                      onPress={handlePost}
                      isLoading={posting}
                      isDisabled={
                        !content.trim() ||
                        selectedAccounts.length === 0 ||
                        (!postNow && !scheduleDate)
                      }
                      startContent={
                        !posting &&
                        (postNow ? (
                          <Send className="w-4 h-4" />
                        ) : (
                          <Calendar className="w-4 h-4" />
                        ))
                      }
                    >
                      {postNow ? "Post Now" : "Schedule Post"}
                    </Button>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold">Connected Accounts</h2>
              </CardHeader>
              <CardBody className="space-y-3">
                {activeAccounts.map((account) => (
                  <div key={account.id} className="flex items-center gap-3">
                    <Avatar
                      src={account.avatarUrl}
                      name={account.displayName || account.platform}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {account.displayName || account.platformUsername}
                      </p>
                      <p className="text-xs text-gray-500">{account.platform}</p>
                    </div>
                  </div>
                ))}
                <Button
                  as={Link}
                  href="/dashboard/social"
                  variant="flat"
                  size="sm"
                  className="w-full mt-2"
                >
                  Manage Accounts
                </Button>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold">Tips</h2>
              </CardHeader>
              <CardBody>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li className="flex items-start gap-2">
                    <span>•</span>
                    <span>Keep posts concise for better engagement</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span>•</span>
                    <span>Use images or videos to boost visibility</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span>•</span>
                    <span>Schedule posts for optimal times</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span>•</span>
                    <span>Cross-post to multiple platforms</span>
                  </li>
                </ul>
              </CardBody>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
