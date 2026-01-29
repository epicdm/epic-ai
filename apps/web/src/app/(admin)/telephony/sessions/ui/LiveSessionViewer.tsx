"use client";

import * as React from "react";

type ApiEnvelope<T> = {
  data: T | null;
  confidence?: Record<string, number>;
  gaps?: any[];
  warnings?: Array<{ code: string; message: string; severity: "info" | "warning" | "error" }>;
  error?: { code: string; message: string; details?: unknown };
};

type LiveSessionData = {
  sessionId: string;
  [k: string]: string; // Redis hgetall returns strings
};

function Badge({ children, tone }: { children: React.ReactNode; tone: "gray" | "green" | "yellow" | "red" | "blue" }) {
  const base =
    "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium border";
  const tones: Record<typeof tone, string> = {
    gray: "bg-muted text-muted-foreground border-border",
    green: "bg-green-50 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-200 dark:border-green-900/40",
    yellow: "bg-yellow-50 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-200 dark:border-yellow-900/40",
    red: "bg-red-50 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-200 dark:border-red-900/40",
    blue: "bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-200 dark:border-blue-900/40",
  };
  return <span className={`${base} ${tones[tone]}`}>{children}</span>;
}

function toneForSeverity(s?: string) {
  if (s === "error") return "red";
  if (s === "warning") return "yellow";
  return "gray";
}

function formatKey(k: string) {
  return k.replace(/_/g, " ");
}

function toBool(v?: string) {
  return (v || "").toLowerCase() === "true" || v === "1" || (v || "").toLowerCase() === "yes";
}

