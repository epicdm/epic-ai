# Human Handoff - 15-Minute Quick Start

Get AI → Human escalation working in 15 minutes.

## What You're Building

```
Customer: "I want to talk to a person"
    ↓
AI Agent: "Of course! Let me connect you to our team."
    ↓
[Call transfers to human queue]
    ↓
Human Agent: "Hi, how can I help you today?"
```

## Prerequisites

- ✅ Voice agent runtime (already built)
- ✅ Asterisk AMI access (from callback system)
- ✅ Redis connection (from callback system)
- ✅ Active voice calls working

## Step 1: Configure Asterisk (5 minutes)

### Add dialplan context

Edit `/etc/asterisk/extensions.conf`:

```ini
[sales_queue]
exten => 1,1,NoOp(AI → Human Escalation)
 same => n,Answer()
 same => n,Playback(silence/1)
 same => n,Queue(sales-support,t,,,30)
 same => n,Hangup()
```

### Create queue

Edit `/etc/asterisk/queues.conf`:

```ini
[sales-support]
strategy = ringall
timeout = 30
member => PJSIP/agent1
```

**Replace `PJSIP/agent1` with your actual agent extension.**

### Reload Asterisk

```bash
asterisk -rx "dialplan reload"
asterisk -rx "queue reload"
```

### Verify

```bash
asterisk -rx "dialplan show sales_queue"
asterisk -rx "queue show sales-support"
```

## Step 2: Set Environment Variables (1 minute)

Add to `apps/workers/.env`:

```bash
HANDOFF_DEFAULT_TARGET=sales_queue
HANDOFF_CONTEXT=sales_queue
HANDOFF_METHOD=cli
```

## Step 3: Integrate in Voice Adapter (5 minutes)

### Edit your voice adapter

File: `apps/workers/src/runtime/adapters/voice-adapter.ts`

**Add imports:**

```typescript
import {
  executeHandoff,
  shouldHandoff,
  getHandoffMessage,
} from "../handoff-handler";
```

**Add handoff check** (after brain decision, before response):

```typescript
// Around line 400-430, after you get the brain decision:

if (shouldHandoff(result.decision)) {
  const handoffResult = await executeHandoff({
    channel: params.channel,
    sessionId: params.sessionId,
    reason: result.decision.reasoning || "customer_requested_human",
    flowState: result.flowState,
  });

  const handoffMessage = getHandoffMessage(handoffResult.target);

  return {
    success: handoffResult.success,
    text: handoffMessage,
    flowStage: result.flowState.currentNode,
    shouldEndCall: true,
    toolActions: [],
    requestId,
    handoffExecuted: true,
    handoffTarget: handoffResult.target,
  };
}
```

**Update return type** (add optional fields):

```typescript
export interface VoiceAdapterResponse {
  // ... existing fields ...
  handoffExecuted?: boolean;
  handoffTarget?: string;
}
```

## Step 4: Add Flow Intent (2 minutes)

### Update flow configuration

Add to your agent's flow config (wherever that's stored):

```json
{
  "intents": [
    {
      "id": "request_human",
      "description": "Customer asks to speak with a human",
      "examples": [
        "I want to talk to a person",
        "Can I speak to someone?",
        "Transfer me to a human",
        "Let me talk to your team"
      ]
    }
  ],
  "edges": [
    {
      "id": "edge_handoff",
      "from": "*",
      "to": "handoff_sales",
      "when": { "intent": "request_human" },
      "priority": 100
    }
  ],
  "nodes": [
    {
      "id": "handoff_sales",
      "type": "handoff",
      "title": "Transfer to Sales",
      "instructions": "Transfer customer to human sales team",
      "required_fields": []
    }
  ]
}
```

## Step 5: Test (2 minutes)

### Start your worker

```bash
cd apps/workers
pnpm dev
```

### Make a test call

Using your existing call flow, once connected say:

```
"I want to talk to a person"
```

### Expected behavior

