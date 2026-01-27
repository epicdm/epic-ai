#!/usr/bin/env python3
"""
Test server to simulate Epic AI web app telephony endpoints
for testing Inbound Call Guard v1
"""
from flask import Flask, jsonify, request
import json

app = Flask(__name__)

# Mock database of phone mappings
PHONE_MAPPINGS = {
    "+14155551234": {
        "agentId": "agent_published_001",
        "status": "PUBLISHED",
        "deploymentState": "published"
    },
    "+14155555678": {
        "agentId": "agent_testing_002",
        "status": "TESTING",
        "deploymentState": "draft"
    },
}

@app.route('/api/telephony/health-check', methods=['GET'])
def health_check():
    """System health check endpoint"""
    return jsonify({
        "data": {
            "ok": True,
            "database": "connected",
            "timestamp": "2026-01-25T18:30:00Z",
            "checks": {
                "database": "healthy"
            }
        },
        "confidence": 1.0,
        "gaps": [],
        "warnings": []
    })

@app.route('/api/telephony/resolve-did', methods=['POST'])
def resolve_did():
    """DID resolution endpoint for Inbound Call Guard v1"""
    data = request.get_json()
    did = data.get('did', '')
    call_id = data.get('callId', '')

    print(f"\n[RESOLVE-DID] Request: did={did}, callId={call_id}")

    # Check if DID exists in mapping
    if did not in PHONE_MAPPINGS:
        response = {
            "data": {
                "allowed": False,
                "action": "REJECT",
                "reason_code": "DID_NOT_MAPPED",
                "message": "This phone number is not configured. Please contact support.",
                "agentId": None,
                "deploymentState": None
            },
            "confidence": 1.0,
            "gaps": [],
            "warnings": []
        }
        print(f"[RESOLVE-DID] Response: {json.dumps(response, indent=2)}")
        return jsonify(response)

    # Get mapping
    mapping = PHONE_MAPPINGS[did]
    agent_id = mapping["agentId"]
    status = mapping["status"]
    deployment_state = mapping["deploymentState"]

    # Check if agent is live-eligible (PUBLISHED or READY)
    if deployment_state not in ["published", "ready"]:
        response = {
            "data": {
                "allowed": False,
                "action": "REJECT",
                "reason_code": "AGENT_NOT_LIVE",
                "message": f"This agent is not available to take live calls. Current state: {status}.",
                "agentId": agent_id,
                "deploymentState": deployment_state
            },
            "confidence": 1.0,
            "gaps": [],
            "warnings": []
        }
        print(f"[RESOLVE-DID] Response: {json.dumps(response, indent=2)}")
        return jsonify(response)

    # All checks passed - allow call
    response = {
        "data": {
            "allowed": True,
            "action": "CONNECT",
            "reason_code": None,
            "message": None,
            "agentId": agent_id,
            "deploymentState": deployment_state
        },
        "confidence": 1.0,
        "gaps": [],
        "warnings": []
    }
    print(f"[RESOLVE-DID] Response: {json.dumps(response, indent=2)}")
    return jsonify(response)

if __name__ == '__main__':
    print("=" * 60)
    print("Test Telephony Endpoints Server")
    print("=" * 60)
    print("\nEndpoints:")
    print("  GET  /api/telephony/health-check")
    print("  POST /api/telephony/resolve-did")
    print("\nMock Phone Mappings:")
    for did, info in PHONE_MAPPINGS.items():
        print(f"  {did} -> {info['agentId']} ({info['status']})")
    print("\n" + "=" * 60 + "\n")

    app.run(host='0.0.0.0', port=3000, debug=False)
