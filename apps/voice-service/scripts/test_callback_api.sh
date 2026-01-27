#!/bin/bash
#
# Test Script: Callback Queue v1 - API Endpoint Test
#
# Tests the /api/telephony/callback/enqueue endpoint directly
# Schedules a callback 2 minutes from now
#
# Usage:
#   ./scripts/test_callback_api.sh

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "============================================================"
echo "Callback Queue v1 - API Endpoint Test"
echo "============================================================"
echo

# Generate ISO timestamp 2 minutes from now
if command -v python3 &> /dev/null; then
    CALLBACK_TIME=$(python3 - <<'PY'
from datetime import datetime, timedelta, timezone
print((datetime.now(timezone.utc) + timedelta(minutes=2)).isoformat().replace("+00:00", "Z"))
PY
)
elif command -v date &> /dev/null && date --version &> /dev/null 2>&1; then
    # GNU date (Linux)
    CALLBACK_TIME=$(date -u -d '+2 minutes' +%Y-%m-%dT%H:%M:%SZ)
else
    # macOS date
    CALLBACK_TIME=$(date -u -v+2M +%Y-%m-%dT%H:%M:%SZ)
fi

echo -e "${YELLOW}Generated callback time (2 minutes from now):${NC} $CALLBACK_TIME"
echo

# API endpoint
API_URL="${WEB_BASE_URL:-http://localhost:3000}/api/telephony/callback/enqueue"

echo -e "${YELLOW}Calling API:${NC} $API_URL"
echo

# Make request
RESPONSE=$(curl -sS -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "voiceAgentId": "va_test_001",
    "sessionId": "s_test_001",
    "caller": "+17675551234",
    "callbackTimeIso": "'"$CALLBACK_TIME"'",
    "callbackWindow": "asap_15min",
    "callbackLabel": "Test callback (2 minutes)",
    "did": "+17679876543",
    "leadId": "lead_test_001",
    "answers": {
      "intent": "1",
      "budget": "2",
      "timeframe": "1",
      "area": "Test Area"
    }
  }')

echo -e "${GREEN}Response:${NC}"
echo "$RESPONSE" | jq . || echo "$RESPONSE"
echo

# Extract jobId and scheduledInMs
JOB_ID=$(echo "$RESPONSE" | jq -r '.data.jobId // empty')
SCHEDULED_IN_MS=$(echo "$RESPONSE" | jq -r '.data.scheduledInMs // empty')

if [ -n "$JOB_ID" ]; then
    echo -e "${GREEN}✓ Success!${NC}"
    echo "  Job ID: $JOB_ID"
    echo "  Scheduled in: ${SCHEDULED_IN_MS}ms (~$(($SCHEDULED_IN_MS / 1000))s)"
    echo
    echo -e "${YELLOW}Worker should process this job in ~2 minutes${NC}"
    echo "Check worker logs for: [callback.requested] running"
else
    echo -e "${RED}✗ Failed to enqueue callback${NC}"
    exit 1
fi

echo "============================================================"
