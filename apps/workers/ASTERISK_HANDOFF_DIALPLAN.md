# Asterisk Dialplan - Human Handoff Configuration

Complete dialplan setup for AI → Human escalation system.

## Overview

When the AI agent decides to escalate, it uses Asterisk's `Redirect` command to transfer the active call to a human endpoint. This requires proper dialplan configuration.

## Dialplan Contexts

### 1. Sales Queue Context

The most common handoff target - routes to sales team.

```ini
[sales_queue]
exten => 1,1,NoOp(AI → Human Escalation: Sales)
 same => n,Set(ESCALATION_SOURCE=AI_AGENT)
 same => n,Set(ESCALATION_TIME=${STRFTIME(${EPOCH},,%Y-%m-%d %H:%M:%S)})
 same => n,Answer()
 same => n,Playback(please-hold-while-we-connect)
 same => n,Queue(sales-support,t,,,30)
 same => n,GotoIf($["${QUEUESTATUS}"="TIMEOUT"]?timeout)
 same => n,GotoIf($["${QUEUESTATUS}"="FULL"]?full)
 same => n,Hangup()

 same => n(timeout),Playback(all-agents-busy)
 same => n,Voicemail(sales@company,u)
 same => n,Hangup()

 same => n(full),Playback(queue-full)
 same => n,Voicemail(sales@company,u)
 same => n,Hangup()
```

### 2. Support Queue Context

For technical support escalations.

```ini
[support_queue]
exten => 1,1,NoOp(AI → Human Escalation: Support)
 same => n,Set(ESCALATION_SOURCE=AI_AGENT)
 same => n,Set(ESCALATION_TIME=${STRFTIME(${EPOCH},,%Y-%m-%d %H:%M:%S)})
 same => n,Answer()
 same => n,Playback(transferring-to-support)
 same => n,Queue(technical-support,t,,,45)
 same => n,GotoIf($["${QUEUESTATUS}"="TIMEOUT"]?timeout)
 same => n,Hangup()

 same => n(timeout),Playback(support-unavailable)
 same => n,Voicemail(support@company,u)
 same => n,Hangup()
```

### 3. Direct Extension Transfer

For transferring to specific agents.

```ini
[agent_direct]
exten => _1XX,1,NoOp(AI → Human Escalation: Direct Extension ${EXTEN})
 same => n,Set(ESCALATION_SOURCE=AI_AGENT)
 same => n,Set(TARGET_AGENT=${EXTEN})
 same => n,Answer()
 same => n,Playback(one-moment-please)
 same => n,Dial(PJSIP/${EXTEN},30,t)
 same => n,GotoIf($["${DIALSTATUS}"="ANSWER"]?answered)
 same => n,Playback(agent-unavailable)
 same => n,Voicemail(${EXTEN}@company,u)
 same => n,Hangup()

 same => n(answered),Hangup()
```

### 4. Emergency Escalation

For high-priority or compliance-required handoffs.

```ini
[emergency_escalation]
exten => 1,1,NoOp(AI → Human Escalation: EMERGENCY)
 same => n,Set(ESCALATION_SOURCE=AI_AGENT)
 same => n,Set(ESCALATION_PRIORITY=EMERGENCY)
 same => n,Answer()
 same => n,Playback(emergency-transfer)
 same => n,Queue(supervisor-queue,t,,,15)
 same => n,GotoIf($["${QUEUESTATUS}"="TIMEOUT"]?page)
 same => n,Hangup()

 same => n(page),Page(PJSIP/supervisor1&PJSIP/supervisor2)
 same => n,Hangup()
```

### 5. Business Hours Routing

Handles escalations based on time of day.

```ini
[smart_handoff]
exten => 1,1,NoOp(AI → Human Escalation: Smart Routing)
 same => n,Set(ESCALATION_SOURCE=AI_AGENT)
 same => n,GotoIfTime(9:00-17:00,mon-fri,*,*?business_hours)
 same => n,GotoIfTime(9:00-13:00,sat,*,*?business_hours)
 same => n,Goto(after_hours)

 same => n(business_hours),Answer()
 same => n,Playback(connecting-to-agent)
 same => n,Queue(general-support,t,,,30)
 same => n,Hangup()

 same => n(after_hours),Answer()
 same => n,Playback(office-closed)
 same => n,Voicemail(general@company,u)
 same => n,Hangup()
```

## Queue Configuration

### queues.conf

Define the queues referenced in dialplan:

