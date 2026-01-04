/**
 * Publishing Settings Page - PKG-024
 * Configure publishing schedules and automation
 */

import { getAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@epic-ai/database";
import { PublishingSettings } from "@/components/publishing/PublishingSettings";

export const metadata = {
  title: "Publishing Settings | Epic AI",
  description: "Configure your publishing schedules and automation",
};

export default async function PublishingSettingsPage() {
  const { userId } = await getAuth();
  if (!userId) {
    redirect("/sign-in");
  }

  // Get user's organization
  const membership = await prisma.membership.findFirst({
    where: { userId },
    include: { organization: true },
  });

  if (!membership) {
    redirect("/onboarding");
  }

  return (
    <div className="p-6">
      <PublishingSettings orgId={membership.organizationId} />
    </div>
  );
}
