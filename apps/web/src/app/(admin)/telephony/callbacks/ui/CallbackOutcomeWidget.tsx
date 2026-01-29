"use client";

import * as React from "react";

type WarningItem = {
  code: string;
  message: string;
  severity: "info" | "warning" | "error";
  field_path?: string;
  suggestion?: string;
};

type GapItem = {
  gap_type: string;
  field_path: string;
  severity: "low" | "medium" | "high";
  impact: string;
  recommended_fix: string;
  question_to_user?: string;
  suggestions?: string[];
};

type OutcomeEnvelope = {
  data: Record<string, string> | null;
  confidence?: Record<string, number>;
  gaps?: GapItem[];
  warnings?: WarningItem[];
};

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function Badge({
  children,
  tone = "gray",
}: {
  children: React.ReactNode;
  tone?: "green" | "yellow" | "red" | "gray" | "blue";
}) {
  const map: Record<string, string> = {
    green: "bg-emerald-50 text-emerald-700 border-emerald-200",
    yellow: "bg-amber-50 text-amber-700 border-amber-200",
    red: "bg-rose-50 text-rose-700 border-rose-200",
    gray: "bg-slate-50 text-slate-700 border-slate-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
  };
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        map[tone] || map.gray
      )}
    >
      {children}
    </span>
  );
}

function Row({ label, value }: { label: string; value?: React.ReactNode }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-xs text-slate-900 text-right break-all">{value}</div>
    </div>
  );
}

function severityTone(sev?: string) {
  if (sev === "error" || sev === "high") return "red";
  if (sev === "warning" || sev === "medium") return "yellow";
  if (sev === "info" || sev === "low") return "blue";
  return "gray";
}

function deriveStatus(outcome: Record<string, string> | null) {
  if (!outcome) {
    return { label: "Waiting for outcome…", tone: "gray" as const };
  }
  if (outcome.final) {
    const f = outcome.final.toLowerCase();
    if (f.includes("success") || f.includes("answered")) return { label: "Completed", tone: "green" as const };
    return { label: `Final: ${outcome.final}`, tone: "red" as const };
  }
  const stage = (outcome.stage || "").toLowerCase();
  if (stage === "originate") return { label: "Originate submitted", tone: "blue" as const };
  if (stage === "hangup") return { label: "Call ended (hangup)", tone: "yellow" as const };
  if (stage) return { label: `Stage: ${outcome.stage}`, tone: "blue" as const };
  return { label: "Outcome recorded", tone: "blue" as const };
}

