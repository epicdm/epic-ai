import { getAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { needsOnboarding } from "@/lib/sync-user";
import { TestConsole } from "@/components/voice/test-console";

export default async function TestPage() {
  const { userId } = await getAuth();

  if (!userId) {
    redirect("/sign-in");
  }

  if (await needsOnboarding()) {
    redirect("/onboarding");
  }

  return <TestConsole />;
}
