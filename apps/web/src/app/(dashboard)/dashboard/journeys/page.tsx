/**
 * Customer Journeys Page - Cross-Channel Journey Visualization
 * Visualize customer journeys across Social, Voice, Email, and other channels
 */

import { getAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@epic-ai/database";
import { JourneysDashboard } from "@/components/journeys/journeys-dashboard";

export const dynamic = 'force-dynamic';

export const metadata = {
  title: "Customer Journeys | Epic AI",
  description: "Visualize cross-channel customer journeys and touchpoints",
};

export default async function JourneysPage() {
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
    throw new Error("Organization membership not found - please contact support");
  }

  return (
    <div className="p-6">
      <JourneysDashboard orgId={membership.organizationId} />
    </div>
  );
}
