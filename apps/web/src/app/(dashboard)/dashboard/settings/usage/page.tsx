import { getAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUserOrganization } from "@/lib/sync-user";
import { UsagePageClient } from "./client";

export default async function UsagePage() {
  const { userId } = await getAuth();

  if (!userId) {
    redirect("/sign-in");
  }

  const organization = await getUserOrganization();

  if (!organization) {
    throw new Error("Organization not found - please contact support");
  }

  return <UsagePageClient />;
}
