"use client";

import Link from "next/link";
import { Card, CardBody, Button } from "@heroui/react";

export function EmptyStateLeads() {
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Leads
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          View and manage all your captured leads
        </p>
      </div>

      {/* Empty State */}
      <Card className="max-w-2xl mx-auto">
        <CardBody className="py-16 text-center">
          <div className="w-20 h-20 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">👥</span>
          </div>

          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            No Leads Yet
          </h2>

          <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
            Leads from your social media campaigns and voice agents will appear
            here. Start by connecting your accounts or setting up a voice agent.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              as={Link}
              href="/dashboard/social"
              color="primary"
              size="lg"
            >
              Set Up Social
            </Button>
            <Button
              as={Link}
              href="/dashboard/voice"
              variant="bordered"
              size="lg"
            >
              Create Voice Agent
            </Button>
          </div>

          {/* Feature Highlights */}
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <span className="text-2xl mb-2 block">🔄</span>
              <h3 className="font-medium text-gray-900 dark:text-white">
                Unified Inbox
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                All leads from all channels in one place
              </p>
            </div>

            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <span className="text-2xl mb-2 block">⚡</span>
              <h3 className="font-medium text-gray-900 dark:text-white">
                Real-time
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Instant notifications for new leads
              </p>
            </div>

            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <span className="text-2xl mb-2 block">📈</span>
              <h3 className="font-medium text-gray-900 dark:text-white">
                Lead Scoring
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                AI-powered lead quality scoring
              </p>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
