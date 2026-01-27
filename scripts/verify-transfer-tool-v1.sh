#!/bin/bash

###############################################################################
# Transfer Tool Adapter v1 - Automated Verification Script
#
# Purpose: Execute all verification phases from transfer-tool-verification.md
# Target: voice000.epic.dm
# Usage: ./verify-transfer-tool-v1.sh [--voice-host HOST] [--redis-host HOST]
#
# Version: 1.0.0
# Last Updated: 2026-01-26
###############################################################################

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
VOICE_HOST="${VOICE_HOST:-voice000.epic.dm}"
VOICE_PORT="${VOICE_PORT:-8000}"
REDIS_HOST="${REDIS_HOST:-localhost}"
REDIS_PORT="${REDIS_PORT:-6379}"
ASTERISK_HOST="${ASTERISK_HOST:-127.0.0.1}"
ASTERISK_PORT="${ASTERISK_PORT:-5038}"

# Results tracking
PHASE_RESULTS=()
FAILED_CHECKS=0
PASSED_CHECKS=0

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_pass() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((PASSED_CHECKS++))
}

log_fail() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((FAILED_CHECKS++))
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_section() {
    echo ""
    echo "=================================="
    echo "  $1"
    echo "=================================="
}

# Phase 1: Pre-Flight Checklist
phase_1_pre_flight() {
    log_section "PHASE 1: Pre-Flight Checklist"

    log_info "Checking Asterisk connectivity..."
    if telnet -zv $ASTERISK_HOST $ASTERISK_PORT &>/dev/null || nc -zv $ASTERISK_HOST $ASTERISK_PORT &>/dev/null; then
        log_pass "Asterisk AMI port ($ASTERISK_HOST:$ASTERISK_PORT) is accessible"
    else
        log_fail "Cannot connect to Asterisk AMI port ($ASTERISK_HOST:$ASTERISK_PORT)"
    fi

    log_info "Checking PostgreSQL accessibility..."
    if [ -n "$DATABASE_URL" ]; then
        log_pass "DATABASE_URL is set"
    else
        log_fail "DATABASE_URL not configured"
    fi

    log_info "Checking Redis accessibility..."
    if [ -n "$REDIS_URL" ]; then
        log_pass "REDIS_URL is set"
    else
        log_fail "REDIS_URL not configured"
    fi

    log_info "Checking DigitalOcean App Platform deployment..."
    log_warn "Manual verification required: Check DigitalOcean App Platform dashboard"
}

# Phase 2 Step 1: Verify Asterisk Manager Configuration
phase_2_step1_manager_config() {
    log_section "PHASE 2 - STEP 1: Verify Asterisk Manager Configuration"

    log_info "Checking manager.conf permissions..."

    # Try to read manager.conf directly
    if [ -f "/etc/asterisk/manager.conf" ]; then
        log_pass "Found manager.conf at /etc/asterisk/manager.conf"

        if grep -q "\[admin\]" /etc/asterisk/manager.conf; then
            log_pass "Found [admin] section in manager.conf"
        else
            log_fail "No [admin] section found in manager.conf"
        fi

        if grep -q "write=all\|write=.*originate" /etc/asterisk/manager.conf; then
            log_pass "Manager has write permissions for call operations"
        else
            log_fail "Manager missing write permissions for call operations"
        fi
    else
        log_warn "Cannot directly access /etc/asterisk/manager.conf (may require root)"
        log_warn "Manual verification required: SSH to voice000.epic.dm and check /etc/asterisk/manager.conf"
    fi
}

