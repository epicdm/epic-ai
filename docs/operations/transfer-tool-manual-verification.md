# Transfer Tool Adapter v1 - Manual Verification Procedures

**Version**: 1.0.0
**Last Updated**: 2026-01-26
**Target Server**: voice000.epic.dm

---

## Purpose

This document provides step-by-step manual procedures for verifying Transfer Tool Adapter v1 functionality that cannot be automated. These procedures must be executed by operations team with direct access to voice000.epic.dm.

---

## Prerequisites

- SSH access to voice000.epic.dm
- Redis CLI access (redis-cli available on server or remote access configured)
- PostgreSQL client (psql) for database inspection
- Asterisk console access (asterisk -rx)
- Active test environment or dev Asterisk instance

---

## Section 1: Asterisk Manager Configuration Verification

### Procedure 1.1: Verify manager.conf Permissions

**On voice000.epic.dm:**

```bash
# SSH into server
ssh admin@voice000.epic.dm

# Check manager.conf for [admin] section
cat /etc/asterisk/manager.conf | grep -A 15 "\\[admin\\]"
```

**Expected Output:**
```
[admin]
secret=<PASSWORD>
read=all
write=all
permit=127.0.0.1/255.255.255.0
deny=0.0.0.0/0.0.0.0
```

**Verification Checklist:**
- [ ] `[admin]` section exists
- [ ] `secret=` is set
- [ ] `read=all` is present
- [ ] `write=` includes `originate,command,call`
- [ ] `permit=` allows voice-service IP (typically 127.0.0.1 or App Platform IP)
- [ ] `deny=0.0.0.0/0.0.0.0` is set for security

**If Redirect permission issues, update:**
```bash
# Edit manager.conf
sudo nano /etc/asterisk/manager.conf

# Add or update [admin] section:
[admin]
secret=<YOUR_PASSWORD>
read=all
write=all
permit=127.0.0.1/255.255.255.0
deny=0.0.0.0/0.0.0.0

# Reload Asterisk
asterisk -rx "core reload manager"
```

### Procedure 1.2: Verify Manager User in Asterisk

**Command:**
```bash
asterisk -rx "core show manager"
```

**Expected Output:**
```
Manager (connected)
[admin]
      Registered - No
      Logged in - No
        Channels - 0
      Subscriptions - 0
```

**What to Look For:**
- User `admin` is registered
- Status shows "connected"
- No errors in output

**If Missing:**
```bash
# Restart Asterisk manager
asterisk -rx "manager reload"
asterisk -rx "core reload manager"
```

---

## Section 2: voice-service AMI Connectivity Verification

### Procedure 2.1: Check voice-service Process

**Command:**
```bash
ps aux | grep -i "voice.*service\|python.*main"
```

**Expected Output:**
Process should be running with environment variables visible.

**Verification Checklist:**
- [ ] voice-service process is running
- [ ] Port 8000 is listening:
  ```bash
  netstat -tlnp | grep 8000
  # or
  ss -tlnp | grep 8000
  ```

### Procedure 2.2: Manual Transfer Endpoint Test

**With Asterisk Running:**

```bash
# Test 1: Health check (should return 200)
curl -v http://127.0.0.1:8000/health

# Expected response:
# < HTTP/1.1 200 OK
# {"status": "ok", "timestamp": "...", "service": "voice-service"}
```

**Test 2: Transfer endpoint with non-existent channel:**

```bash
curl -X POST http://127.0.0.1:8000/telephony/transfer \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "PJSIP/fake-channel-999999",
    "context": "default",
    "exten": "1",
    "priority": 1
  }'

# Expected response (channel doesn't exist, which is GOOD):
# {
#   "ok": false,
#   "error": "AMI Redirect failed",
#   "details": {
#     "ok": false,
#     "response": "Response: Error\r\nMessage: No such channel\r\n",
#     "duration_ms": 125
#   }
# }
```

**What This Means:**
- ✅ **"No such channel" error = GOOD** - voice-service successfully reached Asterisk AMI
- ✅ **Response includes duration_ms** - confirms AMI roundtrip timing
- ❌ **Connection timeout** - voice-service cannot reach Asterisk
- ❌ **400 error** - Flask endpoint not receiving requests

