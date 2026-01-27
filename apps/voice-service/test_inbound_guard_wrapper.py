#!/usr/bin/env python3
"""
Test Inbound Call Guard Wrapper
This wrapper calls resolve-did and provides stable reason codes for Asterisk
"""
import json

print("=" * 80)
print("INBOUND CALL GUARD - WRAPPER ENDPOINT TEST")
print("=" * 80)

print("\n✅ Architecture:")
print("""
  Asterisk Dialplan
      ↓
  /api/telephony/inbound-call-guard  ← NEW (stable reason codes)
      ↓
  /api/telephony/resolve-did         ← EXISTING (DID resolution)
      ↓
  Database (PhoneMapping → VoiceAgent)
""")

print("\n" + "=" * 80)
print("ENDPOINT COMPARISON")
print("=" * 80)

comparison = [
    {
        "aspect": "Purpose",
        "resolve-did": "Core DID resolution logic",
        "inbound-guard": "Call-time enforcement wrapper"
    },
    {
        "aspect": "Response",
        "resolve-did": "allowed: true/false + reason_code",
        "inbound-guard": "allow: true/false + stable reason_code"
    },
    {
        "aspect": "Reason Codes",
        "resolve-did": "DID_NOT_FOUND, AGENT_NOT_LIVE, etc.",
        "inbound-guard": "NO_MAPPING, AGENT_NOT_LIVE, etc."
    },
    {
        "aspect": "Caller Info",
        "resolve-did": "Optional callId only",
        "inbound-guard": "from, callSid supported"
    },
    {
        "aspect": "Used By",
        "resolve-did": "Multiple consumers (runtime, UI, etc.)",
        "inbound-guard": "Asterisk dialplan primarily"
    },
]

for item in comparison:
    print(f"\n{item['aspect']}:")
    print(f"  resolve-did:    {item['resolve-did']}")
    print(f"  inbound-guard:  {item['inbound-guard']}")

print("\n" + "=" * 80)
print("STABLE REASON CODES (for Asterisk Dialplan)")
print("=" * 80)

reason_codes = {
    "OK": {
        "meaning": "Call allowed, proceed to route agent",
        "action": "Gosub(route_to_agent, voiceAgentId, 1)"
    },
    "NO_MAPPING": {
        "meaning": "DID not found in PhoneMapping",
        "action": "Playback('number-not-in-service') + Hangup"
    },
    "MAPPING_INACTIVE": {
        "meaning": "PhoneMapping.isActive = false",
        "action": "Playback('temporarily-unavailable') + Hangup"
    },
    "AGENT_MISSING": {
        "meaning": "VoiceAgent record not found",
        "action": "Route to fallback IVR"
    },
    "AGENT_INACTIVE": {
        "meaning": "VoiceAgent.isActive = false",
        "action": "Playback('agent-unavailable') + Hangup"
    },
    "AGENT_NOT_LIVE": {
        "meaning": "VoiceAgent status not PUBLISHED/READY",
        "action": "Playback('not-available-yet') + Hangup"
    },
    "AGENT_ARCHIVED": {
        "meaning": "VoiceAgent status = ARCHIVED",
        "action": "Playback('no-longer-in-service') + Hangup"
    },
    "AGENT_PAUSED": {
        "meaning": "VoiceAgent status = PAUSED",
        "action": "Playback('temporarily-unavailable') + Hangup"
    },
    "RESOLVE_FAILED": {
        "meaning": "resolve-did endpoint error",
        "action": "Route to fallback IVR"
    },
}

for code, info in reason_codes.items():
    print(f"\n{code}:")
    print(f"  Meaning: {info['meaning']}")
    print(f"  Action:  {info['action']}")

print("\n" + "=" * 80)
print("REQUEST/RESPONSE EXAMPLES")
print("=" * 80)

print("\n--- Example 1: Allowed Call ---")
print("\nRequest:")
print("GET /api/telephony/inbound-call-guard?did=+17675551234&from=+14155559876&callSid=ast-123")
print("Headers:")
print("  x-epic-internal-token: optional-secret")
print("  x-request-id: ast-call-123")

print("\nResponse (200 OK):")
allowed_response = {
    "data": {
        "allow": True,
        "reason_code": "OK",
        "did": "+17675551234",
        "from": "+14155559876",
        "callSid": "ast-123",
        "voiceAgentId": "clx_agent_published",
        "agentName": "Sales Support Agent",
        "companyId": "org_abc123",
        "agentStatus": "PUBLISHED",
        "request_id": "ast-call-123"
    },
    "confidence": {
        "inbound_call_guard": 1.0,
        "resolve_did": 1.0
    },
    "gaps": [],
    "warnings": []
}
print(json.dumps(allowed_response, indent=2))

print("\n--- Example 2: Rejected Call (No Mapping) ---")
print("\nRequest:")
print("GET /api/telephony/inbound-call-guard?did=+19995551111&from=+14155559876")

print("\nResponse (200 OK):")
reject_response = {
    "data": {
        "allow": False,
        "reason_code": "NO_MAPPING",
        "reason_detail": "This number is not currently in service. Please check the number and try again.",
        "did": "+19995551111",
        "from": "+14155559876",
        "callSid": None,
        "request_id": "uuid-xyz"
    },
    "confidence": {
        "inbound_call_guard": 1.0
    },
    "gaps": [],
    "warnings": []
}
print(json.dumps(reject_response, indent=2))

