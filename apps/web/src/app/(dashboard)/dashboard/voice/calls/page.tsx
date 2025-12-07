import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { needsOnboarding } from "@/lib/sync-user";
import { CallHistory } from "@/components/voice/call-history";

export default async function CallsPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  if (await needsOnboarding()) {
    redirect("/onboarding");
  }

  return <CallHistory />;
}
