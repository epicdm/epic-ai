"""
LiveKit Agent Manager API
Provides endpoints for managing LiveKit agents, rooms, and participants
"""
import os
import subprocess
import json
import asyncio
import concurrent.futures
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any, Optional
from flask import Blueprint, request, jsonify
from flask_cors import cross_origin
import logging

logger = logging.getLogger(__name__)

# Thread pool for running async LiveKit operations
_executor = concurrent.futures.ThreadPoolExecutor(max_workers=4)


def run_async(coro):
    """Run an async coroutine from synchronous Flask code."""
    def _run():
        return asyncio.run(coro)
    future = _executor.submit(_run)
    return future.result(timeout=30)


# Blueprint for LiveKit management routes
livekit_manager = Blueprint('livekit_manager', __name__, url_prefix='/api/livekit')

# Configuration
LIVEKIT_URL = os.getenv("LIVEKIT_URL", "")
LIVEKIT_API_KEY = os.getenv("LIVEKIT_API_KEY", "")
LIVEKIT_API_SECRET = os.getenv("LIVEKIT_API_SECRET", "")
AGENTS_DIR = Path(os.environ.get("AGENTS_DIR", "/tmp/agents"))


def get_livekit_api():
    """Get LiveKit API module for sync operations"""
    try:
        from livekit import api
        return api
    except ImportError:
        return None


async def list_livekit_rooms_async():
    """Async function to list LiveKit rooms"""
    from livekit import api
    from livekit.protocol import room as room_proto

    http_url = LIVEKIT_URL.replace("wss://", "https://").replace("ws://", "http://")
    lk_api = api.LiveKitAPI(http_url, LIVEKIT_API_KEY, LIVEKIT_API_SECRET)

    try:
        request = room_proto.ListRoomsRequest()
        return await lk_api.room.list_rooms(request)
    finally:
        await lk_api.aclose()


async def test_livekit_connection_async():
    """Async function to test LiveKit connection"""
    from livekit import api
    from livekit.protocol import room as room_proto

    http_url = LIVEKIT_URL.replace("wss://", "https://").replace("ws://", "http://")
    lk_api = api.LiveKitAPI(http_url, LIVEKIT_API_KEY, LIVEKIT_API_SECRET)

    try:
        request = room_proto.ListRoomsRequest()
        await lk_api.room.list_rooms(request)
        return True
    finally:
        await lk_api.aclose()


async def get_room_participants_async(room_name: str):
    """Async function to get participants in a room"""
    from livekit import api
    from livekit.protocol import room as room_proto

    http_url = LIVEKIT_URL.replace("wss://", "https://").replace("ws://", "http://")
    lk_api = api.LiveKitAPI(http_url, LIVEKIT_API_KEY, LIVEKIT_API_SECRET)

    try:
        request = room_proto.ListParticipantsRequest(room=room_name)
        return await lk_api.room.list_participants(request)
    finally:
        await lk_api.aclose()


@livekit_manager.route('/config', methods=['GET'])
@cross_origin()
def get_livekit_config():
    """Get LiveKit configuration (without secrets)"""
    try:
        api_module = get_livekit_api()
        status = "connected"

        if api_module and LIVEKIT_URL and LIVEKIT_API_KEY:
            try:
                run_async(test_livekit_connection_async())
            except Exception as e:
                logger.warning(f"LiveKit connection test failed: {e}")
                status = "error"
        else:
            status = "not_configured"

        return jsonify({
            "url": LIVEKIT_URL,
            "api_key": LIVEKIT_API_KEY[:10] + "..." if LIVEKIT_API_KEY else None,
            "status": status,
            "agents_dir": str(AGENTS_DIR)
        })
    except Exception as e:
        logger.error(f"LiveKit config check failed: {e}")
        return jsonify({
            "url": LIVEKIT_URL,
            "status": "error",
            "error": str(e)
        }), 500


