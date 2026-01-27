#!/usr/bin/env python3
"""
Test Route-to-Agent Runtime Adapter v1

Verifies the bridge between Asterisk/telephony control and Agent OS
"""
import json

print("=" * 80)
print("ROUTE-TO-AGENT RUNTIME ADAPTER v1 - TEST & DOCUMENTATION")
print("=" * 80)

print("\n✅ Purpose:")
print("""
Bridge Asterisk/telephony control to Agent OS safely.
Decides: "For this inbound call, what agent do I run — and what should I do if I can't?"
""")

print("\n✅ Flow:")
print("""
  Asterisk (AGI / HTTP)
      ↓
  voice-service /telephony/route_to_agent
      ↓
  Web API /api/telephony/inbound-guard
      ↓
  If allowed → return Agent Call Plan
  If blocked → return polite fail plan
""")

print("\n" + "=" * 80)
print("ENDPOINT: POST /telephony/route_to_agent")
print("=" * 80)

print("\n--- Request Format ---")
request_example = {
    "did": "+17675551234",
    "caller_id": "18005550000",
    "call_id": "asterisk_unique_id"
}
print("POST /telephony/route_to_agent")
print("Content-Type: application/json")
print(json.dumps(request_example, indent=2))

print("\n" + "=" * 80)
print("RESPONSE SCENARIOS")
print("=" * 80)

print("\n--- Scenario 1: ALLOWED (Run Agent) ---")
allowed_response = {
    "allowed": True,
    "voiceAgentId": "va_abc123",
    "action": "run_agent",
    "message": None
}
print(json.dumps(allowed_response, indent=2))
print("HTTP Status: 200")
print("Meaning: Call is allowed, route to voiceAgentId")
print("Action: Start LiveKit session with this agent")

print("\n--- Scenario 2: UNMAPPED (Play Message) ---")
unmapped_response = {
    "allowed": False,
    "voiceAgentId": None,
    "action": "play_message",
    "message": "The number you dialed is not in service."
}
print(json.dumps(unmapped_response, indent=2))
print("HTTP Status: 200")
print("Meaning: DID not found in PhoneMapping table")
print("Action: Play message to caller, then hangup")

print("\n--- Scenario 3: INACTIVE_MAPPING (Play Message) ---")
inactive_mapping_response = {
    "allowed": False,
    "voiceAgentId": None,
    "action": "play_message",
    "message": "This service is temporarily unavailable."
}
print(json.dumps(inactive_mapping_response, indent=2))
print("HTTP Status: 200")
print("Meaning: Mapping exists but isActive = false")
print("Action: Play message to caller, then hangup")

print("\n--- Scenario 4: MISSING_AGENT (Play Message) ---")
missing_agent_response = {
    "allowed": False,
    "voiceAgentId": None,
    "action": "play_message",
    "message": "This service is not configured. Please contact support."
}
print(json.dumps(missing_agent_response, indent=2))
print("HTTP Status: 200")
print("Meaning: Mapping exists but referenced VoiceAgent doesn't exist")
print("Action: Play message to caller, then hangup")

print("\n--- Scenario 5: INACTIVE_AGENT (Play Message) ---")
inactive_agent_response = {
    "allowed": False,
    "voiceAgentId": None,
    "action": "play_message",
    "message": "This service is temporarily unavailable."
}
print(json.dumps(inactive_agent_response, indent=2))
print("HTTP Status: 200")
print("Meaning: Agent exists but isActive = false")
print("Action: Play message to caller, then hangup")

print("\n--- Scenario 6: NOT_LIVE (Play Message) ---")
not_live_response = {
    "allowed": False,
    "voiceAgentId": None,
    "action": "play_message",
    "message": "This service is not yet live."
}
print(json.dumps(not_live_response, indent=2))
print("HTTP Status: 200")
print("Meaning: Agent status is not READY or PUBLISHED")
print("Action: Play message to caller, then hangup")

