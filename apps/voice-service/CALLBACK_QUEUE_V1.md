# Callback Queue v1 - Implementation Guide

## Overview

Callback Queue v1 enables scheduled callbacks via BullMQ job queue. When a caller selects a callback window during a DTMF flow, a job is scheduled in Redis for later execution.

**Status:** ✅ **COMPLETE**

---

## Architecture

```
Voice Flow (Python)
  ↓ callback.enqueue tool
Web API (/api/telephony/callback/enqueue)
  ↓ BullMQ job with delay
Redis Queue (callback)
  ↓ Scheduled execution
Background Worker (TypeScript)
  ↓ callback.requested processor
v2: Trigger outbound call via Asterisk/LiveKit
```

---

## Components

### 1. **Shared Types** (`packages/shared/src/agent-os/callback/`)

**`types.ts`** - Zod schema for callback payload validation:

```typescript
export const CallbackRequestedPayloadSchema = z.object({
  voiceAgentId: z.string().min(1),
  sessionId: z.string().min(1),
  callId: z.string().optional(),
  did: z.string().optional(),
  caller: z.string().min(1),
  callbackWindow: z.string().optional(),
  callbackLabel: z.string().optional(),
  callbackTimeIso: z.string().optional(),
  timezone: z.string().optional(),
  answers: z.record(z.string(), z.string()).optional(),
  leadId: z.string().optional(),
});
```

**Purpose:** Ensures type-safe payload across all services (voice, web, workers).

---

### 2. **BullMQ Queue** (`apps/workers/src/queues/callback.ts`)

```typescript
import { Queue } from "bullmq";
import { redis } from "../lib/redis";

export const CALLBACK_QUEUE_NAME = "callback";

export const callbackQueue = new Queue(CALLBACK_QUEUE_NAME, {
  connection: redis,
});
```

**Purpose:** Defines the BullMQ queue for callback jobs in the workers service.

---

### 3. **Job Processor** (`apps/workers/src/processors/callbackRequested.ts`)

```typescript
export async function callbackRequestedProcessor(job: Job) {
  const payload = CallbackRequestedPayloadSchema.parse(job.data);

  console.log("[callback.requested] running", {
    jobId: job.id,
    voiceAgentId: payload.voiceAgentId,
    caller: payload.caller,
    callbackTimeIso: payload.callbackTimeIso,
  });

  // TODO v2: trigger outbound call, create CRM task, send SMS

  return { ok: true };
}
```

**Purpose:** Processes callback jobs when they execute. V1 logs only. V2 will trigger outbound calls.

---

### 4. **Worker Registration** (`apps/workers/src/index.ts`)

```typescript
async function callbackRouter(job: any): Promise<unknown> {
  const jobName = job.name;

  switch (jobName) {
    case "callback.requested":
      return callbackRequestedProcessor(job);
    default:
      logger.warn(COMPONENT, `Unknown callback job name: ${jobName}`);
      throw new Error(`Unknown job name: ${jobName}`);
  }
}

// In main():
const callbackWorker = createWorker(
  CALLBACK_QUEUE_NAME,
  callbackRouter
);
workers.push(callbackWorker);
```

**Purpose:** Registers the callback worker to process jobs from the callback queue.

---

### 5. **Web API Route** (`apps/web/src/app/api/telephony/callback/enqueue/route.ts`)

```typescript
export async function POST(request: NextRequest) {
  const body = await request.json();
  const payload = CallbackRequestedPayloadSchema.parse(body);

  // Compute delay from callbackTimeIso
  let delay = 0;
  if (payload.callbackTimeIso) {
    const targetTime = new Date(payload.callbackTimeIso).getTime();
    const now = Date.now();
    delay = Math.max(0, targetTime - now);
  }

  // Add job to BullMQ with delay
  const job = await callbackQueue.add(
    "callback.requested",
    payload,
    { delay, attempts: 3, backoff: { type: "exponential", delay: 2000 } }
  );

  return NextResponse.json({
    ok: true,
    jobId: job.id,
    scheduledFor: payload.callbackTimeIso || new Date().toISOString(),
    delayMs: delay,
  });
}
```

**Purpose:** HTTP endpoint for enqueueing callback jobs. Computes delay and schedules in BullMQ.

---

### 6. **Redis Connection (Web)** (`apps/web/src/lib/redis.ts`)

```typescript
import Redis from 'ioredis';

export const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null, // Required for BullMQ
  enableReadyCheck: false,
  lazyConnect: true,
});
```

