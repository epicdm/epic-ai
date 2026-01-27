#!/bin/bash
# Quick API endpoint testing script

API_BASE="http://localhost:3000/api"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

if [ -z "$1" ]; then
  echo -e "${YELLOW}Usage: ./test-api.sh <endpoint> [method] [data]${NC}"
  echo ""
  echo "Examples:"
  echo "  ./test-api.sh /brands"
  echo "  ./test-api.sh /brands POST '{\"name\":\"Test Brand\"}'"
  echo "  ./test-api.sh /brands/123 PUT '{\"name\":\"Updated\"}'"
  echo "  ./test-api.sh /brands/123 DELETE"
  exit 1
fi

ENDPOINT=$1
METHOD=${2:-GET}
DATA=$3

echo -e "${YELLOW}Testing: $METHOD $API_BASE$ENDPOINT${NC}"
echo ""

if [ -z "$DATA" ]; then
  # GET, DELETE (no body)
  RESPONSE=$(curl -s -w "\n%{http_code}" -X "$METHOD" "$API_BASE$ENDPOINT" \
    -H "Content-Type: application/json")
else
  # POST, PUT (with body)
  RESPONSE=$(curl -s -w "\n%{http_code}" -X "$METHOD" "$API_BASE$ENDPOINT" \
    -H "Content-Type: application/json" \
    -d "$DATA")
fi

# Extract body and status code
BODY=$(echo "$RESPONSE" | head -n -1)
STATUS=$(echo "$RESPONSE" | tail -n 1)

# Format JSON
FORMATTED=$(echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY")

# Color code based on status
if [ "$STATUS" -ge 200 ] && [ "$STATUS" -lt 300 ]; then
  echo -e "${GREEN}Status: $STATUS${NC}"
elif [ "$STATUS" -ge 400 ]; then
  echo -e "${RED}Status: $STATUS${NC}"
else
  echo -e "${YELLOW}Status: $STATUS${NC}"
fi

echo ""
echo "Response:"
echo "$FORMATTED"
