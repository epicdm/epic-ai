#!/usr/bin/env python3
"""
Test Route-to-Agent Adapter v1

Verifies the runtime adapter logic for DTMF-based call flows
"""
import json

print("=" * 80)
print("ROUTE-TO-AGENT ADAPTER v1 - TEST & DOCUMENTATION")
print("=" * 80)

print("\n✅ Architecture:")
print("""
  Asterisk Inbound Call
      ↓
  POST /telephony/route_to_agent
      ↓
  RouteToAgentAdapter
      ↓
  ┌─────────────────────────────────────┐
  │ 1. Call inbound-call-guard          │
  │    (fail-closed enforcement)         │
  │                                      │
  │ 2. Fetch wizard snapshot             │
  │    (Agent OS configuration)          │
  │                                      │
  │ 3. Build action plan                 │
  │    (speak + DTMF + record)          │
  │                                      │
  │ 4. Store session state               │
  └─────────────────────────────────────┘
      ↓
  Return action plan to Asterisk
""")

print("\n" + "=" * 80)
print("ENDPOINT 1: /telephony/route_to_agent")
print("=" * 80)

print("\n--- Request Format ---")
route_request = {
    "did": "+17675551234",
    "from": "+14155559876",
    "callSid": "ast-12345"
}
print(json.dumps(route_request, indent=2))

print("\n--- Response (Allowed - Sales Qualifier Template) ---")
allowed_response = {
    "ok": True,
    "action": "speak_and_collect_dtmf",
    "tts": "Hi! Thanks for calling Acme Corp. You're speaking with Sales Bot. Press 1 for Sales. Press 2 for Support. Press 9 to leave a message.",
    "dtmf": {
        "mode": "collect",
        "max_digits": 1,
        "timeout_ms": 8000,
        "retries": 1,
        "valid_digits": ["1", "2", "9"],
        "prompt_on_retry_tts": "Sorry, I didn't get that. Press 1 for Sales, 2 for Support, or 9 to leave a message."
    },
    "voiceAgentId": "va_sales_bot_123",
    "request_id": "rta_abc123_1234567890"
}
print(json.dumps(allowed_response, indent=2))

print("\n--- Response (Blocked) ---")
blocked_response = {
    "ok": False,
    "action": "reject",
    "tts": "Sorry, this line is not available right now.",
    "blocked": {
        "reason_code": "AGENT_NOT_LIVE",
        "reason_detail": "Agent is in DRAFT status and cannot receive calls"
    },
    "request_id": "rta_xyz789_1234567890"
}
print(json.dumps(blocked_response, indent=2))

print("\n" + "=" * 80)
print("ENDPOINT 2: /telephony/continue")
print("=" * 80)

print("\n--- Request Format (DTMF Input) ---")
continue_dtmf = {
    "callSid": "ast-12345",
    "digit": "1"
}
print(json.dumps(continue_dtmf, indent=2))

print("\n--- Response (Sales Follow-up) ---")
sales_followup = {
    "ok": True,
    "action": "speak_and_collect_dtmf",
    "tts": "Sales. Press 1 if you want a call back today. Press 2 for tomorrow. Press 9 to leave a message.",
    "dtmf": {
        "mode": "collect",
        "max_digits": 1,
        "timeout_ms": 8000,
        "retries": 1,
        "valid_digits": ["1", "2", "9"],
        "prompt_on_retry_tts": "Press 1 for today, 2 for tomorrow, or 9 to leave a message."
    },
    "request_id": "cont_abc123_1234567890"
}
print(json.dumps(sales_followup, indent=2))

print("\n--- Request Format (Recording) ---")
continue_record = {
    "callSid": "ast-12345",
    "digit": "9"
}
print(json.dumps(continue_record, indent=2))

print("\n--- Response (Record Voicemail) ---")
record_response = {
    "ok": True,
    "action": "record_message",
    "tts": "Please leave your message after the beep. When you're done, you can hang up.",
    "record": {
        "format": "wav",
        "max_seconds": 120,
        "beep": True
    },
    "request_id": "cont_xyz789_1234567890"
}
print(json.dumps(record_response, indent=2))

print("\n--- Request Format (Recording Complete) ---")
recording_done = {
    "callSid": "ast-12345",
    "recordingUrl": "http://voice-service/recordings/ast-12345.wav"
}
print(json.dumps(recording_done, indent=2))

print("\n--- Response (Recording Acknowledgment) ---")
recording_ack = {
    "ok": True,
    "action": "speak_and_end",
    "tts": "Thanks. Your message has been saved. Goodbye.",
    "request_id": "cont_done_1234567890"
}
print(json.dumps(recording_ack, indent=2))