1. AI responds: "Let me connect you to someone who can help"
2. Brief pause
3. Hold music plays (or rings)
4. Human agent's phone rings
5. Human answers: "Hello!"

### Verify in logs

Worker logs should show:

```
[handoff-handler] Executing AI → Human escalation
[transfer-tool] Starting human escalation
[transfer-tool] CLI redirect successful
[handoff-handler] Escalation successful
```

### Check Redis

```bash
redis-cli HGETALL agent:session:<your-session-id>

# Should show:
# state: "ESCALATED"
# escalated: "true"
# escalation_target: "sales_queue"
```

## Troubleshooting

### "No such channel" error

**Problem:** Channel name mismatch

**Fix:**
```bash
# Find exact channel name
asterisk -rx "core show channels"

# Use that exact format in your params.channel
```

### Transfer succeeds but no ring

**Problem:** No agents in queue

**Fix:**
```bash
# Check queue members
asterisk -rx "queue show sales-support"

# Add member if missing
asterisk -rx "queue add member PJSIP/agent1 to sales-support"
```

### AI doesn't recognize "I want to talk to a person"

**Problem:** Intent not configured or brain not detecting

**Fix:** Add more examples to the intent, or update your brain prompt to recognize handoff requests.

### Handoff executes but AI keeps talking

**Problem:** Call loop not checking `handoffExecuted`

**Fix:** In your call loop, check for handoff:

```typescript
if (response.handoffExecuted) {
  console.log("Handoff executed, stopping AI loop");
  break; // Exit the loop
}
```

## What You Have Now

✅ Working AI → Human escalation
✅ Seamless call transfer
✅ Professional customer experience
✅ Production-ready handoff system

## Next Steps (Optional)

### Add More Targets

```ini
[support_queue]
exten => 1,1,Queue(technical-support,t)

[billing_queue]
exten => 1,1,Queue(billing-support,t)
```

### Add Business Hours

```ini
[smart_handoff]
exten => 1,1,GotoIfTime(9:00-17:00,mon-fri,*,*?open)
 same => n,Goto(closed)
 same => n(open),Queue(sales-support)
 same => n,Hangup()
 same => n(closed),Voicemail(sales@company)
```

### Add Audio Prompts

Record or generate TTS:
- "please-hold-while-we-connect.wav"
- "transferring-to-team.wav"

Place in: `/var/lib/asterisk/sounds/en/custom/`

Use in dialplan:
```ini
 same => n,Playback(please-hold-while-we-connect)
```

### Track Metrics

```bash
# Count handoffs today
redis-cli --scan --pattern "handoff:log:*" | wc -l

# View successful handoffs
redis-cli --scan --pattern "handoff:log:*" | \
  xargs -I {} redis-cli HGET {} success | \
  grep true | wc -l
```

## Complete System

You now have:

```
┌──────────────┐
│   Customer   │
└──────┬───────┘
       │
       ↓ "I want a human"
┌──────────────┐
│  AI Agent    │ ← Recognizes intent
└──────┬───────┘
       │
       ↓ Executes handoff
┌──────────────┐
│   Asterisk   │ ← Redirects channel
└──────┬───────┘
       │
       ↓ Rings queue
┌──────────────┐
│ Human Agent  │ ← Answers call
└──────────────┘
```

## Time Investment

- Setup: 15 minutes (one-time)
- Testing: 5 minutes
- Production tuning: 30 minutes
- **Total: ~50 minutes**

## ROI

**Before handoff:**
- Demo-only system
- No deployment possible
- Customer frustration on limits
- No compliance path

**After handoff:**
- Production-ready
- Enterprise deployable
- Professional UX
- Compliance enabled
- **100% customer coverage**

## Support

- **Full Documentation:** See `HANDOFF_INTEGRATION_GUIDE.md`
- **Dialplan Guide:** See `ASTERISK_HANDOFF_DIALPLAN.md`
- **System Overview:** See `HANDOFF_SYSTEM_SUMMARY.md`

---

**You're done!** Your AI voice agent can now escalate to humans professionally. 🎉
