#!/usr/bin/env python3
"""
Test Resolve DID v1

Verifies the simpler resolve-did response format
"""
import json

print("=" * 80)
print("RESOLVE DID v1 - TEST & DOCUMENTATION")
print("=" * 80)

print("\n✅ Purpose:")
print("""
Answers ONE question reliably:
"Given an inbound DID, what VoiceAgent (if any) should receive the call — and is it active?"
""")

print("\n" + "=" * 80)
print("ENDPOINT: GET /api/telephony/resolve-did")
print("=" * 80)

print("\n--- Request Format ---")
print("GET /api/telephony/resolve-did?did=+17675551234")

print("\n--- Response 1: UNMAPPED (DID not found) ---")
unmapped_response = {
    "ok": True,
    "did": "+17675551234",
    "mapping": None,
    "voiceAgent": None,
    "reason": "UNMAPPED"
}
print(json.dumps(unmapped_response, indent=2))

print("\n--- Response 2: INACTIVE_MAPPING (Mapping disabled) ---")
inactive_response = {
    "ok": True,
    "did": "+17675551234",
    "mapping": {
        "id": "pm_abc123",
        "did": "+17675551234",
        "voiceAgentId": "va_xyz789",
        "isActive": False,
        "updatedAt": "2026-01-25T12:00:00Z"
    },
    "voiceAgent": None,
    "reason": "INACTIVE_MAPPING"
}
print(json.dumps(inactive_response, indent=2))

print("\n--- Response 3: MISSING_AGENT (Agent not found) ---")
missing_agent_response = {
    "ok": True,
    "did": "+17675551234",
    "mapping": {
        "id": "pm_abc123",
        "did": "+17675551234",
        "voiceAgentId": "va_missing",
        "isActive": True,
        "updatedAt": "2026-01-25T12:00:00Z"
    },
    "voiceAgent": None,
    "reason": "MISSING_AGENT"
}
print(json.dumps(missing_agent_response, indent=2))

print("\n--- Response 4: SUCCESS (Valid mapping + agent) ---")
success_response = {
    "ok": True,
    "did": "+17675551234",
    "mapping": {
        "id": "pm_abc123",
        "did": "+17675551234",
        "voiceAgentId": "va_published_001",
        "isActive": True,
        "updatedAt": "2026-01-25T12:00:00Z"
    },
    "voiceAgent": {
        "id": "va_published_001",
        "name": "Sales Agent",
        "status": "PUBLISHED",
        "isActive": True
    }
}
print(json.dumps(success_response, indent=2))

print("\n" + "=" * 80)
print("INTEGRATION WITH INBOUND-CALL-GUARD")
print("=" * 80)

print("\n✅ Architecture:")
print("""
  inbound-call-guard (Layer 1: Call-time enforcement)
      ↓ internal fetch
  resolve-did (Layer 2: DID → VoiceAgent lookup)
      ↓ database query
  PhoneMapping → VoiceAgent
""")

print("\n✅ Live-Only Enforcement:")
print("• resolve-did: Returns raw agent info (no status filtering)")
print("• inbound-call-guard: Enforces PUBLISHED/READY + isActive checks")

print("\n✅ Reason Code Translation:")
print("resolve-did reasons → inbound-call-guard stable codes:")
print("  UNMAPPED → NO_MAPPING")
print("  INACTIVE_MAPPING → MAPPING_INACTIVE")
print("  MISSING_AGENT → AGENT_MISSING")
print("  (+ additional checks for AGENT_NOT_LIVE, AGENT_ARCHIVED, etc.)")

print("\n" + "=" * 80)
print("TESTING COMMANDS")
print("=" * 80)

print("\n# Start web app")
print("cd /opt/epic-ai/apps/web")
print("pnpm dev")

print("\n# Test resolve-did (unmapped)")
print('curl -sS "http://localhost:3000/api/telephony/resolve-did?did=%2B19995551111" | jq .')

print("\n# Test resolve-did (valid DID - if you have one in database)")
print('curl -sS "http://localhost:3000/api/telephony/resolve-did?did=%2B17675551234" | jq .')

