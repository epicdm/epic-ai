"use client";

import Link from "next/link";
import { Card, CardBody, Button } from "@heroui/react";

export function EmptyStateSocial() {
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Social Media
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Manage and schedule your social media content
        </p>
      </div>

      {/* Empty State */}
      <Card className="max-w-2xl mx-auto">
        <CardBody className="py-16 text-center">
          <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">📱</span>
          </div>

          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Connect Your Social Accounts
          </h2>

          <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
            Start by connecting your social media accounts. You&apos;ll be able
            to schedule posts, track engagement, and manage all your content in
            one place.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              as={Link}
              href="/dashboard/social/accounts"
              color="primary"
              size="lg"
            >
              Connect Accounts
            </Button>
            <Button
              as={Link}
              href="/dashboard/social/create"
              variant="bordered"
              size="lg"
            >
              Create Post
            </Button>
          </div>

          {/* Feature Highlights */}
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <span className="text-2xl mb-2 block">🗓️</span>
              <h3 className="font-medium text-gray-900 dark:text-white">
                Schedule Posts
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Plan your content calendar weeks in advance
              </p>
            </div>

            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <span className="text-2xl mb-2 block">🤖</span>
              <h3 className="font-medium text-gray-900 dark:text-white">
                AI-Powered
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Generate captions and hashtags with AI
              </p>
            </div>

            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <span className="text-2xl mb-2 block">📊</span>
              <h3 className="font-medium text-gray-900 dark:text-white">
                Analytics
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Track performance across all platforms
              </p>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
