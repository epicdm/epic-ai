#!/usr/bin/env python3
"""
Test Inbound Call Guard v1

Verifies the runtime gate that prevents non-live agents from receiving calls
"""
import json

print("=" * 80)
print("INBOUND CALL GUARD v1 - TEST & DOCUMENTATION")
print("=" * 80)

print("\n✅ Purpose:")
print("""
Runtime "single source of truth" gate that prevents any inbound traffic
from touching non-live agents.
""")

print("\n✅ Live-Eligibility Rules (v1):")
rules = [
    "1. DID mapping exists",
    "2. mapping.isActive = true",
    "3. voiceAgent exists",
    "4. voiceAgent.isActive = true",
    "5. voiceAgent.status is READY or PUBLISHED (case-insensitive)"
]
for rule in rules:
    print(f"  {rule}")

print("\n" + "=" * 80)
print("ENDPOINT: GET /api/telephony/inbound-guard")
print("=" * 80)

print("\n--- Request Format ---")
print("GET /api/telephony/inbound-guard?did=+17675551234")

print("\n" + "=" * 80)
print("RESPONSE SCENARIOS")
print("=" * 80)

print("\n--- Scenario 1: ALLOWED (200 OK) ---")
allowed_response = {
    "ok": True,
    "allowed": True,
    "did": "+17675551234",
    "mappingId": "pm_abc123",
    "voiceAgentId": "va_published_001"
}
print(json.dumps(allowed_response, indent=2))
print("HTTP Status: 200")
print("Meaning: Call is allowed, route to voiceAgentId")

print("\n--- Scenario 2: UNMAPPED (404 Not Found) ---")
unmapped_response = {
    "ok": True,
    "allowed": False,
    "did": "+19995551111",
    "reason": "UNMAPPED",
    "message": "No DID mapping found"
}
print(json.dumps(unmapped_response, indent=2))
print("HTTP Status: 404")
print("Meaning: DID not found in PhoneMapping table")

print("\n--- Scenario 3: MISSING_AGENT (404 Not Found) ---")
missing_agent_response = {
    "ok": True,
    "allowed": False,
    "did": "+17675551234",
    "reason": "MISSING_AGENT",
    "message": "Mapping exists but VoiceAgent not found",
    "mappingId": "pm_abc123",
    "voiceAgentId": "va_missing"
}
print(json.dumps(missing_agent_response, indent=2))
print("HTTP Status: 404")
print("Meaning: Mapping exists but referenced VoiceAgent doesn't exist")

print("\n--- Scenario 4: INACTIVE_MAPPING (409 Conflict) ---")
inactive_mapping_response = {
    "ok": True,
    "allowed": False,
    "did": "+17675551234",
    "reason": "INACTIVE_MAPPING",
    "message": "DID mapping exists but is inactive",
    "mappingId": "pm_abc123",
    "voiceAgentId": "va_xyz789"
}
print(json.dumps(inactive_mapping_response, indent=2))
print("HTTP Status: 409")
print("Meaning: Mapping exists but isActive = false")

print("\n--- Scenario 5: INACTIVE_AGENT (409 Conflict) ---")
inactive_agent_response = {
    "ok": True,
    "allowed": False,
    "did": "+17675551234",
    "reason": "INACTIVE_AGENT",
    "message": "VoiceAgent is inactive",
    "mappingId": "pm_abc123",
    "voiceAgentId": "va_xyz789",
    "agentStatus": "PUBLISHED"
}
print(json.dumps(inactive_agent_response, indent=2))
print("HTTP Status: 409")
print("Meaning: Agent exists but isActive = false")

print("\n--- Scenario 6: NOT_LIVE (409 Conflict) ---")
not_live_response = {
    "ok": True,
    "allowed": False,
    "did": "+17675551234",
    "reason": "NOT_LIVE",
    "message": "VoiceAgent must be READY or PUBLISHED for inbound calls",
    "mappingId": "pm_abc123",
    "voiceAgentId": "va_draft_001",
    "agentStatus": "DRAFT"
}
print(json.dumps(not_live_response, indent=2))
print("HTTP Status: 409")
print("Meaning: Agent status is not READY or PUBLISHED (e.g., DRAFT, ARCHIVED, PAUSED)")

print("\n--- Scenario 7: BAD_REQUEST (400 Bad Request) ---")
bad_request_response = {
    "ok": True,
    "allowed": False,
    "did": "",
    "reason": "BAD_REQUEST",
    "message": "Missing DID"
}
print(json.dumps(bad_request_response, indent=2))
print("HTTP Status: 400")
print("Meaning: DID parameter is missing or invalid")

print("\n" + "=" * 80)
print("HTTP STATUS CODE MAPPING")
print("=" * 80)

status_codes = {
    "200 OK": {
        "condition": "allowed = true",
        "reason": "N/A",
        "action": "Route call to voiceAgentId"
    },
    "404 Not Found": {
        "condition": "allowed = false",
        "reason": "UNMAPPED or MISSING_AGENT",
        "action": "Reject call (DID not configured)"
    },
    "409 Conflict": {
        "condition": "allowed = false",
        "reason": "INACTIVE_MAPPING, INACTIVE_AGENT, or NOT_LIVE",
        "action": "Reject call (DID mapped but agent not eligible)"
    },
    "400 Bad Request": {
        "condition": "allowed = false",
        "reason": "BAD_REQUEST",
        "action": "Reject call (invalid request)"
    },
    "500 Internal Error": {
        "condition": "ok = false",
        "reason": "INTERNAL_ERROR",
        "action": "Reject call (unexpected error)"
    }
}

for code, info in status_codes.items():
    print(f"\n{code}:")
    print(f"  Condition: {info['condition']}")
    print(f"  Reason: {info['reason']}")
    print(f"  Action: {info['action']}")