@livekit_manager.route('/token', methods=['POST'])
@cross_origin()
def generate_token():
    """Generate LiveKit access token"""
    try:
        data = request.json or {}
        room = data.get('room')
        identity = data.get('identity', f'user-{int(datetime.now().timestamp())}')
        metadata = json.dumps(data.get('metadata', {}))

        if not room:
            return jsonify({'error': 'room is required'}), 400

        from livekit import api
        token = api.AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET)
        token.with_identity(identity).with_name(identity).with_metadata(metadata)
        token.with_grants(api.VideoGrants(
            room_join=True,
            room=room,
            can_publish=True,
            can_subscribe=True,
            can_publish_data=True
        ))

        jwt_token = token.to_jwt()

        return jsonify({
            "token": jwt_token,
            "url": LIVEKIT_URL,
            "room": room,
            "identity": identity
        })

    except Exception as e:
        logger.error(f"Token generation failed: {e}", exc_info=True)
        return jsonify({
            'error': 'Failed to generate token',
            'details': str(e)
        }), 500


@livekit_manager.route('/rooms', methods=['GET'])
@cross_origin()
def list_rooms():
    """List all active LiveKit rooms"""
    try:
        api_module = get_livekit_api()
        if not api_module:
            return jsonify({'error': 'LiveKit SDK not installed'}), 500

        rooms_response = run_async(list_livekit_rooms_async())

        rooms_data = [
            {
                "sid": room.sid,
                "name": room.name,
                "num_participants": room.num_participants,
                "creation_time": room.creation_time,
                "metadata": room.metadata
            }
            for room in rooms_response.rooms
        ]

        return jsonify({"rooms": rooms_data})

    except Exception as e:
        logger.error(f"Failed to list rooms: {e}", exc_info=True)
        return jsonify({
            'error': 'Failed to list rooms',
            'details': str(e)
        }), 500


@livekit_manager.route('/rooms/<room_name>/participants', methods=['GET'])
@cross_origin()
def get_room_participants(room_name):
    """Get participants in a specific room"""
    try:
        api_module = get_livekit_api()
        if not api_module:
            return jsonify({'error': 'LiveKit SDK not installed'}), 500

        participants_response = run_async(get_room_participants_async(room_name))

        participants_data = [
            {
                "sid": p.sid,
                "identity": p.identity,
                "name": p.name,
                "state": p.state,
                "joined_at": p.joined_at,
                "metadata": p.metadata,
                "is_publisher": p.is_publisher,
                "tracks": [
                    {
                        "sid": t.sid,
                        "type": t.type,
                        "name": t.name,
                        "muted": t.muted,
                        "source": t.source
                    }
                    for t in p.tracks
                ]
            }
            for p in participants_response.participants
        ]

        return jsonify({
            "room": room_name,
            "participants": participants_data
        })

    except Exception as e:
        logger.error(f"Failed to get room participants: {e}", exc_info=True)
        return jsonify({
            'error': 'Failed to get room participants',
            'details': str(e)
        }), 500


@livekit_manager.route('/agents/local', methods=['GET'])
@cross_origin()
def list_local_agents():
    """List all local agent directories"""
    try:
        agents = []

        if not AGENTS_DIR.exists():
            return jsonify({"agents": [], "message": "Agents directory not found"})

        for agent_dir in AGENTS_DIR.iterdir():
            if not agent_dir.is_dir() or agent_dir.name.startswith('.'):
                continue

            agent_id = agent_dir.name
            config_file = agent_dir / "config.py"
            main_file = agent_dir / "main.py"

            agent_name = agent_id.replace('_', ' ').title()

            # Check if process is running
            is_running = False
            pid = None
            try:
                result = subprocess.run(
                    ['pgrep', '-f', f'python.*{agent_id}/main.py'],
                    capture_output=True,
                    text=True
                )
                is_running = len(result.stdout.strip()) > 0
                pid = result.stdout.strip().split('\n')[0] if is_running else None
            except Exception:
                pass

            agents.append({
                "id": agent_id,
                "name": agent_name,
                "path": str(agent_dir),
                "status": "running" if is_running else "stopped",
                "pid": int(pid) if pid else None,
                "has_config": config_file.exists(),
                "has_main": main_file.exists(),
                "last_modified": agent_dir.stat().st_mtime
            })

        agents.sort(key=lambda x: x['last_modified'], reverse=True)

        return jsonify({"agents": agents})

    except Exception as e:
        logger.error(f"Failed to list local agents: {e}", exc_info=True)
        return jsonify({
            'error': 'Failed to list local agents',
            'details': str(e)
        }), 500


