# DTMF-First Voice Service v1 - Setup Guide

Ship this week with deterministic DTMF interactions while building ASR properly.

## Architecture

```
┌─────────────┐
│  Caller     │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│  Asterisk PBX (Call Controller)                         │
│                                                          │
│  1. Gate + Route (/telephony/inbound-start)            │
│  2. Play greeting (local TTS)                           │
│  3. DTMF menu loop:                                     │
│     - Wait for keypress                                 │
│     - Call /telephony/dtmf                              │
│     - Speak response                                    │
│  4. Fallback: record voicemail (/telephony/record)     │
│  5. Hangup notification (/telephony/hangup)            │
└──────┬──────────────────────────────────────────────────┘
       │ HTTP/JSON
       ▼
┌─────────────────────────────────────────────────────────┐
│  Voice Service (Flask)                                   │
│                                                          │
│  Routes:                                                 │
│  • /telephony/inbound-start → InboundCallGuard         │
│  • /telephony/dtmf          → AgentRuntimeClient        │
│  • /telephony/record        → Save + queue transcribe   │
│  • /telephony/hangup        → Cleanup + analytics       │
└──────┬──────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│  Epic AI Agent Runtime                                   │
│  POST /api/agent-os/runtime/turn                        │
│                                                          │
│  Input: DTMF intent ("Caller pressed 1 for sales...")  │
│  Output: Response text + action (continue/transfer)     │
└─────────────────────────────────────────────────────────┘
```

## Why DTMF-First?

✅ **Ships immediately** - No ASR dependency
✅ **Deterministic** - Keypresses are reliable
✅ **Zero latency** - No STT delays
✅ **Still feels AI** - Prompts come from agent config
✅ **Searchable logs** - Every interaction is structured
✅ **Upgrade path** - Add ASR later without rewriting

## Installation

### 1. Install Asterisk Dependencies

```bash
# On your Asterisk server
apt-get update
apt-get install -y \
  sox \
  libsox-fmt-all \
  jq \
  curl \
  libttspico-utils

# Test TTS
pico2wave -l en-US -w /tmp/test.wav "Hello, this is Epic AI."
play /tmp/test.wav
```

### 2. Configure Asterisk

Copy the dialplan:

```bash
# On Asterisk server
cp asterisk/extensions.conf /etc/asterisk/extensions_epic.conf

# Include in main dialplan
echo '#include "extensions_epic.conf"' >> /etc/asterisk/extensions.conf

# Update globals
nano /etc/asterisk/extensions_epic.conf
# Set VOICE_SERVICE_URL to your voice-service endpoint
```

Reload dialplan:

```bash
asterisk -rx "dialplan reload"
```

### 3. Route DIDs to Epic Context

In your SIP trunk configuration (`/etc/asterisk/sip.conf` or `pjsip.conf`):

```ini
[your-trunk]
type=friend
host=your-sip-provider.com
...
context=epic-inbound   ; <-- Route inbound calls to Epic context
```

Or for specific DIDs in `extensions.conf`:

```ini
[from-pstn]
exten => 15551234567,1,Goto(epic-inbound,${EXTEN},1)
```

### 4. Start Voice Service

```bash
cd /opt/epic-ai/apps/voice-service

# Add to .env
echo "RECORDING_DIR=/var/spool/asterisk/recordings" >> .env

# Create recording directory
mkdir -p /var/spool/asterisk/recordings
chmod 755 /var/spool/asterisk/recordings

# Start service
python main.py
```

### 5. Register Routes in Flask App

Edit `main.py`:

```python
from routes.telephony_inbound import telephony_bp

# Register blueprint
app.register_blueprint(telephony_bp)
```

## Testing

### 1. Test Gate + Route

```bash
curl -X POST http://localhost:8000/telephony/inbound-start \
  -H "Content-Type: application/json" \
  -d '{
    "did": "15551234567",
    "from": "15559876543",
    "callId": "test-call-123"
  }'
```

Expected response (if DID is configured):
```json
{
  "action": "connect",
  "sessionId": "uuid-here",
  "agentId": "agent_xxx",
  "greeting": "Hello! Welcome to Epic AI...",
  "dtmfMenu": {
    "prompt": "Press 1 for sales, 2 for support...",
    "options": {
      "1": "Sales / New booking",
      "2": "Support",
      "3": "Hours / Location / Pricing",
      "0": "Speak to an operator"
    },
    "timeout": 10
  }
}
```

Or (if blocked):
```json
{
  "action": "reject",
  "message": "This line is temporarily unavailable..."
}
```

### 2. Test DTMF Handler

```bash
# Use sessionId from previous response
curl -X POST http://localhost:8000/telephony/dtmf \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "your-session-id",
    "digit": "1",
    "callId": "test-call-123"
  }'
```

Expected response:
```json
{
  "text": "Great! Let me connect you with our sales team...",
  "action": "continue"
}
```

### 3. Test Live Call