---

## Section 3: Session Channel Mapping Verification

### Procedure 3.1: Inspect Redis Session Structure

**On voice000.epic.dm (with Redis access):**

**During an active call:**

```bash
# Connect to Redis
redis-cli -h <REDIS_HOST> -p <REDIS_PORT>

# List all sessions
KEYS "session:*"

# Get specific session structure
HGETALL "session:<SESSION_ID>"

# Expected structure:
# 1) "sessionId"
# 2) "call-abc123"
# 3) "asterisk_channel"
# 4) "PJSIP/+17675551234-00000001"
# 5) "asterisk_other_channel"
# 6) "PJSIP/+17675559999-00000002"
# 7) "state"
# 8) "RUNNING"
# 9) "agentId"
# 10) "agent-prod-1"
# ... other fields
```

**Verification Checklist:**
- [ ] Session key exists in Redis
- [ ] `asterisk_channel` field is present
- [ ] Format matches `PJSIP/<NUMBER_OR_NAME>-<HEX_ID>`
- [ ] `asterisk_other_channel` optional field (may be present)
- [ ] `state` field exists with value like "RUNNING"
- [ ] `agentId` field exists and is not empty
- [ ] Fields are flat (not nested JSON)

### Procedure 3.2: Verify Channel Naming Pattern

**Valid Asterisk Channel Patterns:**
- `PJSIP/alice-00000001` (name-based)
- `PJSIP/+17675551234-00000002` (phone number)
- `SIP/alice-00000001` (legacy SIP)
- `Local/1234@default-00000001` (local channels)

**Invalid Patterns (Do NOT use):**
- `PJSIP/alice` (missing sequence ID)
- `alice-00000001` (missing type prefix)
- Spaces or special characters

---

## Section 4: Flow-Level Integration Test (Live Call)

### Procedure 4.1: Setup Test Environment

**Prerequisites:**
- Active Asterisk instance with test queue
- Test extensions available (e.g., support queue)
- Dialplan configured with target extension

**Test Dialplan Example** (in extensions.conf):
```
[support]
exten => 1,1,Queue(support_queue)
exten => 1,n,Hangup()

[test_handoff]
exten => 100,1,Dial(PJSIP/alice)
exten => 100,n,Hangup()
```

### Procedure 4.2: Initiate Live Handoff Test

**Step 1: Start Active Call**
```bash
# Originate a test call (from Asterisk console)
asterisk -rx "channel originate PJSIP/alice application playback hello-world"

# Or trigger call through application that creates session
```

**Step 2: Capture Session ID**
- Monitor logs for session creation
- Get session ID from debug output
- Example: `call-20260126-12-34-56-abc123`

**Step 3: Inject Handoff via API**

```bash
# Make handoff request during active call
curl -X POST http://localhost:3000/api/agent-os/agents/test/flow \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TEST_TOKEN>" \
  -d '{
    "sessionId": "call-20260126-12-34-56-abc123",
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
```

**Step 4: Monitor Expected Behavior**

| Step | Expected Result | How to Verify |
|------|-----------------|---------------|
| Handoff node executes | No errors in console | Check logs: `[handoff-node] Starting handoff` |
| voice-service called | Transfer endpoint hit | Check voice-service logs |
| AMI redirect sent | Asterisk receives action | Check Asterisk log: `/var/log/asterisk/full` |
| Caller transferred | Hear queue audio/hold | Manual audio verification |
| Session state updated | Session.state = "ESCALATED" | `HGET session:<id> state` |
| AI stopped | Flow returns stop:true | Check runtime response |
| Event written | Database has record | Query escalation_events table |

**Sample Asterisk Log Entry:**
```
    -- Channel PJSIP/alice-00000001 joined 'support_queue' queued position 1
    -- <PJSIP/alice-00000001> playing 'queue-callswaiting'
```

### Procedure 4.3: Verify Session State After Transfer

**Command:**
```bash
redis-cli HGET "session:<SESSION_ID>" state
# Expected output: ESCALATED

redis-cli HGET "session:<SESSION_ID>" escalation_at
# Expected output: timestamp when transfer occurred

redis-cli HGET "session:<SESSION_ID>" escalation_target
# Expected output: support/1 (or configured target)
```

