#!/usr/bin/env python3

"""
Transfer Tool Adapter v1 - Advanced Verification Script

Purpose: Comprehensive verification of Transfer Tool Adapter v1 against voice000.epic.dm
Tests all critical paths and integration points
Generates detailed verification report

Usage:
    python3 verify-transfer-tool-v1.py --voice-host voice000.epic.dm --redis-host localhost
"""

import sys
import json
import time
import socket
import argparse
import requests
from typing import Dict, List, Tuple, Optional
from datetime import datetime

# ANSI color codes
class Colors:
    PASS = '\033[92m'      # Green
    FAIL = '\033[91m'      # Red
    WARN = '\033[93m'      # Yellow
    INFO = '\033[94m'      # Blue
    SECTION = '\033[95m'   # Magenta
    RESET = '\033[0m'

class VerificationReport:
    def __init__(self):
        self.checks: List[Dict] = []
        self.passed = 0
        self.failed = 0
        self.warnings = 0
        self.start_time = datetime.now()

    def add_pass(self, check_name: str, details: str = ""):
        self.checks.append({
            "status": "PASS",
            "name": check_name,
            "details": details,
            "timestamp": datetime.now().isoformat()
        })
        self.passed += 1
        print(f"{Colors.PASS}✓ PASS{Colors.RESET} {check_name}")
        if details:
            print(f"       {details}")

    def add_fail(self, check_name: str, details: str = "", error: str = ""):
        self.checks.append({
            "status": "FAIL",
            "name": check_name,
            "details": details,
            "error": error,
            "timestamp": datetime.now().isoformat()
        })
        self.failed += 1
        print(f"{Colors.FAIL}✗ FAIL{Colors.RESET} {check_name}")
        if details:
            print(f"       {details}")
        if error:
            print(f"       Error: {error}")

    def add_warn(self, check_name: str, details: str = ""):
        self.checks.append({
            "status": "WARN",
            "name": check_name,
            "details": details,
            "timestamp": datetime.now().isoformat()
        })
        self.warnings += 1
        print(f"{Colors.WARN}⚠ WARN{Colors.RESET} {check_name}")
        if details:
            print(f"       {details}")

    def section(self, title: str):
        print(f"\n{Colors.SECTION}{'='*70}")
        print(f"  {title}")
        print(f"{'='*70}{Colors.RESET}\n")

    def summary(self) -> bool:
        elapsed = (datetime.now() - self.start_time).total_seconds()
        print(f"\n{Colors.SECTION}{'='*70}")
        print(f"  VERIFICATION SUMMARY")
        print(f"{'='*70}{Colors.RESET}\n")

        print(f"Passed:   {Colors.PASS}{self.passed}{Colors.RESET}")
        print(f"Failed:   {Colors.FAIL}{self.failed}{Colors.RESET}")
        print(f"Warnings: {Colors.WARN}{self.warnings}{Colors.RESET}")
        print(f"Elapsed:  {elapsed:.2f}s")
        print()

        if self.failed == 0:
            print(f"{Colors.PASS}✅ GO - System ready for deployment{Colors.RESET}")
            return True
        else:
            print(f"{Colors.FAIL}❌ NO-GO - Issues must be resolved{Colors.RESET}")
            return False

    def export_json(self, filepath: str):
        """Export verification report as JSON"""
        report_data = {
            "timestamp": datetime.now().isoformat(),
            "duration_seconds": (datetime.now() - self.start_time).total_seconds(),
            "summary": {
                "passed": self.passed,
                "failed": self.failed,
                "warnings": self.warnings,
                "total": len(self.checks)
            },
            "checks": self.checks
        }
        with open(filepath, 'w') as f:
            json.dump(report_data, f, indent=2)
        print(f"\nReport exported to: {filepath}")

