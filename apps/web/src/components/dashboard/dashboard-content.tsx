"use client";

import Link from "next/link";
import { Card, CardBody, CardHeader, Progress, Chip, Button } from "@heroui/react";
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
  Brain,
  FileText,
  CheckCircle2,
  Clock,
  Megaphone,
  Zap,
} from "lucide-react";

interface DashboardContentProps {
  firstName: string | null;
  organizationName: string | null;
  stats: {
    brandCount: number;
    postCount: number;
    callCount: number;
    leadCount: number;
    pendingContent?: number;
    scheduledContent?: number;
    brainCompleteness?: number;
  };
}

export function DashboardContent({
  firstName,
  organizationName,
  stats,
}: DashboardContentProps) {
  const {
    postCount,
    callCount,
    leadCount,
    pendingContent = 0,
    scheduledContent = 0,
    brainCompleteness = 0,
  } = stats;

  const statCards = [
    {
      name: "Content Queue",
      value: pendingContent,
      change: `${scheduledContent} scheduled`,
      changeType: "neutral" as const,
      icon: FileText,
      href: "/dashboard/content",
      bgColor: "bg-blue-100 dark:bg-blue-900/30",
      iconColor: "text-blue-600 dark:text-blue-400",
    },
    {
      name: "Published",
      value: postCount,
      change: "This month",
      changeType: "positive" as const,
      icon: Share2,
      href: "/dashboard/content/published",
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
      name: "Voice Calls",
      value: callCount,
      change: "This week",
      changeType: "neutral" as const,
      icon: Phone,
      href: "/dashboard/voice/calls",
      bgColor: "bg-orange-100 dark:bg-orange-900/30",
      iconColor: "text-orange-600 dark:text-orange-400",
    },
  ];

  const quickActions = [
    {
      name: "Generate Content",
      description: "Create AI-powered posts",
      icon: Sparkles,
      href: "/dashboard/content/generate",
      color: "bg-gradient-to-br from-purple-500 to-pink-500",
    },
    {
      name: "Review Queue",
      description: `${pendingContent} items pending`,
      icon: CheckCircle2,
      href: "/dashboard/content/approval",
      color: "bg-gradient-to-br from-blue-500 to-cyan-500",
    },
    {
      name: "View Analytics",
      description: "Track performance",
      icon: BarChart3,
      href: "/dashboard/analytics",
      color: "bg-gradient-to-br from-green-500 to-emerald-500",
    },
    {
      name: "Manage Ads",
      description: "Campaign performance",
      icon: Megaphone,
      href: "/dashboard/ads",
      color: "bg-gradient-to-br from-orange-500 to-red-500",
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

      {/* Brand Brain Status & Getting Started */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Brand Brain Card */}
        <Card>
          <CardHeader className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-500" />
              <h2 className="text-lg font-semibold">Brand Brain</h2>
            </div>
            <Link href="/dashboard/brand">
              <Button size="sm" variant="light" endContent={<ArrowRight className="w-4 h-4" />}>
                Manage
              </Button>
            </Link>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500">Training Completeness</span>
                  <Chip
                    size="sm"
                    color={brainCompleteness >= 80 ? "success" : brainCompleteness >= 50 ? "warning" : "danger"}
                    variant="flat"
                  >
                    {brainCompleteness}%
                  </Chip>
                </div>
                <Progress
                  value={brainCompleteness}
                  color={brainCompleteness >= 80 ? "success" : brainCompleteness >= 50 ? "warning" : "danger"}
                  size="sm"
                />
              </div>
              <p className="text-sm text-gray-500">
                {brainCompleteness < 50
                  ? "Add context sources to improve AI content quality"
                  : brainCompleteness < 80
                  ? "Your AI is learning! Keep adding context"
                  : "Your Brand Brain is well-trained"}
              </p>
            </div>
          </CardBody>
        </Card>

        {/* Setup Checklist */}
        <Card>
          <CardHeader className="pb-0">
            <h2 className="text-lg font-semibold">Setup Checklist</h2>
          </CardHeader>
          <CardBody>
            <div className="space-y-3">
              <Link
                href="/dashboard/brand"
                className="flex items-center gap-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg"
              >
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span className="text-sm font-medium">Organization created</span>
              </Link>

              <Link
                href="/dashboard/brand/context"
                className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <Clock className="w-5 h-5 text-gray-400" />
                <span className="text-sm">Add context sources</span>
                <ArrowRight className="w-4 h-4 ml-auto text-gray-400" />
              </Link>

              <Link
                href="/dashboard/social/accounts"
                className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <Clock className="w-5 h-5 text-gray-400" />
                <span className="text-sm">Connect social accounts</span>
                <ArrowRight className="w-4 h-4 ml-auto text-gray-400" />
              </Link>

              <Link
                href="/dashboard/content/generate"
                className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <Clock className="w-5 h-5 text-gray-400" />
                <span className="text-sm">Generate first content</span>
                <ArrowRight className="w-4 h-4 ml-auto text-gray-400" />
              </Link>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
