# Callback Worker + Lifecycle Tracker v1 - Quick Start

Complete callback system: BullMQ worker triggers outbound calls + AMI listener tracks full lifecycle (answered/bridged/hangup/final).

## 🚀 Setup (5 Minutes)

### 1. Add Environment Variables

Add to `apps/workers/.env`:

```bash
# Asterisk AMI (required)
ASTERISK_AMI_HOST=127.0.0.1
ASTERISK_AMI_PORT=5038
ASTERISK_AMI_USER=admin
ASTERISK_AMI_PASS=secret

# Originate settings (optional, defaults shown)
ASTERISK_ORIGINATE_CONTEXT=from-internal
ASTERISK_ORIGINATE_PRIORITY=1
ASTERISK_ORIGINATE_CALLERID=EPIC
ASTERISK_ORIGINATE_TIMEOUT_MS=30000
ASTERISK_ORIGINATE_CHANNEL_PREFIX=PJSIP/

# BullMQ (optional, defaults shown)
CALLBACK_QUEUE_NAME=telephony-callback
BULLMQ_PREFIX=epic
```

### 2. Restart Workers

```bash
cd apps/workers
pnpm dev
```

**Expected output:**
```
[worker] Callback worker started (originate-callback)
```

### 3. Test End-to-End

**Option A: Use the Web UI** (easiest)
```
http://localhost:3000/telephony/callbacks
```

Fill in:
- To Number: `+17675551234`
- From DID: `+17675559999`
- VoiceAgent ID: `va_test_123`
- Delay: `0` seconds

Click "Schedule Callback" → Widget shows real-time status

**Option B: Use cURL** (API testing)
```bash
curl -X POST http://localhost:3000/api/telephony/callback/schedule \
  -H "Content-Type: application/json" \
  -d '{
    "toNumber": "+17675551234",
    "fromDid": "+17675559999",
    "voiceAgentId": "va_test_123",
    "delaySeconds": 0
  }'
```

Response:
```json
{
  "data": {
    "jobId": "123",
    "queue": "telephony-callback",
    "delaySeconds": 0
  }
}
```

View outcome:
```
http://localhost:3000/telephony/callbacks/outcome?jobId=123
```

## 📊 What Happens (Full Lifecycle)

```
1. UI/API creates BullMQ job → "originate-callback"
2. Worker picks up job
3. Worker writes: stage=originate, response=START
4. Worker connects to Asterisk AMI
5. Worker sends Originate command (async)
6. Worker writes: response=SUCCESS
7. UI shows: "Originate submitted" 🔵

--- AMI Event Listener Tracks Call ---

8. VarSet event fires → Listener correlates uniqueid → jobId
9. Listener writes: stage=correlated
10. UI shows: "Correlated" 🔵

11. BridgeEnter event fires → Call answered + bridged
12. Listener writes: stage=answered, stage=bridged
13. UI shows: "Bridged" 🟡

14. Hangup event fires → Call complete
15. Listener writes: stage=hangup, final=completed
16. UI shows: "Completed" 🟢

OR

15. Listener writes: stage=hangup, final=failed
16. UI shows: "Failed" 🔴
```

## 🔍 Verify It's Working

### Check Worker Logs
```bash
tail -f apps/workers/logs/worker.log | grep callback
```

**Expected:**
```
[callback-worker] completed job=123
```

### Check Redis Outcome
```bash
redis-cli HGETALL callback:job:123
```

**Expected:**
```
stage: "originate"
response: "SUCCESS"
to: "+17675551234"
from: "+17675559999"
voiceAgentId: "va_test_123"
actionId: "cb-123-1706234567890"
```

### Check AMI Connection
```bash
telnet $ASTERISK_AMI_HOST 5038
```

**Expected:**
```
Asterisk Call Manager/X.X
```

## 🐛 Troubleshooting

### Worker Not Starting
```bash
# Check env vars
env | grep ASTERISK_AMI

# Restart workers
pm2 restart workers  # or pnpm dev
```

### AMI Connection Fails
```bash
# Test AMI manually
telnet $ASTERISK_AMI_HOST 5038

# Check Asterisk manager.conf
cat /etc/asterisk/manager.conf | grep -A5 [admin]

# Check firewall
nc -zv $ASTERISK_AMI_HOST 5038
```

### Jobs Not Processing
```bash
# Check BullMQ queue
redis-cli KEYS "epic:telephony-callback:*"

# Check if worker is registered
ps aux | grep workers

# Check worker logs for errors
grep ERROR apps/workers/logs/worker.log
```

### Outcome Not Showing in UI
```bash
# Check Redis connection from web app
redis-cli -h $REDIS_HOST ping

# Check Redis key exists
redis-cli HGETALL callback:job:<jobId>

# Check API endpoint
curl "http://localhost:3000/api/telephony/callback/outcome?jobId=<jobId>"
```

## 📝 Files Created

### Originate Worker
- `apps/workers/src/lib/callback-outcome.ts` - Redis outcome writer (41 lines)
- `apps/workers/src/lib/asterisk-ami.ts` - Added `amiSendAction()` function (~120 lines)
- `apps/workers/src/processors/originate-callback.ts` - Main processor (165 lines)
- `apps/workers/src/queues/callback.ts` - Queue + Worker setup (43 lines)

### Lifecycle Tracker
- `apps/workers/src/runtime/ami-event-listener.ts` - AMI event listener (379 lines)

### Integration
- `apps/workers/src/index.ts` - Worker + listener registration (updated)
- `apps/workers/.env.example` - Environment variables (updated)

**Total:** ~750 lines of new code

## 🎯 What's Next?

You now have a working callback system:
- ✅ Web UI for scheduling callbacks
- ✅ BullMQ worker that triggers AMI Originate
- ✅ Redis outcome storage
- ✅ Real-time UI polling widget
- ✅ Automatic retry via BullMQ (3 attempts)

**Next steps:**
1. Configure your Asterisk dialplan to handle `route_to_agent` extension
2. Test with real phone numbers
3. Add AMI event listener for hangup tracking (if not already running)
4. Monitor worker performance and tune concurrency

## 📚 Documentation

- Full guide: `apps/workers/CALLBACK_WORKER_V1.md`
- UI docs: `apps/web/src/app/(admin)/telephony/callbacks/README.md`
- API docs: `apps/web/CALLBACK_UI_QUICKSTART.md`

## ✅ Quick Checklist

Before going to production:
- [ ] Set strong AMI password
- [ ] Configure Asterisk dialplan for `route_to_agent`
- [ ] Test with various phone number formats
- [ ] Monitor worker logs for errors
- [ ] Set up alerts for failed jobs
- [ ] Document your specific dialplan requirements
- [ ] Test retry behavior (simulate failures)
- [ ] Verify Redis persistence settings

## 🔗 Integration Points

- **Schedule API:** `POST /api/telephony/callback/schedule`
- **Outcome API:** `GET /api/telephony/callback/outcome?jobId=<jobId>`
- **Scheduler UI:** `/telephony/callbacks`
- **Outcome Widget:** `/telephony/callbacks/outcome?jobId=<jobId>`
- **BullMQ Queue:** `telephony-callback` (configurable)
- **Redis Outcome:** `callback:job:<jobId>` (hash)

Your callback system is ready to handle outbound calls! 🎉