---

## Section 5: Failure Scenario Testing

### Test 1: Missing asterisk_channel Field

**Setup:**
```bash
redis-cli

# Inject session WITHOUT asterisk_channel
HSET "session:test-missing-channel" \
  sessionId "test-missing-channel" \
  agentId "agent-1" \
  channel "VOICE" \
  state "RUNNING"
```

**Trigger Handoff:**
```bash
curl -X POST http://localhost:3000/api/agent-os/agents/test/flow \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-missing-channel",
    "nodes": [{
      "type": "handoff",
      "reason": "escalation"
    }]
  }'
```

**Expected Response:**
```json
{
  "ok": false,
  "code": 400,
  "message": "No Asterisk channel available for transfer",
  "sessionState": "ESCALATION_FAILED"
}
```

**Verify:**
```bash
redis-cli HGET "session:test-missing-channel" state
# Expected: ESCALATION_FAILED

redis-cli HGET "session:test-missing-channel" escalation_error
# Expected: "No Asterisk channel available"
```

### Test 2: No Handoff Target Configured

**Setup:**
```bash
redis-cli

HSET "session:test-no-target" \
  asterisk_channel "PJSIP/test-00001" \
  agentId "agent-1" \
  state "RUNNING"

# Ensure governance.handoff.enabled = false or no valid target
```

**Trigger Handoff:**
```bash
curl -X POST http://localhost:3000/api/agent-os/agents/test/flow \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-no-target",
    "nodes": [{
      "type": "handoff",
      "reason": "escalation"
    }]
  }'
```

**Expected Response:**
```json
{
  "ok": false,
  "code": 400,
  "message": "No handoff target configured",
  "sessionState": "ESCALATION_FAILED"
}
```

### Test 3: Invalid Asterisk Channel

**Setup:**
```bash
redis-cli

HSET "session:test-invalid-channel" \
  asterisk_channel "PJSIP/ghost-channel-999999-999999" \
  agentId "agent-1" \
  state "RUNNING"
```

**Trigger Handoff:**
```bash
curl -X POST http://localhost:3000/api/agent-os/agents/test/flow \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-invalid-channel",
    "nodes": [{
      "type": "handoff",
      "target": {"context": "support", "exten": "1"}
    }]
  }'
```

**Expected Response:**
```json
{
  "ok": false,
  "code": 502,
  "message": "AMI redirect failed",
  "sessionState": "TRANSFER_FAILED"
}
```

**Verify voice-service logs:**
```
AMI Redirect failed: No such channel
```

### Test 4: Max Handoff Attempts Exceeded

**Setup:**
```bash
redis-cli

HSET "session:test-max-attempts" \
  asterisk_channel "PJSIP/alice-00001" \
  agentId "agent-1" \
  escalation_attempt_count "3" \
  state "RUNNING"
```

**Trigger Handoff:**
```bash
curl -X POST http://localhost:3000/api/agent-os/agents/test/flow \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-max-attempts",
    "nodes": [{
      "type": "handoff",
      "reason": "escalation"
    }]
  }'
```

**Expected Response:**
```json
{
  "ok": false,
  "code": 429,
  "message": "Max handoff attempts exceeded",
  "sessionState": "ESCALATION_BLOCKED"
}
```

---

## Section 6: Database Audit Trail Verification

### Procedure 6.1: Check Session Events Table

**Query for escalation events:**
```sql
-- PostgreSQL
SELECT
  session_id,
  state,
  escalation_reason,
  escalation_target,
  escalation_error,
  escalation_at,
  created_at
FROM session_events
WHERE state LIKE 'ESCALAT%'
ORDER BY created_at DESC
LIMIT 10;
```

**Expected Columns:**
- `session_id`: UUID of session
- `state`: "ESCALATED" or "ESCALATION_FAILED"
- `escalation_reason`: "customer_requested_human", etc.
- `escalation_target`: "support/1"
- `escalation_error`: NULL (on success) or error message (on failure)
- `escalation_at`: Timestamp of transfer
- `created_at`: Record creation time

### Procedure 6.2: Verify Audit Trail Completeness

