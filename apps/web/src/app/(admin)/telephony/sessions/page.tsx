import { LiveSessionViewer } from "./ui/LiveSessionViewer";

export const metadata = {
  title: "Telephony Sessions",
  description: "Live view of call sessions and escalation/handoff state",
};

export default function TelephonySessionsPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Telephony Sessions</h1>
        <p className="text-sm text-muted-foreground">
          Live view of call sessions and escalation/handoff state.
        </p>
      </div>

      <LiveSessionViewer />
    </div>
  );
}
