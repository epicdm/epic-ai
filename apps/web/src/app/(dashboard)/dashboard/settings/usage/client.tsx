"use client";

import dynamic from "next/dynamic";
import { Spinner, Button } from "@heroui/react";
import { PageHeader } from "@/components/layout/page-header";
import Link from "next/link";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";

const UsageDashboard = dynamic(
  () => import("@/components/usage/usage-dashboard").then(mod => mod.UsageDashboard),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    ),
  }
);

export function UsagePageClient() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Usage & Billing"
        description="Track your platform usage, costs, and spending across all services."
        actions={
          <Button
            as={Link}
            href="/dashboard/settings"
            variant="bordered"
            size="sm"
            startContent={<ArrowLeftIcon className="w-4 h-4" />}
          >
            Back to Settings
          </Button>
        }
      />
      <UsageDashboard />
    </div>
  );
}
