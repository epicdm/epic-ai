# Voice Agent Status

## Incoming Calls - WORKING ✅
- Fixed on: 2026-01-14
- Issue: Agent crashed with `AttributeError: 'Agent' object has no attribute 'start'`
- Fix: Updated to new LiveKit AgentSession API pattern
- Commit: c02313ce03db9019a960bc569c60a6ac67f7fa73

## Architecture (Verified Working)
- 1 Agent deployed in LiveKit Cloud (`epic-voice-agent`)
- Incoming/outgoing calls routed via SIP dispatch rules
- Agent registered: Worker ID `AW_cV48hQyCMENw`, Region: US East B

## Outgoing Calls - VERIFIED WORKING ✅
- Fixed on: 2026-01-14
- **Tested on: 2026-01-14 - CONFIRMED WORKING**
- Issues fixed:
  1. Default `agent_name='test-agent'` in test outbound endpoint → Changed to `epic-voice-agent`
     - Commit: 33ab93c0426975309d1f0bb8f19c0c26089c587b
  2. Static `LIVEKIT_SIP_TRUNK_ID` env var was missing → Now dynamically looks up outbound trunk by phone number
     - Root cause: Inbound and outbound trunks are DIFFERENT. Each phone number has its own outbound trunk.
     - Fix: Added `findOutboundTrunkByPhone()` function that queries the voice service API to find the correct outbound trunk
     - Commit: b44db09 (dynamic trunk from PhoneMapping) + follow-up commit (API lookup)
- Test Result:
  - Phone mapping `+17678189907` → Found trunk `ST_7MnXGgXzF4Gc`
  - SIP Call ID: `SCL_gRnRXZ5ixpGJ`
  - Status: `RINGING` (not `mock`)

## Performance Optimizations - DEPLOYED ✅
- Deployed on: 2026-01-14
- Commit: `68f02d38abdda03d2183fb52a7674f476a33f3c9`

### Changes Made
1. **Instance Upgrade**: basic-xs (512MB) → basic-s (1GB RAM)
2. **STT Provider**: OpenAI Whisper → Deepgram Nova-2
   - Latency improvement: ~500-800ms → ~150-300ms
3. **AgentSession Performance Flags**:
   - `preemptive_generation=True` - Start generating before user finishes speaking
   - `resume_false_interruption=True` - Better handling of mid-speech interruptions
   - `transcription_enabled=True` - Real-time transcription
4. **Metrics Logging**: Added detailed latency breakdown per turn (STT, LLM TTFT, TTS TTFB)
5. **Environment Variables**: Added `DEEPGRAM_API_KEY` as encrypted secret

### Current Resource Usage
- **Memory**: ~35% (down from ~50% on basic-xs)
- **CPU**: ~15%

## Key Implementation Details

### Outbound Call Flow
1. User initiates outbound call via `/api/voice/calls/outbound`
2. Web app gets organization's PhoneMapping (caller number)
3. Web app calls voice service API `/api/telephony/trunks/outbound` to list all outbound trunks
4. Finds the trunk that matches the caller phone number
5. Uses that trunk ID to create SIP participant via LiveKit

### Environment Requirements
- `VOICE_SERVICE_URL` must be set in Vercel (e.g., `https://epic-ai-platform-zcjiu.ondigitalocean.app/voice`)
- LiveKit credentials (`LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`)
- Organization must have an active PhoneMapping with a provisioned phone number
- That phone number must have a corresponding outbound trunk in LiveKit
- `DEEPGRAM_API_KEY` for faster STT (falls back to OpenAI if not set)

### Mock Mode
If the outbound trunk cannot be found, calls go into "mock mode":
- Call is logged but not actually made
- Status shows "mock"
- Useful for testing without real phone connections
