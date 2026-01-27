# Human Handoff System - Integration Guide

Complete guide for integrating AI → Human escalation into your voice agent runtime.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Voice Agent Runtime                          │
│                                                                  │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐  │
│  │ Brain Engine │─────>│ Flow Engine  │─────>│   Runtime    │  │
│  │              │      │              │      │   Adapter    │  │
│  │ Decision:    │      │ Node Type:   │      │              │  │
│  │ "handoff"    │      │ "handoff"    │      │ shouldEnd    │  │
│  │ "escalate"   │      │              │      │ = true       │  │
│  └──────────────┘      └──────────────┘      └──────┬───────┘  │
│                                                      │          │
└──────────────────────────────────────────────────────┼──────────┘
                                                       │
                                                       ↓
                                         ┌─────────────────────────┐
                                         │  Handoff Handler        │
                                         │  - Resolve target       │
                                         │  - Execute transfer     │
                                         │  - Update session       │
                                         │  - Log outcome          │
                                         └─────────┬───────────────┘
                                                   │
                                                   ↓
                                         ┌─────────────────────────┐
                                         │  Transfer Tool          │
                                         │  - CLI redirect         │
                                         │  - AMI redirect         │
                                         │  - Validate channel     │
                                         └─────────┬───────────────┘
                                                   │
                                                   ↓
                                         ┌─────────────────────────┐
                                         │  Asterisk PBX           │
                                         │  - Redirect channel     │
                                         │  - Queue/ring agents    │
                                         │  - Bridge to human      │
                                         └─────────────────────────┘
```

## Step 1: Import Handoff Handler

In your voice adapter or runtime processor:

```typescript
// apps/workers/src/runtime/adapters/voice-adapter.ts

import {
  executeHandoff,
  shouldHandoff,
  getHandoffMessage,
  logHandoffAttempt,
} from "../handoff-handler";
```

## Step 2: Check for Handoff Decision

After brain engine returns a decision:

```typescript
// In your processConversationTurn or similar function

export async function processConversationTurn(params: ConversationTurnParams) {
  // ... existing brain engine call ...
  const result = await brainEngine.decide({
    // ... params
  });

  const { decision, flowState } = result;

  // NEW: Check if handoff is required
  if (shouldHandoff(decision)) {
    console.log("[voice-adapter] Handoff/escalation triggered", {
      action: decision.action,
      reason: decision.reasoning,
      flowNode: flowState.currentNode,
    });

    // Execute the handoff
    const handoffResult = await executeHandoff({
      channel: params.channel,         // Active Asterisk channel
      sessionId: params.sessionId,     // Your session identifier
      reason: decision.reasoning || "customer_requested_human",
      flowState: flowState,
      context: params.runtimeContext,
    });

    // Log for analytics
    await logHandoffAttempt(params.sessionId, handoffResult, params.runtimeContext);

    // Return special response that includes handoff message
    const handoffMessage = getHandoffMessage(handoffResult.target);

    return {
      success: handoffResult.success,
      text: handoffMessage,
      flowStage: flowState.currentNode,
      shouldEndCall: true,  // IMPORTANT: Stop AI loop
      toolActions: [],
      handoffExecuted: true,
      handoffTarget: handoffResult.target,
      sessionState: handoffResult.sessionState,
    };
  }

  // ... existing response processing ...
}
```

## Step 3: Handle Handoff in Call Loop

In your main call processing loop:

```typescript
// apps/workers/src/runtime/call-processor.ts or similar

