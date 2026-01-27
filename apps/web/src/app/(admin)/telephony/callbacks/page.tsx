import CallbackSchedulerPanel from "./ui/CallbackSchedulerPanel";

export default function CallbacksPage() {
  return (
    <div className="p-6">
      <div className="mb-4">
        <div className="text-lg font-semibold text-slate-900">Telephony Callbacks</div>
        <div className="text-sm text-slate-600">
          Schedule a callback job, then monitor its execution and final outcome.
        </div>
      </div>

      <CallbackSchedulerPanel />
    </div>
  );
}
