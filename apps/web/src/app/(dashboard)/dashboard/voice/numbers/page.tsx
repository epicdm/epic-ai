import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { needsOnboarding } from "@/lib/sync-user";
import { PhoneNumbersPage } from "@/components/voice/phone-numbers-page";

export default async function NumbersPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  if (await needsOnboarding()) {
    redirect("/onboarding");
  }

  return <PhoneNumbersPage />;
}
