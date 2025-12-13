/**
 * Content Calendar Page - PKG-024
 * Visual calendar view for scheduled content
 */

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@epic-ai/database";
import { ContentCalendar } from "@/components/calendar/ContentCalendar";

export const metadata = {
  title: "Content Calendar | Epic AI",
  description: "View and manage your scheduled content",
};

export default async function CalendarPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  // Get user's organization
  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id },
    include: { organization: true },
  });

  if (!membership) {
    redirect("/onboarding");
  }

  return (
    <div className="p-6">
      <ContentCalendar orgId={membership.organizationId} />
    </div>
  );
}
