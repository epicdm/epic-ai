# Transfer Tool Adapter Pack v1

**Status**: Complete
**Version**: 1.0.0
**Date**: 2026-01-26

## Overview

The Transfer Tool Adapter Pack v1 implements complete call handoff/transfer functionality from AI agents to human support via Asterisk AMI (Asterisk Manager Interface). It integrates policy-based target resolution with voice-service AMI integration.

## Architecture

```
Flow Node (handoff.ts)
  ↓
Policy-First Target Resolution (resolveHandoffTargetPolicyFirst)
  ↓
Transfer Tool (executeTransferTool)
  ↓
Flask Endpoint (/telephony/transfer)
  ↓
Python AMI Client (ami_client.py)
  ↓
Asterisk Manager Interface (AMI Socket)
  ↓
Channel Redirect to New Dialplan Context
```

## Critical Discovery: Session Field Path

**IMPORTANT**: The active Asterisk channel is stored in the live session as a **flat Redis HSET field**, not nested JSON.

- **Field Name**: `asterisk_channel`
- **Storage Type**: Redis HSET (not JSON.SET)
- **Sample Value**: `PJSIP/+17675551234-00000001` or `PJSIP/alice-00000001`
- **Bridged Channel**: `asterisk_other_channel` (optional, for transferring both legs)

### Example Session Structure
```json
{
  "sessionId": "call-123",
  "agentId": "agent-1",
  "channel": "VOICE",
  "asterisk_channel": "PJSIP/alice-00000001",
  "asterisk_other_channel": "PJSIP/bob-00000002",
  "tags": ["vip"],
  ...
}
```

## Components

### 1. Python AMI Client (`apps/voice-service/ami_client.py`)
Minimal socket-based AMI client for channel redirects.

**Key Class**: `AsteriskAMI`
```python
class AsteriskAMI:
    def redirect(
        self,
        channel: str,          # e.g., "PJSIP/alice-00000001"
        context: str,          # e.g., "support_queue"
        exten: str,            # e.g., "1"
        priority: int = 1,
        extra_channel: Optional[str] = None
    ) -> Dict[str, Any]:
        # Returns: {ok: bool, response: str, duration_ms: int}
```

**Environment Variables**:
- `ASTERISK_AMI_HOST` (default: "127.0.0.1")
- `ASTERISK_AMI_PORT` (default: "5038")
- `ASTERISK_AMI_USERNAME` (default: "admin")
- `ASTERISK_AMI_SECRET` (default: "admin")
- `ASTERISK_AMI_TIMEOUT` (default: "3.0" seconds)

### 2. Flask Endpoint (`apps/voice-service/main.py`)
HTTP endpoint bridging TypeScript workers to Python AMI client.

**Route**: `POST /telephony/transfer`

**Request**:
```json
{
  "channel": "PJSIP/alice-00000001",
  "context": "support_queue",
  "exten": "1",
  "priority": 1,
  "extra_channel": "PJSIP/bob-00000002" // optional
}
```

**Response (Success)**:
```json
{
  "ok": true,
  "data": {
    "ok": true,
    "response": "Response: Success\r\n...",
    "duration_ms": 125
  }
}
```

**Response (Failure)**:
```json
{
  "ok": false,
  "error": "AMI Redirect failed",
  "details": {...}
}
```

### 3. Transfer Tool Adapter (`apps/workers/src/runtime/tools/transfer.ts`)
TypeScript adapter for fetch-based calls to voice-service.

**Export**: `executeTransferTool(session, args)`
```typescript
export async function executeTransferTool(
  session: LiveSession,
  args: TransferArgs
): Promise<TransferResult>
```

**Key Features**:
- Extracts `asterisk_channel` from session (uses discovered field path)
- Calls voice-service `/telephony/transfer` endpoint
- Returns standardized `TransferResult` with ok/code/message/data
- Timeout: 5000ms (configurable)
- Includes channel validation

### 4. Handoff Node Runner (`apps/workers/src/runtime/flow/nodes/handoff.ts`)
Flow node that orchestrates complete handoff sequence.

**Function**: `runHandoffNode(args)`
```typescript
export async function runHandoffNode(
  args: HandoffNodeArgs
): Promise<HandoffNodeResult>
```

**Sequence**:
1. Resolve target via `node.target` or policy-first resolution
2. Optionally play TTS message to customer
3. Call `executeTransferTool()` to redirect channel
4. Write session events (ESCALATED/ESCALATION_FAILED)
5. Return stop signal to halt AI loop

**Session Events Written**:
- Success: `{state: "ESCALATED", escalated: "true", escalation_reason, escalation_target, escalation_at}`
- Failure: `{state: "ESCALATION_FAILED", escalation_attempted: "true", escalation_error}`

## Policy-Based Target Resolution

The handoff node uses `resolveHandoffTargetPolicyFirst()` for intelligent target selection.

