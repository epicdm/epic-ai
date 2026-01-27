# Transfer Tool Adapter v1 - Verification Scripts

**Purpose**: Automated and manual verification of Transfer Tool Adapter v1 implementation against voice000.epic.dm

**Status**: v1.0.0 Production Ready | Last Updated: 2026-01-26

---

## Overview

Transfer Tool Adapter v1 implements complete call handoff functionality from AI agents to human support. This directory contains verification scripts to ensure the system is functioning correctly before production deployment.

### What Gets Verified

- ✅ Asterisk Manager Interface (AMI) connectivity
- ✅ voice-service Flask endpoint health and functionality
- ✅ Redis session structure and channel field mapping
- ✅ Flow node integration with handoff logic
- ✅ Runtime safety guards (prevents infinite loops, re-escalation, etc.)
- ✅ Database audit trail logging
- ✅ All failure scenarios handled gracefully

---

## Scripts

### 1. `verify-transfer-tool-v1.py`

**Language**: Python 3.7+
**Type**: Automated verification with detailed reporting
**Runtime**: ~2-3 minutes

#### Purpose
Comprehensive automated verification with:
- Network connectivity checks
- HTTP endpoint testing
- Response validation
- Detailed console output
- Optional JSON report export

#### Usage

**Basic verification:**
```bash
python3 verify-transfer-tool-v1.py --voice-host voice000.epic.dm
```

**With all options:**
```bash
python3 verify-transfer-tool-v1.py \
  --voice-host voice000.epic.dm \
  --voice-port 8000 \
  --redis-host redis.example.com \
  --redis-port 6379 \
  --asterisk-host voice000.epic.dm \
  --asterisk-port 5038 \
  --timeout 5 \
  --report verification-results.json
```

#### Options
```
--voice-host HOST          voice-service hostname (default: voice000.epic.dm)
--voice-port PORT          voice-service port (default: 8000)
--redis-host HOST          Redis hostname (default: localhost)
--redis-port PORT          Redis port (default: 6379)
--asterisk-host HOST       Asterisk hostname (default: 127.0.0.1)
--asterisk-port PORT       Asterisk AMI port (default: 5038)
--timeout SECONDS          Request timeout (default: 5)
--report FILEPATH          Export results to JSON file
```

#### Output

**Console Output**:
```
══════════════════════════════════════════════════════════════════
  Transfer Tool Adapter v1 - Advanced Verification
══════════════════════════════════════════════════════════════════

Configuration:
  voice-service: http://voice000.epic.dm:8000
  Redis: localhost:6379
  Asterisk: voice000.epic.dm:5038

══════════════════════════════════════════════════════════════════
  PHASE 1: Pre-Flight Checklist
══════════════════════════════════════════════════════════════════

✓ PASS Asterisk AMI Port Accessible
       voice000.epic.dm:5038

✓ PASS voice-service Port Accessible
       voice000.epic.dm:8000

[... more checks ...]

══════════════════════════════════════════════════════════════════
  VERIFICATION SUMMARY
══════════════════════════════════════════════════════════════════

Passed:   X
Failed:   Y
Warnings: Z
Elapsed:  2.34s

✅ GO - System ready for deployment
```

**JSON Report** (if --report specified):
```json
{
  "timestamp": "2026-01-26T14:30:00.000000",
  "duration_seconds": 2.34,
  "summary": {
    "passed": 10,
    "failed": 0,
    "warnings": 3,
    "total": 13
  },
  "checks": [
    {
      "status": "PASS",
      "name": "voice-service Health Endpoint",
      "details": "Status: OK, Response time: 0.023s",
      "timestamp": "2026-01-26T14:30:00.000000"
    },
    ...
  ]
}
```

#### Exit Codes
- `0`: All checks passed (GO)
- `1`: Some checks failed (NO-GO)

---

### 2. `verify-transfer-tool-v1.sh`

**Language**: Bash
**Type**: Automated verification with color-coded output
**Runtime**: ~2-3 minutes

#### Purpose
Shell script version for environments where Python may not be available or preferred. Provides:
- Network connectivity checks
- Service port verification
- Basic API testing
- Color-coded Pass/Fail/Warn output

#### Usage

**Basic verification:**
```bash
bash verify-transfer-tool-v1.sh --voice-host voice000.epic.dm
```

**With all options:**
```bash
bash verify-transfer-tool-v1.sh \
  --voice-host voice000.epic.dm \
  --voice-port 8000 \
  --redis-host redis.example.com \
  --redis-port 6379 \
  --asterisk-host voice000.epic.dm \
  --asterisk-port 5038
```

