#!/usr/bin/env python3
"""
Epic AI Voice Agent Worker
Handles inbound/outbound calls with per-agent configuration

This agent connects to LiveKit and handles SIP calls routed via dispatch rules.
Each call fetches the VoiceAgent configuration from the database to use
custom instructions, voice settings, and LLM configuration.

Run with:
    cd /opt/epic-ai/apps/voice-service
    python scripts/test_agent.py start
"""

import os
import json
import logging
import time
import asyncio
import psycopg2
from typing import Optional, Dict, Any

from livekit import agents, rtc
from livekit.agents import AgentSession, Agent, metrics
from livekit.agents.voice import MetricsCollectedEvent
from livekit.plugins import openai, silero, deepgram

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("epic-voice-agent")


# Agent configuration
AGENT_NAME = "epic-voice-agent"

# Default system prompt (used when agent config not found)
DEFAULT_SYSTEM_PROMPT = """You are a helpful AI voice assistant for Epic AI.

Your role:
- Answer incoming calls professionally
- Help callers with questions about Epic AI services
- Provide information and assistance

Guidelines:
- Be friendly, professional, and helpful
- Keep responses concise since this is a phone call
- If you don't know something, be honest about it
- End calls politely when the conversation concludes

Start by greeting the caller warmly and asking how you can help them today.
"""


def get_db_connection():
    """Get a database connection using DATABASE_URL"""
    database_url = os.environ.get('DATABASE_URL')
    if not database_url:
        logger.warning("DATABASE_URL not set - using default config")
        return None

    try:
        conn = psycopg2.connect(database_url)
        return conn
    except Exception as e:
        logger.error(f"Failed to connect to database: {e}")
        return None


def fetch_agent_config(agent_id: str) -> Optional[Dict[str, Any]]:
    """
    Fetch VoiceAgent configuration from the database

    Args:
        agent_id: The VoiceAgent ID (cuid)

    Returns:
        Dict with agent config or None if not found
    """
    if not agent_id or agent_id == "unknown":
        logger.warning("No agent_id provided, using default config")
        return None

    conn = get_db_connection()
    if not conn:
        return None

    try:
        cursor = conn.cursor()

        # Fetch VoiceAgent configuration
        # Note: Table name is voice_agents (Prisma maps VoiceAgent -> voice_agents)
        cursor.execute("""
            SELECT
                id,
                name,
                system_prompt,
                custom_instructions,
                llm_provider,
                llm_model,
                temperature,
                language,
                stt_provider,
                stt_model,
                stt_language,
                tts_provider,
                tts_model,
                tts_voice_id
            FROM voice_agents
            WHERE id = %s
        """, (agent_id,))

        row = cursor.fetchone()

        if not row:
            logger.warning(f"VoiceAgent {agent_id} not found in database")
            return None

        # Map columns to dict
        config = {
            "id": row[0],
            "name": row[1],
            "system_prompt": row[2],
            "custom_instructions": row[3],
            "llm_provider": row[4],
            "llm_model": row[5],
            "temperature": row[6],
            "language": row[7],
            "stt_provider": row[8],
            "stt_model": row[9],
            "stt_language": row[10],
            "tts_provider": row[11],
            "tts_model": row[12],
            "tts_voice_id": row[13],
        }

        logger.info(f"Loaded config for agent '{config['name']}' ({agent_id})")
        return config

    except Exception as e:
        logger.error(f"Failed to fetch agent config: {e}")
        return None
    finally:
        conn.close()


def parse_job_metadata(ctx: agents.JobContext) -> Dict[str, str]:
    """
    Parse metadata from the job context to extract agent_id and other info

    Metadata can come from:
    - Job metadata (dispatch.metadata from dispatch rule)
    - Room attributes (set by dispatch rule)
    """
    metadata = {}

    # Try job metadata first (JSON string from dispatch rule)
    try:
        job = getattr(ctx, 'job', None)
        if job and hasattr(job, 'metadata') and job.metadata:
            parsed = json.loads(job.metadata)
            if isinstance(parsed, dict):
                metadata.update(parsed)
                logger.info(f"Parsed job metadata: {metadata}")
    except (json.JSONDecodeError, Exception) as e:
        logger.debug(f"Could not parse job metadata: {e}")

    # Also check room metadata
    try:
        if ctx.room and ctx.room.metadata:
            parsed = json.loads(ctx.room.metadata)
            if isinstance(parsed, dict):
                metadata.update(parsed)
    except (json.JSONDecodeError, Exception) as e:
        logger.debug(f"Could not parse room metadata: {e}")

    return metadata


