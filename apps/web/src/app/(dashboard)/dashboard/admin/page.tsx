import { getAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminPanel } from "@/components/admin/admin-panel";

export default async function AdminPage() {
  const { userId } = await getAuth();

  if (!userId) {
    redirect("/sign-in");
  }

  // TODO: Add admin role check here when we implement roles
  // For now, any authenticated user can access

  return <AdminPanel />;
}
