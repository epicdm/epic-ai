"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Textarea,
  Spinner,
} from "@heroui/react";
import Link from "next/link";

interface PostizStatus {
  postizAvailable: boolean;
  postizUrl: string;
}

export function PostComposer() {
  const [status, setStatus] = useState<PostizStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");

  useEffect(() => {
    async function checkStatus() {
      try {
        const response = await fetch("/api/social/status");
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

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

      {!status?.postizAvailable ? (
        <Card>
          <CardBody className="py-16 text-center">
            <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-3xl">⚠️</span>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Social Media Engine Not Running
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Please start the social media service to create posts.
            </p>
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

                <div className="flex items-center justify-between pt-4">
                  <div className="text-sm text-gray-500">
                    {content.length} characters
                  </div>
                  <div className="flex gap-3">
                    <Button variant="bordered">Save Draft</Button>
                    <Button
                      as="a"
                      href={`${status.postizUrl}/launches`}
                      target="_blank"
                      color="primary"
                    >
                      Continue in Social Manager →
                    </Button>
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mt-4">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    <strong>Note:</strong> Full post creation with platform
                    selection, scheduling, and media upload is available in the
                    Social Manager. We&apos;re working on bringing these features
                    directly into Epic AI.
                  </p>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold">Quick Actions</h2>
              </CardHeader>
              <CardBody className="space-y-3">
                <Button
                  as="a"
                  href={`${status.postizUrl}/launches`}
                  target="_blank"
                  className="w-full justify-start"
                  variant="flat"
                >
                  📝 Create in Social Manager
                </Button>
                <Button
                  as="a"
                  href={`${status.postizUrl}/calendar`}
                  target="_blank"
                  className="w-full justify-start"
                  variant="flat"
                >
                  📅 View Calendar
                </Button>
                <Button
                  as="a"
                  href={`${status.postizUrl}/analytics`}
                  target="_blank"
                  className="w-full justify-start"
                  variant="flat"
                >
                  📊 View Analytics
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
