"use client";

import * as React from "react";

type WarningItem = {
  code: string;
  message: string;
  severity: "info" | "warning" | "error";
};

type ApiEnvelope<T> = {
  data: T | null;
  warnings?: WarningItem[];
  gaps?: any[];
  confidence?: any;
  error?: any;
};

export type HandoffTarget = {
  id: string;
  label: string;
  description?: string;
  context: string;
  exten: string;
  priority: number;
  enabled: boolean;
  tags: string[];
};

export type GovernanceConfig = {
  handoff?: {
    enabled?: boolean;
    default_handoff_target_id?: string;
    handoff_targets?: HandoffTarget[];
  };
  // other governance fields exist but we don't need them here
  [k: string]: any;
};

function uid(prefix = "t") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function HandoffTargetPicker({ agentId }: { agentId: string }) {
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [env, setEnv] = React.useState<ApiEnvelope<GovernanceConfig> | null>(null);

  const [handoffEnabled, setHandoffEnabled] = React.useState(true);
  const [defaultId, setDefaultId] = React.useState<string>("");
  const [targets, setTargets] = React.useState<HandoffTarget[]>([]);

  const warnings = env?.warnings ?? [];

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/agent-os/agents/${agentId}/governance`, {
        cache: "no-store",
      });
      const json = (await res.json()) as ApiEnvelope<GovernanceConfig>;
      setEnv(json);

      const h = json.data?.handoff ?? {};
      setHandoffEnabled(h.enabled ?? true);
      setDefaultId(h.default_handoff_target_id ?? "");
      setTargets(
        (h.handoff_targets ?? []).map((t) => ({
          id: t.id,
          label: t.label,
          description: t.description,
          context: t.context,
          exten: t.exten ?? "1",
          priority: t.priority ?? 1,
          enabled: t.enabled ?? true,
          tags: Array.isArray(t.tags) ? t.tags : [],
        }))
      );
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  React.useEffect(() => {
    load();
  }, [load]);

  async function save() {
    setSaving(true);
    try {
      const patch: GovernanceConfig = {
        ...(env?.data ?? {}),
        handoff: {
          enabled: handoffEnabled,
          default_handoff_target_id: defaultId || undefined,
          handoff_targets: targets,
        },
      };

      const res = await fetch(`/api/agent-os/agents/${agentId}/governance`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });

      const json = (await res.json()) as ApiEnvelope<GovernanceConfig>;
      setEnv(json);

      // refresh normalized values from server response
      const h = json.data?.handoff ?? {};
      setHandoffEnabled(h.enabled ?? true);
      setDefaultId(h.default_handoff_target_id ?? "");
      setTargets((h.handoff_targets ?? []) as any);
    } finally {
      setSaving(false);
    }
  }

  function addTarget() {
    const id = uid("handoff");
    setTargets((t) => [
      ...t,
      {
        id,
        label: "New Target",
        description: "",
        context: "sales_queue",
        exten: "1",
        priority: 1,
        enabled: true,
        tags: [],
      },
    ]);
    if (!defaultId) setDefaultId(id);
  }

  function removeTarget(id: string) {
    setTargets((t) => t.filter((x) => x.id !== id));
    if (defaultId === id) setDefaultId("");
  }

  function updateTarget(id: string, patch: Partial<HandoffTarget>) {
    setTargets((t) => t.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }

  return (
    <div className="rounded-xl border border-border p-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-lg font-semibold">Human Handoff Targets</div>
          <div className="text-sm text-muted-foreground">
            Configure where live calls are transferred when the agent escalates.
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="h-9 rounded-md border border-border px-3 text-sm hover:bg-muted"
            disabled={loading}
          >
            {loading ? "Loading..." : "Reload"}
          </button>
          <button
            onClick={save}
            className="h-9 rounded-md bg-primary px-3 text-sm text-primary-foreground hover:opacity-90"
            disabled={saving || loading}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {warnings.length > 0 && (
        <div className="space-y-2">
          {warnings.map((w, idx) => (
            <div key={idx} className="rounded-lg border border-border p-3">
              <div className="text-sm font-medium">{w.code}</div>
              <div className="text-sm text-muted-foreground">{w.message}</div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between rounded-lg border border-border p-3">
        <div className="space-y-1">
          <div className="text-sm font-medium">Enable Handoff</div>
          <div className="text-xs text-muted-foreground">
            If disabled, handoff nodes will fail-safe and stop the agent without transferring.
          </div>
        </div>
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={handoffEnabled}
            onChange={(e) => setHandoffEnabled(e.target.checked)}
            className="h-4 w-4"
          />
          <span className="text-sm">{handoffEnabled ? "Enabled" : "Disabled"}</span>
        </label>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="text-sm font-medium">Default Target</div>
          <div className="text-xs text-muted-foreground">
            Used when a flow handoff node does not specify a target.
          </div>
        </div>
        <select
          className="h-9 w-[280px] rounded-md border border-border bg-background px-3 text-sm"
          value={defaultId}
          onChange={(e) => setDefaultId(e.target.value)}
        >
          <option value="">(none)</option>
          {targets
            .filter((t) => t.enabled)
            .map((t) => (
              <option key={t.id} value={t.id}>
                {t.label} — {t.context}/{t.exten}
              </option>
            ))}
        </select>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">Targets</div>
        <button
          onClick={addTarget}
          className="h-9 rounded-md border border-border px-3 text-sm hover:bg-muted"
        >
          + Add Target
        </button>
      </div>

      <div className="space-y-3">
        {targets.length === 0 ? (
          <div className="rounded-lg border border-border p-4 text-sm text-muted-foreground">
            No targets configured. Add at least one target like <code>sales_queue/1</code>.
          </div>
        ) : (
          targets.map((t) => (
            <div key={t.id} className="rounded-lg border border-border p-3 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold">{t.label}</div>
                <div className="flex items-center gap-2">
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={t.enabled}
                      onChange={(e) => updateTarget(t.id, { enabled: e.target.checked })}
                      className="h-4 w-4"
                    />
                    Enabled
                  </label>
                  <button
                    onClick={() => removeTarget(t.id)}
                    className="h-8 rounded-md border border-border px-2 text-xs hover:bg-muted"
                  >
                    Remove
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">ID</div>
                  <input
                    value={t.id}
                    onChange={(e) => updateTarget(t.id, { id: e.target.value })}
                    className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Label</div>
                  <input
                    value={t.label}
                    onChange={(e) => updateTarget(t.id, { label: e.target.value })}
                    className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
                  />
                </div>

                <div className="space-y-1 md:col-span-2">
                  <div className="text-xs text-muted-foreground">Description</div>
                  <input
                    value={t.description ?? ""}
                    onChange={(e) => updateTarget(t.id, { description: e.target.value })}
                    className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Context</div>
                  <input
                    value={t.context}
                    onChange={(e) => updateTarget(t.id, { context: e.target.value })}
                    className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
                    placeholder="sales_queue"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Exten</div>
                    <input
                      value={t.exten}
                      onChange={(e) => updateTarget(t.id, { exten: e.target.value })}
                      className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
                      placeholder="1"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Priority</div>
                    <input
                      type="number"
                      min={1}
                      value={t.priority}
                      onChange={(e) => updateTarget(t.id, { priority: Number(e.target.value) })}
                      className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1 md:col-span-2">
                  <div className="text-xs text-muted-foreground">Tags (comma separated)</div>
                  <input
                    value={t.tags.join(", ")}
                    onChange={(e) =>
                      updateTarget(t.id, {
                        tags: e.target.value
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean),
                      })
                    }
                    className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
                    placeholder="sales, support, vip"
                  />
                </div>
              </div>

              <div className="text-xs text-muted-foreground">
                Dialplan target: <code>{t.context}/{t.exten},{t.priority}</code>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="text-xs text-muted-foreground">
        Runtime behavior: if a flow node handoff has no explicit target, we use the default target ID above.
      </div>
    </div>
  );
}
