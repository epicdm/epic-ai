import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { needsOnboarding } from "@/lib/sync-user";
import { FlywheelTestPage } from "@/components/test/flywheel-test-page";

export default async function TestPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  if (await needsOnboarding()) {
    redirect("/onboarding");
  }

  return <FlywheelTestPage />;
}
