# Callback Outcome Tracking v1 - Implementation Guide

## Overview

Callback Outcome Tracking v1 adds observability and reliability to the outbound callback system. It uses a persistent AMI event listener to track call outcomes (answered/no-answer/busy/failed) and implements automatic retry logic for failed calls.

**Status:** ✅ **COMPLETE**

---

## Why This Matters

### **Before (Outbound Callback v1)**
- Callbacks triggered but no outcome tracking
- No visibility into success/failure
- No automatic retry on busy/no-answer
- Manual intervention required for failed calls

### **After (Outcome Tracking v1)**
- ✅ Real-time outcome tracking via AMI events
- ✅ Automatic correlation of originate → hangup
- ✅ Intelligent retry logic (up to 2 retries)
- ✅ Exponential backoff (2min, 5min)
- ✅ Observable via API endpoint
- ✅ Stored in Redis (24h TTL)

---

## Architecture

```
Callback Job Fires
  ↓
Originate Call (AMI)
  ↓
AMI Event Listener (persistent connection)
  ├─> OriginateResponse Event
  │   ├─> Save outcome to Redis
  │   ├─> Link Uniqueid → JobId
  │   └─> Retry if failed
  │
  └─> Hangup Event
      ├─> Lookup JobId by Uniqueid
      ├─> Save hangup cause to Redis
      └─> Retry if busy/no-answer
```

---

## Components

### 1. **Callback Outcome Store** (`apps/workers/src/lib/callback-outcome-store.ts`)

Redis-based storage for tracking callback outcomes and correlation data.

**Functions:**
- `saveCallbackOutcome(jobId, data)` - Save outcome fields (originate, hangup, retry)
- `getCallbackOutcome(jobId)` - Retrieve outcome data
- `linkUniqueIdToJob(uniqueid, jobId)` - Map Asterisk channel ID to job
- `lookupJobByUniqueId(uniqueid)` - Reverse lookup for Hangup events

**Redis Keys:**
```
callback:job:<jobId>          - Hash with outcome fields
callback:uniqueid:<uniqueid>  - String mapping to jobId
callback:payload:<jobId>      - JSON payload for retry
```

**TTL:** 24 hours

---

### 2. **AMI Event Listener** (`apps/workers/src/lib/ami-events.ts`)

Persistent TCP connection to Asterisk AMI with `Events: on`.

**Features:**
- Long-lived connection with keep-alive
- Event parsing and routing
- Job correlation via ActionID and Uniqueid
- Automatic retry scheduling

**Events Handled:**

#### **OriginateResponse**
```
Event: OriginateResponse
ActionID: cb-123-1234567890
Response: Success
Channel: PJSIP/+17675551234-00000001
Uniqueid: 1234567890.123
Reason: (empty on success)
```

**Actions:**
1. Extract jobId from ActionID (format: `cb-<jobId>-<timestamp>`)
2. Save originate outcome to Redis
3. Link Uniqueid → JobId
4. Trigger retry if Response ≠ "Success"

#### **Hangup**
```
Event: Hangup
Uniqueid: 1234567890.123
Cause: 16
Cause-txt: Normal Clearing
Channel: PJSIP/+17675551234-00000001
```

**Actions:**
1. Lookup jobId by Uniqueid
2. Save hangup cause to Redis
3. Trigger retry if cause indicates busy/no-answer/congestion

---

### 3. **Retry Logic** (`ami-events.ts` - `maybeRetry()`)

**V1 Retry Policy:**
- **Max attempts:** 2
- **Delay schedule:** 2 minutes (1st retry), 5 minutes (2nd retry)
- **Trigger conditions:**
  - Originate Response ≠ "Success"
  - Hangup cause-txt contains "busy", "no answer", or "congestion"

**Process:**
1. Check current attempts from Redis
2. If attempts >= 2: Mark as final failed
3. Otherwise: Schedule retry job with delay
4. Save retry tracking to Redis

---

### 4. **Retry Processor** (`apps/workers/src/processors/callbackRetry.ts`)

Handles `callback.retry` jobs.

**Process:**
1. Receive `originalJobId` from retry job
2. Fetch original payload from Redis (`callback:payload:<jobId>`)
3. Parse and validate payload
4. Create shim job with original jobId (for outcome correlation)
5. Call `callbackRequestedProcessor()` to re-originate

**Why shim job?**
Using the original jobId ensures that retry outcomes are tracked under the same Redis key as the original attempt.

---

### 5. **Payload Storage** (Web API)

Updated `/api/telephony/callback/enqueue` to store payload in Redis after job creation.

**Code:**
```typescript
const job = await callbackQueue.add("callback.requested", payload, {...});

// Store for retry processor
const payloadKey = `callback:payload:${job.id}`;
await redis.set(payloadKey, JSON.stringify(payload), "EX", 60 * 60 * 24);
```

---

### 6. **Outcome API Endpoint** (`/api/telephony/callback/outcome`)

