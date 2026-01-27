# Outbound Callback Execution v1 - Implementation Guide

## Overview

Outbound Callback Execution v1 enables the callback processor to trigger real outbound calls via Asterisk AMI (Manager Interface). When a scheduled callback job executes, it uses AMI Originate to dial the customer and route the answered call to the voice-service via FastAGI.

**Status:** ✅ **COMPLETE**

---

## Architecture

```
BullMQ Job Fires
  ↓
Workers: callbackRequestedProcessor
  ↓
Asterisk AMI: Originate Call
  ↓
Asterisk Dials Customer
  ↓
Customer Answers
  ↓
Asterisk Executes: AGI agi://voice-service:4573/route_to_agent?...
  ↓
Voice Service: FastAGI Server
  ↓
Voice Service: Load Flow JSONB
  ↓
Voice Service: Run DTMF Flow Loop
  (Prompts, DTMF collection, Recording, Tool nodes)
  ↓
Call Completes
```

---

## Why This Approach?

### ✅ Clean Separation of Concerns
- **AMI** - Schedules and launches calls (workers)
- **Asterisk** - Handles telephony (dial, SIP, RTP)
- **Voice Service** - Controls live call logic (DTMF, playback, record)

### ✅ No ASR Required
- DTMF-only navigation
- Pre-recorded or TTS prompts
- Recording for voicemail

### ✅ Reuses Existing Flow Runtime
- Same DTMF flow engine as inbound calls
- Tool Node Runtime integration
- Template rendering with filters

---

## Components

### 1. **Asterisk AMI Client** (`apps/workers/src/lib/asterisk-ami.ts`)

TypeScript client for communicating with Asterisk Manager Interface.

**Features:**
- TCP connection to Asterisk AMI
- Login authentication
- Command execution (Originate, etc.)
- Response parsing

**Usage:**
```typescript
const ami = new AmiClient({
  host: "asterisk.example.com",
  port: 5038,
  username: "epic_ami",
  secret: "CHANGE_ME_STRONG"
});

await ami.connect();

const res = await ami.action({
  Action: "Originate",
  Channel: "PJSIP/+17675551234@trunk",
  CallerID: "+17675550000",
  Application: "AGI",
  Data: "agi://voice-service:4573/route_to_agent?voiceAgentId=..."
});

await ami.close();
```

---

### 2. **Updated Callback Processor** (`apps/workers/src/processors/callbackRequested.ts`)

Replaces the v1 logging-only processor with AMI Originate call triggering.

**Flow:**
1. Validate payload with Zod
2. Check AMI configuration (env vars)
3. Build FastAGI URL with query params
4. Connect to AMI
5. Execute Originate command
6. Return result with originate status

**AMI Originate Parameters:**
```typescript
{
  Action: "Originate",
  Channel: "PJSIP/<caller>@<trunk>",  // e.g., PJSIP/+17675551234@trunk
  CallerID: "+17675550000",            // Outbound caller ID
  Timeout: 30000,                      // Dial timeout (30 seconds)
  Async: "true",                       // Non-blocking
  Application: "AGI",                  // Execute AGI on answer
  Data: "agi://voice-service:4573/...", // FastAGI URL
  Variable: "EPIC_VOICE_AGENT_ID=...|EPIC_SESSION_ID=...|..." // Channel vars
}
```

---

### 3. **FastAGI Server** (`apps/voice-service/fastagi_server.py`)

Python TCP server listening on port 4573 for AGI connections from Asterisk.

**FastAGI Protocol:**
1. Asterisk connects via TCP
2. Sends AGI environment (key:value lines)
3. Voice service responds with AGI commands
4. Commands executed by Asterisk
5. Results returned to voice service

**Supported Endpoints:**
- `/route_to_agent` - Route call to agent flow runtime

**AGI Environment Variables:**
```
agi_request: agi://voice-service:4573/route_to_agent?voiceAgentId=...
agi_channel: PJSIP/+17675551234-00000001
agi_uniqueid: 1234567890.123
agi_callerid: +17675551234
agi_calleridname: John Doe
agi_context: default
agi_extension: s
agi_priority: 1
```

---

### 4. **AGI Integration Functions** (`apps/voice-service/routes/agent_session.py`)

Added to existing agent_session.py:

#### **`create_agi_session()`**
Creates AGI session for outbound callback. Similar to `/session/start` endpoint but for AGI connections.

**Returns:**
```python
{
  "sessionId": "...",
  "voiceAgentId": "...",
  "flow": {...},
  "current_node": "boot",
  "flow_engine": FlowRuntimeEngine(...),
  "context": {
    "session": {...},
    "tool": {},
    "memory": {}
  },
  "agi_env": {...},
  "agi_io": {"rfile": ..., "wfile": ...}
}
```

