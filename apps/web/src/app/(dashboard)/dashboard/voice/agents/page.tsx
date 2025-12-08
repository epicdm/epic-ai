import { redirect } from "next/navigation";

// Redirect /dashboard/voice/agents to /dashboard/voice
// The main voice page shows the agents list
export default function AgentsPage() {
  redirect("/dashboard/voice");
}
