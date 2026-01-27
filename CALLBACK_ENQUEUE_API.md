# Callback Enqueue API v1

Simple API endpoint to create BullMQ jobs for outbound callbacks.

## Overview

This endpoint creates a job in the `telephony-callback` BullMQ queue that will be picked up by the `originate-callback` worker.

## Endpoint

```
POST /api/telephony/callback/enqueue
```

## Request Body

```typescript
{
  toNumber: string;        // E.164 format recommended (e.g., "+17675551234")
  fromDid: string;         // Your outbound DID (e.g., "+17675559999")
  voiceAgentId: string;    // VoiceAgent.id from your database
  metadata?: Record<string, unknown>; // Optional custom data
}
```

## Response

Standard envelope format:

```typescript
{
  data: {
    jobId: string;         // BullMQ job ID (use for outcome polling)
    queue: string;         // Queue name
    name: string;          // Job name ("originate-callback")
    toNumber: string;      // Echo of request
    fromDid: string;       // Echo of request
    voiceAgentId: string;  // Echo of request
  } | null,
  confidence: {},
  gaps: [],
  warnings: []
}
```

## Environment Variables

**Required:**
```bash
REDIS_URL=redis://localhost:6379
```

**Optional (defaults shown):**
```bash
CALLBACK_QUEUE_NAME=telephony-callback
BULLMQ_PREFIX=epic
CALLBACK_JOB_ATTEMPTS=3
CALLBACK_JOB_BACKOFF_MS=5000
```

## Example Usage

### cURL

```bash
curl -X POST http://localhost:3000/api/telephony/callback/enqueue \
  -H "Content-Type: application/json" \
  -d '{
    "toNumber": "+17675551234",
    "fromDid": "+17675559999",
    "voiceAgentId": "va_abc123",
    "metadata": {
      "campaignId": "camp_xyz",
      "attemptNumber": 1
    }
  }'
```

### Response (Success)

```json
{
  "data": {
    "jobId": "123",
    "queue": "telephony-callback",
    "name": "originate-callback",
    "toNumber": "+17675551234",
    "fromDid": "+17675559999",
    "voiceAgentId": "va_abc123"
  },
  "confidence": {},
  "gaps": [],
  "warnings": []
}
```

### Response (Validation Error)

```json
{
  "data": null,
  "confidence": {},
  "gaps": [],
  "warnings": [
    {
      "code": "VALIDATION_ERROR",
      "message": "Required: toNumber, fromDid, voiceAgentId",
      "severity": "error"
    }
  ]
}
```

## Full Flow

```
1. Client → POST /api/telephony/callback/enqueue
              ↓
2. API creates BullMQ job (name: "originate-callback")
              ↓
3. Returns jobId to client
              ↓
4. Worker picks up job from queue
              ↓
5. Worker connects to Asterisk AMI
              ↓
6. Worker sends Originate command (async)
              ↓
7. Worker writes to Redis: callback:job:<jobId>
              ↓
8. AMI Event Listener tracks lifecycle
              ↓
9. Client polls: GET /api/telephony/callback/outcome?jobId=<jobId>
              ↓
10. UI displays real-time status
```

## Integration with Worker

This endpoint creates jobs that match the worker's expected payload:

**Worker processor:** `apps/workers/src/processors/originate-callback.ts`

**Expected payload:**
```typescript
{
  toNumber: string;
  fromDid: string;
  voiceAgentId: string;
  metadata?: Record<string, unknown>;
  createdAt?: string;
}
```

**Job name:** `"originate-callback"`

**Queue name:** `process.env.CALLBACK_QUEUE_NAME || "telephony-callback"`

## Job Options

- **Attempts:** 3 retries (configurable via `CALLBACK_JOB_ATTEMPTS`)
- **Backoff:** Fixed 5-second delay between retries (configurable via `CALLBACK_JOB_BACKOFF_MS`)
- **RemoveOnComplete:** `true` (saves Redis memory)
- **RemoveOnFail:** `false` (keeps failed jobs for debugging)

## Error Handling

### Validation Errors (400)

Missing required fields:
```json
{
  "data": null,
  "confidence": {},
  "gaps": [],
  "warnings": [
    {
      "code": "VALIDATION_ERROR",
      "message": "Required: toNumber, fromDid, voiceAgentId",
      "severity": "error"
    }
  ]
}
```

### Internal Errors (500)

Redis connection failed, BullMQ error, etc.:
```json
{
  "data": null,
  "confidence": {},
  "gaps": [],
  "warnings": [
    {
      "code": "INTERNAL_ERROR",
      "message": "Connection refused",
      "severity": "error"
    }
  ]
}
```

## Differences from /schedule Endpoint

If you have both endpoints:

| Feature | `/enqueue` | `/schedule` |
|---------|-----------|-------------|
| **Job name** | `originate-callback` | `originate-callback` |
| **Delay** | No delay param | Has `delaySeconds` param |
| **Validation** | Manual checks | Zod schema |
| **Backoff** | Fixed | Exponential |
| **Queue creation** | Inline | Shared instance |

Both work with the same worker and outcome system.

## Outcome Polling

After receiving a jobId, poll the outcome:

```bash
curl "http://localhost:3000/api/telephony/callback/outcome?jobId=123"
```

Response shows full lifecycle:

```json
{
  "data": {
    "jobId": "123",
    "stage": "hangup",
    "response": "SUCCESS",
    "answered": "true",
    "final": "completed",
    "hangup_cause_txt": "Normal Clearing",
    "updated_at": "2026-01-26T12:05:00Z"
  },
  "confidence": {},
  "gaps": [],
  "warnings": []
}
```

## Testing

### 1. Start Workers

```bash
cd apps/workers
pnpm dev
```

Expected output:
```
[worker] Callback worker started (originate-callback)
[ami-listener] connected 127.0.0.1:5038
```

### 2. Enqueue Job

```bash
curl -X POST http://localhost:3000/api/telephony/callback/enqueue \
  -H "Content-Type: application/json" \
  -d '{
    "toNumber": "+17675551234",
    "fromDid": "+17675559999",
    "voiceAgentId": "va_test_123"
  }'
```

### 3. Watch Worker Logs

```bash
# Worker processes job
[callback-worker] processing job=123
[callback-worker] completed job=123

# AMI listener tracks lifecycle
[ami-listener:debug] VarSet CALLBACK_JOB_ID { value: '123' }
[ami-listener:debug] event BridgeEnter { jobId: '123' }
[ami-listener:debug] event Hangup { jobId: '123' }
```

### 4. Poll Outcome

```bash
curl "http://localhost:3000/api/telephony/callback/outcome?jobId=123"
```

## Production Checklist

- [ ] Set `REDIS_URL` in production environment
- [ ] Configure `CALLBACK_QUEUE_NAME` consistently across web + workers
- [ ] Set `BULLMQ_PREFIX` to namespace your queues
- [ ] Test with real phone numbers
- [ ] Monitor BullMQ dashboard
- [ ] Set up alerts for failed jobs
- [ ] Configure retry logic for your use case
- [ ] Test error scenarios (invalid numbers, AMI down, etc.)

## Troubleshooting

### Jobs Not Processing

**Check queue connection:**
```bash
redis-cli -h $REDIS_HOST KEYS "epic:telephony-callback:*"
```

**Check worker status:**
```bash
ps aux | grep workers
```

### Invalid JobId in Response

**Symptom:** jobId is undefined or null

**Fix:** Ensure BullMQ is connected and jobs are being created:
```bash
redis-cli MONITOR | grep telephony-callback
```

### Worker Not Picking Up Jobs

**Symptom:** Job created but never processed

**Check:**
1. Queue name matches: `CALLBACK_QUEUE_NAME` in both web and workers
2. BullMQ prefix matches: `BULLMQ_PREFIX` in both
3. Redis URL is accessible from workers
4. Worker process is running

## Related Files

- **API Endpoint:** `apps/web/src/app/api/telephony/callback/enqueue/route.ts`
- **Outcome Endpoint:** `apps/web/src/app/api/telephony/callback/outcome/route.ts`
- **Worker Processor:** `apps/workers/src/processors/originate-callback.ts`
- **AMI Listener:** `apps/workers/src/runtime/ami-event-listener.ts`
- **Queue Setup:** `apps/workers/src/queues/callback.ts`
- **Outcome Writer:** `apps/workers/src/lib/callback-outcome.ts`

## Complete System Diagram

```
┌─────────────────────┐
│  Client (UI/API)    │
└──────────┬──────────┘
           │ POST /enqueue
           ↓
┌─────────────────────┐
│  Enqueue Endpoint   │
│  - Validate         │
│  - Create Job       │
│  - Return jobId     │
└──────────┬──────────┘
           │
           ↓
     ┌─────────┐
     │  Redis  │ ← BullMQ Queue
     └────┬────┘
          │
          ↓
┌─────────────────────┐
│  Callback Worker    │
│  - Consume Job      │
│  - AMI Originate    │
│  - Write Outcome    │
└──────────┬──────────┘
           │
           ↓
     ┌─────────┐
     │ Asterisk│ ← Places Call
     └────┬────┘
          │ AMI Events
          ↓
┌─────────────────────┐
│  AMI Event Listener │
│  - VarSet (corr.)   │
│  - BridgeEnter      │
│  - Hangup           │
│  - Write Stages     │
└──────────┬──────────┘
           │
           ↓
     ┌─────────┐
     │  Redis  │ ← Outcome Hash
     └────┬────┘
          │
          ↓
┌─────────────────────┐
│  Outcome Endpoint   │
│  - Read Hash        │
│  - Return Envelope  │
└──────────┬──────────┘
           │
           ↓
┌─────────────────────┐
│  Client Polling     │
│  - Display Status   │
│  - Show Lifecycle   │
└─────────────────────┘
```

## Next Steps

Now that you have the enqueue endpoint:

1. **Test it:** Use cURL or Postman to create jobs
2. **Monitor:** Watch worker logs and Redis outcomes
3. **Integrate:** Call from your UI or other services
4. **Scale:** Increase worker concurrency if needed
5. **Alert:** Set up monitoring for failed jobs

Your callback system is ready for production! 🚀