#### Options
Same as Python version (see above)

#### Output
Similar to Python version, with ANSI color codes:
- Green: ✓ PASS
- Red: ✗ FAIL
- Yellow: ⚠ WARN

---

## Related Documentation

### Quick Reference
**File**: `../operations/VERIFICATION-QUICKSTART.md`
- TL;DR for busy operations teams
- Quick commands for manual checks
- Expected results summary
- Common issues & fixes

### Full Verification Guide
**File**: `../operations/transfer-tool-verification.md`
- 5 phases of verification
- Detailed step-by-step procedures
- Expected outputs for each phase
- Safety locks and guards overview
- Go/No-Go decision checklist

### Manual Procedures
**File**: `../operations/transfer-tool-manual-verification.md`
- Hands-on procedures requiring server access
- Step-by-step for each verification phase
- Failure scenario testing (4 test cases)
- Database audit trail verification
- Production readiness sign-off form

### Technical Architecture
**File**: `../build-pack/transfer-tool-adapter-v1.md`
- System architecture overview
- Component descriptions
- Discovery notes (field paths, session structure)
- Policy-based target resolution
- Error scenarios reference
- Testing and debugging information

---

## Verification Workflow

### Step 1: Automated Checks (2-3 min)
```bash
# Run automated script
python3 verify-transfer-tool-v1.py --voice-host voice000.epic.dm --report results.json

# Review results:
# - Green ✓: Check passed
# - Red ✗: Issue found
# - Yellow ⚠: Warning/manual verification needed
```

### Step 2: Manual Procedures (~45 min)
If automated checks pass, execute manual verification:
1. Verify Asterisk manager.conf configuration
2. Check voice-service connectivity directly
3. Inspect Redis session structure during live call
4. Conduct flow-level integration test
5. Execute failure scenario tests (4 scenarios)
6. Verify database audit trail

**See**: `../operations/transfer-tool-manual-verification.md`

### Step 3: Sign-Off
Document results in verification checklist:
- [ ] GO - Ready for production
- [ ] NO-GO - Issues to resolve

**See**: `../operations/transfer-tool-verification.md` Section PHASE 4

---

## Quick Start Examples

### Scenario 1: Verify voice000.epic.dm Before Production
```bash
# From development machine with network access to voice000.epic.dm
cd /opt/epic-ai

# 1. Run automated checks
python3 scripts/verify-transfer-tool-v1.py \
  --voice-host voice000.epic.dm \
  --redis-host redis.prod.example.com \
  --asterisk-host voice000.epic.dm \
  --report pre-deployment-verification.json

# 2. Review report
cat pre-deployment-verification.json | jq .

# 3. If all PASS, proceed to manual verification on voice server
ssh admin@voice000.epic.dm
# Follow manual procedures from transfer-tool-manual-verification.md
```

### Scenario 2: Regular Health Check
```bash
# Quick daily health check (2 min)
python3 scripts/verify-transfer-tool-v1.py --voice-host voice000.epic.dm

# Expected output: "✅ GO - System ready for deployment"
```

### Scenario 3: Debugging Production Issue
```bash
# Detailed verification with timeout increased
python3 scripts/verify-transfer-tool-v1.py \
  --voice-host voice000.epic.dm \
  --timeout 10 \
  --report debug-$(date +%s).json

# Check JSON report for specific failure details
cat debug-*.json | jq '.checks[] | select(.status=="FAIL")'
```

---

## Key Verification Points

### Pre-Flight Checklist
- [ ] Asterisk AMI port (5038) accessible
- [ ] voice-service port (8000) accessible
- [ ] Redis accessible from workers
- [ ] PostgreSQL accessible from workers

### Voice-Service Tests
- [ ] Health endpoint returns 200 OK
- [ ] Transfer endpoint accepts POST requests
- [ ] Dry-run transfer generates expected "No such channel" error

### Session Structure Tests
- [ ] Redis sessions contain `asterisk_channel` field
- [ ] Channel format matches expected pattern
- [ ] Bridged channel (`asterisk_other_channel`) optional but present in bridge scenarios

### Flow Integration Tests
- [ ] Handoff node executes without errors
- [ ] voice-service receives transfer request
- [ ] Session state updated to ESCALATED
- [ ] AI loop halted (stop signal returned)

### Safety Guard Tests
- [ ] Max handoff attempts (3) prevents infinite loops
- [ ] Already escalated check prevents re-escalation
- [ ] Agent eligibility gate prevents handoff for no agent
- [ ] Target validation gate ensures valid context/exten