1. Call your DID from a phone
2. Hear greeting
3. Press 1, 2, 3, or 0
4. Hear response from agent runtime
5. Check logs:

```bash
tail -f /var/log/asterisk/full
tail -f voice-service.log
```

## DTMF Menu Configuration

The agent runtime can return custom DTMF menus in metadata:

```json
{
  "text": "Welcome! I can help with several things.",
  "metadata": {
    "dtmfMenu": {
      "prompt": "Press 1 for X, 2 for Y, 3 for Z",
      "options": {
        "1": "Option X description",
        "2": "Option Y description",
        "3": "Option Z description"
      },
      "timeout": 10,
      "maxRetries": 3
    }
  }
}
```

## Call Flow Examples

### Example 1: Sales Call

```
Caller dials → Gate check → Pass
Asterisk: "Hello! Press 1 for sales, 2 for support..."
Caller: [presses 1]
Runtime: "Great! I'll connect you with our sales team. Can I get your name?"
Caller: [presses *] (back to menu)
Asterisk: "Press 1 for sales, 2 for support..."
Caller: [presses 0]
Runtime: "Transferring you to an operator now..."
Asterisk: [transfers to operator]
```

### Example 2: Voicemail Fallback

```
Caller dials → Gate check → Pass
Asterisk: "Hello! Press 1 for sales, 2 for support..."
Caller: [no input]
Asterisk: "I didn't catch that. Please try again."
Asterisk: "Press 1 for sales, 2 for support..."
Caller: [no input]
Asterisk: "I didn't catch that. Please try again."
Asterisk: "Press 1 for sales, 2 for support..."
Caller: [no input]
Asterisk: "Please briefly describe what you need after the tone."
Caller: "I'd like to book a demo for next week..."
Asterisk: "Thank you for your message. We'll get back to you shortly. Goodbye!"
```

## Environment Variables

Add to `.env`:

```bash
# Recording storage
RECORDING_DIR=/var/spool/asterisk/recordings

# Optional: External TTS service (if not using PicoTTS)
# ELEVEN_API_KEY=your-elevenlabs-key

# Runtime API (already configured)
RUNTIME_API_URL=http://localhost:3000
VOICE_RUNTIME_API_KEY=your-api-key
```

## Monitoring

### Key Metrics to Track

1. **Gate decisions**
   - Allowed vs. blocked calls
   - Block reasons

2. **DTMF interactions**
   - Which options are most used
   - Average turns per call
   - Timeout → voicemail rate

3. **Call outcomes**
   - Completed vs. abandoned
   - Transfer rate
   - Average call duration

### Log Patterns

```bash
# Watch gate decisions
grep "InboundStart" voice-service.log

# Watch DTMF selections
grep "DTMF" voice-service.log

# Watch recordings
grep "Record" voice-service.log

# Watch hangups
grep "Hangup" voice-service.log
```

## Production Checklist

- [ ] PicoTTS installed and tested
- [ ] Asterisk dialplan configured
- [ ] DIDs routed to epic-inbound context
- [ ] Voice service running
- [ ] Recording directory created with correct permissions
- [ ] Health check endpoint `/api/telephony/health-check` deployed
- [ ] Runtime turn endpoint `/api/agent-os/runtime/turn` deployed
- [ ] Test calls completed successfully
- [ ] Monitoring/alerting configured
- [ ] Voicemail transcription job queue set up (async)

## Upgrade Path (v2: Real-time ASR)

When ready to add real-time ASR:

1. **Keep DTMF as fallback** - Don't remove it
2. **Add Asterisk → LiveKit bridge**
   - Option A: ExternalMedia (ARI)
   - Option B: SIP trunk → WebRTC gateway
3. **Use route_to_agent adapter** (already built)
4. **Progressive rollout**
   - Start with % of calls
   - Compare DTMF vs ASR performance
   - Gradually increase ASR %

## Troubleshooting

**Issue**: Asterisk can't reach voice-service
- Check: `VOICE_SERVICE_URL` in dialplan
- Check: Firewall rules
- Test: `curl http://localhost:8000/health`

**Issue**: TTS not working
- Check: PicoTTS installed (`which pico2wave`)
- Test: `pico2wave -l en-US -w test.wav "test" && play test.wav`
- Check: `/tmp` write permissions

**Issue**: DTMF not detected
- Check: Asterisk console (`asterisk -rvvv`)
- Check: DTMF mode in SIP trunk (RFC2833 recommended)
- Test: Dial in and watch console for DTMF events

**Issue**: Recordings not saved
- Check: `RECORDING_DIR` exists and is writable
- Check: Disk space (`df -h`)
- Check: Asterisk user permissions

**Issue**: Gate always blocks
- Check: DID is configured in database
- Check: Agent is PUBLISHED or TESTING
- Check: Health check endpoint is reachable
- Test: `curl http://localhost:3000/api/telephony/health-check?did=15551234567`

---

**Version**: 1.0.0
**Target**: Ship this week
**Next**: Real-time ASR via LiveKit (v2)
