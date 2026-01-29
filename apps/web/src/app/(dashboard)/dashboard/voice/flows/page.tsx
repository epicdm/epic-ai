import { getAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { FlowManager } from "@/components/voice/flow-manager";

export const dynamic = 'force-dynamic';

export default async function FlowsPage() {
  const { userId } = await getAuth();

  if (!userId) {
    redirect("/sign-in");
  }

  return <FlowManager />;
}
