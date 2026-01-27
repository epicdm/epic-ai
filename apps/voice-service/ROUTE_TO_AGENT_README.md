# Route-to-agent Runtime Adapter v1

Drop-in module pack for routing LiveKit voice calls to the Epic AI Agent Runtime.

## Overview

Instead of using OpenAI directly in the LiveKit agent, this adapter:
1. Creates a unique `sessionId` for each call
2. Sends user utterances to: `POST /api/agent-os/runtime/turn`
3. Speaks the returned text via LiveKit TTS
4. Loops: **listen → runtime → speak**

## Architecture

```
┌──────────────┐
│  LiveKit     │
│  Voice Call  │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────┐
│  route_to_agent.py               │
│  RouteToAgentRuntimeAdapterV1    │
│                                  │
│  ┌─────────────────────────┐    │
│  │  livekit_call_ctx.py    │    │
│  │  (CallCtx adapter)      │    │
│  └─────────────────────────┘    │
│                                  │
│  ┌─────────────────────────┐    │
│  │ agent_runtime_client.py │    │
│  │ AgentRuntimeClient      │    │
│  └─────────────────────────┘    │
└──────────┬───────────────────────┘
           │
           ▼
   ┌───────────────────┐
   │   Epic AI Agent   │
   │   Runtime API     │
   │  /runtime/turn    │
   └───────────────────┘
```

## Files Created

### Core Modules

1. **`agent_runtime_client.py`**
   - `AgentRuntimeClient` - Synchronous HTTP client
   - Calls `POST /api/agent-os/runtime/turn`
   - Returns `RuntimeTurnResult` with agent response

2. **`call_ctx_protocol.py`**
   - `CallCtx` Protocol definition
   - Minimal interface for call abstraction
   - Methods: `user_utterances()`, `speak()`, `hangup()`

3. **`route_to_agent.py`**
   - `RouteToAgentRuntimeAdapterV1` - Main adapter
   - Manages conversation loop
   - Includes guardrails: timeouts, max turns, hangup keywords

4. **`livekit_call_ctx.py`**
   - `LiveKitCallCtx` - LiveKit-specific adapter
   - Implements `CallCtx` protocol for LiveKit
   - Wraps `AgentSession` and `Participant`

## Environment Variables

Add to your `.env`:

```bash
# Route-to-agent Runtime Adapter v1 (optional)
EPIC_RUNTIME_MAX_TURNS=100
EPIC_RUNTIME_TURN_TIMEOUT=30.0
EPIC_RUNTIME_ENABLE_HANGUP_KEYWORDS=true
EPIC_RUNTIME_FALLBACK_TEXT=I'm having trouble processing your request. Please try again later.
```

## Usage

### Quick Start

In your LiveKit agent entrypoint:

```python
from route_to_agent import RouteToAgentRuntimeAdapterV1
from livekit_call_ctx import LiveKitCallCtx

async def entrypoint(ctx: agents.JobContext):
    # ... (connection and participant setup)

    # Create session for TTS/STT only (no LLM)
    session = AgentSession(
        stt=create_stt(config),
        tts=create_tts(config),
        vad=vad,
    )

    await session.start(room=ctx.room, agent=Agent(instructions=""))

    # Wrap session in CallCtx adapter
    call_ctx = LiveKitCallCtx(session=session, participant=participant)

    # Route to agent runtime
    adapter = RouteToAgentRuntimeAdapterV1(
        agent_id="your-agent-id",
        call_ctx=call_ctx,
    )

    # Run conversation loop
    await adapter.run()
```

### Feature Flag Integration

See `scripts/test_agent.py` for a complete example using `USE_RUNTIME_ROUTING` env var to toggle between:
- **Option 1**: Route to Agent Runtime (runtime adapter)
- **Option 2**: Standard LiveKit Agent (direct OpenAI)

## Guardrails

