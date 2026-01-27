# Voice Service v1 - Quick Start

Get Epic AI voice calls running this week with DTMF-first architecture.

## What You Have Now

### ✅ Inbound Call Guard (Completed)
- **`telephony_health.py`** - HTTP client calling health-check endpoint
- **`inbound_guard.py`** - Fail-closed safety gate
- **`call_actions.py`** - TTS and call control helpers
- **Integration**: Wired into `agent_creator.py` and `test_agent.py`

### ✅ Route-to-agent Runtime Adapter (Completed)
- **`agent_runtime_client.py`** - Calls `/api/agent-os/runtime/turn`
- **`call_ctx_protocol.py`** - CallCtx protocol
- **`route_to_agent.py`** - Main conversation loop adapter
- **`livekit_call_ctx.py`** - LiveKit-specific implementation
- **Use case**: Real-time ASR via LiveKit (v2+)

### ✅ DTMF-First Telephony (NEW - Ship This Week)
- **`routes/telephony_inbound.py`** - Flask routes for Asterisk integration
  - `/telephony/inbound-start` - Gate + route decision
  - `/telephony/dtmf` - Handle DTMF keypresses
  - `/telephony/record` - Voicemail fallback
  - `/telephony/hangup` - Call cleanup
- **`asterisk/extensions.conf`** - Asterisk dialplan
- **Integration**: Registered in `main.py`

## Architecture Comparison

### v1 (Ship This Week) - DTMF-First
```
Caller → Asterisk → Voice Service → Agent Runtime
          ↓
        DTMF Menu
        (keypresses)
```

**Pros:**
- ✅ Ships immediately
- ✅ Zero ASR dependency
- ✅ Deterministic behavior
- ✅ Searchable logs
- ✅ Still feels AI-powered

### v2 (Later) - Real-time ASR
```
Caller → Asterisk → LiveKit → Route-to-Agent → Agent Runtime
                      ↓
                    ASR/TTS
                  (streaming)
```

**Pros:**
- Natural conversation
- No keypress required
- Better UX

**Cons:**
- More complex setup
- ASR latency to manage
- Additional infrastructure

## Implementation Status

| Component | Status | File |
|-----------|--------|------|
| Inbound Call Guard | ✅ Complete | `inbound_guard.py` |
| Telephony Health Client | ✅ Complete | `telephony_health.py` |
| Call Actions | ✅ Complete | `call_actions.py` |
| DTMF Routes | ✅ Complete | `routes/telephony_inbound.py` |
| Asterisk Dialplan | ✅ Complete | `asterisk/extensions.conf` |
| Runtime Client | ✅ Complete | `agent_runtime_client.py` |
| Route-to-Agent Adapter | ✅ Complete | `route_to_agent.py` |
| Flask Integration | ✅ Complete | `main.py` updated |
| Documentation | ✅ Complete | This file + DTMF_V1_SETUP.md |

## Next Steps to Go Live

### 1. Deploy Runtime Turn Endpoint (Web App)

Create `/api/agent-os/runtime/turn` endpoint in your Next.js app:

**File**: `apps/web/src/app/api/agent-os/runtime/turn/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { agentId, sessionId, userText, callerPhone, callerName } = await request.json();

  // TODO: Implement runtime turn logic
  // 1. Get agent config
  // 2. Process user input
  // 3. Generate response
  // 4. Determine next action

  return NextResponse.json({
    text: "Your agent's response here...",
    shouldEnd: false,
    metadata: {
      // Optional DTMF menu, transfer info, etc.
    }
  });
}
```

### 2. Test Locally

```bash
# Terminal 1: Start voice service
cd /opt/epic-ai/apps/voice-service
python main.py

# Terminal 2: Test endpoints
curl -X POST http://localhost:8000/telephony/inbound-start \
  -H "Content-Type: application/json" \
  -d '{"did":"15551234567","from":"15559876543","callId":"test-123"}'

curl -X POST http://localhost:8000/telephony/dtmf \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"uuid-from-above","digit":"1","callId":"test-123"}'
```

### 3. Install Asterisk Dependencies

```bash
# On your Asterisk server
apt-get install -y sox libsox-fmt-all jq curl libttspico-utils

# Test TTS
pico2wave -l en-US -w test.wav "Hello from Epic AI"
play test.wav
```

### 4. Configure Asterisk

