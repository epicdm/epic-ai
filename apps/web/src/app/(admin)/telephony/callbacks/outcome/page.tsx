import CallbackOutcomeWidget from "../ui/CallbackOutcomeWidget";

export default async function CallbackOutcomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const jobId = typeof sp.jobId === "string" ? sp.jobId : "";

  return (
    <div className="p-6">
      <div className="mb-4">
        <div className="text-lg font-semibold text-slate-900">Callback Outcome</div>
        <div className="text-sm text-slate-600">
          Pass <span className="font-mono">?jobId=...</span> to view live polling status.
        </div>
      </div>

      {jobId ? (
        <CallbackOutcomeWidget jobId={jobId} />
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
          Missing jobId. Example:{" "}
          <span className="font-mono">/telephony/callbacks/outcome?jobId=123</span>
        </div>
      )}
    </div>
  );
}