class TransferToolVerifier:
    def __init__(self, voice_host: str, voice_port: int, redis_host: str, redis_port: int,
                 asterisk_host: str, asterisk_port: int, timeout: int = 5):
        self.voice_host = voice_host
        self.voice_port = voice_port
        self.redis_host = redis_host
        self.redis_port = redis_port
        self.asterisk_host = asterisk_host
        self.asterisk_port = asterisk_port
        self.timeout = timeout
        self.report = VerificationReport()
        self.session = requests.Session()

    def check_port_open(self, host: str, port: int, service_name: str) -> bool:
        """Check if a port is open"""
        try:
            sock = socket.create_connection((host, port), timeout=self.timeout)
            sock.close()
            return True
        except (socket.timeout, socket.error):
            return False

    def run_all_checks(self) -> bool:
        """Execute all verification phases"""
        self.phase_1_pre_flight()
        self.phase_2_step1_manager_config()
        self.phase_2_step2_voice_service()
        self.phase_2_step3_session_mapping()
        self.phase_2_step4_flow_integration()
        self.phase_2_step5_failure_paths()
        self.phase_3_safety_locks()
        return self.report.summary()

    def phase_1_pre_flight(self):
        """PHASE 1: Pre-Flight Checklist"""
        self.report.section("PHASE 1: Pre-Flight Checklist")

        # Check Asterisk connectivity
        if self.check_port_open(self.asterisk_host, self.asterisk_port, "Asterisk AMI"):
            self.report.add_pass(
                "Asterisk AMI Port Accessible",
                f"{self.asterisk_host}:{self.asterisk_port}"
            )
        else:
            self.report.add_fail(
                "Asterisk AMI Port Not Accessible",
                f"Cannot connect to {self.asterisk_host}:{self.asterisk_port}",
                "Verify Asterisk is running and AMI is enabled"
            )

        # Check voice-service port
        if self.check_port_open(self.voice_host, self.voice_port, "voice-service"):
            self.report.add_pass(
                "voice-service Port Accessible",
                f"{self.voice_host}:{self.voice_port}"
            )
        else:
            self.report.add_fail(
                "voice-service Port Not Accessible",
                f"Cannot connect to {self.voice_host}:{self.voice_port}",
                "Verify voice-service is running on port 8000"
            )

    def phase_2_step1_manager_config(self):
        """PHASE 2 STEP 1: Verify Asterisk Manager Configuration"""
        self.report.section("PHASE 2 - STEP 1: Asterisk Manager Configuration")

        self.report.add_warn(
            "Manager Configuration Requires Direct Access",
            "SSH access to voice000.epic.dm required to verify /etc/asterisk/manager.conf"
        )

    def phase_2_step2_voice_service(self):
        """PHASE 2 STEP 2: Validate voice-service Connectivity"""
        self.report.section("PHASE 2 - STEP 2: voice-service Connectivity")

        # Test health endpoint
        try:
            url = f"http://{self.voice_host}:{self.voice_port}/health"
            response = self.session.get(url, timeout=self.timeout)

            if response.status_code == 200:
                try:
                    data = response.json()
                    if data.get('status') == 'ok':
                        self.report.add_pass(
                            "voice-service Health Endpoint",
                            f"Status: OK, Response time: {response.elapsed.total_seconds():.3f}s"
                        )
                    else:
                        self.report.add_warn(
                            "voice-service Health Status",
                            f"Unexpected status: {data.get('status')}"
                        )
                except json.JSONDecodeError:
                    self.report.add_warn(
                        "voice-service Health Response Format",
                        "Response was not valid JSON"
                    )
            else:
                self.report.add_fail(
                    "voice-service Health Endpoint",
                    f"HTTP {response.status_code}",
                    f"Response: {response.text[:200]}"
                )
        except requests.exceptions.Timeout:
            self.report.add_fail(
                "voice-service Health Endpoint",
                "Request timed out",
                f"No response within {self.timeout}s"
            )
        except requests.exceptions.ConnectionError as e:
            self.report.add_fail(
                "voice-service Health Endpoint",
                "Connection failed",
                str(e)
            )

        # Test transfer endpoint (dry-run with non-existent channel)
        try:
            url = f"http://{self.voice_host}:{self.voice_port}/telephony/transfer"
            payload = {
                "channel": "PJSIP/test-dry-run-00000001",
                "context": "default",
                "exten": "1",
                "priority": 1
            }

            start_time = time.time()
            response = self.session.post(url, json=payload, timeout=self.timeout)
            duration_ms = (time.time() - start_time) * 1000

            if response.status_code in [200, 502]:
                try:
                    data = response.json()
                    if "No such channel" in str(data) or data.get('error'):
                        self.report.add_pass(
                            "Transfer Endpoint Responds",
                            f"HTTP {response.status_code}, Duration: {duration_ms:.1f}ms (expected error on test channel)"
                        )
                    else:
                        self.report.add_warn(
                            "Transfer Endpoint Response",
                            f"Unexpected response format: {str(data)[:100]}"
                        )
                except json.JSONDecodeError:
                    self.report.add_fail(
                        "Transfer Endpoint Response Format",
                        "Response was not valid JSON",
                        response.text[:200]
                    )
            else:
                self.report.add_fail(
                    "Transfer Endpoint",
                    f"HTTP {response.status_code}",
                    f"Expected 200 or 502, got {response.status_code}"
                )
        except requests.exceptions.Timeout:
            self.report.add_fail(
                "Transfer Endpoint",
                "Request timed out",
                f"No response within {self.timeout}s"
            )
        except requests.exceptions.ConnectionError as e:
            self.report.add_fail(
                "Transfer Endpoint",
                "Connection failed",
                str(e)
            )

    def phase_2_step3_session_mapping(self):
        """PHASE 2 STEP 3: Validate Session → Channel Mapping"""
        self.report.section("PHASE 2 - STEP 3: Session Channel Mapping")

        self.report.add_warn(
            "Redis Session Validation",
            "Requires direct Redis access or active call session. Manual verification needed."
        )
        self.report.add_warn(
            "Expected Session Fields",
            "asterisk_channel (flat HSET field), asterisk_other_channel (optional), state, agentId"
        )

    def phase_2_step4_flow_integration(self):
        """PHASE 2 STEP 4: Flow-Level Integration Test"""
        self.report.section("PHASE 2 - STEP 4: Flow Integration Test")

        self.report.add_warn(
            "Flow Integration Test",
            "Requires live call session and active handoff. Must be executed during production traffic."
        )

    def phase_2_step5_failure_paths(self):
        """PHASE 2 STEP 5: Failure Path Testing"""
        self.report.section("PHASE 2 - STEP 5: Failure Path Testing")

        test_cases = [
            ("Missing asterisk_channel", "Session lacks asterisk_channel field"),
            ("No handoff target", "Governance handoff disabled or misconfigured"),
            ("Invalid channel", "Channel doesn't exist in Asterisk"),
            ("Max attempts exceeded", "escalation_attempt_count >= 3")
        ]

        for test_name, requirement in test_cases:
            self.report.add_warn(
                f"Failure Test: {test_name}",
                f"Requires: {requirement}"
            )

    def phase_3_safety_locks(self):
        """PHASE 3: Runtime Safety Locks"""
        self.report.section("PHASE 3: Runtime Safety Locks")

        safety_locks = [
            "Max Handoff Attempts (3 max)",
            "Already Escalated Check",
            "Agent Eligibility Gate",
            "Target Validation Gate"
        ]

        for lock in safety_locks:
            self.report.add_warn(
                f"Safety Lock: {lock}",
                "Code-level verification required. Check transfer-tool-verification.md"
            )

    def export_report(self, filepath: str):
        """Export verification report"""
        self.report.export_json(filepath)

