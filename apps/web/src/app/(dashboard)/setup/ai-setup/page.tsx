/**
 * Bird's Eye AI Setup Page
 * Unified AI-powered setup for all 5 flywheel phases
 */

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { BirdEyeWizard } from "@/components/flywheel/shared/birdeye-wizard";

export const metadata = {
  title: "AI Setup - Configure Your Flywheel | Epic AI",
  description: "Let AI configure your entire marketing flywheel in one go",
};

export default async function AISetupPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <BirdEyeWizard />
    </div>
  );
}
