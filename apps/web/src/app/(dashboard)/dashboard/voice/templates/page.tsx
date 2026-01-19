import { getAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { VoiceTemplates } from "@/components/voice/voice-templates";

export default async function VoiceTemplatesPage() {
  const { userId } = await getAuth();

  if (!userId) {
    redirect("/sign-in");
  }

  return <VoiceTemplates />;
}
