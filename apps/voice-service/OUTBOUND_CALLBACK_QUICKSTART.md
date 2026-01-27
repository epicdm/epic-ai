# Outbound Callback - Quick Start Guide

## 🚀 5-Minute Setup

### 1. Configure Asterisk AMI

Edit `/etc/asterisk/manager.conf`:
```ini
[general]
enabled = yes
port = 5038

[epic_ami]
secret = YOUR_STRONG_PASSWORD
read = system,call,log,verbose,command,agent,user,originate
write = system,call,log,verbose,command,agent,user,originate
permit = YOUR_WORKER_IP/32
```

Reload:
```bash
asterisk -rx "manager reload"
```

---

### 2. Configure Workers

Edit `apps/workers/.env`:
```bash
ASTERISK_AMI_HOST=your-asterisk-ip
ASTERISK_AMI_PORT=5038
ASTERISK_AMI_USER=epic_ami
ASTERISK_AMI_PASS=YOUR_STRONG_PASSWORD

ASTERISK_OUTBOUND_TRUNK=your-pjsip-trunk
ASTERISK_OUTBOUND_CID=+17675550000

VOICE_SERVICE_FASTAGI_HOST=voice-service
VOICE_SERVICE_FASTAGI_PORT=4573
```

---

### 3. Configure Voice Service

Edit `apps/voice-service/.env`:
```bash
FASTAGI_HOST=0.0.0.0
FASTAGI_PORT=4573
```

---

### 4. Start Services

```bash
# Terminal 1: Web app
pnpm --filter web dev

# Terminal 2: Workers
pnpm --filter @epic-ai/workers dev

# Terminal 3: FastAGI server
cd apps/voice-service
python3 fastagi_server.py

# Terminal 4: Main voice service (if using inbound too)
python3 main.py
```

---

### 5. Test It

#### Test AMI Connection
```bash
nc -vz $ASTERISK_AMI_HOST 5038
```

#### Trigger Test Callback
```bash
curl -X POST http://localhost:3000/api/telephony/callback/enqueue \
  -H "Content-Type: application/json" \
  -d '{
    "voiceAgentId": "va_test",
    "sessionId": "s_test",
    "caller": "+17675551234",
    "callbackTimeIso": "'$(date -u -d '+1 minute' +%Y-%m-%dT%H:%M:%SZ)'"
  }' | jq
```

#### Watch Logs
```bash
# Workers
tail -f apps/workers/logs/worker.log

# Voice service
tail -f apps/voice-service/logs/voice.log

# Asterisk
asterisk -rx "core set verbose 5"
```

---

## 🔍 Expected Output

### Workers Log
```
[callback.requested] processing { jobId: '123', caller: '+17675551234' }
[callback.requested] connecting to AMI
[callback.requested] originating call
[callback.requested] originate response { response: 'Success' }
```

### Asterisk CLI
```
-- Executing AGI("PJSIP/+17675551234-00000001", "agi://voice-service:4573/route_to_agent?...")
```

### Voice Service Log
```
[FastAGI] Incoming request: /route_to_agent
[AGI:RouteToAgent] Starting - voiceAgentId=va_test
[CreateAGISession] Session created
[AGISessionLoop] Starting
[AGI:Speak] Hi there. Thanks for calling...
```

---

## ✅ Verification Checklist

- [ ] AMI port 5038 is accessible from workers
- [ ] AMI login works (test with telnet/nc)
- [ ] FastAGI port 4573 is accessible from Asterisk
- [ ] PJSIP trunk is registered (`asterisk -rx "pjsip show endpoints"`)
- [ ] Workers can connect to web API
- [ ] Redis is running and accessible
- [ ] PostgreSQL is running and accessible

---

## 🐛 Common Issues

### "AMI timeout"
- Check `ASTERISK_AMI_HOST` and `ASTERISK_AMI_PORT`
- Verify firewall allows port 5038
- Test: `nc -vz $ASTERISK_AMI_HOST 5038`

### "Unable to connect to agi://..."
- Check FastAGI server is running: `ps aux | grep fastagi`
- Verify port 4573 is open
- Test from Asterisk: `nc -vz voice-service 4573`

### "Extension does not exist"
- Check PJSIP trunk: `asterisk -rx "pjsip show endpoints"`
- Verify trunk name matches `ASTERISK_OUTBOUND_TRUNK`
- Check number format (should be E.164: +17675551234)

### "No DTMF collected"
- Increase timeout in flow config
- Check DTMF method (RFC2833 vs inband)
- Verify codec supports DTMF

---

## 📞 Manual Test Call

Use the test script:
```bash
./apps/voice-service/scripts/test_ami_originate.sh +17675551234
```

Or manually via AMI:
```bash
(
  echo "Action: Login"
  echo "Username: epic_ami"
  echo "Secret: YOUR_PASSWORD"
  echo "Events: off"
  echo ""
  sleep 1
  echo "Action: Originate"
  echo "Channel: PJSIP/+17675551234@trunk"
  echo "CallerID: +17675550000"
  echo "Application: AGI"
  echo "Data: agi://voice-service:4573/route_to_agent?voiceAgentId=test"
  echo ""
  sleep 2
) | nc $ASTERISK_AMI_HOST 5038
```

---

## 🔧 Useful Asterisk Commands

```bash
# Check AMI status
asterisk -rx "manager show users"

# Check PJSIP endpoints
asterisk -rx "pjsip show endpoints"

# Check active channels
asterisk -rx "core show channels"

# Enable verbose logging
asterisk -rx "core set verbose 5"

# Enable AMI debug
asterisk -rx "manager set debug on"

# Check DTMF
asterisk -rx "dtmf show"
```

---

## 📚 Full Documentation

- **Implementation Guide:** `apps/voice-service/OUTBOUND_CALLBACK_V1.md`
- **Summary:** `/opt/epic-ai/OUTBOUND_CALLBACK_V1_SUMMARY.md`
- **Callback Queue:** `apps/voice-service/CALLBACK_QUEUE_V1.md`

---

## 🎯 Quick Architecture

```
Callback Job → Workers → AMI → Asterisk → Dial Customer
                                    ↓
                              Customer Answers
                                    ↓
                         AGI: voice-service:4573
                                    ↓
                              DTMF Flow Runtime
                                    ↓
                           (Prompts, DTMF, Tools)
                                    ↓
                              Call Complete
```

---

## Support

If you encounter issues:

1. Check logs (workers, voice-service, asterisk)
2. Verify environment variables
3. Test connectivity (nc, telnet)
4. Review Asterisk configuration
5. Check firewall rules

**Status:** Production-ready for staging/test environments
