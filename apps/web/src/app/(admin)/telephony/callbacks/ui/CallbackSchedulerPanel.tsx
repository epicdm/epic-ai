"use client";

import * as React from "react";
import CallbackOutcomeWidget from "./CallbackOutcomeWidget";

type ApiEnvelope<T> = {
  data: T | null;
  confidence?: Record<string, number>;
  gaps?: any[];
  warnings?: Array<{ code: string; message: string; severity: "info" | "warning" | "error"; suggestion?: string }>;
};

type ScheduleResponse = {
  jobId: string;
  queue: string;
  delaySeconds: number;
};

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-end justify-between gap-3">
        <label className="text-xs font-medium text-slate-700">{label}</label>
        {hint ? <div className="text-[11px] text-slate-400">{hint}</div> : null}
      </div>
      {children}
    </div>
  );
}

function Notice({ tone, children }: { tone: "info" | "warn" | "error" | "ok"; children: React.ReactNode }) {
  const cls =
    tone === "ok"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : tone === "warn"
      ? "border-amber-200 bg-amber-50 text-amber-800"
      : tone === "error"
      ? "border-rose-200 bg-rose-50 text-rose-800"
      : "border-slate-200 bg-slate-50 text-slate-800";

  return <div className={cx("rounded-lg border p-3 text-xs", cls)}>{children}</div>;
}

export default function CallbackSchedulerPanel() {
  const [toNumber, setToNumber] = React.useState("");
  const [fromDid, setFromDid] = React.useState("");
  const [voiceAgentId, setVoiceAgentId] = React.useState("");
  const [delaySeconds, setDelaySeconds] = React.useState<number>(0);

  const [submitting, setSubmitting] = React.useState(false);
  const [jobId, setJobId] = React.useState<string | null>(null);
  const [msg, setMsg] = React.useState<{ tone: "info" | "warn" | "error" | "ok"; text: string } | null>(null);

  async function schedule() {
    setSubmitting(true);
    setMsg(null);

    try {
      const res = await fetch("/api/telephony/callback/schedule", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          toNumber,
          fromDid,
          voiceAgentId, // VoiceAgent.id
          delaySeconds,
          metadata: {},
        }),
      });

      const json = (await res.json()) as ApiEnvelope<ScheduleResponse>;

      if (!res.ok || !json.data?.jobId) {
        const w = json.warnings?.[0];
        setMsg({
          tone: "error",
          text: w?.message || "Failed to schedule callback.",
        });
        return;
      }

      setJobId(json.data.jobId);
      setMsg({
        tone: "ok",
        text: `Scheduled callback. Job ID: ${json.data.jobId} (queue: ${json.data.queue}, delay: ${json.data.delaySeconds}s)`,
      });
    } catch (e: any) {
      setMsg({ tone: "error", text: e?.message || "Failed to schedule callback." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="text-sm font-semibold text-slate-900">Schedule Callback</div>
            <div className="text-xs text-slate-500">
              Enqueue a callback job, then watch status update live via the outcome poller.
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setJobId(null);
              setMsg(null);
            }}
            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Reset
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field label="To Number" hint="E.164 recommended, e.g. +1767...">
            <input
              value={toNumber}
              onChange={(e) => setToNumber(e.target.value)}
              placeholder="+1767..."
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
            />
          </Field>

          <Field label="From DID" hint="the DID you originate from">
            <input
              value={fromDid}
              onChange={(e) => setFromDid(e.target.value)}
              placeholder="+1767..."
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
            />
          </Field>

          <Field label="VoiceAgent ID" hint="IMPORTANT: VoiceAgent.id (not Agent.id)">
            <input
              value={voiceAgentId}
              onChange={(e) => setVoiceAgentId(e.target.value)}
              placeholder="voiceAgentId"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
            />
          </Field>

          <Field label="Delay (seconds)" hint="0 = immediate">
            <input
              type="number"
              value={delaySeconds}
              onChange={(e) => setDelaySeconds(Number(e.target.value || 0))}
              min={0}
              max={86400}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
            />
          </Field>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            disabled={submitting}
            onClick={schedule}
            className={cx(
              "rounded-lg px-4 py-2 text-sm font-semibold text-white",
              submitting ? "bg-slate-400" : "bg-slate-900 hover:bg-slate-800"
            )}
          >
            {submitting ? "Scheduling..." : "Schedule Callback"}
          </button>

          <div className="text-xs text-slate-500">
            This creates a BullMQ job; your AMI listener will write outcome to Redis when it runs.
          </div>
        </div>

        {msg ? (
          <div className="mt-3">
            <Notice tone={msg.tone}>{msg.text}</Notice>
          </div>
        ) : null}
      </div>

      {jobId ? (
        <CallbackOutcomeWidget jobId={jobId} />
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-600">
          Once you schedule a job, the outcome widget will appear here and poll until hangup/final.
        </div>
      )}
    </div>
  );
}
