import { getAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { FlowEditorPage } from "@/components/voice/flow-editor-page";

type Props = {
  params: Promise<{ id: string }>;
};

export const dynamic = 'force-dynamic';

export default async function FlowDetailPage({ params }: Props) {
  const { userId } = await getAuth();

  if (!userId) {
    redirect("/sign-in");
  }

  const { id } = await params;

  return <FlowEditorPage flowId={id} />;
}