```ini
[sales-support]
strategy = ringall
timeout = 30
retry = 5
maxlen = 10
announce-frequency = 30
announce-holdtime = yes
announce-position = yes
periodic-announce = queue-periodic-announce
periodic-announce-frequency = 60
member => PJSIP/sales1
member => PJSIP/sales2
member => PJSIP/sales3

[technical-support]
strategy = leastrecent
timeout = 45
retry = 5
maxlen = 15
announce-frequency = 45
member => PJSIP/tech1
member => PJSIP/tech2

[supervisor-queue]
strategy = ringall
timeout = 15
maxlen = 5
member => PJSIP/supervisor1
member => PJSIP/supervisor2
```

## Transfer Command Examples

### CLI Method (Used by transfer tool)

```bash
# Redirect active channel to sales queue
asterisk -rx "channel redirect PJSIP/+17675551234-00000001 sales_queue,1,1"

# Redirect to direct extension
asterisk -rx "channel redirect PJSIP/+17675551234-00000001 agent_direct,101,1"

# Emergency escalation
asterisk -rx "channel redirect PJSIP/+17675551234-00000001 emergency_escalation,1,1"
```

### AMI Method (Alternative)

```
Action: Redirect
Channel: PJSIP/+17675551234-00000001
Context: sales_queue
Exten: 1
Priority: 1
ActionID: handoff-123
```

## Handoff Flow Example

```
1. AI Agent conversation in progress
2. User says "I want to talk to a human"
3. Brain decides: action = "handoff"
4. Runtime calls executeHandoff()
5. Transfer tool executes:
   - channel redirect PJSIP/customer sales_queue,1,1
6. Asterisk:
   - Pauses AI agent channel
   - Redirects to [sales_queue] context
   - Plays hold music
   - Rings sales agents
7. Human agent answers
8. Call continues with human
9. Session state = "ESCALATED"
```

## Channel Variables for Context

Useful variables to set before/during handoff:

```ini
; In your agent AGI/FastAGI context
exten => route_to_agent,1,NoOp(Voice Agent Call)
 same => n,Set(AGENT_ID=${VOICE_AGENT_ID})
 same => n,Set(SESSION_ID=${CALLBACK_JOB_ID})
 same => n,Set(CUSTOMER_NUMBER=${CALLERID(num)})
 same => n,AGI(agi://voice-service:4573/route_to_agent?...)
 same => n,Hangup()
```

These variables are preserved during redirect and available in handoff context:

```ini
[sales_queue]
exten => 1,1,NoOp(Handoff from agent ${AGENT_ID})
 same => n,NoOp(Session: ${SESSION_ID})
 same => n,NoOp(Customer: ${CUSTOMER_NUMBER})
 same => n,Set(CDR(escalation_from)=${AGENT_ID})
 ; ... rest of dialplan
```

## Announcements & Audio Files

Create these audio files for better UX:

```bash
# Record or generate with TTS
please-hold-while-we-connect.wav
transferring-to-support.wav
one-moment-please.wav
emergency-transfer.wav
connecting-to-agent.wav
office-closed.wav
all-agents-busy.wav
queue-full.wav
support-unavailable.wav
agent-unavailable.wav
```

Place in: `/var/lib/asterisk/sounds/en/custom/`

## Testing Handoff

### 1. Start a test call

```bash
# Originate a test call to your agent
asterisk -rx "originate PJSIP/+17675551234 extension route_to_agent@from-internal"
```

### 2. Trigger handoff manually

From Asterisk CLI:

```bash
# List active channels
core show channels

# Find your channel (e.g., PJSIP/+17675551234-00000001)

# Execute redirect
channel redirect PJSIP/+17675551234-00000001 sales_queue,1,1
```

### 3. Watch the transfer

```bash
# Monitor dialplan execution
dialplan set debug on

# Watch channel states
core show channels verbose

# Check queue status
queue show sales-support
```

### 4. Verify in logs

```bash
tail -f /var/log/asterisk/full | grep -E "Redirect|Queue|ESCALATION"
```

Expected output:

```
[timestamp] Executing [1@sales_queue:1] NoOp("PJSIP/+17675551234-00000001", "AI → Human Escalation: Sales")
[timestamp] Executing [1@sales_queue:3] Answer("PJSIP/+17675551234-00000001", "")
[timestamp] Executing [1@sales_queue:4] Playback("PJSIP/+17675551234-00000001", "please-hold-while-we-connect")
[timestamp] Executing [1@sales_queue:5] Queue("PJSIP/+17675551234-00000001", "sales-support,t,,,30")
[timestamp] Called PJSIP/sales1
[timestamp] PJSIP/sales1-00000002 answered PJSIP/+17675551234-00000001
```

## Environment Variables

Set these in `apps/workers/.env`:

```bash
# Handoff Configuration
HANDOFF_DEFAULT_TARGET=sales_queue
HANDOFF_CONTEXT=sales_queue
HANDOFF_PRIORITY=1
HANDOFF_PLAY_MESSAGE=true
HANDOFF_METHOD=cli  # or "ami"
```

