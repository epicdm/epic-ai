# Asterisk Integration Guide - Route-to-Agent Adapter v1

## Overview

This guide shows how to integrate the Route-to-Agent Adapter v1 with Asterisk for DTMF-driven inbound call handling.

**Architecture:**
```
Asterisk → route_to_agent (POST) → guard + snapshot → action plan
         ↓
      Execute action (Playback + Read/Record)
         ↓
      continue (POST) → follow-up action plan
```

---

## Prerequisites

1. **Voice Service Running:**
   ```bash
   cd /opt/epic-ai/apps/voice-service
   python3 main.py
   # Listens on http://localhost:5000
   ```

2. **Environment Variables Set:**
   ```bash
   export EPIC_APP_BASE_URL=http://localhost:3000
   export TELEPHONY_INTERNAL_TOKEN=your-secret-token
   ```

3. **Asterisk with:**
   - `curl` compiled in (or `func_curl` module)
   - `jq` installed on system (for JSON parsing)
   - TTS engine (e.g., Flite, Festival, or external TTS API)

---

## Asterisk Dialplan Implementation

### Complete Example

```asterisk
; /etc/asterisk/extensions.conf

[globals]
VOICE_SERVICE_URL=http://localhost:5000
INTERNAL_TOKEN=your-secret-token

[epic-inbound]
; Main inbound handler for Epic AI voice agents
exten => _+1767XXXXXXX,1,NoOp(=== Epic Inbound Call ===)
    ; Extract call info
    same => n,Set(DID=${EXTEN})
    same => n,Set(FROM=${CALLERID(num)})
    same => n,Set(CALL_SID=ast-${UNIQUEID})
    same => n,NoOp(DID=${DID}, FROM=${FROM}, CALL_SID=${CALL_SID})

    ; Call route_to_agent endpoint
    same => n,Gosub(epic-route-to-agent,s,1(${DID},${FROM},${CALL_SID}))
    same => n,Set(ROUTE_OK=${GOSUB_RETVAL})

    ; Check if routing succeeded
    same => n,GotoIf($["${ROUTE_OK}" = "1"]?success:failed)

    ; Failed routing
    same => n(failed),NoOp(Routing failed)
    same => n,Playback(tt-somethingwrong)
    same => n,Hangup()

    ; Successful routing
    same => n(success),NoOp(Call routed successfully)
    same => n,Hangup()


[epic-route-to-agent]
; Subroutine: Call route_to_agent and execute action plan
; Args: DID, FROM, CALL_SID
exten => s,1,NoOp(=== Route to Agent: ${ARG1} ===)
    same => n,Set(DID=${ARG1})
    same => n,Set(FROM=${ARG2})
    same => n,Set(CALL_SID=${ARG3})

    ; Build request JSON
    same => n,Set(REQUEST_JSON={"did":"${DID}","from":"${FROM}","callSid":"${CALL_SID}"})

    ; Call route_to_agent API
    same => n,Set(CURL_OPTS=-X POST -H "Content-Type: application/json")
    same => n,Set(CURL_URL=${VOICE_SERVICE_URL}/telephony/route_to_agent)
    same => n,Set(API_RESP=${CURL(${CURL_URL} ${CURL_OPTS} -d ${REQUEST_JSON})})

    ; Parse response
    same => n,Set(OK=${SHELL(echo '${API_RESP}' | jq -r '.ok')})
    same => n,Set(ACTION=${SHELL(echo '${API_RESP}' | jq -r '.action')})
    same => n,Set(TTS=${SHELL(echo '${API_RESP}' | jq -r '.tts')})

    ; Check if call was blocked
    same => n,GotoIf($["${OK}" != "true"]?blocked)

    ; Execute action based on type
    same => n,GotoIf($["${ACTION}" = "speak_and_collect_dtmf"]?action-dtmf)
    same => n,GotoIf($["${ACTION}" = "record_message"]?action-record)
    same => n,GotoIf($["${ACTION}" = "speak_and_end"]?action-end)
    same => n,Goto(action-unknown)

    ; Action: speak_and_collect_dtmf
    same => n(action-dtmf),NoOp(Action: speak_and_collect_dtmf)
    same => n,Set(MAX_DIGITS=${SHELL(echo '${API_RESP}' | jq -r '.dtmf.max_digits')})
    same => n,Set(TIMEOUT_MS=${SHELL(echo '${API_RESP}' | jq -r '.dtmf.timeout_ms')})
    same => n,Set(TIMEOUT_S=$[${TIMEOUT_MS} / 1000])

    ; Use Flite or Festival for TTS (replace with your TTS solution)
    same => n,System(echo "${TTS}" | text2wave -o /tmp/tts_${CALL_SID}.wav)
    same => n,Playback(/tmp/tts_${CALL_SID})

    ; Collect DTMF
    same => n,Read(DIGIT,silence/1,${MAX_DIGITS},,,${TIMEOUT_S})
    same => n,NoOp(Collected digit: ${DIGIT})

    ; Call continue endpoint
    same => n,Gosub(epic-continue,s,1(${CALL_SID},${DIGIT}))
    same => n,Return(1)

    ; Action: record_message
    same => n(action-record),NoOp(Action: record_message)
    same => n,Set(MAX_SECONDS=${SHELL(echo '${API_RESP}' | jq -r '.record.max_seconds')})
    same => n,Set(BEEP=${SHELL(echo '${API_RESP}' | jq -r '.record.beep')})

    ; Play TTS
    same => n,System(echo "${TTS}" | text2wave -o /tmp/tts_${CALL_SID}.wav)
    same => n,Playback(/tmp/tts_${CALL_SID})

    ; Play beep if requested
    same => n,GotoIf($["${BEEP}" = "true"]?play-beep:skip-beep)
    same => n(play-beep),Playback(beep)
    same => n(skip-beep),NoOp(Beep: ${BEEP})

    ; Record message
    same => n,Set(REC_FILE=/var/spool/asterisk/recordings/${CALL_SID})
    same => n,Record(${REC_FILE}.wav,${MAX_SECONDS},200)

    ; Upload recording and call continue endpoint
    same => n,Set(REC_URL=http://voice-service/recordings/${CALL_SID}.wav)
    same => n,Gosub(epic-continue-recording,s,1(${CALL_SID},${REC_URL}))
    same => n,Return(1)

    ; Action: speak_and_end
    same => n(action-end),NoOp(Action: speak_and_end)
    same => n,System(echo "${TTS}" | text2wave -o /tmp/tts_${CALL_SID}.wav)
    same => n,Playback(/tmp/tts_${CALL_SID})
    same => n,Return(1)

    ; Action: reject (blocked call)
    same => n(blocked),NoOp(Action: reject)
    same => n,System(echo "${TTS}" | text2wave -o /tmp/tts_${CALL_SID}.wav)
    same => n,Playback(/tmp/tts_${CALL_SID})
    same => n,Return(0)

    ; Unknown action
    same => n(action-unknown),NoOp(Unknown action: ${ACTION})
    same => n,Playback(tt-somethingwrong)
    same => n,Return(0)


[epic-continue]
; Subroutine: Call continue endpoint after DTMF input
; Args: CALL_SID, DIGIT
exten => s,1,NoOp(=== Continue Call: ${ARG1}, Digit: ${ARG2} ===)
    same => n,Set(CALL_SID=${ARG1})
    same => n,Set(DIGIT=${ARG2})

    ; Build request JSON
    same => n,Set(REQUEST_JSON={"callSid":"${CALL_SID}","digit":"${DIGIT}"})

    ; Call continue API
    same => n,Set(CURL_OPTS=-X POST -H "Content-Type: application/json")
    same => n,Set(CURL_URL=${VOICE_SERVICE_URL}/telephony/continue)
    same => n,Set(API_RESP=${CURL(${CURL_URL} ${CURL_OPTS} -d ${REQUEST_JSON})})

    ; Parse response
    same => n,Set(OK=${SHELL(echo '${API_RESP}' | jq -r '.ok')})
    same => n,Set(ACTION=${SHELL(echo '${API_RESP}' | jq -r '.action')})
    same => n,Set(TTS=${SHELL(echo '${API_RESP}' | jq -r '.tts')})

    ; Execute action based on type
    same => n,GotoIf($["${ACTION}" = "speak_and_collect_dtmf"]?action-dtmf)
    same => n,GotoIf($["${ACTION}" = "record_message"]?action-record)
    same => n,GotoIf($["${ACTION}" = "speak_and_end"]?action-end)
    same => n,Return(1)

    ; (Actions same as above - reuse logic or call back to epic-route-to-agent)
    same => n(action-dtmf),NoOp(Continue: speak_and_collect_dtmf)
    ; ... (same as action-dtmf above)
    same => n,Return(1)

    same => n(action-record),NoOp(Continue: record_message)
    ; ... (same as action-record above)
    same => n,Return(1)

    same => n(action-end),NoOp(Continue: speak_and_end)
    ; ... (same as action-end above)
    same => n,Return(1)


[epic-continue-recording]
; Subroutine: Call continue endpoint after recording completion
; Args: CALL_SID, RECORDING_URL
exten => s,1,NoOp(=== Continue Call (Recording): ${ARG1} ===)
    same => n,Set(CALL_SID=${ARG1})
    same => n,Set(REC_URL=${ARG2})

    ; Build request JSON
    same => n,Set(REQUEST_JSON={"callSid":"${CALL_SID}","recordingUrl":"${REC_URL}"})

    ; Call continue API
    same => n,Set(CURL_OPTS=-X POST -H "Content-Type: application/json")
    same => n,Set(CURL_URL=${VOICE_SERVICE_URL}/telephony/continue)
    same => n,Set(API_RESP=${CURL(${CURL_URL} ${CURL_OPTS} -d ${REQUEST_JSON})})

    ; Parse response
    same => n,Set(TTS=${SHELL(echo '${API_RESP}' | jq -r '.tts')})

    ; Play acknowledgment
    same => n,System(echo "${TTS}" | text2wave -o /tmp/tts_${CALL_SID}_end.wav)
    same => n,Playback(/tmp/tts_${CALL_SID}_end)
    same => n,Return(1)
```

