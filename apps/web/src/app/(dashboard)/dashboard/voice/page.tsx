import { getAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { VoiceDashboard } from "@/components/voice/voice-dashboard";

export const dynamic = 'force-dynamic';

export default async function VoicePage() {
  const { userId } = await getAuth();

  if (!userId) {
    redirect("/sign-in");
  }

  return <VoiceDashboard />;
}
