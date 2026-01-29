import { getAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { FlowEditorStub } from "./flow-editor-stub";

type Props = {
  params: Promise<{ id: string }>;
};

export const dynamic = "force-dynamic";

export default async function PhoneFlowDetailPage({ params }: Props) {
  const { userId } = await getAuth();

  if (!userId) {
    redirect("/sign-in");
  }

  const { id } = await params;

  return <FlowEditorStub flowId={id} />;
}