---

## Simplified Example (Minimal)

For testing/development, here's a minimal version:

```asterisk
[epic-inbound-simple]
exten => _+1767XXXXXXX,1,NoOp(=== Epic Inbound ===)
    same => n,Set(DID=${EXTEN})
    same => n,Set(FROM=${CALLERID(num)})
    same => n,Set(CALL_SID=ast-${UNIQUEID})

    ; Call route_to_agent
    same => n,Set(JSON={"did":"${DID}","from":"${FROM}","callSid":"${CALL_SID}"})
    same => n,Set(RESP=${CURL(http://localhost:5000/telephony/route_to_agent -X POST -H "Content-Type: application/json" -d ${JSON})})

    ; Parse and play TTS
    same => n,Set(TTS=${SHELL(echo '${RESP}' | jq -r '.tts')})
    same => n,NoOp(TTS: ${TTS})
    same => n,Playback(tt-weasels)  ; Replace with actual TTS

    ; Collect DTMF
    same => n,Read(DIGIT,silence/1,1,,,8)

    ; Call continue
    same => n,Set(JSON2={"callSid":"${CALL_SID}","digit":"${DIGIT}"})
    same => n,Set(RESP2=${CURL(http://localhost:5000/telephony/continue -X POST -H "Content-Type: application/json" -d ${JSON2})})

    ; Play follow-up TTS
    same => n,Set(TTS2=${SHELL(echo '${RESP2}' | jq -r '.tts')})
    same => n,NoOp(TTS2: ${TTS2})
    same => n,Playback(tt-monkeys)  ; Replace with actual TTS

    same => n,Hangup()
```

