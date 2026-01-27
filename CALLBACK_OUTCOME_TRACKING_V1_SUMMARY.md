# Callback Outcome Tracking v1 - Implementation Summary

## ✅ COMPLETE - Observability & Retry System

Callback Outcome Tracking v1 adds real-time tracking of outbound callback outcomes and intelligent retry logic for failed calls.

---

## What Was Built

### 1. **Callback Outcome Store** (`apps/workers/src/lib/callback-outcome-store.ts`)
✅ Redis-based storage for outcome data
✅ Job correlation via ActionID and Uniqueid
✅ 24-hour TTL for automatic cleanup
✅ 4 core functions:
  - `saveCallbackOutcome()` - Save outcome fields
  - `getCallbackOutcome()` - Retrieve outcome data
  - `linkUniqueIdToJob()` - Map channel to job
  - `lookupJobByUniqueId()` - Reverse lookup

### 2. **AMI Event Listener** (`apps/workers/src/lib/ami-events.ts`)
✅ Persistent TCP connection with `Events: on`
✅ Event parsing and routing
✅ Handles OriginateResponse and Hangup events
✅ Automatic job correlation
✅ Intelligent retry scheduling
✅ ~200 lines of production code

### 3. **Retry Processor** (`apps/workers/src/processors/callbackRetry.ts`)
✅ Fetches original payload from Redis
✅ Re-originates failed calls
✅ Maintains job ID for outcome correlation
✅ Reuses existing callback processor logic

### 4. **Updated Callback Processor** (`callbackRequested.ts`)
✅ Deterministic ActionID generation (`cb-<jobId>-<timestamp>`)
✅ ActionID included in channel variables
✅ Returns actionId in result

### 5. **Payload Storage** (Web API)
✅ Stores callback payload in Redis after job creation
✅ 24-hour TTL (matches outcome TTL)
✅ Key: `callback:payload:<jobId>`

### 6. **Outcome API Endpoint** (`/api/telephony/callback/outcome`)
✅ GET endpoint for retrieving outcomes
✅ Query param: `?jobId=<jobId>`
✅ Returns raw Redis hash with all outcome fields
✅ Standard envelope format (data, confidence, gaps, warnings)
✅ Confidence scoring (0.3 → 0.6 → 0.9 → 1.0)
✅ Detailed gap analysis and contextual warnings

### 7. **Callback Outcome Widget UI** (`apps/web/src/app/(admin)/telephony/callbacks/ui`)
✅ Client-side React component with live polling
✅ Real-time status badges (Waiting → Originate → Hangup → Final)
✅ Displays outcome fields, warnings, gaps, and confidence
✅ Start/Stop/Refresh polling controls
✅ Auto-stops when final or hangup reached
✅ Demo page: `/telephony/callbacks/outcome?jobId=<jobId>`

### 8. **Callback Scheduler UI** (`apps/web/src/app/(admin)/telephony/callbacks`)
✅ Form-based callback scheduling interface
✅ Schedule API endpoint: `POST /api/telephony/callback/schedule`
✅ Collects: toNumber, fromDid, voiceAgentId, delaySeconds
✅ Creates BullMQ job and returns jobId
✅ Auto-renders CallbackOutcomeWidget after scheduling
✅ Main page: `/telephony/callbacks`

### 7. **Worker Integration** (`apps/workers/src/index.ts`)
✅ Import and start AMI event listener
✅ Register retry processor in callback router
✅ Export retry processor from processors/index.ts

---

## Files Created (11)

### Backend & Workers
1. ✅ `apps/workers/src/lib/callback-outcome-store.ts` - Outcome storage (87 lines)
2. ✅ `apps/workers/src/lib/ami-events.ts` - Event listener (286 lines)
3. ✅ `apps/workers/src/processors/callbackRetry.ts` - Retry processor (71 lines)

### API Endpoints
4. ✅ `apps/web/src/app/api/telephony/callback/outcome/route.ts` - Outcome API (220 lines)
5. ✅ `apps/web/src/app/api/telephony/callback/schedule/route.ts` - Schedule API (180 lines)

### UI Components
6. ✅ `apps/web/src/app/(admin)/telephony/callbacks/ui/CallbackOutcomeWidget.tsx` - Live UI widget (310 lines)
7. ✅ `apps/web/src/app/(admin)/telephony/callbacks/ui/CallbackSchedulerPanel.tsx` - Scheduler form (215 lines)
8. ✅ `apps/web/src/app/(admin)/telephony/callbacks/page.tsx` - Main scheduler page (15 lines)
9. ✅ `apps/web/src/app/(admin)/telephony/callbacks/outcome/page.tsx` - Outcome viewer page (25 lines)