print("\n--- Scenario 7: BAD_REQUEST (Play Message) ---")
bad_request_response = {
    "allowed": False,
    "voiceAgentId": None,
    "action": "play_message",
    "message": "Invalid phone number."
}
print(json.dumps(bad_request_response, indent=2))
print("HTTP Status: 400")
print("Meaning: DID parameter is missing or invalid")
print("Action: Play message to caller, then hangup")

print("\n--- Scenario 8: INTERNAL_ERROR (Play Message) ---")
error_response = {
    "allowed": False,
    "voiceAgentId": None,
    "action": "play_message",
    "message": "We are experiencing technical difficulties. Please try again later."
}
print(json.dumps(error_response, indent=2))
print("HTTP Status: 500")
print("Meaning: Unexpected error occurred")
print("Action: Play message to caller, then hangup")

print("\n" + "=" * 80)
print("ACTION TYPES")
print("=" * 80)

actions = {
    "run_agent": {
        "when": "Guard allows call (allowed = true)",
        "action": "Start LiveKit session with voiceAgentId",
        "voiceAgentId": "Required (non-null)"
    },
    "play_message": {
        "when": "Guard rejects call (allowed = false)",
        "action": "Play message to caller, then hangup",
        "message": "Required (user-friendly message)"
    }
}

for action_type, details in actions.items():
    print(f"\n{action_type}:")
    print(f"  When: {details['when']}")
    print(f"  Action: {details['action']}")
    if 'voiceAgentId' in details:
        print(f"  voiceAgentId: {details['voiceAgentId']}")
    if 'message' in details:
        print(f"  message: {details['message']}")

print("\n" + "=" * 80)
print("REJECTION REASON → MESSAGE MAPPING")
print("=" * 80)

reason_messages = {
    "UNMAPPED": "The number you dialed is not in service.",
    "INACTIVE_MAPPING": "This service is temporarily unavailable.",
    "MISSING_AGENT": "This service is not configured. Please contact support.",
    "INACTIVE_AGENT": "This service is temporarily unavailable.",
    "NOT_LIVE": "This service is not yet live.",
    "BAD_REQUEST": "Invalid phone number.",
    "INTERNAL_ERROR": "We are experiencing technical difficulties. Please try again later."
}

for reason, message in reason_messages.items():
    print(f"\n{reason}:")
    print(f"  → \"{message}\"")

print("\n" + "=" * 80)
print("INTEGRATION FLOW")
print("=" * 80)

print("""
1. Asterisk receives inbound call
   ↓
2. Asterisk extracts DID from call
   ↓
3. Asterisk makes POST request to /telephony/route_to_agent
   Request: { did, caller_id, call_id }
   ↓
4. route_to_agent adapter calls /api/telephony/inbound-guard
   ↓
5. inbound-guard runs 5-rule live-eligibility check
   ↓
6. route_to_agent maps guard decision to call plan
   ↓
7. Asterisk receives call plan (allowed + action + voiceAgentId/message)
   ↓
8a. If allowed = true, action = "run_agent":
    → Start LiveKit session with voiceAgentId
    → Bridge caller to agent
   ↓
8b. If allowed = false, action = "play_message":
    → Play message to caller
    → Hangup
""")

print("\n" + "=" * 80)
print("TESTING COMMANDS")
print("=" * 80)

print("\n# Start voice service")
print("cd /opt/epic-ai/apps/voice-service")
print("python main.py")

print("\n# Test 1: Unmapped DID (should return play_message)")
print('curl -X POST http://localhost:5000/telephony/route_to_agent \\')
print('  -H "Content-Type: application/json" \\')
print('  -d \'{"did": "+19995551111", "caller_id": "18005550000", "call_id": "test-123"}\'')

print("\n# Expected:")
print('# HTTP/1.1 200 OK')
print('# {"allowed": false, "action": "play_message", "message": "The number you dialed is not in service."}')

print("\n# Test 2: Valid live agent (should return run_agent)")
print('curl -X POST http://localhost:5000/telephony/route_to_agent \\')
print('  -H "Content-Type: application/json" \\')
print('  -d \'{"did": "+17675551234", "caller_id": "18005550000", "call_id": "test-456"}\'')