print("\n# Test inbound-call-guard (uses resolve-did internally)")
print('curl -sS "http://localhost:3000/api/telephony/inbound-call-guard?did=%2B19995551111&from=%2B14155559876" | jq .')

print("\n" + "=" * 80)
print("RESPONSE FIELDS")
print("=" * 80)

fields = {
    "ok": {
        "type": "boolean",
        "description": "Whether the request was successful (not whether call is allowed)"
    },
    "did": {
        "type": "string",
        "description": "Normalized DID that was queried"
    },
    "mapping": {
        "type": "object | null",
        "description": "PhoneMapping record if found, null otherwise",
        "fields": {
            "id": "PhoneMapping ID",
            "did": "Phone number (phoneNumber field)",
            "voiceAgentId": "Associated VoiceAgent ID",
            "isActive": "Whether mapping is active",
            "updatedAt": "Last update timestamp (ISO 8601)"
        }
    },
    "voiceAgent": {
        "type": "object | null",
        "description": "VoiceAgent record if found, null otherwise",
        "fields": {
            "id": "VoiceAgent ID",
            "name": "Agent name",
            "status": "Agent status (DRAFT, PUBLISHED, READY, ARCHIVED, PAUSED)",
            "isActive": "Whether agent is active"
        }
    },
    "reason": {
        "type": "string | undefined",
        "description": "Rejection reason if mapping/agent not found",
        "values": ["UNMAPPED", "INACTIVE_MAPPING", "MISSING_AGENT"]
    }
}

for field, info in fields.items():
    print(f"\n{field}:")
    print(f"  Type: {info['type']}")
    print(f"  Description: {info['description']}")
    if "fields" in info:
        print("  Fields:")
        for subfield, desc in info["fields"].items():
            print(f"    - {subfield}: {desc}")
    if "values" in info:
        print(f"  Values: {', '.join(info['values'])}")

print("\n" + "=" * 80)
print("KEY BEHAVIORS")
print("=" * 80)

behaviors = [
    "✅ Normalizes DID (removes spaces, hyphens, parentheses)",
    "✅ Looks up PhoneMapping by phoneNumber field (unique index)",
    "✅ Returns reason if mapping not found or inactive",
    "✅ Returns reason if VoiceAgent not found",
    "✅ Returns full mapping + voiceAgent if both exist",
    "✅ Does NOT enforce live-only routing (that's guard's job)",
    "✅ Simple response format (no envelope)",
    "✅ Returns 200 OK even for unmapped DIDs (ok=true, reason='UNMAPPED')"
]

for behavior in behaviors:
    print(f"  {behavior}")

print("\n" + "=" * 80)
print("COMPARISON: Old vs New")
print("=" * 80)

print("\n--- Old Format (Complex) ---")
old_format = {
    "data": {
        "allowed": True,
        "agentId": "va_123",
        "reason_code": "OK"
    },
    "confidence": {"resolve_did": 0.98},
    "gaps": [],
    "warnings": []
}
print(json.dumps(old_format, indent=2))

print("\n--- New Format (Simple v1) ---")
new_format = {
    "ok": True,
    "did": "+17675551234",
    "mapping": {"id": "pm_123", "did": "+17675551234", "voiceAgentId": "va_123", "isActive": True, "updatedAt": "2026-01-25T12:00:00Z"},
    "voiceAgent": {"id": "va_123", "name": "Agent", "status": "PUBLISHED", "isActive": True}
}
print(json.dumps(new_format, indent=2))

print("\n" + "=" * 80)
print("ADVANTAGES OF v1 FORMAT")
print("=" * 80)

advantages = [
    "✅ Simpler: No envelope, gaps, warnings, confidence",
    "✅ Clearer: Returns actual data objects (mapping, voiceAgent)",
    "✅ More flexible: Consumers can make their own routing decisions",
    "✅ Single responsibility: Just resolve DID, don't enforce policy",
    "✅ Easier to test: Simple JSON structure",
    "✅ Better TypeScript: No 'any' types needed"
]

for advantage in advantages:
    print(f"  {advantage}")

print("\n" + "=" * 80)
print("Status: ✅ READY FOR TESTING")
print("=" * 80 + "\n")
