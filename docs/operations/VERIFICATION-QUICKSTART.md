# Transfer Tool Adapter v1 - Verification Quick Start

**Quick reference for operations team**

---

## TL;DR - Fast Path

```bash
# 1. Run automated checks
cd /opt/epic-ai
python3 scripts/verify-transfer-tool-v1.py --voice-host voice000.epic.dm

# 2. Export results
python3 scripts/verify-transfer-tool-v1.py --voice-host voice000.epic.dm \
  --report verification-results.json

# 3. Manual execution checklist
# Follow: docs/operations/transfer-tool-manual-verification.md
```

---

## What's Being Verified?

| Component | Purpose | Status |
|-----------|---------|--------|
| **Asterisk AMI** | Channel redirect capability | ✅ Verify |
| **voice-service** | HTTP ↔ AMI bridge | ✅ Verify |
| **Session Mapping** | Channel field in Redis | ✅ Verify |
| **Flow Integration** | Handoff node execution | ✅ Verify |
| **Safety Guards** | Prevent infinite loops | ✅ Verify |
| **Audit Trail** | Database event logging | ✅ Verify |

---

## Pre-Verification Checklist

- [ ] SSH access to voice000.epic.dm
- [ ] Redis CLI available (or remote access configured)
- [ ] PostgreSQL client (psql) installed
- [ ] Python 3.7+ with requests module
- [ ] Network access to:
  - voice000.epic.dm:8000 (voice-service)
  - voice000.epic.dm:5038 (Asterisk AMI)
  - Redis host/port
  - PostgreSQL host/port

---

## Quick Commands

### Health Check
```bash
# Is voice-service running?
curl http://voice000.epic.dm:8000/health

# Is Asterisk reachable?
telnet voice000.epic.dm 5038
# (Type Ctrl+] then quit to exit)

# Is Redis accessible?
redis-cli -h redis.host.com ping
```

### Test Transfer Endpoint
```bash
curl -X POST http://voice000.epic.dm:8000/telephony/transfer \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "PJSIP/test-00000001",
    "context": "default",
    "exten": "1"
  }'

# Expected: Error about "No such channel" (GOOD!)
```

### Inspect Live Session
```bash
redis-cli HGETALL "session:<SESSION_ID>"

# Look for:
# - asterisk_channel (REQUIRED)
# - asterisk_other_channel (OPTIONAL)
# - state (should be RUNNING)
# - agentId (should not be empty)
```

### Check Database Events
```bash
psql -U $DB_USER -d $DB_NAME -c \
  "SELECT session_id, state, escalation_target, created_at
   FROM session_events
   WHERE state LIKE 'ESCALAT%'
   ORDER BY created_at DESC LIMIT 5;"
```

---

## Automated Script Usage

### Option 1: Basic Check
```bash
python3 scripts/verify-transfer-tool-v1.py --voice-host voice000.epic.dm
```

**Output**: Pass/Fail status for each check

### Option 2: Full Verification with Report
```bash
python3 scripts/verify-transfer-tool-v1.py \
  --voice-host voice000.epic.dm \
  --redis-host redis.example.com \
  --asterisk-host voice000.epic.dm \
  --report verification-2026-01-26.json
```

**Output**:
- Console output showing each check
- JSON report file for record-keeping

### Option 3: Shell Script
```bash
bash scripts/verify-transfer-tool-v1.sh --voice-host voice000.epic.dm
```

---

## Manual Verification Steps

**Note**: These require direct server access and should be done after automated checks

### Step 1: Asterisk Manager Config (5 min)
```bash
ssh admin@voice000.epic.dm
cat /etc/asterisk/manager.conf | grep -A 10 "\\[admin\\]"
# Verify: secret set, write=all or includes originate/command
```

### Step 2: Manager User Status (2 min)
```bash
asterisk -rx "core show manager"
# Verify: admin user appears in list
```

### Step 3: Live Session Inspection (5 min)
```bash
# During active call:
redis-cli HGETALL "session:<ID>"
# Verify: asterisk_channel field present and formatted correctly
```

### Step 4: Live Handoff Test (10 min)
```bash
# Create test call
# Trigger handoff node
# Monitor logs and verify channel transferred
```

### Step 5: Failure Scenario Testing (15 min)
```bash
# Run 4 failure tests (see manual-verification.md):
# 1. Missing asterisk_channel
# 2. No handoff target
# 3. Invalid channel
# 4. Max attempts exceeded
```

---

## Expected Results Summary

### ✅ On Success (GO)
```
Passed: 8
Failed: 0
Warnings: N/A (informational only)

Health endpoint: 200 OK ✓
Transfer endpoint: Responds ✓
Manager permissions: Verified ✓
```

### ❌ On Failure (NO-GO)
```
Passed: X
Failed: Y > 0
Warnings: N/A

Issues must be resolved before production deployment
```

---

## Common Issues & Quick Fixes

| Issue | Quick Fix |
|-------|-----------|
| "Connection refused" on port 8000 | Start voice-service: `docker start voice-service` |
| "No such host" on voice000.epic.dm | Verify hostname/DNS resolution |
| "Permission denied" in manager.conf | Check file permissions: `sudo cat /etc/asterisk/manager.conf` |
| "Cannot connect to Redis" | Verify Redis host/port and network access |
| "No asterisk_channel in session" | Session creation not populating field - check runtime logs |

---

## Sign-Off Document

After completing all verification steps, fill out:

**File**: `/opt/epic-ai/docs/operations/transfer-tool-verification.md`
**Section**: PHASE 4 - Operations Checklist

Marks both:
- [ ] ✅ GO - Ready for production
- [ ] ❌ NO-GO - Issues to resolve

---

## Verification Timeline

- **Automated Script**: ~2-3 minutes
- **Manual Steps**: ~40-50 minutes total
  - Asterisk config: 5 min
  - Manager user: 2 min
  - Session inspection: 5 min
  - Live handoff test: 10 min
  - Failure scenarios: 15 min
  - Database verification: 10 min

**Total First-Time Verification**: ~45-55 minutes

---

## Documentation References

- **Full Verification Guide**: `transfer-tool-verification.md`
- **Manual Procedures**: `transfer-tool-manual-verification.md`
- **Technical Architecture**: `../build-pack/transfer-tool-adapter-v1.md`
- **Troubleshooting**: See "Troubleshooting" section in verification.md

---

## Support & Escalation

**Questions during verification?**

1. Check troubleshooting guide in `transfer-tool-verification.md`
2. Review relevant manual procedure in `transfer-tool-manual-verification.md`
3. Contact Platform Team (on-call)
4. Email: platform-oncall@epic.dm

**After GO/NO-GO Decision:**

- **GO**: Document in this file, notify deployment team
- **NO-GO**: Document issues, create tickets, schedule retry

---

**Version**: 1.0.0 | **Last Updated**: 2026-01-26
**For**: voice000.epic.dm Transfer Tool Adapter v1
