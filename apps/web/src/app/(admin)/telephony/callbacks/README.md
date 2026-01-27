# Callback Scheduler & Outcome UI

Complete UI for scheduling callbacks and monitoring their execution in real-time.

## Overview

This module provides two main components:

1. **CallbackSchedulerPanel** - Form to schedule callbacks + auto-renders outcome widget
2. **CallbackOutcomeWidget** - Real-time polling widget for callback outcomes

**Main Page:** `/telephony/callbacks` - Full scheduler with form + outcome widget
**Outcome Viewer:** `/telephony/callbacks/outcome?jobId=<id>` - Standalone outcome viewer

## Files

### Scheduler Components

#### 1. CallbackSchedulerPanel.tsx
**Location:** `ui/CallbackSchedulerPanel.tsx`

Form component that:
- Collects callback parameters (toNumber, fromDid, voiceAgentId, delaySeconds)
- Posts to `/api/telephony/callback/schedule` API
- Receives jobId from BullMQ
- Automatically renders CallbackOutcomeWidget with the jobId
- Shows success/error messages with envelope format

**Usage:**
```tsx
import CallbackSchedulerPanel from "@/app/(admin)/telephony/callbacks/ui/CallbackSchedulerPanel";

export function MyPage() {
  return <CallbackSchedulerPanel />;
}
```

#### 2. Schedule API Route
**Location:** `apps/web/src/app/api/telephony/callback/schedule/route.ts`

**Endpoint:** `POST /api/telephony/callback/schedule`

**Request Body:**
```json
{
  "toNumber": "+17675551234",
  "fromDid": "+17675559999",
  "voiceAgentId": "va_123",
  "delaySeconds": 0,
  "metadata": {}
}
```

**Response:**
```json
{
  "data": {
    "jobId": "123",
    "queue": "telephony-callback",
    "delaySeconds": 0
  },
  "confidence": { "schedule": 1 },
  "gaps": [],
  "warnings": []
}
```

### Outcome Components

### 1. CallbackOutcomeWidget.tsx
**Location:** `ui/CallbackOutcomeWidget.tsx`

Self-contained React component that polls `/api/telephony/callback/outcome` and displays:
- Call status badges (Waiting → Originate → Hangup → Final)
- Core outcome fields (stage, response, uniqueid, hangup cause)
- Warnings and gaps from the envelope
- Confidence scoring
- Retry attempt tracking
- Live polling controls (Start/Stop/Refresh)

**Props:**
```typescript
{
  jobId: string;              // BullMQ job ID from callback enqueue
  pollIntervalMs?: number;    // Default: 2500ms (2.5 seconds)
  stopWhenFinal?: boolean;    // Default: true (stops polling when final status reached)
  stopWhenHangup?: boolean;   // Default: true (stops polling after hangup recorded)
  className?: string;         // Optional CSS class
}
```

### 2. Demo Page
**Location:** `outcome/page.tsx`
**URL:** `/telephony/callbacks/outcome?jobId=<jobId>`

Simple demo page that mounts the widget with query parameter support.

## Usage

### Standalone Page
```
/telephony/callbacks/outcome?jobId=123
```

### Embed in Your Flow
After enqueuing a callback, render the widget:

```tsx
import CallbackOutcomeWidget from "@/app/(admin)/telephony/callbacks/ui/CallbackOutcomeWidget";

export function MyCallbackForm() {
  const [jobId, setJobId] = useState<string | null>(null);

  async function handleEnqueue() {
    const res = await fetch("/api/telephony/callback/enqueue", {
      method: "POST",
      body: JSON.stringify({ ... }),
    });
    const { data } = await res.json();
    setJobId(data.jobId);
  }

  return (
    <div>
      <button onClick={handleEnqueue}>Enqueue Callback</button>

      {jobId && (
        <div className="mt-4">
          <CallbackOutcomeWidget jobId={jobId} />
        </div>
      )}
    </div>
  );
}
```

## Status Display

The widget automatically derives status from outcome data:

| Outcome State | Badge | Tone |
|---------------|-------|------|
| No data yet | "Waiting for outcome…" | Gray |
| Originate fired | "Originate submitted" | Blue |
| Hangup recorded | "Call ended (hangup)" | Yellow |
| Final: success/answered | "Completed" | Green |
| Final: failed/timeout | "Final: failed" | Red |

## Confidence Scoring

Displayed as `confidence(outcome)`:
- **1.0** - Final outcome recorded (complete)
- **0.9** - Hangup stage data present
- **0.6** - Originate response present
- **0.3** - Partial or minimal data

## Auto-Stop Polling

By default, polling stops when:
- `final` field is set (e.g., "failed", "success")
- `stage === "hangup"` is recorded

To continue polling indefinitely:
```tsx
<CallbackOutcomeWidget
  jobId={jobId}
  stopWhenFinal={false}
  stopWhenHangup={false}
/>
```

## Integration Points

### After Callback Enqueue
**File:** `apps/web/src/app/api/telephony/callback/enqueue/route.ts`

```typescript
const job = await callbackQueue.add("callback.requested", payload, { ... });

return NextResponse.json({
  data: {
    jobId: job.id,  // ← Pass this to CallbackOutcomeWidget
    scheduledInMs: delay,
  },
  ...
});
```

### In Dashboard or Admin Panel
Embed the widget wherever you need real-time visibility:
- Voice agent testing page
- Callback management dashboard
- Customer service admin panel
- Debugging tools

## Example: Full Flow

```tsx
"use client";

import { useState } from "react";
import CallbackOutcomeWidget from "@/app/(admin)/telephony/callbacks/ui/CallbackOutcomeWidget";

export function CallbackTester() {
  const [jobId, setJobId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function scheduleCallback() {
    setLoading(true);
    try {
      const res = await fetch("/api/telephony/callback/enqueue", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          voiceAgentId: "va_test_123",
          sessionId: "s_test_123",
          caller: "+17675551234",
          callbackTimeIso: new Date(Date.now() + 60_000).toISOString(), // 1 min from now
        }),
      });

      const { data } = await res.json();
      setJobId(data.jobId);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <button
          onClick={scheduleCallback}
          disabled={loading}
          className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          {loading ? "Scheduling..." : "Schedule Test Callback"}
        </button>
      </div>

      {jobId && (
        <CallbackOutcomeWidget
          jobId={jobId}
          pollIntervalMs={2000}
        />
      )}
    </div>
  );
}
```

## Technical Notes

- **Polling Strategy:** Uses `setInterval` with automatic cleanup
- **Cache Control:** All fetches use `cache: "no-store"` for fresh data
- **Error Handling:** Displays fetch errors in the UI
- **Memory Safety:** Clears intervals on unmount
- **Type Safety:** Full TypeScript types for outcome envelope

## Debugging

If the widget shows "No outcome recorded yet":
1. Check that the callback job has executed (check BullMQ dashboard or Redis)
2. Verify AMI event listener is running in workers (check logs)
3. Confirm Redis key exists: `redis-cli hgetall "callback:job:<jobId>"`
4. Check that `REDIS_URL` env var is set in apps/web

## Future Enhancements

Potential additions (not implemented yet):
- Real-time WebSocket updates (instead of polling)
- Audio playback of recorded calls
- Call transcript display
- Outcome history timeline
- Export outcome data (JSON/CSV)
- Bulk callback monitoring (table view)