print("\n--- Example 3: Rejected Call (Agent Not Live) ---")
print("\nRequest:")
print("GET /api/telephony/inbound-call-guard?did=+17675555678&from=+14155559876")

print("\nResponse (200 OK):")
not_live_response = {
    "data": {
        "allow": False,
        "reason_code": "AGENT_NOT_LIVE",
        "reason_detail": "This line is not yet available. Please try again later.",
        "did": "+17675555678",
        "from": "+14155559876",
        "callSid": None,
        "agentId": "clx_agent_draft",
        "request_id": "uuid-abc"
    },
    "confidence": {
        "inbound_call_guard": 1.0
    },
    "gaps": [],
    "warnings": []
}
print(json.dumps(not_live_response, indent=2))

print("\n" + "=" * 80)
print("ASTERISK DIALPLAN INTEGRATION")
print("=" * 80)

asterisk_dialplan = '''
[epic-inbound]
exten => _+1767XXXXXXX,1,NoOp(=== Epic Inbound Call Guard ===)
    ; Get caller info
    same => n,Set(DID=${EXTEN})
    same => n,Set(FROM=${CALLERID(num)})
    same => n,Set(CALL_SID=ast-${UNIQUEID})

    ; Call guard endpoint
    same => n,Set(GUARD_URL=http://epic-web/api/telephony/inbound-call-guard)
    same => n,Set(GUARD_PARAMS=?did=${DID}&from=${FROM}&callSid=${CALL_SID})
    same => n,Set(CURL_OPTS=-H "x-epic-internal-token: ${INTERNAL_TOKEN}")
    same => n,Set(GUARD_RESP=${CURL(${GUARD_URL}${GUARD_PARAMS} ${CURL_OPTS})})

    ; Parse JSON response
    same => n,Set(ALLOW=${SHELL(echo "${GUARD_RESP}" | jq -r '.data.allow')})
    same => n,Set(REASON=${SHELL(echo "${GUARD_RESP}" | jq -r '.data.reason_code')})
    same => n,Set(AGENT_ID=${SHELL(echo "${GUARD_RESP}" | jq -r '.data.voiceAgentId')})
    same => n,Set(MSG=${SHELL(echo "${GUARD_RESP}" | jq -r '.data.reason_detail')})

    ; Branch on allow flag
    same => n,GotoIf($["${ALLOW}" = "true"]?allowed:rejected)

    ; --- ALLOWED PATH ---
    same => n(allowed),NoOp(Call allowed for agent ${AGENT_ID})
    same => n,Gosub(route-to-agent,${AGENT_ID},1)
    same => n,Hangup()

    ; --- REJECTED PATH ---
    same => n(rejected),NoOp(Call rejected: ${REASON})

    ; Handle specific rejection reasons
    same => n,GotoIf($["${REASON}" = "NO_MAPPING"]?no-mapping)
    same => n,GotoIf($["${REASON}" = "AGENT_NOT_LIVE"]?not-live)
    same => n,GotoIf($["${REASON}" = "AGENT_ARCHIVED"]?archived)
    ; ... handle other reasons ...
    same => n,Goto(generic-reject)

    same => n(no-mapping),Playback(number-not-in-service)
    same => n,Hangup()

    same => n(not-live),Playback(agent-not-available-yet)
    same => n,Hangup()

    same => n(archived),Playback(number-no-longer-in-service)
    same => n,Hangup()

    same => n(generic-reject),Playback(${MSG})
    same => n,Hangup()

[route-to-agent]
; Subroutine to handle allowed calls
exten => s,1,NoOp(=== Route to Agent ${ARG1} ===)
    same => n,Set(AGENT_ID=${ARG1})
    ; TODO: Start LiveKit session, connect call
    same => n,Return()
'''

print("\nAsterisk Dialplan Example:")
print(asterisk_dialplan)

print("\n" + "=" * 80)
print("KEY BENEFITS")
print("=" * 80)

benefits = [
    "✅ Single source of truth (wraps resolve-did)",
    "✅ Stable reason codes for dialplan logic",
    "✅ Fail-closed at call-time (not just provisioning)",
    "✅ Supports caller ID tracking (from parameter)",
    "✅ Supports call SID for logging correlation",
    "✅ Internal token auth (optional but recommended)",
    "✅ Request ID tracking across all layers",
    "✅ Simple boolean: allow true/false",
]

for benefit in benefits:
    print(f"  {benefit}")

print("\n" + "=" * 80)
print("TESTING COMMANDS")
print("=" * 80)

print("\n# Test allowed call:")
print('curl "http://localhost:3000/api/telephony/inbound-call-guard?did=+17675551234&from=+14155559876"')

print("\n# Test rejected call (unmapped DID):")
print('curl "http://localhost:3000/api/telephony/inbound-call-guard?did=+19995551111&from=+14155559876"')

print("\n# Test with internal auth:")
print('curl -H "x-epic-internal-token: your-secret" \\')
print('  "http://localhost:3000/api/telephony/inbound-call-guard?did=+1767..."')

print("\n# Test with all parameters:")
print('curl "http://localhost:3000/api/telephony/inbound-call-guard?did=+17675551234&from=+14155559876&callSid=ast-12345"')

print("\n" + "=" * 80)
print("Ready for Asterisk integration!")
print("=" * 80 + "\n")