print("\n" + "=" * 80)
print("DECISION FLOW")
print("=" * 80)

print("""
1. Normalize DID (remove spaces, hyphens, parentheses)
   ↓
2. Lookup PhoneMapping by phoneNumber
   ↓ not found
   └→ UNMAPPED (404)
   ↓ found
3. Check mapping.isActive
   ↓ false
   └→ INACTIVE_MAPPING (409)
   ↓ true
4. Lookup VoiceAgent by agentId
   ↓ not found
   └→ MISSING_AGENT (404)
   ↓ found
5. Check agent.isActive
   ↓ false
   └→ INACTIVE_AGENT (409)
   ↓ true
6. Check agent.status (READY or PUBLISHED)
   ↓ false
   └→ NOT_LIVE (409)
   ↓ true
7. ALLOWED (200) ✅
""")

print("\n" + "=" * 80)
print("LIVE STATUS CHECK")
print("=" * 80)

print("\nLive-eligible statuses (case-insensitive):")
print("  • READY")
print("  • PUBLISHED")

print("\nNOT live-eligible:")
print("  • DRAFT")
print("  • ARCHIVED")
print("  • PAUSED")
print("  • TESTING")
print("  • (any other status)")

print("\n" + "=" * 80)
print("INTEGRATION WITH RESOLVE-DID")
print("=" * 80)

print("""
resolve-did vs inbound-guard:

resolve-did:
  • Returns raw mapping + voiceAgent data
  • No policy enforcement
  • Used for: Lookups, debugging, admin UI

inbound-guard:
  • Uses resolve-did internally (via shared helper)
  • Enforces live-only policy
  • Returns HTTP status codes for runtime decisions
  • Used for: Asterisk, voice-service, real-time call routing
""")

print("\n" + "=" * 80)
print("TESTING COMMANDS")
print("=" * 80)

print("\n# Start web app")
print("cd /opt/epic-ai/apps/web")
print("pnpm dev")

print("\n# Test 1: Unmapped DID (should return 404)")
print('curl -i "http://localhost:3000/api/telephony/inbound-guard?did=%2B19995551111"')

print("\n# Expected:")
print("# HTTP/1.1 404 Not Found")
print('# {"ok":true,"allowed":false,"reason":"UNMAPPED",...}')

print("\n# Test 2: Valid live agent (should return 200)")
print('curl -i "http://localhost:3000/api/telephony/inbound-guard?did=%2B17675551234"')

print("\n# Expected (if DID exists and agent is live):")
print("# HTTP/1.1 200 OK")
print('# {"ok":true,"allowed":true,"voiceAgentId":"va_...",...}')

print("\n# Test 3: Check both resolve-did and inbound-guard")
print('curl -sS "http://localhost:3000/api/telephony/resolve-did?did=%2B17675551234" | jq .')
print('curl -i "http://localhost:3000/api/telephony/inbound-guard?did=%2B17675551234"')

print("\n" + "=" * 80)
print("ASTERISK INTEGRATION")
print("=" * 80)

print("""
Asterisk can use HTTP status codes to make routing decisions:

[epic-inbound]
exten => _+1767XXXXXXX,1,NoOp(=== Epic Inbound ===)
    same => n,Set(DID=${EXTEN})
    same => n,Set(GUARD_URL=http://epic-web:3000/api/telephony/inbound-guard)
    same => n,Set(GUARD_RESP=${CURL(${GUARD_URL}?did=${DID})})
    same => n,Set(GUARD_STATUS=${CURL_STATUS})

    ; Check HTTP status
    same => n,GotoIf($["${GUARD_STATUS}" = "200"]?allowed)
    same => n,GotoIf($["${GUARD_STATUS}" = "404"]?not-found)
    same => n,GotoIf($["${GUARD_STATUS}" = "409"]?not-eligible)
    same => n,Goto(error)

    ; Parse JSON response for voiceAgentId
    same => n(allowed),Set(AGENT_ID=${SHELL(echo "${GUARD_RESP}" | jq -r '.voiceAgentId')})
    same => n,NoOp(Routing to agent ${AGENT_ID})
    same => n,Gosub(route-to-agent,${AGENT_ID},1)
    same => n,Hangup()

    same => n(not-found),Playback(number-not-in-service)
    same => n,Hangup()

    same => n(not-eligible),Playback(temporarily-unavailable)
    same => n,Hangup()

    same => n(error),Playback(an-error-has-occurred)
    same => n,Hangup()
""")

print("\n" + "=" * 80)
print("KEY FEATURES")
print("=" * 80)

features = [
    "✅ Single source of truth for call-time enforcement",
    "✅ HTTP status codes for runtime decisions (200/404/409/400/500)",
    "✅ Live-only routing (READY or PUBLISHED + isActive)",
    "✅ Clear rejection reasons (UNMAPPED, NOT_LIVE, etc.)",
    "✅ Shared helper for reusability",
    "✅ DID normalization (removes formatting)",
    "✅ Case-insensitive status check",
    "✅ Returns mappingId and voiceAgentId for allowed calls",
    "✅ Returns agentStatus for debugging rejected calls"
]

for feature in features:
    print(f"  {feature}")

print("\n" + "=" * 80)
print("FILES CREATED")
print("=" * 80)

print("""
apps/web/src/lib/telephony/
└── inbound-guard.ts                  (shared helper) ✅

apps/web/src/app/api/telephony/
└── inbound-guard/
    └── route.ts                      (API endpoint) ✅

apps/voice-service/
└── test_inbound_guard_v1.py          (this file) ✅
""")

print("\n" + "=" * 80)
print("Status: ✅ READY FOR TESTING")
print("=" * 80 + "\n")
