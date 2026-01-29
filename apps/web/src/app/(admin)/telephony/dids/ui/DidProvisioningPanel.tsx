"use client";

import { useMemo, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

type DidRow = {
  did: string;
  agentId: string;
  isActive: boolean;
  updatedAt?: string | null;
  agentStatus?: string | null;
  agentName?: string | null;
};

type LiveAgent = { id: string; name: string; status: string };

const FormSchema = z.object({
  did: z.string().min(3, "Enter a DID").max(32),
  agentId: z.string().min(1, "Select an agent"),
  action: z.enum(["activate", "deactivate"]).default("activate"),
  note: z.string().max(500).optional(),
});

type FormValues = z.infer<typeof FormSchema>;

function normalizeDid(input: string) {
  const trimmed = input.trim();
  const plus = trimmed.startsWith("+") ? "+" : "";
  const digits = trimmed.replace(/[^\d]/g, "");
  return `${plus}${digits}`;
}

async function provisionDid(payload: FormValues) {
  const res = await fetch("/api/telephony/provision-did", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      did: normalizeDid(payload.did),
      agentId: payload.agentId,
      action: payload.action, // activate or deactivate
    }),
  });

  const json = await res.json();
  if (!res.ok || json?.error) {
    const msg = json?.error || json?.message || "Provision failed";
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }

  return json as {
    id?: string;
    phoneNumber?: string;
    agentId?: string;
    isActive?: boolean;
    created?: boolean;
  };
}