```
GET /api/telephony/callback/outcome?jobId=<jobId>
```

**Returns (found):**
```json
{
  "data": {
    "jobId": "123",
    "stage": "hangup",
    "response": "Success",
    "actionId": "cb-123-1234567890",
    "uniqueid": "1234567890.123",
    "hangup_cause": "16",
    "hangup_cause_txt": "Normal Clearing",
    "attempts": "0"
  },
  "confidence": { "outcome": 0.9 },
  "gaps": [],
  "warnings": []
}
```

**Returns (not found yet):**
```json
{
  "data": null,
  "confidence": { "outcome": 0 },
  "gaps": [{
    "gap_type": "missing_data",
    "field_path": "redis.callback:job:123",
    "severity": "medium",
    "impact": "No outcome recorded yet...",
    "recommended_fix": "Wait for callback execution...",
    "question_to_user": "Has the callback job executed yet?"
  }],
  "warnings": [{
    "code": "OUTCOME_NOT_FOUND",
    "message": "No callback outcome hash exists yet...",
    "severity": "info"
  }]
}
```

**Confidence Scoring:**
- `1.0` - Final outcome recorded (complete)
- `0.9` - Hangup stage data present
- `0.6` - Originate response present
- `0.3` - Partial or minimal data

---

## Changes to Existing Code

### Updated: `callbackRequestedProcessor.ts`

**Before:**
```typescript
const res = await ami.action({
  Action: "Originate",
  Channel: channel,
  // ...
});

return { ok: true, originate: res, agiUrl };
```

**After:**
```typescript
const actionId = `cb-${job.id}-${Date.now()}`;

const res = await ami.action({
  Action: "Originate",
  ActionID: actionId,  // ← Deterministic ActionID
  Channel: channel,
  Variable: [
    // ...
    `EPIC_CALLBACK_ACTION_ID=${actionId}`,  // ← Added
  ].join("|"),
});

return { ok: true, actionId, originate: res, agiUrl };  // ← Include actionId
```

---

### Updated: `apps/workers/src/index.ts`

**Added imports:**
```typescript
import { callbackRetryProcessor } from './processors/callbackRetry';
import { startAmiEventListener } from './lib/ami-events';
```

**Updated callback router:**
```typescript
switch (jobName) {
  case "callback.requested":
    return callbackRequestedProcessor(job);
  case "callback.retry":  // ← Added
    return callbackRetryProcessor(job);
  default:
    throw new Error(`Unknown job name: ${jobName}`);
}
```

**Start AMI listener:**
```typescript
startStatsMonitoring();

// ← Added AMI event listener startup
startAmiEventListener().catch((error) => {
  logger.error(COMPONENT, 'Failed to start AMI event listener', { error });
});

// Register shutdown handlers
```

---

## Testing

### Test 1: Successful Callback

```bash
# 1. Enqueue callback
curl -X POST http://localhost:3000/api/telephony/callback/enqueue \
  -H "Content-Type: application/json" \
  -d '{
    "voiceAgentId": "va_123",
    "sessionId": "s_123",
    "caller": "+17675551234",
    "callbackTimeIso": "'$(date -u -d '+1 minute' +%Y-%m-%dT%H:%M:%SZ)'"
  }' | jq

# 2. Wait 1 minute for callback to execute

# 3. Check outcome
curl "http://localhost:3000/api/telephony/callback/outcome?jobId=<jobId>" | jq
```

**Expected outcome:**
```json
{
  "data": {
    "stage": "hangup",
    "originate": {
      "response": "Success",
      "uniqueid": "..."
    },
    "hangup": {
      "cause": "16",
      "causeTxt": "Normal Clearing"
    },
    "retry": {
      "attempts": 0
    }
  }
}
```

---

### Test 2: Failed Callback with Retry

```bash
# 1. Enqueue callback to non-existent number
curl -X POST http://localhost:3000/api/telephony/callback/enqueue \
  -H "Content-Type: application/json" \
  -d '{
    "voiceAgentId": "va_123",
    "sessionId": "s_123",
    "caller": "+19999999999",  # Non-existent
    "callbackTimeIso": "'$(date -u -d '+1 minute' +%Y-%m-%dT%H:%M:%SZ)'"
  }' | jq

# 2. Check outcome immediately after originate
curl "http://localhost:3000/api/telephony/callback/outcome?jobId=<jobId>" | jq
```

**Expected outcome (after 1st attempt):**
```json
{
  "data": {
    "stage": "originate",
    "originate": {
      "response": "Failure",
      "reason": "..."
    },
    "retry": {
      "attempts": 1,
      "lastReason": "originate_failure",
      "nextRetryInMs": 120000
    }
  }
}
```

**Expected: 2nd retry after 2 minutes**

**Expected: 3rd retry after 5 more minutes**

**Expected: Final outcome after 3 attempts:**
```json
{
  "data": {
    "retry": {
      "attempts": 2
    },
    "final": {
      "status": "failed",
      "reason": "originate_failure"
    }
  }
}
```

