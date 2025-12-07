"use client";

import Link from "next/link";
import { Card, CardBody, CardHeader } from "@heroui/react";
import { PageHeader } from "@/components/layout/page-header";
import {
  Share2,
  Phone,
  Users,
  TrendingUp,
  ArrowRight,
  Sparkles,
  Calendar,
  BarChart3,
} from "lucide-react";

interface DashboardContentProps {
  firstName: string | null;
  organizationName: string | null;
  stats: {
    brandCount: number;
    postCount: number;
    callCount: number;
    leadCount: number;
  };
}

export function DashboardContent({
  firstName,
  organizationName,
  stats,
}: DashboardContentProps) {
  const { postCount, callCount, leadCount } = stats;

  const statCards = [
    {
      name: "Social Posts",
      value: postCount,
      change: "+12%",
      changeType: "positive" as const,
      icon: Share2,
      href: "/dashboard/social",
      bgColor: "bg-blue-100 dark:bg-blue-900/30",
      iconColor: "text-blue-600 dark:text-blue-400",
    },
    {
      name: "Voice Calls",
      value: callCount,
      change: "Coming soon",
      changeType: "neutral" as const,
      icon: Phone,
      href: "/dashboard/voice",
      bgColor: "bg-green-100 dark:bg-green-900/30",
      iconColor: "text-green-600 dark:text-green-400",
    },
    {
      name: "Total Leads",
      value: leadCount,
      change: "+5%",
      changeType: "positive" as const,
      icon: Users,
      href: "/dashboard/leads",
      bgColor: "bg-purple-100 dark:bg-purple-900/30",
      iconColor: "text-purple-600 dark:text-purple-400",
    },
    {
      name: "Conversion Rate",
      value: "0%",
      change: "No data yet",
      changeType: "neutral" as const,
      icon: TrendingUp,
      href: "/dashboard/analytics",
      bgColor: "bg-orange-100 dark:bg-orange-900/30",
      iconColor: "text-orange-600 dark:text-orange-400",
    },
  ];

  const quickActions = [
    {
      name: "Create Post",
      description: "Schedule content across platforms",
      icon: Sparkles,
      href: "/dashboard/social/create",
      color: "bg-blue-500",
    },
    {
      name: "View Calendar",
      description: "See your content calendar",
      icon: Calendar,
      href: "/dashboard/social",
      color: "bg-purple-500",
    },
    {
      name: "View Analytics",
      description: "Track your performance",
      icon: BarChart3,
      href: "/dashboard/analytics",
      color: "bg-green-500",
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Welcome back, ${firstName || "there"}!`}
        description={`Here's what's happening with ${organizationName || "your marketing"} today.`}
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <Link key={stat.name} href={stat.href}>
            <Card isPressable className="hover:shadow-md transition-shadow">
              <CardBody className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.bgColor}`}
                  >
                    <stat.icon className={`w-5 h-5 ${stat.iconColor}`} />
                  </div>
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded-full ${
                      stat.changeType === "positive"
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                    }`}
                  >
                    {stat.change}
                  </span>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stat.value}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {stat.name}
                </p>
              </CardBody>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickActions.map((action) => (
            <Link key={action.name} href={action.href}>
              <Card isPressable className="hover:shadow-md transition-shadow h-full">
                <CardBody className="p-6">
                  <div
                    className={`w-12 h-12 ${action.color} rounded-xl flex items-center justify-center mb-4`}
                  >
                    <action.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {action.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {action.description}
                  </p>
                </CardBody>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Getting Started */}
      <Card>
        <CardHeader className="pb-0">
          <h2 className="text-lg font-semibold">Getting Started</h2>
        </CardHeader>
        <CardBody>
          <div className="space-y-3">
            <Link
              href="/dashboard/settings"
              className="flex items-center gap-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl group"
            >
              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold">✓</span>
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900 dark:text-white">
                  Create your organization
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {organizationName} is ready!
                </p>
              </div>
            </Link>

            <Link
              href="/dashboard/social/accounts"
              className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl group hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="w-10 h-10 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold">2</span>
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900 dark:text-white">
                  Connect social accounts
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Link your Twitter, LinkedIn, Instagram, and more
                </p>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
            </Link>

            <Link
              href="/dashboard/voice"
              className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl group hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="w-10 h-10 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold">3</span>
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900 dark:text-white">
                  Set up a voice agent
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Create your first AI-powered phone agent
                </p>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
            </Link>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
