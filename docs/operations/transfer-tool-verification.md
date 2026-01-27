# Transfer Tool Adapter - Operational Verification Checklist

**Version**: 1.0.0
**Status**: Production Verification Guide
**Target Server**: voice000.epic.dm
**Last Updated**: 2026-01-26

---

## PHASE 1 — Pre-Flight Checklist

### ✅ Infrastructure Requirements
- [ ] Asterisk 16+ running on voice000.epic.dm
- [ ] AMI enabled on port 5038 (default)
- [ ] Manager user credentials configured (`admin` or custom)
- [ ] PostgreSQL database accessible from workers
- [ ] Redis instance accessible from workers
- [ ] Workers app deployed to DigitalOcean App Platform

### ✅ Environment Variables Configured

**On Asterisk/voice-service server**:
```bash
ASTERISK_AMI_HOST=127.0.0.1          # or remote IP
ASTERISK_AMI_PORT=5038
ASTERISK_AMI_USERNAME=admin
ASTERISK_AMI_SECRET=<YOUR_SECRET>
ASTERISK_AMI_TIMEOUT=3.0
```

**On workers servers**:
```bash
VOICE_SERVICE_URL=http://voice000.epic.dm:8000
DATABASE_URL=postgres://...
REDIS_URL=redis://...
```

---

## PHASE 2 — STEP 1: Verify Asterisk Manager Configuration

### Check manager.conf Permissions

**SSH into voice000.epic.dm**:
```bash
cat /etc/asterisk/manager.conf | grep -A 10 "\[admin\]"
```

**Expected output** (verify these permissions present):
```
[admin]
secret=<PASSWORD>
read=all
write=originate,command,call,log,verbose,agent,user,config,dtmf,reporting
permit=127.0.0.1/255.255.255.0
deny=0.0.0.0/0.0.0.0
```

**If Redirect permission not working**, add to manager.conf:
```
[admin]
secret=<PASSWORD>
read=all
write=all  # Permissive for testing
```

Then reload Asterisk:
```bash
asterisk -rx "core reload manager"
```

### ✅ Verification Result
- [ ] Manager user exists with credentials
- [ ] Permissions include call/command operations
- [ ] AMI listening on port 5038
- [ ] Firewall allows traffic from workers servers to port 5038

---

## PHASE 2 — STEP 2: Validate voice-service AMI Connectivity

### Health Check Endpoint

**From any machine with network access to voice000.epic.dm**:
```bash
curl http://voice000.epic.dm:8000/health
```

**Expected response**:
```json
{
  "status": "ok",
  "timestamp": "2026-01-26T...",
  "service": "voice-service"
}
```

**If fails**: Check voice-service logs on voice000.epic.dm
```bash
docker logs -f voice-service  # or systemctl status voice-service
```

### Test Transfer Endpoint

**Simulate a transfer request** (use non-existent channel for dry-run):
```bash
curl -X POST http://voice000.epic.dm:8000/telephony/transfer \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "PJSIP/test-00000001",
    "context": "default",
    "exten": "1",
    "priority": 1
  }'
```