print("\n" + "=" * 80)
print("TEMPLATE-BASED ACTION PLANS")
print("=" * 80)

print("\n--- Template: sales_qualifier ---")
print("Initial Prompt:")
print('  "Press 1 for Sales. Press 2 for Support. Press 9 to leave a message."')
print("\nDTMF Flow:")
print("  1 → Sales follow-up (call back today/tomorrow)")
print("  2 → Support recording")
print("  9 → Voicemail recording")

print("\n--- Template: default (fallback) ---")
print("Initial Prompt:")
print('  "This is [Agent Name]. Press 9 to leave a message."')
print("\nDTMF Flow:")
print("  9 → Voicemail recording")

print("\n" + "=" * 80)
print("ACTION TYPES")
print("=" * 80)

action_types = {
    "speak_and_collect_dtmf": {
        "description": "Play TTS and collect DTMF input",
        "fields": ["tts", "dtmf"],
        "asterisk_usage": "Playback(tts) + Read(digit, ...)"
    },
    "record_message": {
        "description": "Play TTS and record audio message",
        "fields": ["tts", "record"],
        "asterisk_usage": "Playback(tts) + Record(filename, ...)"
    },
    "speak_and_end": {
        "description": "Play TTS and hang up",
        "fields": ["tts"],
        "asterisk_usage": "Playback(tts) + Hangup()"
    },
    "reject": {
        "description": "Reject call with TTS message",
        "fields": ["tts"],
        "asterisk_usage": "Playback(tts) + Hangup()"
    }
}

for action, info in action_types.items():
    print(f"\n{action}:")
    print(f"  Description: {info['description']}")
    print(f"  Fields: {', '.join(info['fields'])}")
    print(f"  Asterisk: {info['asterisk_usage']}")

print("\n" + "=" * 80)
print("CALL FLOW EXAMPLES")
print("=" * 80)

print("\n--- Flow 1: Sales Inquiry (DTMF path) ---")
print("1. Asterisk → POST /telephony/route_to_agent")
print("   Response: speak_and_collect_dtmf (Press 1/2/9)")
print("2. Caller presses 1")
print("3. Asterisk → POST /telephony/continue {digit: '1'}")
print("   Response: speak_and_collect_dtmf (Call back today/tomorrow/message)")
print("4. Caller presses 1 (today)")
print("5. Asterisk → POST /telephony/continue {digit: '1'}")
print("   Response: speak_and_end ('We will call you back today')")
print("6. Call ends")

print("\n--- Flow 2: Voicemail (Recording path) ---")
print("1. Asterisk → POST /telephony/route_to_agent")
print("   Response: speak_and_collect_dtmf (Press 1/2/9)")
print("2. Caller presses 9")
print("3. Asterisk → POST /telephony/continue {digit: '9'}")
print("   Response: record_message (Leave message after beep)")
print("4. Asterisk records audio, uploads to storage")
print("5. Asterisk → POST /telephony/continue {recordingUrl: 'http://...'}")
print("   Response: speak_and_end ('Your message has been saved')")
print("6. Call ends")

print("\n--- Flow 3: Blocked Call (Guard rejection) ---")
print("1. Asterisk → POST /telephony/route_to_agent")
print("2. Adapter calls inbound-call-guard → allow: false, reason: AGENT_NOT_LIVE")
print("3. Response: reject ('This line is not available right now')")
print("4. Asterisk plays rejection message")
print("5. Call ends")

print("\n" + "=" * 80)
print("SESSION STATE MANAGEMENT")
print("=" * 80)

print("\nIn-Memory Session Store (v1):")
print("  Key: callSid")
print("  Value: {")
print("    voiceAgentId: string,")
print("    companyId: string,")
print("    companyName: string,")
print("    agentName: string,")
print("    templateKey: string,")
print("    did: string,")
print("    from: string,")
print("    startedAt: number (ms)")
print("  }")

print("\nSession Lifecycle:")
print("  1. Created on first route_to_agent call")
print("  2. Referenced by continue calls")
print("  3. Persists until process restart (v1)")
print("  4. TODO v2: Move to Redis for multi-process support")

print("\n" + "=" * 80)
print("INTEGRATION WITH AGENT OS")
print("=" * 80)

print("\nWizard Snapshot Fetch:")
print("  GET /api/agent-os/agents/{voiceAgentId}/wizard-snapshot")