---

### Test 3: Monitor AMI Events

```bash
# Terminal 1: Workers logs
tail -f apps/workers/logs/worker.log | grep ami-events

# Terminal 2: Enqueue callback
curl -X POST http://localhost:3000/api/telephony/callback/enqueue ...

# Expected output:
# [ami-events] Connected to AMI
# [ami-events] OriginateResponse { jobId: '123', response: 'Success', ... }
# [ami-events] Hangup { jobId: '123', cause: '16', causeTxt: 'Normal Clearing' }
```

---

## Environment Variables

No new environment variables required. Uses existing AMI configuration:

```bash
# Workers (.env)
ASTERISK_AMI_HOST=asterisk.example.com
ASTERISK_AMI_PORT=5038
ASTERISK_AMI_USER=epic_ami
ASTERISK_AMI_PASS=CHANGE_ME_STRONG

# Web (.env)
REDIS_URL=redis://localhost:6379
```

---

## Redis Data Structure

### Outcome Hash (`callback:job:<jobId>`)

**After Originate:**
```
stage: originate
actionId: cb-123-1234567890
response: Success
channel: PJSIP/+17675551234-00000001
uniqueid: 1234567890.123
reason: (empty)
at: 2026-01-26T12:00:00Z
```

**After Hangup:**
```
stage: hangup
hangup_cause: 16
hangup_cause_txt: Normal Clearing
hangup_channel: PJSIP/+17675551234-00000001
at: 2026-01-26T12:05:00Z
```

**After Retry:**
```
attempts: 1
last_retry_reason: originate_failure
next_retry_in_ms: 120000
at: 2026-01-26T12:00:05Z
```

**Final:**
```
final: failed
final_reason: originate_failure
attempts: 2
at: 2026-01-26T12:10:00Z
```

---

## Troubleshooting

### AMI Listener Not Starting

**Symptoms:**
```
[ami-events] AMI not configured, skipping event listener
```

**Solutions:**
1. Check environment variables: `ASTERISK_AMI_HOST`, `ASTERISK_AMI_USER`, `ASTERISK_AMI_PASS`
2. Verify AMI port: `nc -vz $ASTERISK_AMI_HOST 5038`

---

### No Events Received

**Symptoms:**
- Callbacks work but no outcome data

**Solutions:**
1. Check AMI connection: Workers logs should show `[ami-events] Connected to AMI`
2. Verify ActionID format: Should be `cb-<jobId>-<timestamp>`
3. Check Redis: `redis-cli hgetall "callback:job:<jobId>"`

---

### Retry Not Triggering

**Symptoms:**
- Callback fails but no retry scheduled

**Solutions:**
1. Check retry attempts in outcome: `curl "http://localhost:3000/api/telephony/callback/outcome?jobId=<jobId>"`
2. Check payload stored in Redis: `redis-cli get "callback:payload:<jobId>"`
3. Check retry processor registration in worker

---

### Outcome API Returns Null

**Symptoms:**
```json
{ "data": null, "warnings": [{ "code": "OUTCOME_NOT_FOUND" }] }
```

**Solutions:**
1. Check jobId is correct
2. Check Redis TTL: Outcomes expire after 24 hours
3. Check if job has executed yet

---

## Hangup Causes Reference

Common Asterisk hangup causes:

| Cause | Cause-txt | Meaning | Retry? |
|-------|-----------|---------|--------|
| 16 | Normal Clearing | Call answered and completed normally | ❌ No |
| 17 | User Busy | Called party is busy | ✅ Yes |
| 19 | No Answer | Called party did not answer | ✅ Yes |
| 21 | Call Rejected | Called party rejected call | ❌ No |
| 34 | Congestion | Network congestion | ✅ Yes |
| 127 | Interworking | Unspecified error | ❌ No |

---

## Next Steps (V2)

### Immediate Enhancements
- **Auto-reconnect** - AMI listener reconnects on disconnect
- **Magnus Call Log** - Write outcomes to Magnus CRM
- **Analytics** - Track success rates, retry counts
- **Notifications** - Slack/email on final failure

### Future Features
- **Time-based retry windows** - Don't retry late at night
- **Per-number blacklist** - Don't retry known bad numbers
- **Adaptive retry** - Adjust delays based on success rate
- **Outcome webhooks** - POST to external URL on final outcome

---

## Summary

✅ **Callback Outcome Tracking v1 is COMPLETE:**

- ✅ AMI event listener (persistent connection)
- ✅ Outcome storage (Redis with 24h TTL)
- ✅ Automatic retry logic (2 attempts, exponential backoff)
- ✅ Retry processor (fetch payload, re-originate)
- ✅ Outcome API endpoint (GET /api/telephony/callback/outcome)
- ✅ Full event correlation (ActionID → Uniqueid → JobId)
- ✅ Comprehensive logging

**Status:** Production-ready for observability and retry

**Next:** Add webhooks and Magnus CRM integration (v2)