export async function runCallLoop(callParams: CallParams) {
  const { channel, sessionId } = callParams;

  let shouldContinue = true;
  let turnCount = 0;

  while (shouldContinue && turnCount < MAX_TURNS) {
    try {
      // Get user input (transcription)
      const userInput = await getTranscription(channel);

      // Process with brain + flow
      const response = await processConversationTurn({
        userInput,
        channel,
        sessionId,
        // ... other params
      });

      // NEW: Check if handoff was executed
      if (response.handoffExecuted) {
        console.log("[call-loop] Handoff executed, ending AI loop", {
          sessionId,
          target: response.handoffTarget,
        });

        // Play final message before transfer
        if (response.text) {
          await speakToChannel(channel, response.text);
        }

        // Stop the AI loop - human takes over
        shouldContinue = false;
        break;
      }

      // Check if call should end for other reasons
      if (response.shouldEndCall) {
        console.log("[call-loop] Call ending", {
          sessionId,
          reason: response.flowStage,
        });
        shouldContinue = false;
        break;
      }

      // Speak response to customer
      if (response.text) {
        await speakToChannel(channel, response.text);
      }

      turnCount++;
    } catch (err) {
      console.error("[call-loop] Turn failed", { sessionId, error: err });
      // Consider emergency escalation on repeated errors
      if (turnCount > 3) {
        await executeHandoff({
          channel,
          sessionId,
          reason: "system_error_fallback",
          target: "support_queue",
        });
        shouldContinue = false;
      }
    }
  }

  console.log("[call-loop] AI loop ended", {
    sessionId,
    turns: turnCount,
    reason: shouldContinue ? "max_turns" : "handoff_or_end",
  });
}
```

## Step 4: Update Voice Adapter Return Type

Extend your response type to include handoff info:

```typescript
// apps/workers/src/runtime/adapters/voice-adapter.ts

export interface VoiceAdapterResponse {
  success: boolean;
  text: string;
  flowStage: string;
  shouldEndCall: boolean;
  toolActions: ToolAction[];
  requestId?: string;
  tokensUsed?: number;
  latencyMs?: number;
  error?: string;

  // NEW: Handoff fields
  handoffExecuted?: boolean;
  handoffTarget?: string;
  handoffReason?: string;
  sessionState?: "ESCALATED" | "TRANSFER_FAILED" | "ACTIVE";
}
```

## Step 5: Configure Environment Variables

Add to `apps/workers/.env`:

```bash
# ============================================
# Human Handoff Configuration
# ============================================

# Default transfer target (dialplan extension/queue)
HANDOFF_DEFAULT_TARGET=sales_queue

# Dialplan context for handoff
HANDOFF_CONTEXT=sales_queue

# Dialplan priority
HANDOFF_PRIORITY=1

# Play transfer message before handoff
HANDOFF_PLAY_MESSAGE=true

# Transfer method: "cli" or "ami"
HANDOFF_METHOD=cli
```

## Step 6: Add Handoff Intent to Flow Config

Update your flow configuration to include handoff triggers:

```json
{
  "intents": [
    {
      "id": "request_human",
      "description": "Customer explicitly requests to speak with a human agent",
      "examples": [
        "I want to talk to a person",
        "Can I speak to someone?",
        "Transfer me to a human",
        "I need to talk to your team",
        "Let me speak to a real person",
        "Connect me to an agent",
        "I don't want to talk to a robot"
      ]
    },
    {
      "id": "frustrated",
      "description": "Customer expresses frustration or anger",
      "examples": [
        "This isn't helping",
        "You're not understanding me",
        "I'm getting frustrated",
        "This is ridiculous",
        "I give up"
      ]
    }
  ],
  "edges": [
    {
      "id": "edge_request_human",
      "from": "*",
      "to": "handoff_sales",
      "when": {
        "intent": "request_human"
      },
      "priority": 100
    },
    {
      "id": "edge_frustrated_handoff",
      "from": "*",
      "to": "handoff_support",
      "when": {
        "intent": "frustrated"
      },
      "priority": 90
    }
  ],
  "nodes": [
    {
      "id": "handoff_sales",
      "type": "handoff",
      "title": "Transfer to Sales Team",
      "instructions": "Customer has requested to speak with a human sales representative. Confirm the transfer and provide reassurance.",
      "required_fields": []
    },
    {
      "id": "handoff_support",
      "type": "handoff",
      "title": "Transfer to Support Team",
      "instructions": "Customer needs additional support. Transfer to technical support team.",
      "required_fields": []
    }
  ]
}
```

## Step 7: Brain Engine Rules

Configure your brain engine to recognize handoff scenarios:

```typescript
// In your brain config or prompt

