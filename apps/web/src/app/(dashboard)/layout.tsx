import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { syncUser } from "@/lib/sync-user";
import { DashboardShell } from "@/components/layout/dashboard-shell";

// Development UAT bypass - allows testing without auth in development mode
const isUATBypassEnabled =
  process.env.NODE_ENV === "development" &&
  process.env.UAT_AUTH_BYPASS === "true";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();

  // In UAT bypass mode, skip auth check and use mock values
  if (isUATBypassEnabled && !userId) {
    return (
      <DashboardShell
        organizationName="UAT Test Organization"
        userName="UAT Tester"
      >
        {children}
      </DashboardShell>
    );
  }

  if (!userId) {
    redirect("/sign-in");
  }

  // Get user data in parallel - wrap in try/catch for resilience
  let organizationName: string | undefined;
  let userName: string | undefined;

  try {
    const [syncedUser, clerkUser] = await Promise.all([
      syncUser(),
      currentUser(),
    ]);

    // Get organization from synced user (already includes memberships)
    if (syncedUser?.memberships?.[0]?.organization) {
      organizationName = syncedUser.memberships[0].organization.name;
    }

    // Get user name from Clerk
    if (clerkUser?.firstName) {
      userName = clerkUser.firstName;
    }
  } catch (e) {
    console.error("Error in dashboard layout:", e);
    // Continue rendering with default values
  }

  return (
    <DashboardShell
      organizationName={organizationName}
      userName={userName}
    >
      {children}
    </DashboardShell>
  );
}
