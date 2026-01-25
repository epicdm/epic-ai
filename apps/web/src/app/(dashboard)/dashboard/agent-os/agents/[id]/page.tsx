import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { AgentDetailContent } from "./agent-detail-content";

const isUATBypassEnabled =
  process.env.NODE_ENV === "development" &&
  process.env.UAT_AUTH_BYPASS === "true";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AgentDetailPage({ params }: PageProps) {
  const { userId } = await auth();

  if (!userId && !isUATBypassEnabled) {
    redirect("/sign-in");
  }

  const { id } = await params;

  return <AgentDetailContent agentId={id} />;
}