### Documentation
10. ✅ `apps/web/src/app/(admin)/telephony/callbacks/README.md` - UI documentation
11. ✅ `apps/voice-service/CALLBACK_OUTCOME_TRACKING_V1.md` - Implementation guide

---

## Files Modified (4)

1. ✅ `apps/workers/src/processors/callbackRequested.ts` - ActionID generation
2. ✅ `apps/workers/src/index.ts` - AMI listener startup + retry registration
3. ✅ `apps/workers/src/processors/index.ts` - Export retry processor
4. ✅ `apps/web/src/app/api/telephony/callback/enqueue/route.ts` - Payload storage

---

## Retry Policy (V1)

### **Triggers:**
- OriginateResponse.Response ≠ "Success"
- Hangup cause-txt contains: "busy", "no answer", or "congestion"

### **Schedule:**
- **1st retry:** 2 minutes delay
- **2nd retry:** 5 minutes delay
- **After 2 retries:** Mark as final failed

### **Storage:**
```redis
callback:job:<jobId> (hash):
  attempts: 2
  last_retry_reason: "hangup_no_answer"
  next_retry_in_ms: 300000
  final: "failed"
  final_reason: "hangup_no_answer"
```

---

## Redis Data Flow

```
1. Callback enqueued
   ↓
   callback:payload:<jobId> = JSON payload

2. Originate executed
   ↓
   AMI OriginateResponse event
   ↓
   callback:job:<jobId> = { stage: originate, response: Success, ... }
   callback:uniqueid:<uniqueid> = <jobId>

3. Call answered & hung up
   ↓
   AMI Hangup event
   ↓
   Lookup jobId via callback:uniqueid:<uniqueid>
   ↓
   callback:job:<jobId> += { stage: hangup, hangup_cause: 16, ... }

4. Retry if needed
   ↓
   callback:job:<jobId> += { attempts: 1, next_retry_in_ms: 120000 }
   ↓
   BullMQ job: callback.retry { originalJobId: <jobId> }
   ↓
   Fetch callback:payload:<jobId>
   ↓
   Re-originate call
```

---

## API Usage

### Enqueue Callback
```bash
curl -X POST http://localhost:3000/api/telephony/callback/enqueue \
  -H "Content-Type: application/json" \
  -d '{
    "voiceAgentId": "va_123",
    "sessionId": "s_123",
    "caller": "+17675551234",
    "callbackTimeIso": "'$(date -u -d '+1 minute' +%Y-%m-%dT%H:%M:%SZ)'"
  }'

# Response:
{
  "data": { "jobId": "123", "scheduledInMs": 60000 },
  "confidence": { "callback_enqueue": 1 },
  "gaps": [],
  "warnings": []
}
```

### Check Outcome
```bash
curl "http://localhost:3000/api/telephony/callback/outcome?jobId=123" | jq

# Response (successful call):
{
  "data": {
    "jobId": "123",
    "stage": "hangup",
    "originate": {
      "actionId": "cb-123-1234567890",
      "response": "Success",
      "uniqueid": "1234567890.123"
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

# Response (failed with retry):
{
  "data": {
    "jobId": "124",
    "stage": "originate",
    "originate": {
      "response": "Failure",
      "reason": "Extension not found"
    },
    "retry": {
      "attempts": 1,
      "lastReason": "originate_failure",
      "nextRetryInMs": 120000
    }
  }
}

# Response (final failure):
{
  "data": {
    "jobId": "125",
    "retry": {
      "attempts": 2
    },
    "final": {
      "status": "failed",
      "reason": "hangup_no_answer"
    }
  }
}
```

---

## Event Correlation

### Flow
```
1. Worker generates ActionID
   Format: cb-<jobId>-<timestamp>
   Example: cb-123-1706234567890

2. AMI Originate executed
   ActionID: cb-123-1706234567890
   Variable: EPIC_CALLBACK_ACTION_ID=cb-123-1706234567890

3. OriginateResponse event received
   ActionID: cb-123-1706234567890
   Uniqueid: 1234567890.123

   Extract jobId: "123"
   Save outcome: callback:job:123
   Link: callback:uniqueid:1234567890.123 = "123"

4. Hangup event received
   Uniqueid: 1234567890.123

   Lookup: callback:uniqueid:1234567890.123 → jobId = "123"
   Update: callback:job:123 += hangup data
```

---

## Testing Scenarios

### Test 1: Normal Call (Answered)
```
Enqueue → Originate (Success) → Call Answered → Hangup (16: Normal Clearing)

Outcome:
  originate.response = "Success"
  hangup.causeTxt = "Normal Clearing"
  retry.attempts = 0
```