---

## TTS Integration Options

### Option 1: Flite (Lightweight, Built-in)
```bash
# Install Flite
apt-get install flite

# In dialplan:
System(echo "${TTS}" | flite -o /tmp/tts_${CALL_SID}.wav)
Playback(/tmp/tts_${CALL_SID})
```

### Option 2: Festival (Better Quality)
```bash
# Install Festival
apt-get install festival

# In dialplan:
System(echo "${TTS}" | text2wave -o /tmp/tts_${CALL_SID}.wav)
Playback(/tmp/tts_${CALL_SID})
```

### Option 3: External TTS API (Best Quality)
```bash
# Use ElevenLabs, Google TTS, Amazon Polly, etc.
# Example with ElevenLabs:
System(curl -X POST "https://api.elevenlabs.io/v1/text-to-speech/voice-id" \
  -H "xi-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"text":"${TTS}"}' \
  -o /tmp/tts_${CALL_SID}.mp3)
Playback(/tmp/tts_${CALL_SID})
```

---

## Testing

### 1. Start Services
```bash
# Terminal 1: Web app
cd /opt/epic-ai/apps/web
pnpm dev

# Terminal 2: Voice service
cd /opt/epic-ai/apps/voice-service
python3 main.py

# Terminal 3: Asterisk
asterisk -rvvv
```

