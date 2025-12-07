"use client";

import { Card, CardBody, CardHeader } from "@heroui/react";

interface DashboardContentProps {
  firstName: string | null;
}

export function DashboardContent({ firstName }: DashboardContentProps) {
  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Welcome back, {firstName || "there"}!
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Here&apos;s what&apos;s happening with your marketing today.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardBody className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Social Posts
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  0
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                <span className="text-2xl">📱</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">This month</p>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Voice Calls
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  0
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                <span className="text-2xl">📞</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">This month</p>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Total Leads
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  0
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                <span className="text-2xl">👥</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">All time</p>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Conversions
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  0%
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center">
                <span className="text-2xl">🎯</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">Lead to customer</p>
          </CardBody>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-0">
          <h2 className="text-lg font-semibold">Quick Actions</h2>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="p-4 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors text-left">
              <span className="text-2xl mb-2 block">✍️</span>
              <span className="font-medium text-gray-900 dark:text-white">
                Create Post
              </span>
              <p className="text-sm text-gray-500 mt-1">
                Schedule content across platforms
              </p>
            </button>

            <button className="p-4 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors text-left">
              <span className="text-2xl mb-2 block">🤖</span>
              <span className="font-medium text-gray-900 dark:text-white">
                Create Agent
              </span>
              <p className="text-sm text-gray-500 mt-1">
                Set up a new voice AI agent
              </p>
            </button>

            <button className="p-4 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors text-left">
              <span className="text-2xl mb-2 block">📊</span>
              <span className="font-medium text-gray-900 dark:text-white">
                View Analytics
              </span>
              <p className="text-sm text-gray-500 mt-1">
                See your performance metrics
              </p>
            </button>
          </div>
        </CardBody>
      </Card>

      {/* Getting Started */}
      <Card>
        <CardHeader className="pb-0">
          <h2 className="text-lg font-semibold">Getting Started</h2>
        </CardHeader>
        <CardBody>
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="w-8 h-8 bg-brand-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
                1
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900 dark:text-white">
                  Create your organization
                </p>
                <p className="text-sm text-gray-500">
                  Set up your workspace and invite team members
                </p>
              </div>
              <span className="text-gray-400">→</span>
            </div>

            <div className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg opacity-50">
              <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                2
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900 dark:text-white">
                  Connect social accounts
                </p>
                <p className="text-sm text-gray-500">
                  Link your Twitter, LinkedIn, Instagram, and more
                </p>
              </div>
              <span className="text-gray-400">→</span>
            </div>

            <div className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg opacity-50">
              <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                3
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900 dark:text-white">
                  Set up a voice agent
                </p>
                <p className="text-sm text-gray-500">
                  Create your first AI-powered phone agent
                </p>
              </div>
              <span className="text-gray-400">→</span>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