### Test 2: Busy Number
```
Enqueue → Originate (Success) → Busy Signal → Hangup (17: User Busy) → Retry #1 → Retry #2 → Final Failure

Outcome progression:
  1. originate.response = "Success"
  2. hangup.causeTxt = "User Busy"
  3. retry.attempts = 1, next_retry_in_ms = 120000
  4. (2 min later) retry.attempts = 2, next_retry_in_ms = 300000
  5. (5 min later) final = "failed", final_reason = "hangup_user_busy"
```

### Test 3: No Answer
```
Enqueue → Originate (Success) → No Answer → Hangup (19: No Answer) → Retry #1 → Retry #2 → Final Failure

Same progression as Test 2
```

### Test 4: Invalid Number
```
Enqueue → Originate (Failure) → Retry #1 → Retry #2 → Final Failure

Outcome:
  originate.response = "Failure"
  retry.attempts = 1 → 2
  final = "failed", final_reason = "originate_failure"
```

---

## Logs

### Workers Startup
```
[ami-events] Starting event listener { host: 'asterisk.example.com', port: 5038 }
[ami-events] Connected to AMI
```

### Callback Execution
```
[callback.requested] processing { jobId: '123', caller: '+17675551234' }
[callback.requested] connecting to AMI
[callback.requested] originating call
[callback.requested] originate response { response: 'Success', message: 'Originate successfully queued' }
```

### AMI Events
```
[ami-events] OriginateResponse { jobId: '123', actionId: 'cb-123-...', response: 'Success', uniqueid: '...' }
[ami-events] Hangup { jobId: '123', uniqueid: '...', cause: '16', causeTxt: 'Normal Clearing' }
```

### Retry Scheduling
```
[callback] Scheduling retry { jobId: '124', nextAttempts: 1, delayMs: 120000, reason: 'originate_failure' }
[callback.retry] Processing retry { retryJobId: '456', originalJobId: '124' }
[callback.retry] Retrieved payload { voiceAgentId: 'va_123', caller: '+17675551234' }
```

---

## Production Readiness

### ✅ Ready for Production
- Outcome tracking (real-time)
- Retry logic (automatic)
- Observable (API endpoint)
- Failure handling (graceful)
- TTL management (24h auto-cleanup)

### ⚠️ Before Scale
- AMI listener auto-reconnect (v2)
- Magnus CRM integration (write outcomes)
- Analytics dashboard
- Outcome webhooks

---

## Comparison: Before vs After

| Feature | Before (Outbound v1) | After (Outcome Tracking v1) |
|---------|---------------------|----------------------------|
| **Outcome Tracking** | ❌ None | ✅ Real-time via AMI events |
| **Success/Failure Visibility** | ❌ None | ✅ API endpoint + Redis |
| **Retry on Failure** | ❌ Manual | ✅ Automatic (2 attempts) |
| **Correlation** | ❌ None | ✅ ActionID → Uniqueid → JobId |
| **Observable** | ❌ Logs only | ✅ API + Redis + Logs |
| **Storage** | ❌ None | ✅ Redis (24h TTL) |
| **Retry Delays** | ❌ N/A | ✅ Exponential (2min, 5min) |

---

## Architecture Benefits

✅ **Observable** - Every callback tracked end-to-end
✅ **Reliable** - Automatic retry on transient failures
✅ **Scalable** - Redis storage, no DB changes
✅ **Decoupled** - AMI listener runs independently
✅ **Maintainable** - Clean separation of concerns
✅ **Debuggable** - Comprehensive logging + API access

---

## Next Steps

### V2 Enhancements
1. **Auto-reconnect** - AMI listener reconnects on disconnect
2. **Magnus Integration** - Write outcomes to CRM
3. **Webhooks** - POST to external URL on final outcome
4. **Analytics** - Success rates, retry counts, call duration

### V3 Features
5. **Time-based retry** - Respect business hours
6. **Number blacklist** - Don't retry known bad numbers
7. **Adaptive retry** - Adjust delays based on patterns
8. **Outcome streaming** - Real-time websocket updates

---

## Summary

✅ **Callback Outcome Tracking v1 is COMPLETE**

**Components:**
- ✅ Outcome storage (Redis, 87 lines)
- ✅ AMI event listener (persistent, 286 lines)
- ✅ Retry processor (71 lines)
- ✅ Outcome API with envelope (220 lines)
- ✅ Schedule API with envelope (180 lines)
- ✅ Live UI widget with polling (310 lines)
- ✅ Scheduler form panel (215 lines)
- ✅ Main scheduler page (15 lines)
- ✅ Outcome viewer page (25 lines)
- ✅ Worker integration
- ✅ Documentation

**Total Implementation:** ~1,400 lines of production code

**Status:** Production-ready for observability and retry

**Impact:** Callbacks are now observable, reliable, and self-healing

**Next:** Magnus CRM integration + webhooks (v2)