**Expected response** (channel doesn't exist, so AMI error is normal):
```json
{
  "ok": false,
  "error": "AMI Redirect failed",
  "details": {
    "ok": false,
    "response": "Response: Error\r\nMessage: No such channel\r\n",
    "duration_ms": 125
  }
}
```

**"No such channel" error is GOOD** — means voice-service successfully reached Asterisk AMI. Transfer logic works.

### ✅ Verification Result
- [ ] voice-service health endpoint responds
- [ ] Transfer endpoint accepts POST requests
- [ ] voice-service successfully connects to Asterisk AMI
- [ ] Response includes duration_ms (confirms AMI roundtrip)

---

## PHASE 2 — STEP 3: Validate Session → Channel Mapping

### During Live Call

**While a call is active**, dump the session from Redis:

```bash
# Option 1: Via redis-cli (if SSH access available)
redis-cli GET "session:<session-id>"

# Option 2: Via logs (session structure logged at call start)
# Look for: [runtime] Session created with asterisk_channel
```

### Expected Session Structure

```json
{
  "sessionId": "call-abc123",
  "agentId": "agent-prod-1",
  "callId": "2026-01-26-12-34-56-abc123",
  "channel": "VOICE",
  "asterisk_channel": "PJSIP/+17675551234-00000001",
  "asterisk_other_channel": "PJSIP/+17675559999-00000002",
  "tags": ["vip"],
  "state": "RUNNING",
  "...": "other fields"
}
```

### Verify Field Paths

| Field | Format | Example |
|-------|--------|---------|
| `asterisk_channel` | PJSIP/SIP/Local | `PJSIP/+17675551234-00000001` |
| `asterisk_other_channel` | Same or empty | `PJSIP/+17675559999-00000002` |
| `channel` | VOICE/CHAT/SMS/EMAIL | `VOICE` |
| `sessionId` | UUID or call ID | `call-abc123` |

### ✅ Verification Result
- [ ] Session contains `asterisk_channel` field
- [ ] Field value matches pattern: `<TYPE>/<NUMBER>-<HEX>`
- [ ] Other channel (bridged leg) also present
- [ ] Session reachable via Redis HGETALL

---

## PHASE 2 — STEP 4: Flow-Level Integration Test

### Simulate Handoff Flow Node

**Create test script** (`test-handoff.sh`):
```bash
#!/bin/bash

SESSION_ID="test-session-$(date +%s)"
CHANNEL="PJSIP/+17675551234-00000001"

# Inject test session into Redis
redis-cli HSET "session:$SESSION_ID" \
  sessionId "$SESSION_ID" \
  agentId "agent-test-1" \
  channel "VOICE" \
  asterisk_channel "$CHANNEL" \
  state "RUNNING"

# Trigger handoff via API (adjust endpoint as needed)
curl -X POST http://localhost:3000/api/agent-os/agents/test/flow \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "'"$SESSION_ID"'",
    "nodes": [{
      "type": "handoff",
      "id": "handoff-1",
      "reason": "customer_requested_human",
      "target": {
        "context": "support",
        "exten": "1"
      }
    }]
  }'

# Check session state after handoff
sleep 2
redis-cli HGET "session:$SESSION_ID" state
```

**Run the test**:
```bash
chmod +x test-handoff.sh
./test-handoff.sh
```

### Expected Behavior

| Step | Expected Result |
|------|-----------------|
| Session created | Redis HSET contains asterisk_channel |
| Handoff node invoked | Console logs "[handoff-node] Starting handoff execution" |
| voice-service called | logs show "Transfer: channel=PJSIP/...target=support/1" |
| AMI Redirect sent | Asterisk logs show Redirect action received |
| Caller transferred | Caller hears support queue/agent audio |
| Runtime stops AI | Flow returns stop: true, sessionState: ESCALATED |
| Session patched | Redis session.state = "ESCALATED" |
| Audit entry | Database has escalation_event record |

### ✅ Verification Result
- [ ] Handoff node executes without errors
- [ ] voice-service receives and processes transfer
- [ ] AMI Redirect reaches Asterisk
- [ ] Session state updated to ESCALATED
- [ ] Session event written to database
- [ ] AI loop halted (flow returns stop signal)

---

## PHASE 2 — STEP 5: Failure Path Testing

### Test 1: Missing Asterisk Channel

**Inject session without asterisk_channel**:
```bash
redis-cli HSET "session:test-missing-channel" \
  sessionId "test-missing-channel" \
  agentId "agent-1" \
  channel "VOICE"

curl -X POST http://localhost:3000/api/agent-os/agents/test/flow \
  -d '{
    "sessionId": "test-missing-channel",
    "nodes": [{"type": "handoff", "reason": "escalation"}]
  }'
```

**Expected result**:
```json
{
  "ok": false,
  "code": 400,
  "message": "No Asterisk channel available for transfer",
  "sessionState": "ESCALATION_FAILED"
}
```

Session event should log:
```
state: "ESCALATION_FAILED"
escalation_error: "No Asterisk channel available"
```

### Test 2: No Handoff Target Configured

**Disable governance handoff**:
```bash
# Update governance config to disable handoff
# governance.handoff.enabled = false
```

**Trigger handoff on session without explicit target**:
```bash
redis-cli HSET "session:test-no-target" \
  asterisk_channel "PJSIP/test-00001" \
  agentId "agent-1"

curl -X POST http://localhost:3000/api/agent-os/agents/test/flow \
  -d '{
    "sessionId": "test-no-target",
    "nodes": [{"type": "handoff", "reason": "escalation"}]
  }'
```

**Expected result**:
```json
{
  "ok": false,
  "code": 400,
  "message": "No handoff target configured",
  "sessionState": "ESCALATION_FAILED"
}
```

### Test 3: Asterisk Channel Doesn't Exist

**Use non-existent channel in live system**:
```bash
redis-cli HSET "session:test-invalid-channel" \
  asterisk_channel "PJSIP/ghost-channel-999999-999999" \
  agentId "agent-1"

# Trigger handoff
```

**Expected result**:
- voice-service returns: `"No such channel"`
- Session marked: `state: "TRANSFER_FAILED"`
- Audit logged: escalation error included

### Test 4: Max Handoff Attempts Exceeded

**Manually set attempt count**:
```bash
redis-cli HSET "session:test-max-attempts" \
  asterisk_channel "PJSIP/alice-00001" \
  escalation_attempt_count "3" \
  agentId "agent-1"

# Trigger handoff
```

**Expected result**:
```json
{
  "ok": false,
  "code": 429,
  "message": "Max handoff attempts exceeded",
  "sessionState": "ESCALATED"
}
```

Session event: `"ESCALATION_BLOCKED" / "Max handoff attempts exceeded (3)"`

### ✅ Verification Result
- [ ] Missing channel returns 400 ESCALATION_FAILED
- [ ] No target returns 400 ESCALATION_FAILED
- [ ] Invalid channel returns 502 TRANSFER_FAILED
- [ ] Max attempts returns 429 ESCALATION_BLOCKED
- [ ] All failures logged to session events
- [ ] Audit trail captures error details

---

## PHASE 3 — Runtime Safety Locks Summary

All guards are **automatically enforced** in the implementation:

| Guard | Trigger | Response |
|-------|---------|----------|
| **Max Handoff Attempts** | `escalation_attempt_count >= 3` | 429 ESCALATION_BLOCKED |
| **Already Escalated** | `session.state == "ESCALATED"` | 409 Conflict |
| **Agent Ineligible** | `!session.agentId` | 400 Bad Request |
| **Invalid Target** | `context/exten empty or invalid` | 400 Bad Request |
| **No Asterisk Channel** | `!session.asterisk_channel` | 400 Bad Request |

---

## PHASE 4 — Operations Checklist

### Pre-Production Verification

- [ ] **Asterisk Manager Permissions**
  - Manager user configured with call/command permissions
  - AMI socket listening on port 5038
  - Test: `asterisk -rx "core show manager"` shows user

- [ ] **voice-service Connectivity**
  - Health endpoint responds: `GET /health` → 200 OK
  - Transfer endpoint accepts requests: `POST /telephony/transfer` → processes
  - Test: `curl http://voice000.epic.dm:8000/health`

- [ ] **Session Structure**
  - Live sessions contain `asterisk_channel` field
  - Format matches: `PJSIP/...` or `SIP/...` or `Local/...`
  - Test: During call, `redis-cli HGET session:<id> asterisk_channel`

- [ ] **Flow-Based Handoff**
  - Handoff node executes without errors
  - voice-service receives transfer requests
  - AMI Redirect succeeds on valid channels
  - Session.state updated to ESCALATED
  - Test: `./test-handoff.sh` passes

- [ ] **Failure Handling**
  - Missing channel → ESCALATION_FAILED
  - No target → ESCALATION_FAILED
  - Invalid channel → TRANSFER_FAILED
  - Max attempts → ESCALATION_BLOCKED
  - Test: Run all 4 failure tests above

- [ ] **Audit Trail**
  - Session events written to database
  - escalation_error captured on failure
  - escalation_at recorded on success
  - Test: Query database for escalation events

- [ ] **Dialplan Targets**
  - All governance targets exist in extensions.conf
  - Contexts and extensions are valid
  - Test: `asterisk -rx "dialplan show <context>"`

### Production Readiness

**System is PRODUCTION READY when ALL checks pass:**

- [ ] Asterisk Manager configured and accessible
- [ ] voice-service successfully reaches Asterisk
- [ ] Live sessions populate asterisk_channel field
- [ ] Handoff transfers work end-to-end
- [ ] All failure scenarios handled gracefully
- [ ] Session events and audit logs written
- [ ] Dialplan targets verified

**Go/No-Go Decision**:
- ✅ **GO** if all boxes checked
- ❌ **NO-GO** if any verification fails — document issues and retry

---

## Troubleshooting

### Issue: "No Asterisk channel in session"

**Root Cause**: Session not properly populated during call initialization

**Solutions**:
1. Verify call creation populates `asterisk_channel` field
2. Check Redis connection from runtime
3. Verify Asterisk Channel events being captured

### Issue: "Transfer endpoint returns 502 AMI error"

**Root Cause**: voice-service unable to connect to Asterisk AMI

**Solutions**:
1. Check `ASTERISK_AMI_HOST` and `ASTERISK_AMI_PORT` environment variables
2. Verify AMI port open: `telnet voice000.epic.dm 5038`
3. Check Asterisk manager.conf permissions
4. Review voice-service logs for connection errors

### Issue: "Max handoff attempts exceeded on first attempt"

**Root Cause**: `escalation_attempt_count` not properly reset

**Solutions**:
1. Check session initialization sets `escalation_attempt_count = 0`
2. Verify increment logic (count increases only on escalation_attempted)
3. Check Redis session persistence across calls

### Issue: "Caller not transferred to queue"

**Root Cause**: Dialplan target missing or wrong context/exten

**Solutions**:
1. Verify context exists: `asterisk -rx "dialplan show <context>"`
2. Check extensions.conf for typos
3. Reload dialplan: `asterisk -rx "dialplan reload"`
4. Test manually: `asterisk -rx "channel originate PJSIP/test application playback hello-world"`

---

## Support & Escalation

**For issues with Transfer Tool Adapter**:

1. **Logs to check**:
   - voice-service logs: `/var/log/voice-service/` or docker logs
   - Asterisk logs: `/var/log/asterisk/full`
   - Workers logs: DigitalOcean App Platform logs

2. **Data to gather**:
   - Session ID
   - Exact error message
   - Transfer request/response
   - AMI response details

3. **Contact**:
   - Platform Team (on-call)
   - Asterisk Admin (for dialplan issues)
   - Operations (for infrastructure)

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-26 | Initial verification guide for v1.0.0 |