**Priority Chain**:
1. Explicit `node.target` (if specified)
2. Policy rules (matching `reason` + optional constraints)
3. Policy fallback target (if no rule matches)
4. Governance default target
5. First enabled target

**Policy Rule Constraints** (all must match):
- `reason`: Escalation reason (must match)
- `channel`: Call type (VOICE, CHAT, SMS, EMAIL) - optional
- `tags_any`: Customer has any of these tags - optional (OR logic)
- `tags_all`: Customer has all of these tags - optional (AND logic)
- `min_severity`: Severity threshold (low < medium < high < critical) - optional

**Example Governance Config**:
```typescript
{
  handoff: {
    enabled: true,
    handoff_targets: [
      {
        id: "target-vip",
        context: "vip_support",
        exten: "1",
        priority: 1,
        enabled: true
      },
      {
        id: "target-basic",
        context: "support",
        exten: "1",
        enabled: true
      }
    ],
    default_handoff_target_id: "target-basic",
    policy: {
      enabled: true,
      reason_rules: [
        {
          id: "vip-rule",
          reason: "customer_requested_human",
          priority: 100,
          target_id: "target-vip",
          enabled: true,
          when: {
            tags_any: ["vip"],
            min_severity: "high"
          }
        }
      ],
      fallback_target_id: "target-basic"
    }
  }
}
```

## Asterisk Dialplan Requirements

Transfer targets must exist as valid contexts/extensions in `extensions.conf`.

**Example Dialplan**:
```
[support]
exten => 1,1,Queue(support_queue)
exten => 1,n,Hangup()

[vip_support]
exten => 1,1,Queue(vip_queue)
exten => 1,n,Hangup()

[manager_queue]
exten => 5,1,Queue(manager_queue)
exten => 5,2,Hangup()
```

## Error Scenarios

| Scenario | Behavior | Session State |
|----------|----------|---------------|
| Missing `asterisk_channel` in session | Returns 400, no AMI call | ESCALATION_FAILED |
| No matching handoff target | Returns error, no AMI call | ESCALATION_FAILED |
| AMI socket connection timeout | Returns 500, escalation attempted | TRANSFER_FAILED |
| AMI Redirect fails (no such channel) | Returns 502, escalation attempted | TRANSFER_FAILED |
| TTS playback fails (non-critical) | Continues with transfer | ESCALATED (if transfer succeeds) |
| Session event write fails (non-critical) | Transfer already executed, logged | ESCALATED |

## Testing

Unit tests in `apps/workers/src/runtime/flow/nodes/__tests__/handoff-node.test.ts`:
- Missing `asterisk_channel` error handling
- Missing handoff target error handling
- Policy-based target resolution
- Explicit node target
- Session event tracking

E2E tests in `apps/workers/src/runtime/flow/nodes/__tests__/e2e-handoff-policy.ts`:
- 7 scenarios covering VIP escalation, channel-specific routing, severity-based chains, multi-constraint rules, fallback chains, priority selection, and disabled rule filtering

## Environment Configuration

**Required for voice-service**:
```bash
ASTERISK_AMI_HOST=127.0.0.1
ASTERISK_AMI_PORT=5038
ASTERISK_AMI_USERNAME=admin
ASTERISK_AMI_SECRET=admin
ASTERISK_AMI_TIMEOUT=3.0
```

**Required for workers**:
```bash
VOICE_SERVICE_URL=http://localhost:8000  # or DigitalOcean App Platform URL
```

## Debugging

**Console Logs** (from handoff node):
```
[handoff-node] Starting handoff execution - logs channel, target, reason
[handoff-node] Playing transfer message - if TTS enabled
[handoff-node] Executing transfer - before calling transfer tool
[handoff-node] Transfer succeeded - if AMI redirect succeeded
[handoff-node] Handoff execution failed - if any exception thrown
[handoff-node] Writing session event - logs to session
```

**Console Logs** (from transfer tool):
```
Transfer: channel={channel} target={context}/{exten}
Transfer failed: {status} - {error}
Transfer AMI error: {error}
Transfer succeeded: {duration_ms}ms
Transfer tool error: {message}
```

## Future Enhancements

Potential v2+ features:
- Queue status checking before routing
- Dynamic capacity-based target selection
- Estimated wait time announcements
- Transfer timeout and escalation fallback
- Real-time agent availability integration
- Call recording during transfer
- Post-transfer survey automation

## Migration Notes

This is the first version (v1) of the Transfer Tool Adapter Pack. It provides:
- ✅ Basic AMI Redirect via Flask microservice
- ✅ Policy-based target resolution with priority rules
- ✅ Session event tracking
- ✅ TTS message before transfer
- ✅ Error handling and safe fallbacks

The implementation is production-ready for v1 scope. Future versions will add queue integration, dynamic routing, and advanced features.