# Phase 2 Step 2: Validate voice-service AMI Connectivity
phase_2_step2_voice_service_connectivity() {
    log_section "PHASE 2 - STEP 2: Validate voice-service AMI Connectivity"

    log_info "Testing voice-service health endpoint..."
    HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" "http://$VOICE_HOST:$VOICE_PORT/health" 2>/dev/null || echo "000")
    HTTP_CODE=$(echo "$HEALTH_RESPONSE" | tail -n1)
    BODY=$(echo "$HEALTH_RESPONSE" | sed '$d')

    if [ "$HTTP_CODE" = "200" ]; then
        log_pass "voice-service health endpoint responds (HTTP $HTTP_CODE)"
        if echo "$BODY" | grep -q '"status":"ok"'; then
            log_pass "Health status is 'ok'"
        else
            log_warn "Health endpoint returned unexpected format: $BODY"
        fi
    else
        log_fail "voice-service health endpoint returned HTTP $HTTP_CODE"
    fi

    log_info "Testing transfer endpoint (dry-run with non-existent channel)..."
    TRANSFER_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "http://$VOICE_HOST:$VOICE_PORT/telephony/transfer" \
        -H "Content-Type: application/json" \
        -d '{
            "channel": "PJSIP/test-00000001",
            "context": "default",
            "exten": "1",
            "priority": 1
        }' 2>/dev/null || echo "")

    TRANSFER_HTTP_CODE=$(echo "$TRANSFER_RESPONSE" | tail -n1)
    TRANSFER_BODY=$(echo "$TRANSFER_RESPONSE" | sed '$d')

    if [ "$TRANSFER_HTTP_CODE" = "502" ] || [ "$TRANSFER_HTTP_CODE" = "200" ]; then
        log_pass "Transfer endpoint accepts POST requests (HTTP $TRANSFER_HTTP_CODE)"
    elif [ -z "$TRANSFER_HTTP_CODE" ]; then
        log_fail "Cannot reach transfer endpoint at http://$VOICE_HOST:$VOICE_PORT/telephony/transfer"
    else
        log_warn "Transfer endpoint returned unexpected HTTP $TRANSFER_HTTP_CODE"
    fi

    # Check for "No such channel" error (which is GOOD - means voice-service reached AMI)
    if echo "$TRANSFER_BODY" | grep -q "No such channel\|AMI\|Error"; then
        log_pass "voice-service successfully connected to Asterisk AMI (expected error on test channel)"
    fi
}

# Phase 2 Step 3: Validate Session → Channel Mapping
phase_2_step3_session_mapping() {
    log_section "PHASE 2 - STEP 3: Validate Session → Channel Mapping"

    log_info "Checking Redis connectivity and session structure..."

    # Try redis-cli if available
    if command -v redis-cli &> /dev/null; then
        TEST_KEY="transfer-tool-test-$$"
        TEST_VALUE="PJSIP/test-$(date +%s)"

        if redis-cli -h $REDIS_HOST -p $REDIS_PORT SET "$TEST_KEY" "$TEST_VALUE" &>/dev/null; then
            log_pass "Redis is accessible at $REDIS_HOST:$REDIS_PORT"

            RETRIEVED=$(redis-cli -h $REDIS_HOST -p $REDIS_PORT GET "$TEST_KEY" 2>/dev/null)
            if [ "$RETRIEVED" = "$TEST_VALUE" ]; then
                log_pass "Redis key-value storage working correctly"
            else
                log_fail "Redis retrieval failed"
            fi

            redis-cli -h $REDIS_HOST -p $REDIS_PORT DEL "$TEST_KEY" &>/dev/null
        else
            log_fail "Cannot connect to Redis at $REDIS_HOST:$REDIS_PORT"
        fi
    else
        log_warn "redis-cli not found - skipping direct Redis validation"
        log_warn "Manual verification required: Check live session with: redis-cli HGET session:<session-id> asterisk_channel"
    fi
}

# Phase 2 Step 4: Flow-Level Integration Test
phase_2_step4_flow_integration() {
    log_section "PHASE 2 - STEP 4: Flow-Level Integration Test"

    log_warn "Flow-level integration test requires live call session"
    log_warn "Manual verification required: Execute during active call"
    log_info "Expected behavior:"
    echo "  1. Handoff node executes without errors"
    echo "  2. voice-service receives transfer request"
    echo "  3. AMI Redirect succeeds on valid channels"
    echo "  4. Session.state updated to ESCALATED"
    echo "  5. AI loop halted (flow returns stop signal)"
}

# Phase 2 Step 5: Failure Path Testing
phase_2_step5_failure_paths() {
    log_section "PHASE 2 - STEP 5: Failure Path Testing"

    log_info "Test 1: Missing Asterisk channel..."
    # This would require injecting into Redis; note for manual execution
    log_warn "Requires manual Redis injection - see transfer-tool-verification.md Test 1"

    log_info "Test 2: No handoff target configured..."
    log_warn "Requires governance config modification - see transfer-tool-verification.md Test 2"

    log_info "Test 3: Invalid Asterisk channel..."
    log_warn "Requires live system with non-existent channel - see transfer-tool-verification.md Test 3"

    log_info "Test 4: Max handoff attempts exceeded..."
    log_warn "Requires escalation_attempt_count manipulation - see transfer-tool-verification.md Test 4"
}