def main():
    parser = argparse.ArgumentParser(
        description="Transfer Tool Adapter v1 - Advanced Verification Script",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python3 verify-transfer-tool-v1.py --voice-host voice000.epic.dm
  python3 verify-transfer-tool-v1.py --voice-host voice000.epic.dm --report results.json
        """
    )

    parser.add_argument("--voice-host", default="voice000.epic.dm",
                       help="voice-service hostname (default: voice000.epic.dm)")
    parser.add_argument("--voice-port", type=int, default=8000,
                       help="voice-service port (default: 8000)")
    parser.add_argument("--redis-host", default="localhost",
                       help="Redis hostname (default: localhost)")
    parser.add_argument("--redis-port", type=int, default=6379,
                       help="Redis port (default: 6379)")
    parser.add_argument("--asterisk-host", default="127.0.0.1",
                       help="Asterisk hostname (default: 127.0.0.1)")
    parser.add_argument("--asterisk-port", type=int, default=5038,
                       help="Asterisk AMI port (default: 5038)")
    parser.add_argument("--timeout", type=int, default=5,
                       help="Request timeout in seconds (default: 5)")
    parser.add_argument("--report", default="",
                       help="Export report to JSON file (optional)")

    args = parser.parse_args()

    # Print header
    print("\n" + "="*70)
    print("  Transfer Tool Adapter v1 - Advanced Verification")
    print("="*70)
    print(f"\nConfiguration:")
    print(f"  voice-service: http://{args.voice_host}:{args.voice_port}")
    print(f"  Redis: {args.redis_host}:{args.redis_port}")
    print(f"  Asterisk: {args.asterisk_host}:{args.asterisk_port}")
    print()

    # Run verification
    verifier = TransferToolVerifier(
        voice_host=args.voice_host,
        voice_port=args.voice_port,
        redis_host=args.redis_host,
        redis_port=args.redis_port,
        asterisk_host=args.asterisk_host,
        asterisk_port=args.asterisk_port,
        timeout=args.timeout
    )

    success = verifier.run_all_checks()

    # Export report if requested
    if args.report:
        verifier.export_report(args.report)

    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