def build_system_prompt(config: Dict[str, Any]) -> str:
    """
    Build the system prompt from agent configuration

    Combines system_prompt and custom_instructions
    """
    parts = []

    if config.get("system_prompt"):
        parts.append(config["system_prompt"])

    if config.get("custom_instructions"):
        parts.append(f"\nAdditional Instructions:\n{config['custom_instructions']}")

    if parts:
        return "\n".join(parts)

    return DEFAULT_SYSTEM_PROMPT


def create_tts(config: Optional[Dict[str, Any]]):
    """Create TTS instance based on agent config"""
    if not config:
        return openai.TTS(voice="alloy")

    provider = config.get("tts_provider", "openai").lower()
    voice_id = config.get("tts_voice_id") or "alloy"

    if provider == "openai":
        return openai.TTS(voice=voice_id)
    # Add other TTS providers here (elevenlabs, etc.)

    # Default to OpenAI
    return openai.TTS(voice=voice_id)


def create_stt(config: Optional[Dict[str, Any]]):
    """Create STT instance based on agent config

    Uses OpenAI Whisper by default for reliability.
    Deepgram can be enabled via config when a valid API key is available.
    """
    provider = (config.get("stt_provider", "openai") if config else "openai").lower()

    # Only use Deepgram if explicitly configured AND API key is available
    if provider == "deepgram" and os.environ.get('DEEPGRAM_API_KEY'):
        model = config.get("stt_model", "nova-2") if config else "nova-2"
        language = config.get("stt_language", "multi") if config else "multi"
        logger.info(f"Using Deepgram STT (model={model}, language={language})")
        return deepgram.STT(model=model, language=language)

    # Default to OpenAI STT (reliable, no additional API key needed)
    logger.info("Using OpenAI STT")
    return openai.STT()


def create_llm(config: Optional[Dict[str, Any]]):
    """Create LLM instance based on agent config"""
    if not config:
        return openai.LLM(model="gpt-4o-mini")

    model = config.get("llm_model", "gpt-4o-mini")
    temperature = config.get("temperature", 0.7)

    return openai.LLM(
        model=model,
        temperature=temperature
    )


def prewarm(proc: agents.JobProcess):
    """Prewarm resources for faster agent startup"""
    logger.info("Prewarming VAD model...")
    proc.userdata["vad"] = silero.VAD.load()


async def wait_for_call_active(
    participant: rtc.RemoteParticipant,
    timeout: float = 60.0,
    poll_interval: float = 0.3
) -> bool:
    """
    Wait for an outbound call to be answered (sip.callStatus = "active")

    For outbound calls, the SIP participant joins immediately in "dialing" state.
    We need to wait for the call to be answered before the AI starts speaking.

    Uses polling since the LiveKit Python SDK event system works differently
    than the Node.js SDK.

    Args:
        participant: The SIP participant to monitor
        timeout: Maximum seconds to wait for answer (default 60s)
        poll_interval: Seconds between status checks (default 0.3s)

    Returns:
        True if call was answered, False if timeout or hangup
    """
    start_time = time.time()
    last_status = ""

    while time.time() - start_time < timeout:
        call_status = participant.attributes.get("sip.callStatus", "")

        # Log status changes
        if call_status != last_status:
            logger.info(f"Call status: {call_status}")
            last_status = call_status

        # Check if call is answered
        if call_status == "active":
            logger.info("Call answered - ready to speak")
            return True

        # Check if call failed
        if call_status in ("hangup", "error", "disconnected"):
            logger.warning(f"Call failed with status: {call_status}")
            return False

        await asyncio.sleep(poll_interval)

    logger.warning(f"Timeout waiting for call answer ({timeout}s)")
    return False