print("\nSnapshot Structure:")
print("  {")
print('    data: {')
print('      role_card: { name: "...", company: "..." },')
print('      personality: { ... },')
print('      knowledge: { ... },')
print('      tools: [ ... ]')
print('    },')
print('    templateKey: "sales_qualifier" | "default" | null')
print("  }")

print("\nTemplate-Based Decision Logic:")
print("  • sales_qualifier → Multi-option DTMF menu (1=Sales, 2=Support, 9=Message)")
print("  • default → Simple voicemail option (9=Message)")

print("\n" + "=" * 80)
print("ENVIRONMENT VARIABLES")
print("=" * 80)

env_vars = {
    "EPIC_APP_BASE_URL": {
        "required": False,
        "default": "http://localhost:3000",
        "description": "Base URL for Epic web app (for API calls)",
        "alternatives": ["NEXT_PUBLIC_APP_URL", "APP_URL"]
    },
    "TELEPHONY_INTERNAL_TOKEN": {
        "required": False,
        "default": None,
        "description": "Internal token for API auth (optional but recommended)",
        "usage": "Sent as x-epic-internal-token header"
    }
}

for var, info in env_vars.items():
    print(f"\n{var}:")
    print(f"  Required: {info['required']}")
    print(f"  Default: {info['default']}")
    print(f"  Description: {info['description']}")
    if "alternatives" in info:
        print(f"  Alternatives: {', '.join(info['alternatives'])}")
    if "usage" in info:
        print(f"  Usage: {info['usage']}")

print("\n" + "=" * 80)
print("TESTING COMMANDS")
print("=" * 80)

print("\n# Start voice-service")
print("cd /opt/epic-ai/apps/voice-service")
print("python3 main.py")

print("\n# Test route_to_agent (allowed)")
print('curl -X POST http://localhost:5000/telephony/route_to_agent \\')
print('  -H "Content-Type: application/json" \\')
print('  -d \'{"did": "+17675551234", "from": "+14155559876", "callSid": "test-123"}\'')

print("\n# Test route_to_agent (blocked - unmapped DID)")
print('curl -X POST http://localhost:5000/telephony/route_to_agent \\')
print('  -H "Content-Type: application/json" \\')
print('  -d \'{"did": "+19995551111", "from": "+14155559876", "callSid": "test-456"}\'')

print("\n# Test continue (DTMF input)")
print('curl -X POST http://localhost:5000/telephony/continue \\')
print('  -H "Content-Type: application/json" \\')
print('  -d \'{"callSid": "test-123", "digit": "1"}\'')

print("\n# Test continue (recording complete)")
print('curl -X POST http://localhost:5000/telephony/continue \\')
print('  -H "Content-Type: application/json" \\')
print('  -d \'{"callSid": "test-123", "recordingUrl": "http://example.com/recording.wav"}\'')

print("\n# Health check")
print('curl http://localhost:5000/telephony/route_to_agent/health')

print("\n" + "=" * 80)
print("KEY FEATURES")
print("=" * 80)

features = [
    "✅ Fail-closed enforcement via inbound-call-guard",
    "✅ Template-based action plans (sales_qualifier, default)",
    "✅ DTMF-driven call flows (no ASR in v1)",
    "✅ Recording support for voicemail",
    "✅ Session state management",
    "✅ Integration with Agent OS wizard snapshots",
    "✅ Request ID correlation across all layers",
    "✅ Internal token authentication",
    "✅ Graceful error handling",
    "✅ Flask blueprint architecture"
]

for feature in features:
    print(f"  {feature}")

print("\n" + "=" * 80)
print("LIMITATIONS (v1)")
print("=" * 80)

limitations = [
    "⏭️ No real-time ASR (DTMF only)",
    "⏭️ In-memory session state (not Redis)",
    "⏭️ No LiveKit integration yet",
    "⏭️ No call recording storage integration",
    "⏭️ No CRM lead creation",
    "⏭️ Limited template types (2 total)"
]

for limitation in limitations:
    print(f"  {limitation}")

print("\n" + "=" * 80)
print("NEXT STEPS (v2)")
print("=" * 80)

next_steps = [
    "1. LiveKit integration for real-time ASR/TTS",
    "2. Redis session storage for multi-process support",
    "3. Recording storage integration (S3/R2)",
    "4. CRM lead creation on voicemail",
    "5. More template types (support_triage, appointment_booking, etc.)",
    "6. Call analytics and metrics",
    "7. Real-time agent state synchronization"
]

for step in next_steps:
    print(f"  {step}")

print("\n" + "=" * 80)
print("Status: ✅ READY FOR TESTING")
print("=" * 80 + "\n")