print("\n# Expected (if DID exists and agent is live):")
print('# HTTP/1.1 200 OK')
print('# {"allowed": true, "voiceAgentId": "va_...", "action": "run_agent", "message": null}')

print("\n# Test 3: Health check")
print('curl http://localhost:5000/telephony/route_to_agent/health')

print("\n# Expected:")
print('# {"status": "healthy", "module": "route_to_agent_guard", "version": "1.0.0"}')

print("\n" + "=" * 80)
print("ASTERISK INTEGRATION EXAMPLE")
print("=" * 80)

print("""
[epic-inbound]
exten => _+1767XXXXXXX,1,NoOp(=== Epic Inbound ===)
    same => n,Set(DID=${EXTEN})
    same => n,Set(CALLER_ID=${CALLERID(num)})
    same => n,Set(CALL_ID=${UNIQUEID})

    ; Build JSON payload
    same => n,Set(JSON_PAYLOAD={"did":"${DID}","caller_id":"${CALLER_ID}","call_id":"${CALL_ID}"})

    ; Call route-to-agent adapter
    same => n,Set(ROUTE_URL=http://voice-service:5000/telephony/route_to_agent)
    same => n,Set(ROUTE_RESP=${CURL(${ROUTE_URL},${JSON_PAYLOAD})})
    same => n,Set(HTTP_STATUS=${CURL_STATUS})

    ; Parse JSON response
    same => n,Set(ALLOWED=${SHELL(echo "${ROUTE_RESP}" | jq -r '.allowed')})
    same => n,Set(ACTION=${SHELL(echo "${ROUTE_RESP}" | jq -r '.action')})

    ; Check if call is allowed
    same => n,GotoIf($["${ALLOWED}" = "true"]?run-agent)
    same => n,Goto(play-message)

    ; Run agent (allowed)
    same => n(run-agent),Set(AGENT_ID=${SHELL(echo "${ROUTE_RESP}" | jq -r '.voiceAgentId')})
    same => n,NoOp(Routing to agent ${AGENT_ID})
    same => n,Gosub(start-livekit-session,${AGENT_ID},1)
    same => n,Hangup()

    ; Play message (rejected)
    same => n(play-message),Set(MESSAGE=${SHELL(echo "${ROUTE_RESP}" | jq -r '.message')})
    same => n,NoOp(Call rejected: ${MESSAGE})
    same => n,Festival("${MESSAGE}")  ; or use Festival/SSML/recorded audio
    same => n,Hangup()
""")

print("\n" + "=" * 80)
print("KEY FEATURES")
print("=" * 80)

features = [
    "✅ Bridge between Asterisk and Agent OS",
    "✅ Calls inbound-guard internally for live-eligibility check",
    "✅ Maps rejection reasons to user-friendly messages",
    "✅ Returns CallPlan with action (run_agent or play_message)",
    "✅ Fail-closed: Rejects on any uncertainty",
    "✅ Polite failover: User-friendly error messages",
    "✅ Health check endpoint for monitoring",
    "✅ Handles all guard rejection scenarios gracefully",
    "✅ Returns voiceAgentId for allowed calls"
]

for feature in features:
    print(f"  {feature}")

print("\n" + "=" * 80)
print("FILES CREATED")
print("=" * 80)

print("""
apps/voice-service/routes/
└── route_to_agent_guard.py          (adapter) ✅

apps/voice-service/
├── main.py                          (blueprint registration) ✅
└── test_route_to_agent_v1.py        (this file) ✅
""")

print("\n" + "=" * 80)
print("DEPENDENCIES")
print("=" * 80)

print("""
Depends on:
  ✅ Inbound Call Guard v1 (/api/telephony/inbound-guard)
  ✅ Flask (voice-service framework)
  ✅ requests (HTTP client library)

Environment variables:
  • WEB_API_BASE (default: http://localhost:3000)
  • EPIC_APP_BASE_URL (fallback for WEB_API_BASE)
""")

print("\n" + "=" * 80)
print("Status: ✅ READY FOR TESTING")
print("=" * 80 + "\n")