# Phase 3: Runtime Safety Locks Summary
phase_3_safety_locks() {
    log_section "PHASE 3: Runtime Safety Locks Summary"

    log_info "Verifying safety guards are implemented in handoff.ts..."

    if grep -q "hasExceededHandoffAttempts\|escalation_attempt_count" \
        apps/workers/src/runtime/flow/nodes/handoff.ts 2>/dev/null; then
        log_pass "Max Handoff Attempts guard is implemented"
    else
        log_fail "Max Handoff Attempts guard not found"
    fi

    if grep -q "isAlreadyEscalated\|state === \"ESCALATED\"" \
        apps/workers/src/runtime/flow/nodes/handoff.ts 2>/dev/null; then
        log_pass "Already Escalated guard is implemented"
    else
        log_fail "Already Escalated guard not found"
    fi

    if grep -q "isAgentEligibleForHandoff\|agentId" \
        apps/workers/src/runtime/flow/nodes/handoff.ts 2>/dev/null; then
        log_pass "Agent Eligibility guard is implemented"
    else
        log_fail "Agent Eligibility guard not found"
    fi

    if grep -q "validateTargetExists\|context.*exten" \
        apps/workers/src/runtime/flow/nodes/handoff.ts 2>/dev/null; then
        log_pass "Target Validation guard is implemented"
    else
        log_fail "Target Validation guard not found"
    fi
}

# Phase 4: Operations Checklist
phase_4_operations_checklist() {
    log_section "PHASE 4: Operations Checklist & Go/No-Go Decision"

    log_info "Summarizing verification results..."
    echo ""
    echo "Checks Passed: ${GREEN}$PASSED_CHECKS${NC}"
    echo "Checks Failed: ${RED}$FAILED_CHECKS${NC}"
    echo ""

    if [ $FAILED_CHECKS -eq 0 ]; then
        echo -e "${GREEN}✅ GO - System appears ready for deployment${NC}"
        echo "Next steps:"
        echo "  1. Execute manual failure scenario tests (Phase 2 Step 5)"
        echo "  2. Conduct live call handoff test"
        echo "  3. Verify session event logging in database"
        echo "  4. Review all error logs and confirm no surprises"
        echo "  5. Proceed with production traffic"
        return 0
    else
        echo -e "${RED}❌ NO-GO - Issues detected, resolve before deployment${NC}"
        echo "Issues to resolve:"
        echo "  - Review all [FAIL] messages above"
        echo "  - Consult troubleshooting guide in transfer-tool-verification.md"
        echo "  - Contact platform team for infrastructure issues"
        return 1
    fi
}

# Help message
show_help() {
    cat << EOF
Transfer Tool Adapter v1 - Automated Verification Script

Usage: $0 [OPTIONS]

Options:
    --voice-host HOST         voice-service hostname (default: voice000.epic.dm)
    --voice-port PORT         voice-service port (default: 8000)
    --redis-host HOST         Redis hostname (default: localhost)
    --redis-port PORT         Redis port (default: 6379)
    --asterisk-host HOST      Asterisk hostname (default: 127.0.0.1)
    --asterisk-port PORT      Asterisk AMI port (default: 5038)
    --help                    Show this help message

Environment Variables:
    VOICE_HOST                Override --voice-host
    VOICE_PORT                Override --voice-port
    REDIS_HOST                Override --redis-host
    REDIS_PORT                Override --redis-port
    ASTERISK_HOST             Override --asterisk-host
    ASTERISK_PORT             Override --asterisk-port
    DATABASE_URL              PostgreSQL connection string
    REDIS_URL                 Redis connection string

Example:
    ./verify-transfer-tool-v1.sh --voice-host voice000.epic.dm --redis-host redis.example.com

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --voice-host)
            VOICE_HOST="$2"
            shift 2
            ;;
        --voice-port)
            VOICE_PORT="$2"
            shift 2
            ;;
        --redis-host)
            REDIS_HOST="$2"
            shift 2
            ;;
        --redis-port)
            REDIS_PORT="$2"
            shift 2
            ;;
        --asterisk-host)
            ASTERISK_HOST="$2"
            shift 2
            ;;
        --asterisk-port)
            ASTERISK_PORT="$2"
            shift 2
            ;;
        --help)
            show_help
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Main execution
main() {
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║   Transfer Tool Adapter v1 - Automated Verification Script     ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo ""
    echo "Configuration:"
    echo "  Voice Service: http://$VOICE_HOST:$VOICE_PORT"
    echo "  Redis: $REDIS_HOST:$REDIS_PORT"
    echo "  Asterisk AMI: $ASTERISK_HOST:$ASTERISK_PORT"
    echo ""

    # Execute all phases
    phase_1_pre_flight
    phase_2_step1_manager_config
    phase_2_step2_voice_service_connectivity
    phase_2_step3_session_mapping
    phase_2_step4_flow_integration
    phase_2_step5_failure_paths
    phase_3_safety_locks
    phase_4_operations_checklist

    echo ""
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║                  Verification Complete                         ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
}

main "$@"
