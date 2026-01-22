import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { AgentsContent } from "@/app/(dashboard)/dashboard/agents/agents-content";

const isUATBypassEnabled =
  process.env.NODE_ENV === "development" &&
  process.env.UAT_AUTH_BYPASS === "true";

export const dynamic = "force-dynamic";

export default async function AgentsPage() {
  const { userId } = await auth();

  if (!userId && !isUATBypassEnabled) {
    redirect("/sign-in");
  }

  return <AgentsContent />;
}