**Check sequence of events:**
```sql
SELECT
  session_id,
  state,
  escalation_attempt_count,
  created_at
FROM session_events
WHERE session_id = '<SPECIFIC_SESSION_ID>'
ORDER BY created_at ASC;
```

**Expected sequence:**
1. Initial call state (RUNNING)
2. After first handoff attempt: escalation_attempt_count=1
3. After second: count=2
4. After third: count=3
5. Fourth attempt: ESCALATION_BLOCKED (429)

---

## Section 7: Production Readiness Sign-Off

### Operations Checklist

Use this checklist to sign off on production readiness:

```
[ ] Asterisk Manager Configuration
    [ ] [admin] section configured
    [ ] Permissions include call/command
    [ ] AMI listening on port 5038

[ ] voice-service Connectivity
    [ ] Health endpoint responds (200 OK)
    [ ] Transfer endpoint accepts POST
    [ ] voice-service reaches Asterisk AMI

[ ] Session Structure
    [ ] Live sessions have asterisk_channel field
    [ ] Format matches pattern (PJSIP/... or SIP/...)
    [ ] Bridged channel (other_channel) present when applicable

[ ] Handoff Flow
    [ ] Handoff node executes without errors
    [ ] voice-service receives transfer requests
    [ ] AMI Redirect succeeds on valid channels
    [ ] Session.state updated to ESCALATED
    [ ] AI loop halted (flow returns stop signal)

[ ] Error Handling
    [ ] Missing channel → ESCALATION_FAILED (400)
    [ ] No target → ESCALATION_FAILED (400)
    [ ] Invalid channel → TRANSFER_FAILED (502)
    [ ] Max attempts → ESCALATION_BLOCKED (429)

[ ] Audit Trail
    [ ] Session events written to database
    [ ] escalation_error captured on failure
    [ ] escalation_at recorded on success
    [ ] Complete audit trail for each session

[ ] Dialplan Verification
    [ ] All governance targets exist in extensions.conf
    [ ] Contexts and extensions are valid
    [ ] No typos in context/exten mappings

[ ] Final Verification
    [ ] Executed automated verification script (PASS)
    [ ] Ran all 4 failure scenarios
    [ ] Conducted live call handoff test
    [ ] Reviewed logs for errors
    [ ] Database audit trail verified
```

### Sign-Off

**Verified By**: _________________
**Date**: _________________
**Status**: ☐ GO | ☐ NO-GO

**Issues (if NO-GO)**:
```
1. _________________________________
2. _________________________________
3. _________________________________
```

**Notes**:
```
_________________________________________________
_________________________________________________
_________________________________________________
```

---

## Support & Escalation

**For issues during manual verification:**

1. Check logs:
   - voice-service logs: `/var/log/voice-service/` or docker logs
   - Asterisk logs: `/var/log/asterisk/full`
   - Workers logs: DigitalOcean App Platform dashboard

2. Common issues:
   - "No such channel" on valid channels: Verify channel name in Redis
   - "Permission denied" on Asterisk: Check manager.conf write permissions
   - "Connection refused": Verify ports are open and services running
   - "Max attempts exceeded" on first try: Check escalation_attempt_count initialization

3. Contact:
   - Platform team (on-call)
   - Asterisk admin (for dialplan issues)
   - Operations (for infrastructure)

---

## Appendix: Useful Commands

```bash
# Asterisk
asterisk -rx "core show manager"              # Show manager status
asterisk -rx "channel show all"               # Show all channels
asterisk -rx "queue show support_queue"       # Show queue status
asterisk -rx "dialplan show support"          # Show context dialplan

# Redis
redis-cli KEYS "session:*"                    # List all sessions
redis-cli HGETALL "session:<id>"              # Get full session
redis-cli HGET "session:<id>" asterisk_channel # Get channel
redis-cli HSET "session:<id>" state RUNNING   # Set session state

# PostgreSQL
psql -U dbuser -d dbname -c "SELECT * FROM session_events ORDER BY created_at DESC LIMIT 10;"

# Network
telnet voice000.epic.dm 5038                  # Test Asterisk AMI port
curl -v http://voice000.epic.dm:8000/health  # Test voice-service
```

---

**End of Manual Verification Procedures**
