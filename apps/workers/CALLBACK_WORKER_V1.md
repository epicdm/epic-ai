# BullMQ Callback Worker v1

Complete BullMQ worker implementation that consumes `originate-callback` jobs and triggers Asterisk AMI Originate commands.

## Overview

This worker:
- ✅ Consumes `originate-callback` jobs from BullMQ queue
- ✅ Connects to Asterisk AMI and sends Originate command
- ✅ Writes job outcome to Redis hash (`callback:job:<jobId>`)
- ✅ Compatible with CallbackOutcomeWidget polling UI
- ✅ Automatic retry via BullMQ (3 attempts, exponential backoff)
- ✅ Concurrency: 5 workers

## Architecture

```
UI schedules callback
  ↓
POST /api/telephony/callback/schedule
  ↓
Creates BullMQ job: "originate-callback"
  ↓
Worker picks up job
  ↓
Connects to Asterisk AMI
  ↓
Sends Originate command (async)
  ↓
Writes outcome to Redis: callback:job:<jobId>
  ↓
CallbackOutcomeWidget polls and displays status
```

## Files Created

### 1. `src/lib/callback-outcome.ts` (41 lines)
Redis outcome writer helper.

**Functions:**
- `keyForJob(jobId)` - Returns Redis key: `callback:job:<jobId>`
- `writeOutcome(redis, jobId, patch)` - Writes/updates outcome hash

**Example outcome hash:**
```redis
HGETALL callback:job:123
{
  stage: "originate",
  response: "SUCCESS",
  to: "+17675551234",
  from: "+17675559999",
  voiceAgentId: "va_123",
  attempts: "1",
  actionId: "cb-123-1706234567890",
  processing_time_ms: "234",
  updated_at: "2026-01-26T12:00:00Z"
}
```

### 2. `src/lib/asterisk-ami.ts` (updated)
Added simpler `amiSendAction()` function alongside existing `AmiClient` class.

**Function:** `amiSendAction(config, actionLines)`
- Minimal AMI client: connect → login → action → logoff
- Single action per connection (stateless)
- Returns `{ raw, headers }` with parsed response

**Example:**
```typescript
const res = await amiSendAction(
  { host, port, username, password, timeoutMs: 8000 },
  [
    "Action: Originate",
    "ActionID: cb-123-1234567890",
    "Channel: PJSIP/+17675551234",
    "Context: from-internal",
    "Exten: route_to_agent",
    "Priority: 1",
    "Async: true"
  ]
);
// res.headers["Response"] === "Success"
```

### 3. `src/processors/originate-callback.ts` (165 lines)
Main BullMQ processor that handles `originate-callback` jobs.

**Process:**
1. Validate payload (toNumber, fromDid, voiceAgentId)
2. Write initial outcome: `stage=originate, response=START`
3. Read AMI config from env vars
4. Build AMI Originate command with variables
5. Send to Asterisk via `amiSendAction()`
6. Write final outcome: `response=SUCCESS/ERROR`
7. Mark as failed if AMI rejects submission

**Payload Schema:**
```typescript
{
  toNumber: string;       // E.164 phone number to call
  fromDid: string;        // Originating DID/caller ID
  voiceAgentId: string;   // VoiceAgent.id (not Agent.id!)
  metadata?: object;      // Optional metadata
  createdAt?: string;     // ISO timestamp
}
```

**Variables passed to dialplan:**
- `CALLBACK_JOB_ID` - BullMQ job ID
- `VOICE_AGENT_ID` - VoiceAgent ID from payload
- `CALLBACK_TO` - toNumber
- `CALLBACK_FROM_DID` - fromDid

### 4. `src/queues/callback.ts` (43 lines)
Queue and Worker factory functions.

**Exports:**
- `createCallbackQueue()` - Creates BullMQ Queue instance
- `createCallbackWorker()` - Creates BullMQ Worker with processor

**Worker Config:**
- Queue name: `CALLBACK_QUEUE_NAME` env var (default: "telephony-callback")
- Prefix: `BULLMQ_PREFIX` env var (default: "epic")
- Concurrency: 5 workers
- Event listeners: completed, failed (with console logging)

### 5. `src/index.ts` (updated)
Worker startup integration.

Added after AMI event listener startup:
```typescript
const { createCallbackWorker } = await import('./queues/callback');
createCallbackWorker();
logger.info(COMPONENT, 'Callback worker started (originate-callback)');
```

## Environment Variables

Add these to `apps/workers/.env`:

### Required
```bash
# Redis
REDIS_URL=redis://localhost:6379

# Asterisk AMI
ASTERISK_AMI_HOST=127.0.0.1
ASTERISK_AMI_PORT=5038
ASTERISK_AMI_USER=admin
ASTERISK_AMI_PASS=secret
```

### Optional (with defaults)
```bash
# Originate settings
ASTERISK_ORIGINATE_CONTEXT=from-internal
ASTERISK_ORIGINATE_PRIORITY=1
ASTERISK_ORIGINATE_CALLERID=EPIC
ASTERISK_ORIGINATE_TIMEOUT_MS=30000
ASTERISK_ORIGINATE_CHANNEL_PREFIX=PJSIP/

# BullMQ settings
CALLBACK_QUEUE_NAME=telephony-callback
BULLMQ_PREFIX=epic
```

## Dialplan Integration

The worker sends calls to extension: `route_to_agent` (configurable).

