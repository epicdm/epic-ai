import { getAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PhoneOverviewContent } from "./phone-overview-content";

export const dynamic = "force-dynamic";

export default async function PhonePage() {
  const { userId } = await getAuth();

  if (!userId) {
    redirect("/sign-in");
  }

  return <PhoneOverviewContent />;
}