async def entrypoint(ctx: agents.JobContext):
    """Main entrypoint for handling voice calls"""
    logger.info(f"Agent connecting to room: {ctx.room.name}")

    # Parse metadata to get agent_id
    metadata = parse_job_metadata(ctx)
    agent_id = metadata.get("agent_id", "unknown")
    org_id = metadata.get("org_id", "unknown")
    phone_number = metadata.get("phone_number", "unknown")

    logger.info(f"Call details - Agent ID: {agent_id}, Org: {org_id}, Phone: {phone_number}")

    # Fetch agent configuration from database
    agent_config = fetch_agent_config(agent_id) if agent_id != "unknown" else None

    # Get prewarmed VAD
    vad = ctx.proc.userdata.get("vad")
    if not vad:
        logger.info("Loading VAD model...")
        vad = silero.VAD.load()

    # Connect to the room
    await ctx.connect(auto_subscribe=agents.AutoSubscribe.AUDIO_ONLY)

    # Log room info
    logger.info(f"Connected to room: {ctx.room.name}")

    # Wait for participant
    participant = await ctx.wait_for_participant()
    logger.info(f"Participant joined: {participant.identity}")

    # Log SIP-specific attributes
    sip_attrs = {k: v for k, v in participant.attributes.items() if 'sip' in k.lower()}
    if sip_attrs:
        logger.info(f"SIP attributes: {sip_attrs}")

    # Detect outbound calls (room name starts with "outbound-")
    is_outbound = ctx.room.name.startswith("outbound-")
    if is_outbound:
        logger.info("Outbound call detected - waiting for call to be answered...")
        call_answered = await wait_for_call_active(participant, timeout=60.0)
        if not call_answered:
            logger.warning("Call was not answered - ending session")
            return
        logger.info("Outbound call answered - proceeding with agent session")

    # Build system prompt from agent config or use default
    system_prompt = build_system_prompt(agent_config) if agent_config else DEFAULT_SYSTEM_PROMPT

    # Log which config we're using
    if agent_config:
        logger.info(f"Using custom config for agent '{agent_config['name']}'")
    else:
        logger.info("Using default agent configuration")

    # Create the AgentSession with configured plugins and performance optimizations
    logger.info("Creating agent session with performance optimizations...")
    session = AgentSession(
        stt=create_stt(agent_config),
        llm=create_llm(agent_config),
        tts=create_tts(agent_config),
        vad=vad,
        # Performance optimizations
        preemptive_generation=True,      # Start generating before user finishes speaking
        resume_false_interruption=True,  # Handle mid-speech interruptions better
    )

    # Setup metrics collection for performance monitoring
    usage_collector = metrics.UsageCollector()
    call_start_time = time.time()

    @session.on("metrics_collected")
    def _on_metrics_collected(ev: MetricsCollectedEvent):
        """Log metrics for each turn to help debug latency issues"""
        metrics.log_metrics(ev.metrics)
        usage_collector.collect(ev.metrics)

        # Log detailed latency breakdown
        m = ev.metrics
        if hasattr(m, 'stt_duration') and hasattr(m, 'llm_ttft') and hasattr(m, 'tts_ttfb'):
            logger.info(
                f"[LATENCY] STT: {getattr(m, 'stt_duration', 0)*1000:.0f}ms | "
                f"LLM TTFT: {getattr(m, 'llm_ttft', 0)*1000:.0f}ms | "
                f"TTS TTFB: {getattr(m, 'tts_ttfb', 0)*1000:.0f}ms"
            )

    async def log_usage():
        """Log usage summary when call ends"""
        call_duration = time.time() - call_start_time
        summary = usage_collector.get_summary()
        logger.info(f"[CALL ENDED] Duration: {call_duration:.1f}s | Usage: {summary}")

    ctx.add_shutdown_callback(log_usage)

    # Start the agent session with the room and instructions
    logger.info("Starting agent session...")
    await session.start(
        room=ctx.room,
        agent=Agent(instructions=system_prompt),
    )

    # Generate initial greeting
    logger.info("Generating initial greeting...")
    await session.generate_reply(
        instructions="Greet the caller warmly and ask how you can help them today."
    )

    # The session runs autonomously after start() - it will close automatically
    # when the participant disconnects (handled by LiveKit SDK internals)
    logger.info("Agent is now handling the call - session running autonomously")


def main():
    """Start the agent worker"""
    logger.info(f"Starting {AGENT_NAME} worker...")
    logger.info(f"LiveKit URL: {os.environ.get('LIVEKIT_URL', 'NOT SET')}")

    # Check for required environment variables
    if not os.environ.get('OPENAI_API_KEY'):
        logger.warning("OPENAI_API_KEY not set! Agent will fail to process speech.")

    if not os.environ.get('DATABASE_URL'):
        logger.warning("DATABASE_URL not set! Agent will use default config for all calls.")
    else:
        logger.info("Database connection configured - per-agent config enabled")

    # Use WorkerOptions with the new API
    options = agents.WorkerOptions(
        entrypoint_fnc=entrypoint,
        prewarm_fnc=prewarm,
        agent_name=AGENT_NAME,
    )

    agents.cli.run_app(options)


if __name__ == "__main__":
    main()
