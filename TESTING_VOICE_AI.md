# Testing the Voice AI Fix

## Quick Start

### 1. Prerequisites

Make sure you have the required environment variables set. Create a `.env` file in the project root:

```bash
# Required for voice AI to work
OPENAI_API_KEY="sk-proj-..." # Get from https://platform.openai.com/api-keys

# Database (for auth and data persistence)
DATABASE_URL="postgresql://user:password@localhost:5432/epic_ai"

# Authentication (for user login)
CLERK_SECRET_KEY="sk_test_..." # Get from https://dashboard.clerk.com
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
```

### 2. Start Development Server

```bash
cd C:/repos/epic-ai
pnpm install          # Install dependencies
pnpm db:push          # Setup database schema
pnpm dev              # Start dev server
```

The app will be available at: **http://localhost:3000**

### 3. Navigate to Voice Test Console

1. Login to the app (create account if needed)
2. Go to: **http://localhost:3000/dashboard/voice/test**
3. Or navigate via sidebar: **Dashboard → Voice AI → Test Console**

### 4. Test the Voice Agent

#### Step-by-Step Test:

1. **Select an agent** from the dropdown (or create one first if none exist)

2. **Click "Start Test Call"**
   - You'll be prompted to allow microphone access
   - The AI will greet you with an opening message
   - You should hear the greeting played through your speakers

3. **Click "Push to Talk"**
   - The button will turn red
   - Speak clearly into your microphone
   - Say something like: "Hello, can you help me?"

4. **Release the button**
   - Your audio will be processed
   - You'll see "Processing..." status
   - Your transcribed text appears in the conversation
   - The AI response appears
   - You hear the AI response spoken

5. **Continue the conversation**
   - Click "Push to Talk" again to say more
   - The conversation builds up in the chat window

6. **End the call**
   - Click "End Call" when done
   - View conversation statistics

## What to Look For

### ✅ Success Indicators:

1. **Microphone permission granted** - Browser asks for mic access
2. **AI greeting plays** - You hear a voice greeting you
3. **Your speech is transcribed** - Your words appear accurately in chat
4. **AI responds with text** - AI message appears in conversation
5. **AI response is spoken** - You hear the AI's voice response
6. **No error messages** - No red error banners appear
7. **Status indicators work** - Recording, Processing, Speaking chips show correctly
8. **Stats display** - After ending call, you see message count, duration, cost

### ❌ Potential Issues:

1. **"Error processing audio"** - Check console for specific error
   - Likely causes: Missing OPENAI_API_KEY, network issues, invalid audio format

2. **No audio playback** - Check browser audio permissions
   - Verify speakers/headphones are working
   - Check browser console for audio errors

3. **Microphone not working** - Browser permissions
   - Click the lock icon in address bar → allow microphone
   - Try a different browser (Chrome/Edge recommended)

4. **"Unauthorized"** - Authentication issue
   - Make sure you're logged in
   - Check CLERK_SECRET_KEY is set

## Testing Checklist

- [ ] Voice agent can be selected
- [ ] Call starts successfully
- [ ] AI greeting is heard
- [ ] Microphone recording works (red dot appears)
- [ ] Speech is transcribed correctly
- [ ] AI generates relevant response
- [ ] AI response is spoken aloud
- [ ] Multiple exchanges work
- [ ] Call can be ended cleanly
- [ ] Stats are displayed correctly
- [ ] Cost estimate is shown

## Console Debugging

Open browser DevTools (F12) and check:

### Network Tab:
- `POST /api/voice/transcribe` - Should return 200 with transcription
- `POST /api/voice/chat` - Should return 200 with AI response
- `POST /api/voice/speak` - Should return 200 with audio data

### Console Tab:
Look for errors related to:
- `Audio processing error:`
- `TTS error:`
- `Transcription failed`

## Common Solutions

### Issue: "Error processing audio"

**Solution 1: Check OpenAI API Key**
```bash
# In .env file
OPENAI_API_KEY="sk-proj-..." # Must start with sk-proj- or sk-
```

**Solution 2: Check Audio Format**
- Browser should record as webm (handled automatically)
- If issues persist, try Chrome/Edge instead of Firefox/Safari

**Solution 3: Check Network**
- Ensure you have internet connection
- OpenAI API must be reachable
- Check firewall/VPN settings

### Issue: No audio playback

**Solution 1: Browser Permissions**
- Click address bar lock icon
- Ensure microphone AND speakers are allowed
- Refresh the page

**Solution 2: Audio Context**
- Some browsers require user interaction before playing audio
- Click anywhere on the page first

### Issue: Microphone not recording

**Solution 1: Grant Permissions**
- Browser will prompt on first use
- If denied, click lock icon → reset permissions

**Solution 2: Check Hardware**
- Test mic in other apps (Zoom, Discord, etc.)
- Verify correct input device in OS settings

## Performance Expectations

| Action | Expected Time |
|--------|--------------|
| Start call | 1-2 seconds |
| Transcribe 5s audio | 1-2 seconds |
| AI response generation | 1-3 seconds |
| TTS generation | 1-2 seconds |
| **Total roundtrip** | **4-8 seconds** |

Slower times may indicate:
- Slow internet connection
- OpenAI API latency
- Large audio files (speak for <10 seconds per turn)

## Cost Monitoring

The test console shows:
- **Real-time cost estimate** based on duration
- **$0.40/minute** for full voice AI experience
- **Detailed breakdown** in the info tooltip

To monitor actual usage:
1. Go to https://platform.openai.com/usage
2. Check API usage for Whisper (STT) and TTS
3. Compare with in-app estimates

## Advanced Testing

### Test Different Voices

Modify the voice in `test-console.tsx`:
```typescript
voice: "nova",  // Try: alloy, echo, fable, onyx, shimmer
```

### Test Different Speeds

```typescript
speed: 1.0,  // Try: 0.75 (slower), 1.25 (faster)
```

### Test Long Conversations

- Make 10+ exchanges
- Verify conversation history is maintained
- Check stats accuracy

### Test Error Recovery

- Speak very quietly (should error)
- Make gibberish sounds
- Disconnect internet mid-call
- Verify errors are handled gracefully

## Production Testing

Once working in development:

1. **Build for production:**
   ```bash
   pnpm build
   ```

2. **Deploy to Vercel:**
   ```bash
   vercel --prod
   ```

3. **Test on deployed URL:**
   - Verify environment variables are set in Vercel dashboard
   - Test with multiple users simultaneously
   - Monitor OpenAI usage and costs

## Support

If issues persist:
1. Check `VOICE_AI_FIX.md` for technical details
2. Review browser console for specific errors
3. Verify all environment variables are set
4. Test with a fresh browser profile (no extensions)
5. Try a different browser (Chrome recommended)

## Expected Behavior Video

The working flow should look like this:

1. 🟢 Start Call → AI greets you
2. 🔴 Push to Talk → Speak
3. ⚪ Release → Processing
4. 💬 Your text appears
5. 🤖 AI text response appears
6. 🔊 AI speaks the response
7. 🔁 Repeat steps 2-6
8. ⏹️ End Call → See stats

Happy testing! 🎉