@livekit_manager.route('/agents/<agent_id>/start', methods=['POST'])
@cross_origin()
def start_agent(agent_id):
    """Start a local agent"""
    try:
        agent_dir = AGENTS_DIR / agent_id
        if not agent_dir.exists():
            return jsonify({'error': 'Agent not found'}), 404

        main_file = agent_dir / "main.py"
        if not main_file.exists():
            return jsonify({'error': 'Agent main.py not found'}), 404

        # Check if already running
        result = subprocess.run(
            ['pgrep', '-f', f'python.*{agent_id}/main.py'],
            capture_output=True,
            text=True
        )
        if result.stdout.strip():
            return jsonify({
                'error': 'Agent already running',
                'pid': int(result.stdout.strip().split('\n')[0])
            }), 400

        # Start agent
        log_file = f"/tmp/agent-{agent_id}.log"
        env = os.environ.copy()
        cmd = ['python3', str(main_file), 'dev']

        process = subprocess.Popen(
            cmd,
            cwd=str(agent_dir),
            env=env,
            stdout=open(log_file, 'w'),
            stderr=subprocess.STDOUT,
            start_new_session=True
        )

        logger.info(f"Started agent {agent_id} with PID {process.pid}")

        return jsonify({
            "status": "started",
            "pid": process.pid,
            "agent_id": agent_id,
            "log_file": log_file
        })

    except Exception as e:
        logger.error(f"Failed to start agent: {e}", exc_info=True)
        return jsonify({
            'error': 'Failed to start agent',
            'details': str(e)
        }), 500


@livekit_manager.route('/agents/<agent_id>/stop', methods=['POST'])
@cross_origin()
def stop_agent(agent_id):
    """Stop a running agent"""
    try:
        result = subprocess.run(
            ['pgrep', '-f', f'python.*{agent_id}/main.py'],
            capture_output=True,
            text=True
        )

        if not result.stdout.strip():
            return jsonify({'error': 'Agent not running'}), 404

        pids = result.stdout.strip().split('\n')

        for pid in pids:
            try:
                subprocess.run(['kill', '-15', pid])
                logger.info(f"Stopped agent {agent_id} PID {pid}")
            except Exception:
                pass

        return jsonify({
            "status": "stopped",
            "agent_id": agent_id
        })

    except Exception as e:
        logger.error(f"Failed to stop agent: {e}", exc_info=True)
        return jsonify({
            'error': 'Failed to stop agent',
            'details': str(e)
        }), 500


@livekit_manager.route('/agents/<agent_id>/logs', methods=['GET'])
@cross_origin()
def get_agent_logs(agent_id):
    """Get agent logs"""
    try:
        log_file = f"/tmp/agent-{agent_id}.log"
        lines = request.args.get('lines', '100')

        if not Path(log_file).exists():
            return jsonify({
                "logs": [],
                "agent_id": agent_id
            })

        result = subprocess.run(
            ['tail', '-n', lines, log_file],
            capture_output=True,
            text=True
        )

        log_entries = [
            {
                "timestamp": datetime.now().isoformat(),
                "level": "info",
                "message": line,
                "agent_id": agent_id
            }
            for line in result.stdout.split('\n')
            if line.strip()
        ]

        return jsonify({
            "logs": log_entries,
            "agent_id": agent_id
        })

    except Exception as e:
        logger.error(f"Failed to get logs: {e}", exc_info=True)
        return jsonify({
            'error': 'Failed to get logs',
            'details': str(e)
        }), 500