export function LiveSessionViewer({
  initialSessionId = "",
  defaultPollMs = 1500,
}: {
  initialSessionId?: string;
  defaultPollMs?: number;
}) {
  const [sessionId, setSessionId] = React.useState(initialSessionId);
  const [pollMs, setPollMs] = React.useState(defaultPollMs);
  const [isPolling, setIsPolling] = React.useState(true);

  const [loading, setLoading] = React.useState(false);
  const [lastFetchAt, setLastFetchAt] = React.useState<string | null>(null);
  const [envelope, setEnvelope] = React.useState<ApiEnvelope<LiveSessionData> | null>(null);

  const fetchSession = React.useCallback(async () => {
    const sid = sessionId.trim();
    if (!sid) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/telephony/session?sessionId=${encodeURIComponent(sid)}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });
      const json = (await res.json()) as ApiEnvelope<LiveSessionData>;
      setEnvelope(json);
      setLastFetchAt(new Date().toISOString());
    } catch (e: any) {
      setEnvelope({
        data: null,
        warnings: [{ code: "FETCH_FAILED", message: e?.message || "Fetch failed", severity: "error" }],
      });
      setLastFetchAt(new Date().toISOString());
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  React.useEffect(() => {
    if (!isPolling) return;
    if (!sessionId.trim()) return;

    // initial fetch
    fetchSession();

    const id = window.setInterval(fetchSession, Math.max(300, pollMs));
    return () => window.clearInterval(id);
  }, [isPolling, pollMs, sessionId, fetchSession]);

  const data = envelope?.data || null;
  const warnings = envelope?.warnings || [];

  // Highlighted fields (common ones from your handoff + runtime)
  const stage = data?.stage;
  const escalated = toBool(data?.escalated);
  const escalationReason = data?.escalation_reason;
  const escalationTarget = data?.escalation_target;
  const handoffOk = data?.handoff_ok;
  const handoffMessage = data?.handoff_message;

  // Render remaining fields (excluding the highlighted ones)
  const highlightedKeys = new Set([
    "sessionId",
    "stage",
    "escalated",
    "escalation_reason",
    "escalation_target",
    "escalated_at",
    "handoff_ok",
    "handoff_message",
    "handoff_done_at",
    "updated_at",
  ]);

  const extraPairs = data
    ? Object.entries(data)
        .filter(([k]) => !highlightedKeys.has(k))
        .sort(([a], [b]) => a.localeCompare(b))
    : [];

  return (
    <div className="w-full rounded-xl border border-border p-4 space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <div className="text-lg font-semibold">Live Session Viewer</div>
          <div className="text-sm text-muted-foreground">
            Polls Redis-backed session state via <code>/api/telephony/session</code>
          </div>
        </div>

        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground">Session ID</label>
            <input
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              placeholder="SESSION_123"
              className="h-9 w-[260px] rounded-md border border-border bg-background px-3 text-sm"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground">Poll (ms)</label>
            <input
              type="number"
              min={300}
              value={pollMs}
              onChange={(e) => setPollMs(Number(e.target.value))}
              className="h-9 w-[110px] rounded-md border border-border bg-background px-3 text-sm"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPolling((v) => !v)}
              className="h-9 rounded-md border border-border px-3 text-sm hover:bg-muted"
            >
              {isPolling ? "Pause" : "Resume"}
            </button>
            <button
              onClick={fetchSession}
              className="h-9 rounded-md bg-primary px-3 text-sm text-primary-foreground hover:opacity-90"
              disabled={loading || !sessionId.trim()}
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="space-y-2">
          {warnings.map((w, idx) => (
            <div key={idx} className="flex items-start justify-between gap-3 rounded-lg border border-border p-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge tone={toneForSeverity(w.severity) as any}>{w.severity.toUpperCase()}</Badge>
                  <span className="text-sm font-medium">{w.code}</span>
                </div>
                <div className="text-sm text-muted-foreground">{w.message}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-border p-3">
          <div className="text-xs text-muted-foreground">Stage</div>
          <div className="mt-1 flex items-center gap-2">
            <div className="text-sm font-semibold">{stage || "—"}</div>
            {stage ? <Badge tone="blue">{stage}</Badge> : <Badge tone="gray">unknown</Badge>}
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            {lastFetchAt ? `Last fetch: ${new Date(lastFetchAt).toLocaleTimeString()}` : "Not fetched yet"}
          </div>
        </div>

        <div className="rounded-lg border border-border p-3">
          <div className="text-xs text-muted-foreground">Escalation</div>
          <div className="mt-1 flex items-center gap-2">
            {data ? (
              escalated ? <Badge tone="yellow">ESCALATED</Badge> : <Badge tone="green">NO</Badge>
            ) : (
              <Badge tone="gray">—</Badge>
            )}
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            {escalationReason ? `Reason: ${escalationReason}` : "Reason: —"}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {escalationTarget ? `Target: ${escalationTarget}` : "Target: —"}
          </div>
        </div>

        <div className="rounded-lg border border-border p-3">
          <div className="text-xs text-muted-foreground">Handoff Result</div>
          <div className="mt-1 flex items-center gap-2">
            {handoffOk ? (
              toBool(handoffOk) ? <Badge tone="green">OK</Badge> : <Badge tone="red">FAILED</Badge>
            ) : (
              <Badge tone="gray">—</Badge>
            )}
          </div>
          <div className="mt-2 text-xs text-muted-foreground line-clamp-3">
            {handoffMessage || "Message: —"}
          </div>
        </div>
      </div>

      {/* Data table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 bg-muted/50">
          <div className="text-sm font-medium">Session Fields</div>
          <div className="text-xs text-muted-foreground">
            {data ? `Keys: ${Object.keys(data).length}` : "No data"}
          </div>
        </div>

        {!data ? (
          <div className="p-4 text-sm text-muted-foreground">
            Enter a Session ID to begin. If a call just started, it may take a moment before the session hash appears.
          </div>
        ) : (
          <div className="max-h-[380px] overflow-auto">
            <table className="w-full text-sm">
              <tbody>
                {[
                  ["sessionId", data.sessionId],
                  ["updated_at", data.updated_at],
                  ["escalated_at", data.escalated_at],
                  ["handoff_done_at", data.handoff_done_at],
                ]
                  .filter(([, v]) => !!v)
                  .map(([k, v]) => (
                    <tr key={k} className="border-t border-border">
                      <td className="w-[240px] px-3 py-2 font-medium">{formatKey(k)}</td>
                      <td className="px-3 py-2 text-muted-foreground break-all">{v}</td>
                    </tr>
                  ))}

                {extraPairs.map(([k, v]) => (
                  <tr key={k} className="border-t border-border">
                    <td className="w-[240px] px-3 py-2 font-medium">{formatKey(k)}</td>
                    <td className="px-3 py-2 text-muted-foreground break-all">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="text-xs text-muted-foreground">
        Tip: your handoff node writes <code>escalated=true</code>, <code>escalation_reason</code>,{" "}
        <code>escalation_target</code>, and <code>handoff_ok</code>. This widget will reflect those immediately.
      </div>
    </div>
  );
}
