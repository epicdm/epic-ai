import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { AgentsContent } from "@/app/(dashboard)/dashboard/agents/agents-content";

function isUATBypassEnabled() {
  return process.env.UAT_AUTH_BYPASS === "true" || process.env.E2E_UAT_BYPASS === "true";
}

export const dynamic = "force-dynamic";

export default async function AgentsPage() {
  const { userId } = await auth();

  if (!userId && !isUATBypassEnabled()) {
    redirect("/sign-in");
  }

  return <AgentsContent />;
}
