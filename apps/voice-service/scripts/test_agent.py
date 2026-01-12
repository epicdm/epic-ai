#!/usr/bin/env python3
"""
Test Voice Agent for Epic AI
Handles inbound calls to +17678183521

This agent connects to LiveKit and handles SIP calls routed via the dispatch rule.
It uses OpenAI for STT, LLM, and TTS.

Run with:
    cd /opt/epic-ai/apps/voice-service
    python scripts/test_agent.py start
"""

import os
import asyncio
import logging

# Environment variables must be set before running:
# LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET, OPENAI_API_KEY
# Example: export LIVEKIT_URL=wss://your-livekit.cloud

from livekit.agents import (
    AutoSubscribe,
    JobContext,
    JobProcess,
    WorkerOptions,
    cli,
)
from livekit.agents.voice import Agent
from livekit.plugins import openai, silero

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("epic-voice-agent")


# Agent configuration
AGENT_NAME = "epic-voice-agent"
SYSTEM_PROMPT = """You are a helpful AI voice assistant for Epic AI.

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


def prewarm(proc: JobProcess):
    """Prewarm resources for faster agent startup"""
    logger.info("Prewarming VAD model...")
    proc.userdata["vad"] = silero.VAD.load()


async def entrypoint(ctx: JobContext):
    """Main entrypoint for handling voice calls"""
    logger.info(f"Agent connecting to room: {ctx.room.name}")

    # Get prewarmed VAD
    vad = ctx.proc.userdata.get("vad")
    if not vad:
        logger.info("Loading VAD model...")
        vad = silero.VAD.load()

    # Connect to the room
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

    # Log room info
    logger.info(f"Connected to room: {ctx.room.name}")
    logger.info(f"Room metadata: {ctx.room.metadata}")

    # Wait for participant
    participant = await ctx.wait_for_participant()
    logger.info(f"Participant joined: {participant.identity}")

    # Log SIP-specific attributes
    sip_attrs = {k: v for k, v in participant.attributes.items() if 'sip' in k.lower()}
    if sip_attrs:
        logger.info(f"SIP attributes: {sip_attrs}")

    # Create the voice agent using the new API
    agent = Agent(
        instructions=SYSTEM_PROMPT,
        vad=vad,
        stt=openai.STT(),
        llm=openai.LLM(model="gpt-4o-mini"),
        tts=openai.TTS(voice="alloy"),
    )

    # Start the agent session
    logger.info("Starting agent session...")
    session = await agent.start(ctx.room, participant)

    # Generate initial greeting
    await session.generate_reply()

    # Keep the session running
    logger.info("Agent is now handling the call...")
    await session.wait()


def main():
    """Start the agent worker"""
    logger.info(f"Starting {AGENT_NAME} worker...")
    logger.info(f"LiveKit URL: {os.environ['LIVEKIT_URL']}")

    # Check for OpenAI key
    if not os.environ.get('OPENAI_API_KEY'):
        logger.warning("OPENAI_API_KEY not set! Agent will fail to process speech.")

    options = WorkerOptions(
        entrypoint_fnc=entrypoint,
        prewarm_fnc=prewarm,
        agent_name=AGENT_NAME,
    )

    cli.run_app(options)


if __name__ == "__main__":
    main()