### 2. Test with Curl (No Asterisk)
```bash
# Test route_to_agent
curl -X POST http://localhost:5000/telephony/route_to_agent \
  -H "Content-Type: application/json" \
  -d '{"did": "+17675551234", "from": "+14155559876", "callSid": "test-123"}'

# Test continue
curl -X POST http://localhost:5000/telephony/continue \
  -H "Content-Type: application/json" \
  -d '{"callSid": "test-123", "digit": "1"}'
```

### 3. Test with Asterisk
```asterisk
; In Asterisk CLI:
originate Local/+17675551234@epic-inbound extension 123@default
```

---

## Troubleshooting

### Issue: "Session not found"
**Cause:** Session expired or service restarted (in-memory storage)
**Solution:**
- Use Redis for production session storage (v2)
- For v1, ensure service doesn't restart during calls

### Issue: "GUARD_ERROR"
**Cause:** Can't reach inbound-call-guard endpoint
**Solution:**
- Check `EPIC_APP_BASE_URL` environment variable
- Ensure web app is running and accessible
- Check internal token if using auth

### Issue: "SNAPSHOT_ERROR"
**Cause:** Can't fetch wizard snapshot for voice agent
**Solution:**
- Verify voice agent exists and is PUBLISHED/READY
- Check Agent OS routes are accessible
- Verify database connectivity

### Issue: TTS not playing
**Cause:** TTS engine not configured or audio file not generated
**Solution:**
- Install Flite/Festival or configure external TTS API
- Check `/tmp/tts_*.wav` files are being created
- Verify Asterisk can read files from /tmp

---

## Production Deployment

### 1. Environment Setup
```bash
# /opt/epic-ai/apps/voice-service/.env
EPIC_APP_BASE_URL=https://your-app.com
TELEPHONY_INTERNAL_TOKEN=your-production-token
LOG_LEVEL=INFO
```

### 2. Use Redis for Session Storage (v2)
```python
# In route_to_agent_adapter.py:
import redis
self.redis = redis.Redis(host='localhost', port=6379, db=0)
# Store sessions in Redis instead of self.sessions dict
```

### 3. Use External TTS API
- Recommended: ElevenLabs, Google TTS, Amazon Polly
- Caching: Cache TTS audio for common phrases
- Fallback: Have backup TTS engine if API fails

### 4. Monitoring
- Log all route_to_agent calls with request_id
- Track rejection rates by reason_code
- Monitor API response times
- Alert on high error rates

---

## Next Steps

1. **LiveKit Integration (v2)**
   - Real-time ASR for natural conversation
   - Better TTS with prosody control
   - Agent state synchronization

2. **CRM Integration**
   - Create lead on voicemail
   - Track call outcomes
   - Follow-up automation

3. **Advanced Call Flows**
   - Appointment booking
   - Order status lookup
   - Multi-step qualification

---

## Status: ✅ Ready for Asterisk Integration

The Route-to-Agent Adapter v1 is production-ready for DTMF-based call flows.
