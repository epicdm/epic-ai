import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { syncUser, getUserOrganization } from "@/lib/sync-user";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  // Sync user and get their organization - wrap in try/catch for resilience
  let organization = null;
  let user = null;

  try {
    await syncUser();
  } catch (e) {
    console.error("Error syncing user:", e);
  }

  try {
    organization = await getUserOrganization();
  } catch (e) {
    console.error("Error getting organization:", e);
  }

  try {
    user = await currentUser();
  } catch (e) {
    console.error("Error getting current user:", e);
  }

  return (
    <DashboardShell
      organizationName={organization?.name}
      userName={user?.firstName || undefined}
    >
      {children}
    </DashboardShell>
  );
}
