#!/usr/bin/env python3
"""
Test Script: Callback Queue v1

Tests the callback.enqueue tool adapter by calling the web API.

Usage:
    python3 scripts/test_callback_queue.py
"""

import sys
import os
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

# Add parent directory to path to import modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from tools.callback_tool import enqueue_callback
from callback_time import compute_callback_time


def test_callback_enqueue():
    """Test callback.enqueue tool with various scenarios."""

    print("=" * 80)
    print("Callback Queue v1 - Test Script")
    print("=" * 80)
    print()

    # Test 1: ASAP callback (15 minutes)
    print("Test 1: ASAP callback (15 minutes)")
    print("-" * 40)

    callback_time_iso = compute_callback_time("asap_15min", "America/Dominica")

    args = {
        "voiceAgentId": "test_agent_001",
        "sessionId": "test_session_001",
        "caller": "+17671234567",
        "callbackTimeIso": callback_time_iso,
        "callbackWindow": "asap_15min",
        "callbackLabel": "ASAP (within 15 minutes)",
        "did": "+17679876543",
        "leadId": "lead_test_001",
        "answers": {
            "intent": "1",
            "budget": "2",
            "timeframe": "1",
            "area": "Roseau"
        }
    }

    print(f"Request payload:")
    print(f"  Caller: {args['caller']}")
    print(f"  Callback time: {callback_time_iso}")
    print(f"  Window: {args['callbackWindow']}")
    print(f"  Label: {args['callbackLabel']}")
    print()

    result = enqueue_callback(args)

    print(f"Result:")
    print(f"  OK: {result.get('ok')}")
    if result.get('ok'):
        print(f"  Job ID: {result.get('jobId')}")
        print(f"  Scheduled for: {result.get('scheduledFor')}")
        print(f"  Delay (ms): {result.get('delayMs')}")
    else:
        print(f"  Error: {result.get('error')}")
        print(f"  Details: {result.get('details')}")
    print()

    # Test 2: Later today callback
    print("Test 2: Later today callback")
    print("-" * 40)

    callback_time_iso = compute_callback_time("today", "America/Dominica")

    args = {
        "voiceAgentId": "test_agent_002",
        "sessionId": "test_session_002",
        "caller": "+17677654321",
        "callbackTimeIso": callback_time_iso,
        "callbackWindow": "today",
        "callbackLabel": "Later today",
        "leadId": "lead_test_002",
    }

    print(f"Request payload:")
    print(f"  Caller: {args['caller']}")
    print(f"  Callback time: {callback_time_iso}")
    print(f"  Window: {args['callbackWindow']}")
    print()

    result = enqueue_callback(args)

    print(f"Result:")
    print(f"  OK: {result.get('ok')}")
    if result.get('ok'):
        print(f"  Job ID: {result.get('jobId')}")
        print(f"  Scheduled for: {result.get('scheduledFor')}")
        print(f"  Delay (ms): {result.get('delayMs')}")
    else:
        print(f"  Error: {result.get('error')}")
    print()

    # Test 3: Tomorrow morning callback
    print("Test 3: Tomorrow morning callback")
    print("-" * 40)

    callback_time_iso = compute_callback_time("tomorrow_morning", "America/Dominica")

    args = {
        "voiceAgentId": "test_agent_003",
        "sessionId": "test_session_003",
        "caller": "+17671112222",
        "callbackTimeIso": callback_time_iso,
        "callbackWindow": "tomorrow_morning",
        "callbackLabel": "Tomorrow morning",
        "leadId": "lead_test_003",
    }

    print(f"Request payload:")
    print(f"  Caller: {args['caller']}")
    print(f"  Callback time: {callback_time_iso}")
    print(f"  Window: {args['callbackWindow']}")
    print()

    result = enqueue_callback(args)

    print(f"Result:")
    print(f"  OK: {result.get('ok')}")
    if result.get('ok'):
        print(f"  Job ID: {result.get('jobId')}")
        print(f"  Scheduled for: {result.get('scheduledFor')}")
        print(f"  Delay (ms): {result.get('delayMs')}")
    else:
        print(f"  Error: {result.get('error')}")
    print()

    # Test 4: Missing required field (should fail)
    print("Test 4: Missing required field (should fail)")
    print("-" * 40)

    args = {
        "voiceAgentId": "test_agent_004",
        # Missing sessionId - should fail
        "caller": "+17673334444",
    }

    print(f"Request payload (missing sessionId):")
    print(f"  voiceAgentId: {args['voiceAgentId']}")
    print(f"  caller: {args['caller']}")
    print()

    result = enqueue_callback(args)

    print(f"Result:")
    print(f"  OK: {result.get('ok')}")
    print(f"  Error: {result.get('error')}")
    print()

    print("=" * 80)
    print("Tests complete")
    print("=" * 80)


if __name__ == "__main__":
    test_callback_enqueue()