const SYSTEM_RULES = `
You are an AI voice agent. You should escalate to a human when:

1. **Explicit Request**: Customer directly asks to speak with a person
   - Respond with: "Of course! Let me connect you with a member of our team."
   - Action: handoff

2. **Low Confidence**: You are uncertain about the answer (confidence < 0.3)
   - If unsure for 2+ consecutive turns, escalate
   - Action: handoff

3. **Out of Scope**: Topic outside your knowledge domain
   - Legal advice, medical guidance, complex technical issues
   - Action: handoff

4. **Frustrated Customer**: Customer expresses frustration or anger
   - Respond empathetically and offer human assistance
   - Action: handoff

5. **High-Value Decision**: Customer wants to make a large purchase or sign a contract
   - Escalate to sales specialist
   - Action: handoff

6. **Compliance Boundary**: Topic involves sensitive data or regulated content
   - Must transfer to authorized human
   - Action: handoff

When escalating, be warm and professional:
- "I understand. Let me connect you with someone who can help better."
- "I'll transfer you to a specialist right away."
- "One moment while I connect you to our team."
`;
```

## Step 8: Test the Integration

### Test 1: Direct Handoff Request

```bash
# Start a test call
# Say: "I want to talk to a person"

# Expected flow:
# 1. AI recognizes intent: request_human
# 2. Brain decides: action = "handoff"
# 3. Flow transitions to handoff node
# 4. Handoff handler executes
# 5. Transfer tool redirects channel
# 6. Customer hears: "Let me connect you to a specialist"
# 7. Call transfers to sales_queue
# 8. AI loop stops
```

### Test 2: Frustration Escalation

```bash
# Start a test call
# Say: "This isn't helping" (2-3 times)

# Expected flow:
# 1. AI detects frustration intent
# 2. Brain decides: action = "handoff"
# 3. Handoff executes to support_queue
```

### Test 3: Emergency Fallback

```bash
# Simulate system error during call

# Expected flow:
# 1. Error occurs in brain/flow processing
# 2. Error handler triggers emergency handoff
# 3. Transfer to support_queue with reason: "system_error_fallback"
```

## Step 9: Monitor Handoffs

### Check Session State

```bash
redis-cli HGETALL agent:session:<sessionId>

# Expected fields:
# state: "ESCALATED"
# escalated: "true"
# escalation_reason: "customer_requested_human"
# escalation_target: "sales_queue"
# escalation_at: "2026-01-26T12:00:00Z"
```

### Check Handoff Logs

```bash
redis-cli HGETALL handoff:log:<sessionId>

# Expected fields:
# success: "true"
# target: "sales_queue"
# timestamp: "2026-01-26T12:00:00Z"
# session_state: "ESCALATED"
# flow_node: "handoff_sales"
# turns_in_node: "1"
```

### Query Handoff Metrics

```bash
# Count total handoffs
redis-cli KEYS "handoff:log:*" | wc -l

# Count successful handoffs
redis-cli KEYS "handoff:log:*" | xargs -I {} redis-cli HGET {} success | grep true | wc -l

# List recent handoffs
redis-cli --scan --pattern "handoff:log:*" | head -10 | xargs -I {} redis-cli HGETALL {}
```

## Step 10: Add Handoff to Analytics

Track handoff rates and reasons:

```typescript
// apps/workers/src/lib/analytics/handoff-analytics.ts

