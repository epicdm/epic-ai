#!/bin/bash
#
# Test Script: AMI Originate for Outbound Callbacks
#
# Tests AMI connectivity and Originate command
#
# Usage:
#   ./scripts/test_ami_originate.sh <caller_number>
#
# Example:
#   ./scripts/test_ami_originate.sh +17675551234

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "============================================================"
echo "AMI Originate Test - Outbound Callback"
echo "============================================================"
echo

# Check arguments
if [ -z "$1" ]; then
    echo -e "${RED}Error: Caller number required${NC}"
    echo "Usage: $0 <caller_number>"
    echo "Example: $0 +17675551234"
    exit 1
fi

CALLER_NUMBER=$1

# AMI Configuration (from environment or defaults)
AMI_HOST=${ASTERISK_AMI_HOST:-"localhost"}
AMI_PORT=${ASTERISK_AMI_PORT:-"5038"}
AMI_USER=${ASTERISK_AMI_USER:-"epic_ami"}
AMI_PASS=${ASTERISK_AMI_PASS:-"CHANGE_ME_STRONG"}

OUTBOUND_TRUNK=${ASTERISK_OUTBOUND_TRUNK:-"trunk"}
OUTBOUND_CID=${ASTERISK_OUTBOUND_CID:-"+17675550000"}

FASTAGI_HOST=${VOICE_SERVICE_FASTAGI_HOST:-"voice-service"}
FASTAGI_PORT=${VOICE_SERVICE_FASTAGI_PORT:-"4573"}

echo -e "${YELLOW}Configuration:${NC}"
echo "  AMI Host: $AMI_HOST:$AMI_PORT"
echo "  AMI User: $AMI_USER"
echo "  Caller: $CALLER_NUMBER"
echo "  Trunk: $OUTBOUND_TRUNK"
echo "  Caller ID: $OUTBOUND_CID"
echo "  FastAGI: agi://$FASTAGI_HOST:$FASTAGI_PORT/route_to_agent"
echo

# Test 1: AMI Connectivity
echo -e "${YELLOW}Test 1: AMI Connectivity${NC}"
if nc -zv $AMI_HOST $AMI_PORT 2>&1 | grep -q succeeded || nc -zv $AMI_HOST $AMI_PORT 2>&1 | grep -q open; then
    echo -e "${GREEN}✓ AMI port $AMI_PORT is open${NC}"
else
    echo -e "${RED}✗ AMI port $AMI_PORT is closed or unreachable${NC}"
    exit 1
fi
echo

# Test 2: AMI Login
echo -e "${YELLOW}Test 2: AMI Login${NC}"
LOGIN_RESULT=$(
    (
        echo "Action: Login"
        echo "Username: $AMI_USER"
        echo "Secret: $AMI_PASS"
        echo "Events: off"
        echo ""
        sleep 1
        echo "Action: Logoff"
        echo ""
        sleep 1
    ) | nc $AMI_HOST $AMI_PORT 2>&1
)

if echo "$LOGIN_RESULT" | grep -q "Authentication accepted"; then
    echo -e "${GREEN}✓ AMI login successful${NC}"
else
    echo -e "${RED}✗ AMI login failed${NC}"
    echo "$LOGIN_RESULT"
    exit 1
fi
echo

# Test 3: FastAGI Connectivity
echo -e "${YELLOW}Test 3: FastAGI Connectivity${NC}"
if nc -zv $FASTAGI_HOST $FASTAGI_PORT 2>&1 | grep -q succeeded || nc -zv $FASTAGI_HOST $FASTAGI_PORT 2>&1 | grep -q open; then
    echo -e "${GREEN}✓ FastAGI port $FASTAGI_PORT is open${NC}"
else
    echo -e "${YELLOW}⚠ FastAGI port $FASTAGI_PORT is closed (start fastagi_server.py)${NC}"
fi
echo

# Test 4: AMI Originate
echo -e "${YELLOW}Test 4: AMI Originate (Outbound Call)${NC}"
echo "  Calling: $CALLER_NUMBER"
echo "  Via trunk: $OUTBOUND_TRUNK"
echo

# Build FastAGI URL
AGI_URL="agi://$FASTAGI_HOST:$FASTAGI_PORT/route_to_agent?voiceAgentId=test_agent&sessionId=test_session&caller=$CALLER_NUMBER"

echo -e "${YELLOW}Sending Originate command...${NC}"

ORIGINATE_RESULT=$(
    (
        echo "Action: Login"
        echo "Username: $AMI_USER"
        echo "Secret: $AMI_PASS"
        echo "Events: off"
        echo ""
        sleep 1
        echo "Action: Originate"
        echo "Channel: PJSIP/$CALLER_NUMBER@$OUTBOUND_TRUNK"
        echo "CallerID: $OUTBOUND_CID"
        echo "Timeout: 30000"
        echo "Async: true"
        echo "Application: AGI"
        echo "Data: $AGI_URL"
        echo "Variable: EPIC_TEST=true"
        echo ""
        sleep 2
        echo "Action: Logoff"
        echo ""
        sleep 1
    ) | nc $AMI_HOST $AMI_PORT 2>&1
)

echo "$ORIGINATE_RESULT"
echo

if echo "$ORIGINATE_RESULT" | grep -q "Originate successfully queued"; then
    echo -e "${GREEN}✓ Originate command successful!${NC}"
    echo
    echo -e "${YELLOW}What happens next:${NC}"
    echo "  1. Asterisk dials $CALLER_NUMBER"
    echo "  2. On answer, executes AGI: $AGI_URL"
    echo "  3. Voice service handles DTMF flow"
    echo
    echo -e "${YELLOW}Monitor logs:${NC}"
    echo "  Asterisk CLI: asterisk -rx 'core set verbose 5'"
    echo "  Voice service: tail -f voice-service.log"
    echo "  Workers: tail -f workers.log"
elif echo "$ORIGINATE_RESULT" | grep -qi "error"; then
    echo -e "${RED}✗ Originate command failed${NC}"
    echo
    ERROR_MSG=$(echo "$ORIGINATE_RESULT" | grep -i "message:" || echo "Unknown error")
    echo -e "${RED}Error: $ERROR_MSG${NC}"
    exit 1
else
    echo -e "${YELLOW}⚠ Uncertain result (check Asterisk CLI)${NC}"
fi

echo "============================================================"