### 1. Max Turns
- Default: 100 turns per call
- Prevents infinite conversations
- Configurable via `EPIC_RUNTIME_MAX_TURNS`

### 2. Turn Timeout
- Default: 30 seconds per turn
- Prevents stuck calls
- Configurable via `EPIC_RUNTIME_TURN_TIMEOUT`

### 3. Hangup Keywords
- Detects: "goodbye", "bye", "hang up", "end call", "disconnect"
- Gracefully ends call when detected
- Disable via `EPIC_RUNTIME_ENABLE_HANGUP_KEYWORDS=false`

### 4. Fail-safe Fallback
- On runtime errors: speaks fallback message and hangs up
- Prevents silent failures
- Configurable via `EPIC_RUNTIME_FALLBACK_TEXT`

## API Endpoint Required

The adapter expects this endpoint to exist:

**POST** `/api/agent-os/runtime/turn`

Request:
```json
{
  "agentId": "agent_xxx",
  "sessionId": "uuid-v4",
  "userText": "What's the weather?",
  "callerPhone": "+15551234567",
  "callerName": "John Doe"
}
```

Response:
```json
{
  "text": "The weather is sunny today.",
  "shouldEnd": false,
  "metadata": {}
}
```

## Flow Diagram

```
┌─────────────────────────────────────────────────────┐
│                 Conversation Loop                   │
├─────────────────────────────────────────────────────┤
│                                                     │
│  1. Listen for user utterance (via CallCtx)        │
│     ↓                                               │
│  2. Check hangup keywords                          │
│     ↓                                               │
│  3. Send to runtime:                               │
│     POST /api/agent-os/runtime/turn                │
│     { agentId, sessionId, userText, ... }          │
│     ↓                                               │
│  4. Get response: { text, shouldEnd }              │
│     ↓                                               │
│  5. Speak response via TTS                         │
│     ↓                                               │
│  6. Check shouldEnd or max turns                   │
│     ↓                                               │
│  7. Loop back to step 1                            │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## Error Handling

- **Timeout**: Speaks timeout message and hangs up
- **Runtime Error**: Speaks fallback message and hangs up
- **Network Error**: Speaks fallback message and hangs up
- **Empty Response**: Asks user to repeat
- **TTS Failure**: Logs error, attempts hangup

## Testing

1. **Unit Test**: Test `AgentRuntimeClient` with mock HTTP
2. **Integration Test**: Test full flow with test runtime endpoint
3. **Live Test**: Use `scripts/test_agent.py` with `USE_RUNTIME_ROUTING=true`

## Deployment

1. Add environment variables to your deployment
2. Ensure `/api/agent-os/runtime/turn` endpoint is deployed
3. Set `USE_RUNTIME_ROUTING=true` to enable
4. Monitor logs for `[RouteToAgent]` entries

## Monitoring

Key log patterns:
```
[RouteToAgent] Starting conversation loop (sessionId=...)
[RouteToAgent] Turn 1: User said: ...
[RuntimeClient] Response: ... (shouldEnd=false)
[RouteToAgent] Conversation ended - sessionId=..., turns=5
```

## Troubleshooting

**Issue**: Calls immediately hang up
- Check: Runtime endpoint is reachable
- Check: API key is correct (`VOICE_RUNTIME_API_KEY`)

**Issue**: Timeout errors
- Increase `EPIC_RUNTIME_TURN_TIMEOUT`
- Check runtime endpoint performance

**Issue**: Empty responses
- Check runtime endpoint logs
- Verify agent ID is correct

**Issue**: TTS not working
- Ensure session has TTS configured
- Check LiveKit connection

## Next Steps

1. ✅ Implement `/api/agent-os/runtime/turn` endpoint in web app
2. ✅ Test with live calls
3. ✅ Monitor latency and errors
4. ✅ Add more guardrails as needed

---

**Version**: 1.0.0
**Created**: 2026-01-25
**Module Pack**: Route-to-agent Runtime Adapter v1
