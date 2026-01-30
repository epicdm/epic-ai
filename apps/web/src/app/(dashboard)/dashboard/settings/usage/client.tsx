"use client";

import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import Link from "next/link";
import { ArrowLeft as ArrowLeftIcon } from "lucide-react";

const UsageDashboard = dynamic(
  () => import("@/components/usage/usage-dashboard").then(mod => mod.UsageDashboard),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
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
            variant="outline"
            size="sm"
            
          ><ArrowLeftIcon className="w-4 h-4" /> 
            Back to Settings
          </Button>
        }
      />
      <UsageDashboard />
    </div>
  );
}