**Purpose:** Shared Redis connection for BullMQ queues in the web app.

---

### 7. **Queue Client (Web)** (`apps/web/src/lib/queues/callback.ts`)

```typescript
import { Queue } from "bullmq";
import { redis } from "../redis";

export const callbackQueue = new Queue("callback", {
  connection: redis,
});
```

**Purpose:** Queue instance for adding jobs from web API routes.

---

### 8. **Voice Tool Adapter** (`apps/voice-service/tools/callback_tool.py`)

```python
def enqueue_callback(args: Dict[str, Any]) -> Dict[str, Any]:
    """
    Enqueues a callback job via the Epic AI web app API.
    """
    payload = {
        "voiceAgentId": args.get("voiceAgentId"),
        "sessionId": args.get("sessionId"),
        "caller": args.get("caller"),
        "callbackTimeIso": args.get("callbackTimeIso"),
        "callbackWindow": args.get("callbackWindow"),
        "callbackLabel": args.get("callbackLabel"),
        # ... other fields
    }

    response = requests.post(
        f"{EPIC_WEB_BASE_URL}/api/telephony/callback/enqueue",
        json=payload,
        headers=headers,
        timeout=CALLBACK_ENQUEUE_TIMEOUT
    )

    if response.status_code == 200:
        data = response.json()
        return {
            "ok": True,
            "jobId": data.get("jobId"),
            "scheduledFor": data.get("scheduledFor"),
        }
    else:
        return {"ok": False, "error": "..."}
```

**Purpose:** Python adapter that calls the web API to enqueue callback jobs from voice flows.

---

### 9. **Tool Registration** (`apps/voice-service/tool_runtime.py`)

```python
from tools.callback_tool import enqueue_callback

TOOL_ADAPTERS = {
    # ... other tools
    "callback.enqueue": enqueue_callback,
}
```

**Purpose:** Registers callback.enqueue in the Tool Node Runtime.

---

### 10. **Flow Integration** (`apps/voice-service/flows/sales_qualifier_v1.json`)

```json
{
  "enqueue_callback": {
    "type": "tool",
    "tool_key": "callback.enqueue",
    "input": {
      "voiceAgentId": "{{session.voiceAgentId}}",
      "sessionId": "{{session.sessionId}}",
      "caller": "{{session.caller | digits}}",
      "callbackTimeIso": "{{session.callback_time_iso}}",
      "callbackWindow": "{{session.callback_window}}",
      "callbackLabel": "{{session.callback_label}}",
      "leadId": "{{tool.magnus.lead.leadId}}",
      "answers": {
        "intent": "{{session.q_intent}}",
        "budget": "{{session.q_budget}}",
        "timeframe": "{{session.q_timeframe}}",
        "area": "{{session.q_area}}"
      }
    },
    "save_output_as": "tool.callback.job",
    "on_success": "confirm_callback",
    "on_error": "confirm_callback"
  }
}
```

**Purpose:** Flow node that calls callback.enqueue tool with session data.

---

### 11. **Tool Configuration** (`apps/voice-service/configs/sales_qualifier_tools_v1.json`)

```json
{
  "enabled_tools": [
    {
      "id": "callback.enqueue",
      "name": "callback.enqueue",
      "enabled": true,
      "permissions": {
        "read": false,
        "write": true,
        "delete": false,
        "requires_confirmation": false
      }
    }
  ]
}
```

**Purpose:** Enables callback.enqueue in the tool allowlist for the flow.

---

## Environment Variables

### Voice Service (`.env`)

```bash
# Epic AI web app base URL (for callback enqueue API)
EPIC_WEB_BASE_URL=http://localhost:3000

# API key for authentication (optional)
EPIC_RUNTIME_API_KEY=your-runtime-api-key

# Timeout for callback enqueue API calls (seconds)
CALLBACK_ENQUEUE_TIMEOUT=5.0
```

### Web App (`.env`)

```bash
# Redis connection for BullMQ queues
REDIS_URL=redis://localhost:6379
```

### Workers (`.env`)

```bash
# Redis connection for BullMQ workers
REDIS_URL=redis://localhost:6379
```

---

## Flow Execution Example

1. **Caller selects callback window** (DTMF flow)
   - Presses "2" for "later today"
   - Sets `session.callback_window = "today"`

2. **Set node computes callback_time_iso**
   - Calls `compute_callback_time("today", "America/Dominica")`
   - Sets `session.callback_time_iso = "2026-01-27T14:00:00-04:00"`