export function CallbackOutcomeWidget({
  jobId,
  pollIntervalMs = 2500,
  stopWhenFinal = true,
  stopWhenHangup = true,
  className,
}: {
  jobId: string;
  pollIntervalMs?: number;
  stopWhenFinal?: boolean;
  stopWhenHangup?: boolean;
  className?: string;
}) {
  const [loading, setLoading] = React.useState(true);
  const [envelope, setEnvelope] = React.useState<OutcomeEnvelope | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isPolling, setIsPolling] = React.useState(true);
  const [lastFetchedAt, setLastFetchedAt] = React.useState<string | null>(null);

  const fetchOnce = React.useCallback(async () => {
    if (!jobId) return;
    setError(null);

    try {
      const res = await fetch(`/api/telephony/callback/outcome?jobId=${encodeURIComponent(jobId)}`, {
        method: "GET",
        headers: { "content-type": "application/json" },
        cache: "no-store",
      });

      const json = (await res.json()) as OutcomeEnvelope;

      setEnvelope(json);
      setLastFetchedAt(new Date().toISOString());
      setLoading(false);

      const data = json.data;
      const stage = (data?.stage || "").toLowerCase();
      const hasFinal = !!data?.final;

      if (stopWhenFinal && hasFinal) setIsPolling(false);
      if (stopWhenHangup && stage === "hangup") setIsPolling(false);
    } catch (e: any) {
      setLoading(false);
      setError(e?.message || "Failed to fetch callback outcome.");
    }
  }, [jobId, stopWhenFinal, stopWhenHangup]);

  React.useEffect(() => {
    setIsPolling(true);
    setLoading(true);
    setEnvelope(null);
    setError(null);
    void fetchOnce();
  }, [jobId, fetchOnce]);

  React.useEffect(() => {
    if (!isPolling) return;

    const t = window.setInterval(() => {
      void fetchOnce();
    }, Math.max(800, pollIntervalMs));

    return () => window.clearInterval(t);
  }, [isPolling, pollIntervalMs, fetchOnce]);

  const outcome = envelope?.data ?? null;
  const warnings = envelope?.warnings ?? [];
  const gaps = envelope?.gaps ?? [];
  const confidence = envelope?.confidence ?? {};
  const status = deriveStatus(outcome);

  const attempts = outcome?.attempts ? Number(outcome.attempts) : undefined;
  const confidenceOutcome =
    typeof confidence["outcome"] === "number" ? confidence["outcome"] : undefined;

  return (
    <div className={cx("rounded-xl border border-slate-200 bg-white p-4 shadow-sm", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="text-sm font-semibold text-slate-900">Callback Outcome</div>
            <Badge tone={status.tone}>{status.label}</Badge>
            {isPolling ? <Badge tone="blue">Polling</Badge> : <Badge tone="gray">Paused</Badge>}
          </div>
          <div className="text-xs text-slate-500">
            Job ID: <span className="font-mono text-slate-700">{jobId}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void fetchOnce()}
            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={() => setIsPolling((v) => !v)}
            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            {isPolling ? "Stop" : "Start"}
          </button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-slate-200 p-3">
          <div className="mb-2 text-xs font-semibold text-slate-800">Core</div>

          {loading ? (
            <div className="text-xs text-slate-500">Loading…</div>
          ) : error ? (
            <div className="text-xs text-rose-700">{error}</div>
          ) : !outcome ? (
            <div className="text-xs text-slate-500">
              No outcome recorded yet. This is normal if the call hasn't fired, or the AMI listener hasn't written.
            </div>
          ) : (
            <div className="space-y-2">
              <Row label="stage" value={outcome.stage} />
              <Row label="response" value={outcome.response} />
              <Row label="reason" value={outcome.reason} />
              <Row label="uniqueid" value={outcome.uniqueid} />
              <Row label="channel" value={outcome.channel} />
              <Row label="hangup cause" value={outcome.hangup_cause} />
              <Row label="hangup text" value={outcome.hangup_cause_txt} />
              <Row label="attempts" value={attempts !== undefined ? String(attempts) : undefined} />
              <Row label="final" value={outcome.final} />
              <Row label="final reason" value={outcome.final_reason} />
              <Row label="confidence(outcome)" value={confidenceOutcome !== undefined ? confidenceOutcome.toFixed(2) : undefined} />
            </div>
          )}
        </div>

        <div className="rounded-lg border border-slate-200 p-3">
          <div className="mb-2 text-xs font-semibold text-slate-800">Signals</div>

          <div className="space-y-3">
            <div className="space-y-2">
              <div className="text-xs font-medium text-slate-700">Warnings</div>
              {warnings.length === 0 ? (
                <div className="text-xs text-slate-500">None</div>
              ) : (
                <div className="space-y-2">
                  {warnings.map((w, idx) => (
                    <div key={`${w.code}-${idx}`} className="rounded-md border border-slate-200 p-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-xs font-semibold text-slate-800">{w.code}</div>
                        <Badge tone={severityTone(w.severity) as any}>{w.severity}</Badge>
                      </div>
                      <div className="mt-1 text-xs text-slate-700">{w.message}</div>
                      {w.suggestion ? (
                        <div className="mt-1 text-xs text-slate-500">Suggestion: {w.suggestion}</div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="text-xs font-medium text-slate-700">Gaps</div>
              {gaps.length === 0 ? (
                <div className="text-xs text-slate-500">None</div>
              ) : (
                <div className="space-y-2">
                  {gaps.map((g, idx) => (
                    <div key={`${g.gap_type}-${idx}`} className="rounded-md border border-slate-200 p-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-xs font-semibold text-slate-800">{g.gap_type}</div>
                        <Badge tone={severityTone(g.severity) as any}>{g.severity}</Badge>
                      </div>
                      <div className="mt-1 text-xs text-slate-700">{g.impact}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        Fix: {g.recommended_fix}
                      </div>
                      {g.question_to_user ? (
                        <div className="mt-1 text-xs text-slate-500">
                          Q: {g.question_to_user}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-1 text-[11px] text-slate-400">
              Last fetched: {lastFetchedAt ? new Date(lastFetchedAt).toLocaleString() : "—"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CallbackOutcomeWidget;
