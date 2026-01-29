import { getAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CallsContent } from "./calls-content";

export const dynamic = "force-dynamic";

export default async function PhoneCallsPage() {
  const { userId } = await getAuth();

  if (!userId) {
    redirect("/sign-in");
  }

  return <CallsContent />;
}
