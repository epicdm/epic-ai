import { getAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { needsOnboarding } from "@/lib/sync-user";
import { FlowEditorPage } from "@/components/voice/flow-editor-page";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function FlowDetailPage({ params }: Props) {
  const { userId } = await getAuth();

  if (!userId) {
    redirect("/sign-in");
  }

  if (await needsOnboarding()) {
    redirect("/onboarding");
  }

  const { id } = await params;

  return <FlowEditorPage flowId={id} />;
}
