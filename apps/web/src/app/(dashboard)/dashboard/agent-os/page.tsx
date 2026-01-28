import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { AgentOSContent } from "./agent-os-content";

function isUATBypassEnabled() {
  return process.env.UAT_AUTH_BYPASS === "true" || process.env.E2E_UAT_BYPASS === "true";
}

export const dynamic = "force-dynamic";

export default async function AgentOSPage() {
  // Check UAT bypass FIRST, before calling any Clerk functions
  if (isUATBypassEnabled()) {
    return <AgentOSContent />;
  }

  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  return <AgentOSContent />;
}
