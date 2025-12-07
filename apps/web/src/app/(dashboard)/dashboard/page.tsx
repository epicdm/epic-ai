import { currentUser } from "@clerk/nextjs/server";
import { DashboardContent } from "@/components/dashboard/dashboard-content";

export default async function DashboardPage() {
  const user = await currentUser();

  return <DashboardContent firstName={user?.firstName || null} />;
}
