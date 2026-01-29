import { getAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { FlowsContent } from "./flows-content";

export const dynamic = "force-dynamic";

export default async function PhoneFlowsPage() {
  const { userId } = await getAuth();

  if (!userId) {
    redirect("/sign-in");
  }

  return <FlowsContent />;
}
