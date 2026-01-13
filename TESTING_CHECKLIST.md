# ✅ Testing Checklist - Epic AI Fixes

> **Print this out or keep it open while testing!**

---

## 🎯 Pre-Testing Setup

- [ ] Open https://staging.leads.epic.dm
- [ ] Open browser console (press F12)
- [ ] Click on "Console" tab
- [ ] Have this checklist ready

---

## Test #1: Voice Agents Dashboard (5 minutes)

### Steps:
1. - [ ] Navigate to: https://staging.leads.epic.dm/dashboard/voice
2. - [ ] Wait for page to load completely
3. - [ ] Check console for `[GET /api/voice/agents]` logs

### Expected Results:
- [ ] Voice agents appear in the dashboard
- [ ] Console shows: `[GET /api/voice/agents] Found agents: X`
   - OR: `[GET /api/voice/agents] Found agents (fallback): X`
- [ ] No error messages in console

### If PASS ✅:
Write down: "Voice agents test PASSED"

### If FAIL ❌:
Copy these from console:
- All lines starting with `[GET /api/voice/agents]`
- Any error messages
- Network tab: check if `/api/voice/agents` returned 500

---

## Test #2: Facebook Quick Setup (10 minutes)

### Steps:
1. - [ ] Navigate to: https://staging.leads.epic.dm/onboarding
2. - [ ] Clear console (click 🚫 button)
3. - [ ] Click "Connect with Facebook" button
4. - [ ] Watch console closely for logs

### Expected Results:
- [ ] Console shows: `[Quick FB Connect] Step 1: Creating organization...`
- [ ] Console shows: `[createOrganization] Creating organization: {...}`
- [ ] Console shows: `[createOrganization] Organization created: org_xxxxx`
- [ ] Console shows ONE of these three patterns:
   - [ ] `[createOrganization] Membership created for userId: ...` **(Pattern 1)**
   - [ ] `[createOrganization] Membership created via raw SQL (camelCase)` **(Pattern 2)**
   - [ ] `[createOrganization] Membership created via raw SQL (snake_case)` **(Pattern 3)**
- [ ] Console shows: `[Quick FB Connect] Brand created: brand_xxxxx`
- [ ] Facebook OAuth popup window opens
- [ ] No `500 Internal Server Error` messages

### If PASS ✅:
Write down: "Facebook Quick Setup PASSED with Pattern X" (replace X with 1, 2, or 3)

### If FAIL ❌:
Copy these from console:
- All lines starting with `[Quick FB Connect]`
- All lines starting with `[createOrganization]`
- Any error messages
- Network tab: check if `/api/onboarding/organization` returned 500
- What was the exact error message?

---

## Test #3: Facebook OAuth Flow (5 minutes)

*Only if Test #2 passed*

### Steps:
1. - [ ] Authorize with Facebook in the popup
2. - [ ] Wait for popup to close
3. - [ ] Check if business name auto-fills

### Expected Results:
- [ ] Popup closes automatically
- [ ] Business name field fills with Facebook page name
- [ ] Website field fills (if available)
- [ ] Console shows: `[Quick FB Connect] Success! Business data: {...}`

### If PASS ✅:
Write down: "OAuth flow PASSED"

### If FAIL ❌:
- What happened after authorization?
- Did popup close?
- Did data auto-fill?
- Any console errors?

---

## 📊 Results Summary

### Voice Agents:
```
Status: ⬜ PASS / ⬜ FAIL
Notes: ___________________________________
```

### Facebook Quick Setup:
```
Status: ⬜ PASS / ⬜ FAIL
Pattern: ⬜ 1 / ⬜ 2 / ⬜ 3
Notes: ___________________________________
```

### OAuth Flow:
```
Status: ⬜ PASS / ⬜ FAIL / ⬜ SKIPPED
Notes: ___________________________________
```

---

## 📝 Error Reporting Template

If anything failed, copy this template and fill it out:

```
### Test Failed: [Voice Agents / Facebook Quick Setup / OAuth Flow]

**What I did:**
1. Step 1
2. Step 2
3. Step 3

**What happened:**
[Describe what you saw]

**Console Logs:**
```
[Paste all relevant console logs here]
```

**Network Tab:**
```
[If there were failed API calls, paste the error]
```

**Screenshots:**
[Attach if helpful]
```

---

## 🎉 Success Criteria

**All tests PASS if:**
- ✅ Voice agents appear in dashboard
- ✅ Facebook Quick Setup creates org without errors
- ✅ One of the three patterns succeeds
- ✅ OAuth popup opens
- ✅ Business data auto-fills (bonus)

**Partial success if:**
- ✅ Voice agents work
- ❌ Facebook Quick Setup fails
  - → Need to investigate database schema

**Complete failure if:**
- ❌ Both tests fail
  - → Need to check deployment and environment variables

---

## 🚀 After Testing

### If All Tests Pass:
1. Reply with: "All tests PASSED! Pattern X worked for Facebook."
2. We'll plan the permanent database sync
3. We'll remove the temporary workarounds

### If Some Tests Fail:
1. Copy the error logs (use template above)
2. Reply with the errors
3. We'll investigate further

### If All Tests Fail:
1. Check if you're on staging environment
2. Check if code deployed (look at git commit hash in footer)
3. Reply with full details
4. We may need to check DigitalOcean logs

---

## 🔧 Troubleshooting Tips

### If page won't load:
- Check if https://staging.leads.epic.dm is accessible
- Check if you're logged in
- Try clearing cookies and logging in again

### If console is overwhelming:
- Click the filter icon
- Select "Errors" only
- Or search for `[GET /api/voice/agents]` or `[Quick FB Connect]`

### If popup blocked:
- Allow popups for staging.leads.epic.dm
- Try again

---

**Ready to test!** 🚀

Open https://staging.leads.epic.dm and start with Test #1!
