import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { WizardContent } from "./wizard-content";

function isUATBypassEnabled() {
  return process.env.UAT_AUTH_BYPASS === "true" || process.env.E2E_UAT_BYPASS === "true";
}

export const dynamic = "force-dynamic";

export default async function AgentOSWizardPage() {
  // Check UAT bypass FIRST, before calling any Clerk functions
  if (isUATBypassEnabled()) {
    return <WizardContent />;
  }

  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  return <WizardContent />;
}
