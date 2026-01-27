#!/bin/bash

# Booking Stub v1 - End-to-End Test Script
# Tests sales qualification + callback window selection

set -e

BASE_URL="${BASE_URL:-http://localhost:5000}"
SESSION_ID="test:booking:$(date +%s)"
AGENT_ID="${AGENT_ID:-va_test}"
DID="+17675551234"
CALLER="+17675559999"
CALL_ID="c-$(date +%s)"

echo "======================================"
echo "Booking Stub v1 Test"
echo "======================================"
echo "Session ID: $SESSION_ID"
echo "Agent ID: $AGENT_ID"
echo "DID: $DID"
echo "Caller: $CALLER"
echo "======================================"
echo ""

# Step 1: Start session (customer lookup)
echo "Step 1: Starting session (customer lookup)..."
curl -sS -X POST "$BASE_URL/telephony/session/start" \
  -H 'Content-Type: application/json' \
  -d "{
    \"sessionId\": \"$SESSION_ID\",
    \"voiceAgentId\": \"$AGENT_ID\",
    \"did\": \"$DID\",
    \"caller\": \"$CALLER\",
    \"callId\": \"$CALL_ID\"
  }" | jq '.'

echo ""
read -p "Press Enter to continue to Step 2 (Select Sales)..."
echo ""

# Step 2: Select Sales (DTMF 1)
echo "Step 2: Selecting Sales (DTMF 1)..."
curl -sS -X POST "$BASE_URL/telephony/session/continue" \
  -H 'Content-Type: application/json' \
  -d "{
    \"sessionId\": \"$SESSION_ID\",
    \"voiceAgentId\": \"$AGENT_ID\",
    \"input\": {\"type\": \"dtmf\", \"value\": \"1\"}
  }" | jq '.'

echo ""
read -p "Press Enter to continue to Step 3 (Answer Intent: Buy Now)..."
echo ""

# Step 3: Answer Intent (DTMF 1 = Buy Now)
echo "Step 3: Answering Intent (DTMF 1 = Buy Now)..."
curl -sS -X POST "$BASE_URL/telephony/session/continue" \
  -H 'Content-Type: application/json' \
  -d "{
    \"sessionId\": \"$SESSION_ID\",
    \"voiceAgentId\": \"$AGENT_ID\",
    \"input\": {\"type\": \"dtmf\", \"value\": \"1\"}
  }" | jq '.'

echo ""
read -p "Press Enter to continue to Step 4 (Answer Budget: \$500-\$2000)..."
echo ""

# Step 4: Answer Budget (DTMF 2 = $500-$2000)
echo "Step 4: Answering Budget (DTMF 2 = \$500-\$2000)..."
curl -sS -X POST "$BASE_URL/telephony/session/continue" \
  -H 'Content-Type: application/json' \
  -d "{
    \"sessionId\": \"$SESSION_ID\",
    \"voiceAgentId\": \"$AGENT_ID\",
    \"input\": {\"type\": \"dtmf\", \"value\": \"2\"}
  }" | jq '.'

echo ""
read -p "Press Enter to continue to Step 5 (Answer Timeframe: <7 days)..."
echo ""

# Step 5: Answer Timeframe (DTMF 1 = <7 days)
echo "Step 5: Answering Timeframe (DTMF 1 = <7 days)..."
curl -sS -X POST "$BASE_URL/telephony/session/continue" \
  -H 'Content-Type: application/json' \
  -d "{
    \"sessionId\": \"$SESSION_ID\",
    \"voiceAgentId\": \"$AGENT_ID\",
    \"input\": {\"type\": \"dtmf\", \"value\": \"1\"}
  }" | jq '.'

echo ""
read -p "Press Enter to continue to Step 6 (Answer Location: In service area)..."
echo ""

# Step 6: Answer Location (DTMF 1 = In service area)
echo "Step 6: Answering Location (DTMF 1 = In service area)..."
curl -sS -X POST "$BASE_URL/telephony/session/continue" \
  -H 'Content-Type: application/json' \
  -d "{
    \"sessionId\": \"$SESSION_ID\",
    \"voiceAgentId\": \"$AGENT_ID\",
    \"input\": {\"type\": \"dtmf\", \"value\": \"1\"}
  }" | jq '.'

echo ""
echo "======================================"
echo "Callback Window Options:"
echo "  1 = ASAP (within 15 minutes)"
echo "  2 = Later today"
echo "  3 = Tomorrow morning"
echo "  4 = Tomorrow afternoon"
echo "======================================"
read -p "Press Enter to continue to Step 7 (Select: Tomorrow morning)..."
echo ""

# Step 7: Select Callback Window (DTMF 3 = Tomorrow morning)
echo "Step 7: Selecting Callback Window (DTMF 3 = Tomorrow morning)..."
curl -sS -X POST "$BASE_URL/telephony/session/continue" \
  -H 'Content-Type: application/json' \
  -d "{
    \"sessionId\": \"$SESSION_ID\",
    \"voiceAgentId\": \"$AGENT_ID\",
    \"input\": {\"type\": \"dtmf\", \"value\": \"3\"}
  }" | jq '.'

echo ""
echo "======================================"
echo "Test Complete!"
echo "======================================"
echo "Qualification Summary:"
echo "  Intent: 1 (Buy Now)"
echo "  Budget: 2 (\$500-\$2000)"
echo "  Timeframe: 1 (<7 days)"
echo "  Location: 1 (In service area)"
echo "  Callback: 3 (Tomorrow morning)"
echo ""
echo "Lead Quality: ⭐⭐⭐⭐⭐ (Hot Lead)"
echo "Callback Window: Tomorrow morning (10:00am)"
echo "======================================"
echo ""
echo "Session Context Should Include:"
echo "  session.callback_window = tomorrow_morning"
echo "  session.callback_label = Tomorrow morning"
echo "  session.callback_time_iso = [ISO timestamp]"
echo "======================================"