export interface HandoffMetrics {
  totalHandoffs: number;
  successfulHandoffs: number;
  failedHandoffs: number;
  handoffRate: number; // % of calls that escalate
  averageTurnsBeforeHandoff: number;
  topReasons: Array<{ reason: string; count: number }>;
  topTargets: Array<{ target: string; count: number }>;
}

export async function getHandoffMetrics(
  startDate: Date,
  endDate: Date
): Promise<HandoffMetrics> {
  // Query Redis handoff logs
  // Aggregate metrics
  // Return summary
}
```

## Advanced: Dynamic Target Resolution

For complex routing based on customer data:

```typescript
// apps/workers/src/runtime/handoff-handler.ts

// Add to resolveTransferTarget function:

function resolveTransferTarget(
  decision: BrainDecision,
  flowState?: FlowState,
  context?: RuntimeContext
): string {
  // Priority 1: Decision specifies target
  if (decision.escalation?.target) {
    return decision.escalation.target;
  }

  // Priority 2: Dynamic routing based on customer value
  if (context?.customer?.lifetimeValue) {
    const ltv = context.customer.lifetimeValue;
    if (ltv > 10000) return "vip_queue";
    if (ltv > 1000) return "sales_queue";
  }

  // Priority 3: Route by conversation topic
  const topic = context?.conversationTopic;
  if (topic === "technical") return "support_queue";
  if (topic === "billing") return "billing_queue";
  if (topic === "sales") return "sales_queue";

  // Priority 4: Route by time of day
  const hour = new Date().getHours();
  if (hour >= 9 && hour < 17) {
    return "sales_queue";
  } else {
    return "after_hours_vm"; // Voicemail
  }

  // Fallback
  return "sales_queue";
}
```

## Production Checklist

Integration checklist before production deployment:

- [ ] Import handoff handler in voice adapter
- [ ] Add handoff check after brain decision
- [ ] Update call loop to stop on handoff
- [ ] Configure environment variables
- [ ] Add handoff intents to flow config
- [ ] Configure brain rules for escalation
- [ ] Test all handoff scenarios
- [ ] Set up Asterisk dialplan contexts
- [ ] Configure queues and agents
- [ ] Record audio prompts
- [ ] Enable handoff analytics
- [ ] Set up monitoring alerts
- [ ] Document handoff procedures for human agents
- [ ] Train human agents on receiving AI transfers
- [ ] Test emergency fallback path

## Troubleshooting

### Handoff Not Triggering

**Symptom:** Customer asks for human but AI continues conversation

**Check:**
1. Brain is recognizing intent correctly
2. Flow has edge with `to: "handoff"` node
3. `shouldHandoff(decision)` returns true
4. No errors in voice adapter logs

### Transfer Fails

**Symptom:** Handoff executes but channel not redirected

**Check:**
1. Channel name is valid: `asterisk -rx "core show channels"`
2. Dialplan context exists: `asterisk -rx "dialplan show sales_queue"`
3. Asterisk AMI credentials are correct
4. Transfer tool logs show success/failure

### AI Loop Doesn't Stop

**Symptom:** Call transfers but AI keeps processing

**Check:**
1. `shouldEndCall = true` when handoff executes
2. Call loop checks `response.handoffExecuted`
3. No errors preventing clean exit from loop

### Session State Not Updated

**Symptom:** Redis doesn't show ESCALATED state

**Check:**
1. Redis connection successful
2. `sessionId` is provided to `executeHandoff()`
3. Check Redis logs: `redis-cli HGETALL agent:session:<sessionId>`

## What's Next

After integration is complete:

1. **Monitor Success Rate** - Track % of handoffs that successfully connect
2. **Optimize Triggers** - Adjust intent examples and brain rules based on real usage
3. **Improve Routing** - Add smart routing based on customer data
4. **Reduce Handoffs** - Train AI to handle more scenarios, reducing unnecessary escalations
5. **Agent Training** - Ensure human agents understand context when receiving AI transfers

You now have production-ready AI → Human escalation! 🎯
