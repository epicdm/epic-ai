import { HandoffTargetPicker } from "../ui/HandoffTargetPicker";

export const metadata = {
  title: "Handoff Settings",
  description: "Configure where this agent transfers live calls when escalating to a human",
};

export default async function AgentHandoffPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Handoff Settings</h1>
        <p className="text-sm text-muted-foreground">
          Configure where this agent transfers live calls when escalating to a human.
        </p>
      </div>

      <HandoffTargetPicker agentId={id} />
    </div>
  );
}