### Audit Trail Tests
- [ ] Session events written to database
- [ ] escalation_error captured on failure
- [ ] escalation_at timestamp recorded on success
- [ ] Complete history available for each session

---

## Troubleshooting

### Script Won't Run
```bash
# Check Python version
python3 --version  # Requires 3.7+

# Install requests module if needed
pip3 install requests

# For shell script, ensure bash is available
bash --version  # Requires bash 4+
```

### Network Connectivity Issues
```bash
# Test basic connectivity
ping voice000.epic.dm
telnet voice000.epic.dm 8000  # voice-service
telnet voice000.epic.dm 5038  # Asterisk AMI

# DNS resolution
nslookup voice000.epic.dm
```

### Voice-Service Not Responding
```bash
# Check if service is running
ps aux | grep voice-service

# Check logs
docker logs voice-service  # if containerized
tail -f /var/log/voice-service/app.log  # if systemd

# Check port
netstat -tlnp | grep 8000
```

### Redis Connection Failed
```bash
# Test Redis connectivity
redis-cli -h redis.example.com ping

# If using environment variable
echo $REDIS_URL
redis-cli -u "$REDIS_URL" ping
```

### Asterisk AMI Connection Failed
```bash
# Check Asterisk is running
ps aux | grep asterisk

# Check manager.conf
cat /etc/asterisk/manager.conf | grep -A 10 "\[admin\]"

# Reload manager
asterisk -rx "core reload manager"
```

---

## Output Interpretation

### Color Codes
| Color | Meaning |
|-------|---------|
| 🟢 Green | Check passed - Everything OK |
| 🔴 Red | Check failed - Issue found |
| 🟡 Yellow | Warning - Manual verification needed |
| 🔵 Blue | Info - Informational message |

### Common Results

**✅ All Green (GO)**
```
Passed:   12
Failed:   0
Warnings: 2
```
System is ready for production deployment.

**⚠️ Some Warnings (GO)**
```
Passed:   10
Failed:   0
Warnings: 4
```
System is OK. Warnings typically indicate:
- Cannot verify without live call (expected)
- Redis session needs direct inspection (expected)
- These do not block deployment

**❌ Failures (NO-GO)**
```
Passed:   8
Failed:   2
Warnings: 1
```
Issues must be resolved before deployment. Review:
1. Error messages in console output
2. Details in JSON report
3. Corresponding section in `transfer-tool-manual-verification.md`

---

## Integration with CI/CD

### Pre-Deployment Verification
```bash
#!/bin/bash
# Run before deploying voice-service update

set -e

echo "Running Transfer Tool Adapter verification..."
python3 scripts/verify-transfer-tool-v1.py \
  --voice-host voice000.epic.dm \
  --report ci-verification.json

# Check for failures
FAILED=$(jq '.summary.failed' ci-verification.json)
if [ "$FAILED" -gt 0 ]; then
  echo "Verification FAILED - $FAILED issues"
  cat ci-verification.json | jq '.checks[] | select(.status=="FAIL")'
  exit 1
fi

echo "Verification PASSED - Safe to deploy"
exit 0
```

### GitHub Actions Example
```yaml
- name: Verify Transfer Tool v1
  run: |
    python3 scripts/verify-transfer-tool-v1.py \
      --voice-host voice000.epic.dm \
      --report verification-${{ github.run_number }}.json

- name: Check Verification Results
  run: |
    if jq -e '.summary.failed > 0' verification-*.json; then
      echo "Verification failed"
      exit 1
    fi
```

---

## Performance Considerations

| Script | Time | Network Calls | Resource Usage |
|--------|------|---------------|----------------|
| Python | 2-3s | ~10 requests | <50MB RAM |
| Shell | 2-3s | ~8 requests | <10MB RAM |
| Manual | 45-55m | Variable | Operator time |

**Recommendation**: Run automated scripts in CI/CD on every deployment. Run manual procedures monthly or before major releases.

---

## Support

**Issues or questions?**

1. Check this README
2. Review `VERIFICATION-QUICKSTART.md` for common issues
3. See `transfer-tool-manual-verification.md` troubleshooting section
4. Contact Platform Team (on-call)

**Report bugs:**
- GitHub Issues: `/epic-ai/issues`
- Slack: `#platform-voice`
- Email: platform-oncall@epic.dm

---

**Version**: 1.0.0
**Last Updated**: 2026-01-26
**For**: Transfer Tool Adapter v1 on voice000.epic.dm