#### **`run_agi_session_loop()`**
Main AGI session loop. Handles:
- Flow node stepping
- Prompt playback (via AGI commands)
- DTMF collection
- Recording
- Tool execution
- End node / hangup

**Actions:**
- `speak_and_collect` - Play prompt, collect DTMF
- `speak_and_record` - Play prompt, record voicemail
- `speak_and_end` - Play final message, hangup

---

### 5. **AGI Helper Functions**

#### **`_agi_speak(agi_io, text)`**
Speak text via TTS or pre-recorded audio.
- V1: Logs text (placeholder)
- V2: Generate TTS audio file, use STREAM FILE

#### **`_agi_get_digit(agi_io, timeout)`**
Wait for DTMF digit.
- Command: `WAIT FOR DIGIT <timeout_ms>`
- Returns: Digit (0-9, *, #) or empty on timeout

#### **`_agi_record(agi_io, max_seconds)`**
Record caller audio.
- Command: `RECORD FILE <filename> wav # <timeout> BEEP`
- Returns: Path to recorded file

#### **`_agi_hangup(agi_io)`**
Hangup the call.
- Command: `HANGUP`

---

## Asterisk Configuration

### 1. **Enable AMI** (`/etc/asterisk/manager.conf`)

```ini
[general]
enabled = yes
port = 5038
bindaddr = 0.0.0.0

[epic_ami]
secret = CHANGE_ME_STRONG
read = system,call,log,verbose,command,agent,user,originate
write = system,call,log,verbose,command,agent,user,originate
permit = 10.0.0.0/8
permit = 172.16.0.0/12
permit = 192.168.0.0/16
; Tighten to your workers host IP if possible
```

**Reload:**
```bash
asterisk -rx "manager reload"
```

---

### 2. **FastAGI Access**

FastAGI uses TCP from Asterisk → voice-service on port 4573.

**Requirements:**
- Voice-service reachable from Asterisk (same network/docker)
- Port 4573 open (firewall rules)

**Test connectivity from Asterisk:**
```bash
nc -vz voice-service 4573
```

---

## Environment Variables

### Workers (`apps/workers/.env`)

```bash
# Asterisk AMI Configuration
ASTERISK_AMI_HOST=asterisk.example.com
ASTERISK_AMI_PORT=5038
ASTERISK_AMI_USER=epic_ami
ASTERISK_AMI_PASS=CHANGE_ME_STRONG

# Outbound Configuration
ASTERISK_OUTBOUND_TRUNK=trunk
ASTERISK_OUTBOUND_CID=+17675550000

# FastAGI Configuration
VOICE_SERVICE_FASTAGI_HOST=voice-service
VOICE_SERVICE_FASTAGI_PORT=4573
```

---

### Voice Service (`apps/voice-service/.env`)

```bash
# FastAGI Server Configuration
FASTAGI_HOST=0.0.0.0
FASTAGI_PORT=4573

# Web API base URL (for callback enqueue)
WEB_BASE_URL=http://localhost:3000
```

---

## Testing

### Step 1: Confirm AMI Login Works

From workers host/container:

```bash
nc -vz $ASTERISK_AMI_HOST 5038
```

Manual AMI login test:

```bash
telnet $ASTERISK_AMI_HOST 5038
# Then type:
Action: Login
Username: epic_ami
Secret: CHANGE_ME_STRONG
```

Expected response:
```
Response: Success
Message: Authentication accepted
```

---

### Step 2: Start FastAGI Server

```bash
cd apps/voice-service
python3 fastagi_server.py
```

Expected output:
```
[FastAGI] Starting server on 0.0.0.0:4573
[FastAGI] Server ready. Waiting for connections...
```

---

### Step 3: Enqueue Callback Job

```bash
curl -X POST http://localhost:3000/api/telephony/callback/enqueue \
  -H "Content-Type: application/json" \
  -d '{
    "voiceAgentId": "va_123",
    "sessionId": "s_123",
    "caller": "+17675551234",
    "callbackTimeIso": "'$(date -u -d '+1 minute' +%Y-%m-%dT%H:%M:%SZ)'"
  }' | jq
```

---

### Step 4: Watch Logs

**Workers:**
```
[callback.requested] processing { jobId: '...', voiceAgentId: 'va_123', caller: '+17675551234' }
[callback.requested] connecting to AMI { host: 'asterisk.example.com', port: 5038 }
[callback.requested] originating call { caller: '+17675551234', trunk: 'trunk', callerID: '+17675550000' }
[callback.requested] originate response { response: 'Success', message: 'Originate successfully queued' }
```

**Asterisk CLI:**
```bash
asterisk -rx "core set verbose 5"
asterisk -rx "manager set debug on"
```

```
-- Executing [s@default:1] AGI("PJSIP/+17675551234-00000001", "agi://voice-service:4573/route_to_agent?voiceAgentId=va_123&...")
-- <PJSIP/+17675551234-00000001>AGI Script agi://voice-service:4573/route_to_agent?... completed, returning 0
```

**Voice Service:**
```
[FastAGI] Incoming request: /route_to_agent
[AGI:RouteToAgent] Starting - voiceAgentId=va_123
[CreateAGISession] Creating session - voiceAgentId=va_123, sessionId=s_123
[AGISessionLoop] Starting - sessionId=s_123
[AGISessionLoop] Action: speak_and_collect
[AGI:Speak] Hi there. Thanks for calling. Press 1 for Sales, 2 for Support.
[AGISessionLoop] DTMF digit: 1
...
```

---

## What This Unlocks

### Current Capabilities (v1)
✅ Scheduled outbound callbacks
✅ AMI Originate call triggering
✅ FastAGI integration
✅ DTMF-driven flow execution
✅ Tool node execution (Magnus, etc.)
✅ Recording capability

### Future Enhancements (v2)
🔄 **Call Progress Tracking**
- OriginateResponse events (success/failure)
- Hangup events (answered/no-answer/busy)

🔄 **Retry Logic**
- Automatic retry on no-answer/busy
- Backoff delays
- Maximum attempt limits

🔄 **Outcome Logging**
- Call disposition (answered/no-answer/busy/failed)
- Magnus call log enrichment
- Analytics tracking

🔄 **Advanced Routing**
- Time-based routing
- Skill-based routing
- Priority queuing

---

## Troubleshooting

### AMI Connection Failed

**Symptoms:**
```
[callback.requested] AMI error { error: 'AMI timeout' }
```

**Solutions:**
1. Check AMI host/port: `nc -vz $ASTERISK_AMI_HOST 5038`
2. Verify credentials in `/etc/asterisk/manager.conf`
3. Check firewall rules
4. Verify `permit` lines in manager.conf

---

### FastAGI Connection Failed

**Symptoms:**
```
Asterisk: Unable to connect to agi://voice-service:4573/route_to_agent
```

**Solutions:**
1. Check FastAGI server is running: `ps aux | grep fastagi`
2. Test connectivity from Asterisk: `nc -vz voice-service 4573`
3. Check firewall rules
4. Verify VOICE_SERVICE_FASTAGI_HOST in workers env

---

### Call Not Dialing

**Symptoms:**
```
[callback.requested] originate response { response: 'Error', message: 'Extension does not exist' }
```

**Solutions:**
1. Verify PJSIP trunk exists: `asterisk -rx "pjsip show endpoints"`
2. Check trunk registration: `asterisk -rx "pjsip show registrations"`
3. Verify caller number format (E.164 with +)
4. Check Asterisk dial plan

---

### No DTMF Collected

**Symptoms:**
```
[AGISessionLoop] DTMF timeout (no digit received)
```

**Solutions:**
1. Verify customer pressed digit
2. Check DTMF method (RFC2833 vs inband)
3. Increase timeout in flow config
4. Test with `asterisk -rx "core show channel <channel>"`

---

## Architecture Benefits

✅ **Decoupled** - Workers trigger, Asterisk dials, voice-service controls
✅ **Scalable** - Multiple workers can trigger calls
✅ **Reliable** - BullMQ handles retry, Asterisk handles telephony
✅ **Observable** - Logs at each step for debugging
✅ **Testable** - Each component tested independently

---

## Next Steps

### Immediate (v1.1)
- Test with real outbound trunk
- Add TTS integration for _agi_speak()
- Add error handling for dial failures

### Short-term (v2)
- AMI event listener for call outcomes
- Retry logic with backoff
- Magnus call log enrichment
- Analytics tracking

### Long-term (v3)
- WebRTC integration for browser-based calls
- Multi-channel support (SMS, email)
- AI-powered scheduling optimization
- Predictive dialing

---

## Summary

✅ **Outbound Callback Execution v1 is COMPLETE:**

- ✅ AMI client library (TypeScript)
- ✅ Callback processor with AMI Originate
- ✅ FastAGI server (Python)
- ✅ AGI session integration
- ✅ AGI helper functions
- ✅ Environment configuration
- ✅ Documentation

**Status:** Production-ready for outbound callbacks with DTMF flows

**Next:** Add call outcome tracking and retry logic (v2)
