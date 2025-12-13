# Epic AI - n8n Workflow Templates

Pre-built workflow templates for extending Epic AI with n8n automation.

## Available Workflows

### 1. Lead to Voice Call (`lead-to-voice-call.json`)
Automatically triggers a Voice AI call when a new lead is captured.

**Trigger:** Webhook (when lead is created)
**Actions:**
- Check if lead has phone number
- Trigger outbound voice call via Epic AI Voice API
- Log activity if no phone available

**Required Credentials:**
- Epic AI API authentication

**Environment Variables:**
- `EPIC_AI_API_URL` - Your Epic AI instance URL
- `DEFAULT_VOICE_AGENT_ID` - Voice agent to use for calls

---

### 2. Content Approval via Slack (`content-approval-slack.json`)
Sends content approval requests to a Slack channel with approve/reject buttons.

**Trigger:** Webhook (when content is generated)
**Actions:**
- Send formatted message to Slack
- Include approve/reject action buttons
- Update content status in Epic AI

**Required Credentials:**
- Slack API

**Environment Variables:**
- `EPIC_AI_API_URL` - Your Epic AI instance URL

---

### 3. Daily Content Report (`daily-content-report.json`)
Sends a daily email with content performance metrics.

**Trigger:** Schedule (daily at 9 AM)
**Actions:**
- Fetch analytics from Epic AI
- Format report with insights
- Send HTML email

**Required Credentials:**
- SMTP email credentials

**Environment Variables:**
- `EPIC_AI_API_URL` - Your Epic AI instance URL
- `DEFAULT_BRAND_ID` - Brand to report on
- `REPORT_EMAIL` - Email address to send reports to

---

## How to Import

1. Open n8n dashboard
2. Click **Workflows** → **Import from File**
3. Select the JSON file
4. Configure credentials and environment variables
5. Activate the workflow

## Custom Workflows

You can create custom workflows using the Epic AI webhook endpoint:

```
POST /api/webhooks/n8n
```

### Available Actions

| Action | Description | Required Fields |
|--------|-------------|-----------------|
| `generate_content` | Trigger content generation | `brandId` |
| `scrape_context` | Trigger context scraping | `brandId` |
| `sync_analytics` | Sync performance metrics | `brandId` |
| `publish_now` | Publish content immediately | `payload.contentId` |
| `create_lead` | Create a new lead | `brandId`, `payload.*` |
| `update_content_status` | Update content status | `payload.contentId`, `payload.status` |
| `custom` | Custom action (logged) | `payload` |

### Example Request

```json
{
  "action": "generate_content",
  "brandId": "clxxxxx",
  "payload": {
    "count": 5,
    "contentType": "POST",
    "platforms": ["TWITTER", "LINKEDIN"]
  }
}
```

## Security

All requests to `/api/webhooks/n8n` must include a signature header:

```
x-n8n-signature: <HMAC-SHA256 of body using N8N_WEBHOOK_SECRET>
```

Configure `N8N_WEBHOOK_SECRET` in both n8n and Epic AI for secure communication.