export default function DidProvisioningPanel({
  initialRoutes,
  liveAgents,
}: {
  initialRoutes: DidRow[];
  liveAgents: LiveAgent[];
}) {
  const [routes, setRoutes] = useState<DidRow[]>(initialRoutes);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{
    type: "ok" | "err";
    msg: string;
  } | null>(null);

  const agentOptions = useMemo(() => liveAgents, [liveAgents]);

  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: { did: "", agentId: "", action: "activate", note: "" },
  });

  async function onSubmit(values: FormValues) {
    setToast(null);
    setBusy(true);
    try {
      const result = await provisionDid(values);
      const did = result.phoneNumber || normalizeDid(values.did);
      const agentId = result.agentId || values.agentId;

      setRoutes((prev) => {
        const idx = prev.findIndex((r) => r.did === did);
        const agentMeta = liveAgents.find((a) => a.id === agentId);
        const row: DidRow = {
          did,
          agentId,
          isActive: result.isActive ?? true,
          updatedAt: new Date().toISOString(),
          agentName: agentMeta?.name ?? null,
          agentStatus: agentMeta?.status ?? null,
        };

        if (idx === -1) return [row, ...prev];
        const copy = [...prev];
        copy[idx] = { ...copy[idx], ...row };
        return copy;
      });

      setToast({
        type: "ok",
        msg: `DID ${did} ${result.created ? "created" : "updated"} → ACTIVE`,
      });
      form.reset({ did: "", agentId: "", action: "activate", note: "" });
    } catch (e: any) {
      setToast({ type: "err", msg: e?.message || "Provision failed" });
    } finally {
      setBusy(false);
    }
  }

  async function quickDeactivate(did: string, agentId: string) {
    setToast(null);
    setBusy(true);
    try {
      const result = await provisionDid({
        did,
        agentId,
        action: "deactivate",
      });
      const updatedDid = result.phoneNumber || did;

      setRoutes((prev) =>
        prev.map((r) =>
          r.did === updatedDid
            ? { ...r, isActive: false, updatedAt: new Date().toISOString() }
            : r
        )
      );

      setToast({ type: "ok", msg: `DID ${updatedDid} deactivated.` });
    } catch (e: any) {
      setToast({ type: "err", msg: e?.message || "Deactivate failed" });
    } finally {
      setBusy(false);
    }
  }

  async function quickActivate(did: string, agentId: string) {
    setToast(null);
    setBusy(true);
    try {
      const result = await provisionDid({ did, agentId, action: "activate" });
      const updatedDid = result.phoneNumber || did;

      setRoutes((prev) =>
        prev.map((r) =>
          r.did === updatedDid
            ? { ...r, isActive: true, updatedAt: new Date().toISOString() }
            : r
        )
      );

      setToast({ type: "ok", msg: `DID ${updatedDid} activated.` });
    } catch (e: any) {
      setToast({ type: "err", msg: e?.message || "Activate failed" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className={`rounded-md border p-3 text-sm ${
            toast.type === "ok"
              ? "border-green-300 bg-green-50"
              : "border-red-300 bg-red-50"
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Form */}
      <div className="rounded-lg border p-4">
        <div className="font-medium mb-2">Provision DID Mapping</div>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end"
        >
          <div className="md:col-span-3">
            <label className="text-xs font-medium">DID</label>
            <input
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              placeholder="+1767XXXXXXX"
              {...form.register("did")}
            />
            {form.formState.errors.did && (
              <p className="text-xs text-red-600 mt-1">
                {form.formState.errors.did.message}
              </p>
            )}
          </div>

          <div className="md:col-span-4">
            <label className="text-xs font-medium">Live Agent</label>
            <select
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              {...form.register("agentId")}
            >
              <option value="">Select agent...</option>
              {agentOptions.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.status})
                </option>
              ))}
            </select>
            {form.formState.errors.agentId && (
              <p className="text-xs text-red-600 mt-1">
                {form.formState.errors.agentId.message}
              </p>
            )}
          </div>

          <div className="md:col-span-4">
            <label className="text-xs font-medium">Note (optional)</label>
            <input
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              {...form.register("note")}
              placeholder="Optional note..."
            />
          </div>

          <div className="md:col-span-1">
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
            >
              {busy ? "..." : "Save"}
            </button>
          </div>
        </form>

        <p className="text-xs text-muted-foreground mt-3">
          Tip: You can paste DIDs with dashes/spaces; we normalize to digits (+
          optional leading +).
        </p>
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-hidden">
        <div className="p-4 border-b">
          <div className="font-medium">Current DID Routes</div>
          <div className="text-xs text-muted-foreground">
            These routes are used by /api/telephony/resolve-did for live
            inbound.
          </div>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="p-3">DID</th>
                <th className="p-3">Agent</th>
                <th className="p-3">Status</th>
                <th className="p-3">Active</th>
                <th className="p-3">Updated</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {routes.length === 0 ? (
                <tr>
                  <td className="p-3 text-muted-foreground" colSpan={6}>
                    No DID routes found.
                  </td>
                </tr>
              ) : (
                routes.map((r) => (
                  <tr key={r.did} className="border-t">
                    <td className="p-3 font-mono">{r.did}</td>
                    <td className="p-3">
                      <div className="font-medium">
                        {r.agentName ?? r.agentId}
                      </div>
                      {r.agentName && (
                        <div className="text-xs text-muted-foreground font-mono">
                          {r.agentId}
                        </div>
                      )}
                    </td>
                    <td className="p-3">{r.agentStatus ?? "—"}</td>
                    <td className="p-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs ${
                          r.isActive ? "bg-green-100" : "bg-gray-100"
                        }`}
                      >
                        {r.isActive ? "ACTIVE" : "INACTIVE"}
                      </span>
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">
                      {r.updatedAt
                        ? new Date(r.updatedAt).toLocaleString()
                        : "—"}
                    </td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        {r.isActive ? (
                          <button
                            disabled={busy}
                            className="rounded-md border px-2 py-1 text-xs hover:bg-muted disabled:opacity-50"
                            onClick={() => quickDeactivate(r.did, r.agentId)}
                          >
                            Deactivate
                          </button>
                        ) : (
                          <button
                            disabled={busy}
                            className="rounded-md border px-2 py-1 text-xs hover:bg-muted disabled:opacity-50"
                            onClick={() => quickActivate(r.did, r.agentId)}
                          >
                            Activate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footnote */}
      <div className="text-xs text-muted-foreground">
        If a call hits an unmapped DID or a non-live agent, Inbound Call Guard
        will fail-closed and route to fallback.
      </div>
    </div>
  );
}