```bash
# Copy dialplan
cp asterisk/extensions.conf /etc/asterisk/extensions_epic.conf

# Update VOICE_SERVICE_URL
nano /etc/asterisk/extensions_epic.conf
# Set: VOICE_SERVICE_URL=http://your-voice-service:8000

# Include in main config
echo '#include "extensions_epic.conf"' >> /etc/asterisk/extensions.conf

# Reload
asterisk -rx "dialplan reload"
```

### 5. Route DIDs

Update your SIP trunk to route calls to `[epic-inbound]` context.

### 6. Test Live Call

1. Call your DID
2. Hear greeting
3. Press 1, 2, 3, or 0
4. Verify response from runtime
5. Check logs

## Example Call Flow (v1 DTMF)

```
📞 Caller dials 1-555-123-4567

1️⃣ Asterisk → /telephony/inbound-start
   ✅ InboundCallGuard passes
   📋 Returns: greeting + DTMF menu

2️⃣ TTS: "Hello! Press 1 for sales, 2 for support, 3 for info, 0 for operator"

3️⃣ Caller presses [1]

4️⃣ Asterisk → /telephony/dtmf (digit=1)
   🤖 Runtime: "Great! Let me help you with sales..."

5️⃣ TTS: Speaks response

6️⃣ Asterisk → /telephony/dtmf (digit=2)
   🤖 Runtime: "For pricing, press 1. For demo, press 2..."

7️⃣ Loop continues until hangup or transfer

📊 On hangup → /telephony/hangup
   💾 Log metrics, cleanup session
```

## Upgrade Path to v2 (ASR)

When ready for real-time ASR:

1. **Keep DTMF as fallback** - Don't remove it!
2. **Add Asterisk → LiveKit bridge**
3. **Use `route_to_agent.py`** (already built)
4. **Progressive rollout**:
   ```python
   # In your call handler
   use_asr = random.random() < 0.1  # Start with 10%
   if use_asr:
       # Use route_to_agent with LiveKit
   else:
       # Use DTMF flow
   ```

## Monitoring

Key metrics to track:

```bash
# Watch calls coming in
tail -f voice-service.log | grep InboundStart

# Watch DTMF selections
tail -f voice-service.log | grep DTMF

# Watch voicemails
tail -f voice-service.log | grep Record

# Asterisk console
asterisk -rvvv
```

## Files You Need to Understand

### Core v1 (DTMF-First)
1. **`routes/telephony_inbound.py`** - Main Flask routes
2. **`asterisk/extensions.conf`** - Asterisk dialplan
3. **`inbound_guard.py`** - Safety gate
4. **`agent_runtime_client.py`** - Runtime API client

### Future v2 (Real-time ASR)
1. **`route_to_agent.py`** - Conversation loop adapter
2. **`livekit_call_ctx.py`** - LiveKit integration
3. **`call_ctx_protocol.py`** - Platform abstraction

## Troubleshooting

**Problem**: Asterisk can't reach voice-service
- Check: Firewall rules between servers
- Test: `curl http://voice-service:8000/health` from Asterisk

**Problem**: DTMF not detected
- Check: DTMF mode in SIP trunk (use RFC2833)
- Test: `asterisk -rvvv` and watch for DTMF events

**Problem**: TTS not working
- Check: PicoTTS installed (`which pico2wave`)
- Test: `pico2wave -l en-US -w test.wav "test" && play test.wav`

**Problem**: Calls always blocked
- Check: DID configured in database
- Check: Agent is PUBLISHED or TESTING
- Test: `curl http://web-app:3000/api/telephony/health-check?did=15551234567`

## Summary

You now have **two parallel paths**:

### Path 1: DTMF-First (v1) - Ship This Week
- Asterisk controls call flow
- DTMF keypresses for input
- Voicemail fallback
- Agent runtime provides responses
- **Status**: Code complete, needs deployment

### Path 2: Real-time ASR (v2) - Future
- LiveKit streaming audio
- ASR for voice input
- Route-to-agent adapter
- Full conversational AI
- **Status**: Framework ready, integrate later

## Decision Points

1. **Deploy v1 first** ✅ Recommended
   - Get calls working immediately
   - Gather data on usage patterns
   - Build confidence in system

2. **Hybrid approach** (later)
   - Start with DTMF menu
   - Offer "press 9 to speak freely" → switches to ASR
   - Best of both worlds

3. **Full v2** (future)
   - Direct to ASR
   - DTMF as fallback only
   - Requires proven ASR pipeline

---

**Your call**: Ship v1 (DTMF) this week, prove the concept, then add ASR when ready. 🚀
