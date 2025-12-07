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

  // Sync user and get their organization
  await syncUser();
  const organization = await getUserOrganization();
  const user = await currentUser();

  return (
    <DashboardShell
      organizationName={organization?.name}
      userName={user?.firstName || undefined}
    >
      {children}
    </DashboardShell>
  );
}