**Example dialplan entry:**
```
[from-internal]
exten => route_to_agent,1,NoOp(Callback routed - Job: ${CALLBACK_JOB_ID})
 same => n,Set(VOICE_AGENT_ID=${VOICE_AGENT_ID})
 same => n,Set(CALLBACK_TO=${CALLBACK_TO})
 same => n,Set(CALLBACK_FROM_DID=${CALLBACK_FROM_DID})
 same => n,AGI(agi://voice-service:4573/route_to_agent?voiceAgentId=${VOICE_AGENT_ID})
 same => n,Hangup()
```

## Testing

### 1. Enqueue a test job via API
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
  }
}
```

### 2. Check worker logs
```bash
tail -f apps/workers/logs/worker.log | grep callback
```

**Expected output:**
```
[callback-worker] Processing job=123
[callback-worker] AMI originate submitted successfully
[callback-worker] completed job=123
```

### 3. Check Redis outcome
```bash
redis-cli HGETALL callback:job:123
```

**Expected:**
```
1) "stage"
2) "originate"
3) "response"
4) "SUCCESS"
5) "to"
6) "+17675551234"
7) "from"
8) "+17675559999"
9) "actionId"
10) "cb-123-1706234567890"
```

### 4. View in UI
```
http://localhost:3000/telephony/callbacks/outcome?jobId=123
```

## BullMQ Job Options

Jobs are created with:
```typescript
{
  delay: delaySeconds * 1000,
  attempts: 3,
  backoff: { type: "exponential", delay: 3000 },
  removeOnComplete: 200,
  removeOnFail: 200,
}
```

**Retry behavior:**
- Attempt 1: Immediate
- Attempt 2: 3 seconds later
- Attempt 3: 9 seconds later (exponential)
- After 3 failures: Job moves to failed queue

## Outcome States

| Stage | Response | Meaning |
|-------|----------|---------|
| originate | START | Worker started processing |
| originate | SUCCESS | AMI accepted originate command |
| originate | ERROR | AMI rejected originate command |
| error | ERROR | Worker exception occurred |

**Final states:**
- If `response !== "SUCCESS"`: `final="failed", final_reason="AMI originate response: ..."`
- If worker throws: `final="failed", final_reason=<error message>`

## Integration with Outcome Tracking v1

This worker writes outcomes that are compatible with:
- ✅ CallbackOutcomeWidget (UI polling)
- ✅ GET /api/telephony/callback/outcome (API endpoint)
- ✅ AMI event listener (if running, will add hangup data)

**Data flow:**
1. Worker writes: `stage=originate, response=SUCCESS`
2. AMI event listener adds: `stage=hangup, hangup_cause=16`
3. UI displays: "Originate submitted" → "Call ended (hangup)"

## Comparison with Existing Implementation

| Feature | Old (callbackRequested) | New (originate-callback) |
|---------|------------------------|--------------------------|
| **AMI Client** | AmiClient class (persistent) | amiSendAction function (stateless) |
| **Outcome Storage** | callback-outcome-store.ts | callback-outcome.ts |
| **Job Name** | "callback.requested" | "originate-callback" |
| **Queue Name** | "callback" | "telephony-callback" |
| **Payload** | voiceAgentId, sessionId, caller | toNumber, fromDid, voiceAgentId |
| **Complexity** | High (event listener, retry logic) | Low (simple worker + AMI) |

Both approaches can coexist. Choose based on your needs:
- **Old:** Full outcome tracking with AMI events + retry
- **New:** Simple originate with immediate feedback

## Troubleshooting

### Worker not picking up jobs
```bash
# Check Redis connection
redis-cli ping

# Check BullMQ queue
redis-cli KEYS "epic:telephony-callback:*"

# Check worker logs
grep "callback-worker" apps/workers/logs/worker.log
```

### AMI originate fails
```bash
# Test AMI connection
telnet $ASTERISK_AMI_HOST 5038

# Check AMI credentials
# Verify manager.conf has correct username/password

# Check worker env vars
env | grep ASTERISK_AMI
```

### Outcome not showing in UI
```bash
# Check Redis key exists
redis-cli HGETALL callback:job:<jobId>

# Check API endpoint
curl "http://localhost:3000/api/telephony/callback/outcome?jobId=<jobId>"

# Check Redis URL in web app
grep REDIS_URL apps/web/.env
```

## Next Steps

### V2 Enhancements
- Add hangup cause tracking (integrate with AMI event listener)
- Support multiple originate strategies (SIP, PJSIP, Local)
- Add call recording support
- Implement retry logic (currently relies on BullMQ)
- Add webhook notifications on completion

### V3 Features
- Call transfer support
- Multi-leg calls (conference)
- Scheduled callback windows (business hours only)
- Number validation and formatting
- Call queue priority support

## Summary

✅ **BullMQ Callback Worker v1 is COMPLETE:**

- ✅ Processor: `originate-callback` (165 lines)
- ✅ AMI client: `amiSendAction()` function (120 lines)
- ✅ Outcome writer: Redis hash helper (41 lines)
- ✅ Queue setup: Worker + Queue factories (43 lines)
- ✅ Worker integration: Registered in index.ts
- ✅ Environment variables: 10+ config options
- ✅ Compatible with existing UI and API

**Total Implementation:** ~370 lines of new code

**Status:** Production-ready for basic outbound callbacks

**Integration:** Works seamlessly with CallbackSchedulerPanel and CallbackOutcomeWidget
