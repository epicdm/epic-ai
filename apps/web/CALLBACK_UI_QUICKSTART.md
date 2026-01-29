# Callback Scheduler & Outcome UI - Quick Start

Complete UI for scheduling callbacks and monitoring execution in real-time.

## 🚀 Quick Test (Scheduler UI - Recommended)

### Option A: Use the Web UI (Easiest)

1. **Start the dev server**
```bash
cd apps/web
pnpm dev
```

2. **Visit the scheduler page**
```
http://localhost:3000/telephony/callbacks
```

3. **Fill in the form:**
- **To Number:** `+17675551234` (E.164 format)
- **From DID:** `+17675559999` (your originating DID)
- **VoiceAgent ID:** `va_test_123` (VoiceAgent.id from database)
- **Delay (seconds):** `0` (immediate) or `60` (1 minute)

4. **Click "Schedule Callback"**

The page will:
- ✅ Create a BullMQ job
- ✅ Return a jobId
- ✅ Automatically render the CallbackOutcomeWidget
- ✅ Poll every 2.5 seconds for outcome updates
- ✅ Show real-time status: Waiting → Originate → Hangup → Final

### Option B: Use cURL (API Testing)

### 1. Start the dev server
```bash
cd apps/web
pnpm dev
```

### 2. Schedule callback via API
```bash
curl -X POST http://localhost:3000/api/telephony/callback/schedule \
  -H "Content-Type: application/json" \
  -d '{
    "toNumber": "+17675551234",
    "fromDid": "+17675559999",
    "voiceAgentId": "va_test_123",
    "delaySeconds": 0,
    "metadata": {}
  }'
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

### 3. View live outcome widget (standalone)
```
http://localhost:3000/telephony/callbacks/outcome?jobId=123
```

The widget will:
- ✅ Poll every 2.5 seconds
- ✅ Show status badges (Waiting → Originate → Hangup → Final)
- ✅ Display outcome fields, warnings, and gaps
- ✅ Auto-stop polling when hangup or final status reached

## 📦 Component Props

```tsx
<CallbackOutcomeWidget
  jobId="123"                  // Required: BullMQ job ID
  pollIntervalMs={2500}        // Optional: polling interval (default: 2500ms)
  stopWhenFinal={true}         // Optional: stop when final status (default: true)
  stopWhenHangup={true}        // Optional: stop after hangup (default: true)
  className="..."              // Optional: CSS class
/>
```

## 🎨 Status Badges

| Outcome State | Badge | Tone |
|---------------|-------|------|
| No data yet | "Waiting for outcome…" | Gray |
| Originate fired | "Originate submitted" | Blue |
| Hangup recorded | "Call ended (hangup)" | Yellow |
| Final: success | "Completed" | Green |
| Final: failed | "Final: failed" | Red |

## 📊 Confidence Scoring

- **1.0** - Final outcome recorded (complete)
- **0.9** - Hangup stage data present
- **0.6** - Originate response present
- **0.3** - Partial or minimal data

## 🔧 Integration Example

```tsx
"use client";

import { useState } from "react";
import CallbackOutcomeWidget from "@/app/(admin)/telephony/callbacks/ui/CallbackOutcomeWidget";

export function MyCallbackForm() {
  const [jobId, setJobId] = useState<string | null>(null);

  async function handleEnqueue() {
    const res = await fetch("/api/telephony/callback/enqueue", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        voiceAgentId: "va_123",
        sessionId: "s_123",
        caller: "+17675551234",
        callbackTimeIso: new Date(Date.now() + 60_000).toISOString(),
      }),
    });

    const { data } = await res.json();
    setJobId(data.jobId);
  }

  return (
    <div>
      <button onClick={handleEnqueue}>Schedule Callback</button>

      {jobId && (
        <div className="mt-4">
          <CallbackOutcomeWidget jobId={jobId} />
        </div>
      )}
    </div>
  );
}
```

## 🐛 Troubleshooting

### Widget shows "No outcome recorded yet"
1. Check callback job executed: `redis-cli hgetall "callback:job:<jobId>"`
2. Verify AMI listener running in workers: `tail -f apps/workers/logs/worker.log | grep ami-events`
3. Confirm Redis URL set: `echo $REDIS_URL` (in apps/web env)

### Widget shows "Failed to fetch"
1. Verify API endpoint: `curl http://localhost:3000/api/telephony/callback/outcome?jobId=123`
2. Check browser console for CORS or network errors
3. Confirm Next.js dev server is running

### Polling never stops
- Check `stopWhenFinal` and `stopWhenHangup` props
- Verify outcome has `final` field or `stage === "hangup"`
- Use "Stop" button to manually pause polling

## 📂 File Locations

- **Widget:** `apps/web/src/app/(admin)/telephony/callbacks/ui/CallbackOutcomeWidget.tsx`
- **Demo Page:** `apps/web/src/app/(admin)/telephony/callbacks/outcome/page.tsx`
- **API Endpoint:** `apps/web/src/app/api/telephony/callback/outcome/route.ts`
- **Documentation:** `apps/web/src/app/(admin)/telephony/callbacks/README.md`

## 🎯 What's Next?

Once you see the widget working:
1. Embed it in your voice agent testing page
2. Add it to callback management dashboard
3. Use it for debugging failed callbacks
4. Monitor retry attempts in real-time

The widget gives you **instant visibility** into callback execution without needing to check Redis or logs manually.
