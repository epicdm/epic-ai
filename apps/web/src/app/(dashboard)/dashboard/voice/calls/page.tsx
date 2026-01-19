import { getAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CallHistory } from "@/components/voice/call-history";

export const dynamic = 'force-dynamic';

export default async function CallsPage() {
  const { userId } = await getAuth();

  if (!userId) {
    redirect("/sign-in");
  }

  return <CallHistory />;
}