## Integration with Flow Engine

### Flow Definition with Handoff Node

```json
{
  "nodes": [
    {
      "id": "handoff_sales",
      "type": "handoff",
      "title": "Transfer to Sales",
      "instructions": "Transfer customer to human sales agent",
      "required_fields": []
    }
  ],
  "edges": [
    {
      "id": "edge_ask_human_to_handoff",
      "from": "*",
      "to": "handoff_sales",
      "when": {
        "intent": "request_human"
      },
      "priority": 100
    }
  ],
  "intents": [
    {
      "id": "request_human",
      "description": "Customer asks to speak with a human",
      "examples": [
        "I want to talk to a person",
        "Can I speak to someone?",
        "Transfer me to a human",
        "I need to talk to your team"
      ]
    }
  ]
}
```

### Brain Rules for Escalation

Configure your brain engine to trigger handoff:

```json
{
  "response_rules": [
    {
      "name": "Human Request",
      "when": "user explicitly asks for human",
      "do": "trigger_handoff",
      "target": "sales_queue"
    },
    {
      "name": "Low Confidence",
      "when": "confidence < 0.3 for 3 consecutive turns",
      "do": "trigger_handoff",
      "target": "support_queue"
    },
    {
      "name": "Compliance Boundary",
      "when": "topic involves legal/medical advice",
      "do": "trigger_handoff",
      "target": "supervisor_queue"
    }
  ]
}
```

## Production Checklist

- [ ] Configure all queue contexts in dialplan
- [ ] Add queue members to queues.conf
- [ ] Record/generate audio prompts
- [ ] Test each handoff target
- [ ] Set environment variables
- [ ] Configure business hours routing
- [ ] Set up voicemail fallback
- [ ] Test emergency escalation path
- [ ] Monitor handoff success rate
- [ ] Set up alerts for failed handoffs

## Monitoring & Analytics

Track handoff metrics in Redis:

```bash
# Check handoff logs
redis-cli KEYS "handoff:log:*"

# View specific handoff
redis-cli HGETALL handoff:log:session_abc123

# Count successful handoffs
redis-cli KEYS "handoff:log:*" | xargs redis-cli MGET | grep "success.*true" | wc -l
```

## Troubleshooting

### Channel Not Found

**Symptom:** "No such channel" error

**Fix:** Verify channel name format matches Asterisk's naming:
```bash
# List active channels
asterisk -rx "core show channels"

# Use exact channel name from output
```

### Redirect Fails Silently

**Symptom:** Command succeeds but call doesn't transfer

**Fix:** Check dialplan exists:
```bash
asterisk -rx "dialplan show sales_queue"
```

### Queue Never Answers

**Symptom:** Customer hears hold music indefinitely

**Fix:** Check queue members:
```bash
asterisk -rx "queue show sales-support"

# Add members if missing
asterisk -rx "queue add member PJSIP/sales1 to sales-support"
```

### Audio Prompts Don't Play

**Symptom:** Silence instead of announcements

**Fix:** Verify audio files exist:
```bash
ls -la /var/lib/asterisk/sounds/en/custom/

# Convert to correct format if needed
sox input.mp3 -r 8000 -c 1 output.wav
```

## Advanced: Custom Handoff Logic

For complex routing based on customer data:

```ini
[dynamic_handoff]
exten => 1,1,NoOp(AI → Human Escalation: Dynamic Routing)
 same => n,Set(CUSTOMER_VALUE=${CURL(http://api/customer/${CUSTOMER_NUMBER}/value)})
 same => n,GotoIf($["${CUSTOMER_VALUE}">"10000"]?vip)
 same => n,GotoIf($["${CUSTOMER_VALUE}">"1000"]?standard)
 same => n,Goto(basic)

 same => n(vip),Queue(vip-support,t,,,10)
 same => n,Hangup()

 same => n(standard),Queue(standard-support,t,,,30)
 same => n,Hangup()

 same => n(basic),Queue(basic-support,t,,,60)
 same => n,Hangup()
```

## Security Considerations

1. **Limit transfer targets** - Only allow predefined contexts
2. **Validate channel names** - Prevent injection attacks
3. **Rate limit transfers** - Prevent abuse
4. **Log all escalations** - Audit trail for compliance
5. **Authenticate human agents** - Use PIN or biometric

## Next Steps

After configuring dialplan:

1. Test each handoff scenario
2. Train human agents on receiving AI transfers
3. Set up monitoring dashboards
4. Configure alerts for queue timeouts
5. Optimize queue strategies based on metrics

Your AI agent can now escalate to humans professionally! 🎯