3. **Lead created** (magnus.createLead tool)
   - Returns `leadId = "lead_abc123"`
   - Saved to `tool.magnus.lead.leadId`

4. **Callback enqueued** (callback.enqueue tool)
   - Calls `/api/telephony/callback/enqueue`
   - Payload includes caller, callbackTimeIso, leadId, answers
   - Web API computes delay: `targetTime - now = 7200000 ms (2 hours)`
   - Adds BullMQ job with 2-hour delay
   - Returns `jobId = "job_xyz789"`

5. **Job executes after delay**
   - BullMQ waits 2 hours
   - Worker calls `callbackRequestedProcessor(job)`
   - V1: Logs job details
   - V2: Triggers outbound call via Asterisk/LiveKit

---

## Testing

### 1. Test API Endpoint Directly

```bash
curl -X POST http://localhost:3000/api/telephony/callback/enqueue \
  -H "Content-Type: application/json" \
  -d '{
    "voiceAgentId": "agent_123",
    "sessionId": "session_456",
    "caller": "+17671234567",
    "callbackTimeIso": "2026-01-27T14:00:00-04:00",
    "callbackWindow": "today",
    "callbackLabel": "Later today",
    "leadId": "lead_abc123"
  }'
```

**Expected Response:**

```json
{
  "ok": true,
  "jobId": "1234567890",
  "scheduledFor": "2026-01-27T14:00:00-04:00",
  "delayMs": 7200000
}
```

---

### 2. Test via Voice Flow

1. Start voice service: `cd apps/voice-service && python3 main.py`
2. Start workers: `cd apps/workers && pnpm dev`
3. Call DID that routes to sales_qualifier flow
4. Navigate DTMF: 1 (sales) → answer questions → 2 (callback: later today)
5. Check logs:
   - Voice service logs callback.enqueue tool execution
   - Web API logs job scheduling
   - Workers logs job execution (after delay)

---

### 3. Monitor Queue

**Check job counts:**

```bash
redis-cli
> HGETALL "bull:callback:counts"
```

**List pending jobs:**

```bash
> LRANGE "bull:callback:wait" 0 -1
```

**Check job details:**

```bash
> HGETALL "bull:callback:1234567890"
```

---

## V2 Roadmap

**Current (v1):** Job execution only logs to console

**Next (v2):** Trigger actual outbound calls

### Option A: Asterisk AMI/ARI

```typescript
// In callbackRequestedProcessor
await asteriskAMI.originateCall({
  channel: `PJSIP/${payload.caller}@trunk`,
  context: "outbound-callback",
  exten: payload.voiceAgentId,
  priority: 1,
  callerId: payload.did,
  variables: {
    VOICE_AGENT_ID: payload.voiceAgentId,
    SESSION_ID: payload.sessionId,
    LEAD_ID: payload.leadId,
  },
});
```

### Option B: LiveKit Outbound

```typescript
await livekit.createRoom({
  name: `callback-${job.id}`,
  emptyTimeout: 300,
});

await livekit.createEgress({
  roomName: `callback-${job.id}`,
  sipUri: `sip:${payload.caller}@trunk.livekit.cloud`,
});
```

### Option C: CRM Task Creation

```typescript
await magnus.createTask({
  leadId: payload.leadId,
  type: "callback",
  scheduledFor: payload.callbackTimeIso,
  assignee: "sales_rep_001",
  notes: `Callback requested: ${payload.callbackLabel}`,
});
```

---

## Troubleshooting

### Job not executing

1. Check Redis connection: `redis-cli PING`
2. Check worker is running: `ps aux | grep workers`
3. Check queue health: `curl http://localhost:3001/health` (workers health endpoint)

### Job executes immediately (delay = 0)

- `callbackTimeIso` is in the past
- Check `compute_callback_time()` logic
- Verify timezone settings

### Job fails with ZodError

- Payload missing required fields (voiceAgentId, sessionId, caller)
- Check tool input in flow JSON

---

## Summary

**Callback Queue v1 is COMPLETE:**

✅ Shared types with Zod validation
✅ BullMQ queue definition
✅ Job processor (v1 logging)
✅ Worker registration
✅ Web API route with delay computation
✅ Redis connection for web app
✅ Queue client for web app
✅ Python tool adapter
✅ Tool registration in runtime
✅ Flow integration (sales_qualifier)
✅ Tool configuration (enabled_tools)

**Next step:** Implement v2 outbound call triggering (Asterisk AMI/LiveKit/CRM).
