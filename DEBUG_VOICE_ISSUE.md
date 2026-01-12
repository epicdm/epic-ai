# Debugging Voice AI - No Response Issue

## Symptoms
- AI greeting works (TTS plays)
- Push to talk records audio
- Your text appears on screen (transcription works)
- **But AI doesn't respond to your question**

## Quick Debug Steps

### 1. Check Browser Console (F12)

Look for these log messages:

```
Transcription received: { text: "your question here", ... }
User said: your question here
Chat response received: { response: "...", conversationId: "...", ... }
```

**What to look for:**
- ✅ If you see "Chat response received" with a response → Issue is in UI rendering
- ❌ If you see "Chat response received" with NO response → Issue is in AI processing
- ❌ If you DON'T see "Chat response received" → API call failed

### 2. Check Network Tab (F12 → Network)

Look for these requests:

1. **POST /api/voice/transcribe** → Should return 200 with your text
2. **POST /api/voice/chat** → Should return 200 with AI response
3. **POST /api/voice/speak** → Should return 200 with audio

**Click on each request and check:**
- Status code (should be 200)
- Response data
- Any error messages

### 3. Check OpenAI API Key

Run this in your browser (when logged in):
```
fetch('/api/voice/health').then(r => r.json()).then(console.log)
```

**Expected output:**
```json
{
  "status": "ok",
  "checks": {
    "openai": {
      "configured": true,
      "keyPrefix": "sk-proj"
    }
  }
}
```

**If `configured: false`:**
- OpenAI API key is missing
- Add `OPENAI_API_KEY` to your `.env` file
- Restart the dev server

### 4. Check Voice Agent Configuration

The issue might be with the agent itself:

1. Go to `/dashboard/voice/agents`
2. Click on your agent
3. Check:
   - **System Prompt** is filled in
   - **LLM Model** is set (e.g., `gpt-4o-mini`)
   - **Greeting Message** exists

### 5. Test API Endpoints Manually

**Test transcription:**
```bash
curl -X POST http://localhost:3000/api/voice/transcribe \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{"audio":"base64data","filename":"test.webm"}'
```

**Test chat:**
```bash
curl -X POST http://localhost:3000/api/voice/chat \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{"agentId":"your-agent-id","message":"Hello"}'
```

## Common Issues & Solutions

### Issue 1: No response in chatData

**Console error:**
```
No response in chatData: { conversationId: "...", stats: {...} }
```

**Cause:** AI didn't generate a response

**Solutions:**
1. Check OpenAI API key is valid
2. Check OpenAI API quota/billing
3. Check agent's system prompt exists
4. Check LLM model is valid (`gpt-4o-mini`, `gpt-4o`, `gpt-3.5-turbo`)

### Issue 2: Chat API returns 404

**Error:** `Agent not found`

**Solutions:**
1. Make sure you selected an agent
2. Create a voice agent first if none exist
3. Check agent belongs to your organization

### Issue 3: Chat API returns 500

**Console shows:** `Failed to process message`

**Solutions:**
1. Check server logs for detailed error
2. Check OpenAI API is reachable
3. Verify OpenAI API key format: `sk-proj-...` or `sk-...`

### Issue 4: Response generated but not spoken

**Console shows:** Response received, but no audio plays

**Solutions:**
1. Check `/api/voice/speak` in Network tab
2. Verify TTS request succeeds (200 status)
3. Check browser audio permissions
4. Check console for "TTS error:"

### Issue 5: Conversation ID not maintained

**Each message starts new conversation**

**Solutions:**
1. Check `conversationId` is being set
2. Check browser doesn't block state updates
3. Look for React strict mode issues in dev

## Detailed Logging

I've added debug logging to help identify the issue:

**In test-console.tsx:**
- `console.log("Transcription received:", transcription)`
- `console.log("User said:", userText)`
- `console.log("Chat response received:", chatData)`

**What each log tells you:**
1. **Transcription received** → STT worked, you have the user's text
2. **User said** → Text is valid (not empty)
3. **Chat response received** → API returned something

**If you see all 3 logs but no AI message:**
- Response is in `chatData.response`
- But not being displayed
- Check `addMessage("assistant", chatData.response)` is being called

## Server-Side Debugging

### Check server logs:

```bash
cd C:/repos/epic-ai
pnpm dev
```

Look for:
```
Error processing message: ...
Error generating speech: ...
```

### Enable verbose OpenAI logging:

In `.env`:
```bash
OPENAI_LOG=debug
```

Restart server to see detailed OpenAI API calls.

## Testing Checklist

Run through this checklist:

- [ ] Dev server is running (`pnpm dev`)
- [ ] Browser console is open (F12)
- [ ] Network tab is visible
- [ ] OpenAI API key is set (check /api/voice/health)
- [ ] Voice agent exists and is selected
- [ ] Agent has system prompt configured
- [ ] Start call → greeting plays ✅
- [ ] Push to talk → record audio ✅
- [ ] Release → see "Processing..." ✅
- [ ] Your text appears in chat ✅
- [ ] Console shows "Chat response received" ⚠️
- [ ] AI response appears in chat ❌ (this is the issue)
- [ ] AI response is spoken ❌

## Next Steps

1. **Open browser console** (F12)
2. **Start a test call**
3. **Say something** (push to talk)
4. **Look for the 3 console.log messages**
5. **Share the output** of "Chat response received:"

The chatData object will tell us exactly what the AI returned.

## Expected vs Actual

**Expected chatData:**
```json
{
  "conversationId": "conv_1234...",
  "response": "Hello! How can I help you today?",
  "stats": {
    "messageCount": 2,
    "userMessages": 1,
    "assistantMessages": 1,
    "duration": 15
  },
  "shouldTransfer": false
}
```

**If response is empty string:**
- AI generated empty response (rare)
- Check OpenAI API returned content
- Check max_tokens setting (currently 150)

**If response is missing entirely:**
- API endpoint error
- Check `/api/voice/chat/route.ts` logs
- Check VoiceAgent.processMessage() error handling

## Quick Fix Attempts

### Attempt 1: Clear conversation state

1. Click "End Call"
2. Refresh the page
3. Start new call

### Attempt 2: Try different model

Edit the agent:
- Change LLM Model from `gpt-4o-mini` to `gpt-4o`
- Save and retry

### Attempt 3: Simplify system prompt

Use minimal prompt:
```
You are a helpful voice assistant. Keep responses under 2 sentences.
```

### Attempt 4: Check API rate limits

Visit: https://platform.openai.com/account/rate-limits

Make sure you're not hitting limits.

## Still Not Working?

Share these details:

1. **Browser console logs** (all 3 console.log outputs)
2. **Network tab** screenshot (chat API request/response)
3. **OpenAI health check** output (from /api/voice/health)
4. **Agent configuration** (system prompt, model)
5. **Server console** (any errors from terminal)

This will help identify exactly where the flow breaks down!
