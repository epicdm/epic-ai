"""
Agent Creator - Converts frontend agent config to LiveKit agent files
Dynamically generates agent code based on configuration
"""
import os
import re
import json
from pathlib import Path
from typing import Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)


class AgentCreator:
    """Creates LiveKit agent files from frontend configuration"""

    def __init__(self, agents_dir: Optional[str] = None):
        if agents_dir:
            self.agents_dir = Path(agents_dir)
        else:
            env_path = os.environ.get("AGENTS_DIR")
            if env_path:
                self.agents_dir = Path(env_path)
            else:
                self.agents_dir = Path("/tmp/agents")

        self.agents_dir.mkdir(parents=True, exist_ok=True)

    def create_agent(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create a LiveKit agent from frontend configuration

        Args:
            config: Agent configuration from frontend
                {
                    "name": "Customer Support",
                    "description": "...",
                    "instructions": "You are helpful...",
                    "personality": "friendly",
                    "llm": {"provider": "openai", "model": "gpt-4o-mini", "temperature": 0.7},
                    "stt": {"provider": "deepgram", "model": "nova-3"},
                    "tts": {"provider": "openai", "voice": "ash"},
                    "features": {
                        "preemptiveGeneration": true,
                        "resumeFalseInterruption": true,
                        "transcriptionEnabled": true,
                        "vadEnabled": true
                    }
                }

        Returns:
            {"agent_id": "...", "path": "...", "status": "created"}
        """
        try:
            agent_id = self._generate_agent_id(config['name'])
            agent_path = self.agents_dir / agent_id
            agent_path.mkdir(exist_ok=True)

            self._create_config_file(agent_path, config)
            self._create_agent_logic(agent_path, config)
            self._create_main_file(agent_path, config)
            self._create_env_template(agent_path)
            self._create_requirements(agent_path, config)

            logger.info(f"Created agent {agent_id} at {agent_path}")

            return {
                "agent_id": agent_id,
                "path": str(agent_path),
                "status": "created",
                "files_created": [
                    "config.py",
                    "agent_logic.py",
                    "main.py",
                    ".env.template",
                    "requirements.txt"
                ]
            }

        except Exception as e:
            logger.error(f"Failed to create agent: {e}")
            raise

    def _generate_agent_id(self, name: str) -> str:
        """Generate safe agent ID from name"""
        agent_id = re.sub(r'[^a-z0-9_]', '', name.lower().replace(' ', '_'))
        return agent_id or 'agent'

    def _generate_class_name(self, name: str) -> str:
        """Generate PascalCase class name from agent name"""
        words = re.sub(r'[^a-zA-Z0-9\s_]', '', name).split()
        class_name = ''.join(word.capitalize() for word in words if word)
        return class_name + 'Agent' if class_name else 'CustomAgent'

    def _create_config_file(self, agent_path: Path, config: Dict[str, Any]):
        """Create config.py file"""
        llm = config.get('llm', {})
        stt = config.get('stt', {})
        tts = config.get('tts', {})
        features = config.get('features', {})

        content = f'''"""
Agent Configuration
Auto-generated from Epic AI agent builder
"""
import os
from dotenv import load_dotenv

load_dotenv()

# LiveKit Connection
LIVEKIT_URL = os.getenv("LIVEKIT_URL")
LIVEKIT_API_KEY = os.getenv("LIVEKIT_API_KEY")
LIVEKIT_API_SECRET = os.getenv("LIVEKIT_API_SECRET")

# Agent Configuration
AGENT_NAME = "{config['name']}"
AGENT_DESCRIPTION = """{config.get('description', '')}"""

# AI Models
LLM_PROVIDER = "{llm.get('provider', 'openai')}"
LLM_MODEL = "{llm.get('model', 'gpt-4o-mini')}"
LLM_TEMPERATURE = {llm.get('temperature', 0.7)}

STT_PROVIDER = "{stt.get('provider', 'deepgram')}"
STT_MODEL = "{stt.get('model', 'nova-3')}"

TTS_PROVIDER = "{tts.get('provider', 'openai')}"
TTS_VOICE = "{tts.get('voice', 'ash')}"

# Features
VAD_ENABLED = {features.get('vadEnabled', True)}
PREEMPTIVE_GENERATION = {features.get('preemptiveGeneration', True)}
RESUME_FALSE_INTERRUPTION = {features.get('resumeFalseInterruption', True)}
TRANSCRIPTION_ENABLED = {features.get('transcriptionEnabled', True)}

# Logging
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
'''

        (agent_path / "config.py").write_text(content)

    def _create_agent_logic(self, agent_path: Path, config: Dict[str, Any]):
        """Create agent_logic.py file"""
        instructions = config.get('instructions', 'You are a helpful AI assistant.')
        instructions = instructions.replace('"', '\\"').replace('\n', '\\n')
        class_name = self._generate_class_name(config['name'])
        personality = config.get('personality', 'friendly')

        content = f'''"""
Agent Logic
Auto-generated from Epic AI agent builder
"""
import logging
from livekit.agents import Agent, AgentSession, JobContext
from livekit.agents.voice import MetricsCollectedEvent
from livekit.agents import metrics
from livekit.plugins import deepgram, openai, silero

from config import (
    AGENT_NAME,
    LLM_MODEL,
    LLM_TEMPERATURE,
    STT_MODEL,
    TTS_VOICE,
    VAD_ENABLED,
    PREEMPTIVE_GENERATION,
    RESUME_FALSE_INTERRUPTION,
    TRANSCRIPTION_ENABLED,
)

logger = logging.getLogger(__name__)


class {class_name}(Agent):
    """
    {config.get('description', 'AI Agent created with Epic AI')}
    Personality: {personality}
    """

    def __init__(self) -> None:
        super().__init__(
            instructions="{instructions}"
        )

    async def on_enter(self):
        """Called when agent enters the session"""
        self.session.generate_reply()


async def entrypoint(ctx: JobContext):
    """Main entrypoint for the agent worker"""
    ctx.log_context_fields = {{
        "room": ctx.room.name,
        "agent": AGENT_NAME,
    }}

    logger.info(f"Starting agent: {{AGENT_NAME}}")

    # Create agent session
    session = AgentSession(
        vad=silero.VAD.load() if VAD_ENABLED else None,
        llm=openai.LLM(model=LLM_MODEL, temperature=LLM_TEMPERATURE),
        stt=deepgram.STT(model=STT_MODEL, language="multi"),
        tts=openai.TTS(voice=TTS_VOICE),
        preemptive_generation=PREEMPTIVE_GENERATION,
        resume_false_interruption=RESUME_FALSE_INTERRUPTION,
        transcription_enabled=TRANSCRIPTION_ENABLED,
    )

    # Setup metrics collection
    usage_collector = metrics.UsageCollector()

    @session.on("metrics_collected")
    def _on_metrics_collected(ev: MetricsCollectedEvent):
        metrics.log_metrics(ev.metrics)
        usage_collector.collect(ev.metrics)

    async def log_usage():
        summary = usage_collector.get_summary()
        logger.info(f"Session usage: {{summary}}")

    ctx.add_shutdown_callback(log_usage)

    # Start the session
    agent = {class_name}()
    await session.start(agent=agent, room=ctx.room)
'''

        (agent_path / "agent_logic.py").write_text(content)

    def _create_main_file(self, agent_path: Path, config: Dict[str, Any]):
        """Create main.py file"""
        content = '''"""
Main Entry Point
Auto-generated from Epic AI agent builder
"""
import logging
from livekit.agents import WorkerOptions, cli
from agent_logic import entrypoint
from config import LOG_LEVEL, AGENT_NAME

# Setup logging
logging.basicConfig(
    level=LOG_LEVEL,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger(__name__)


def main():
    """Start the LiveKit agent worker"""
    logger.info(f"Starting {AGENT_NAME} worker...")

    options = WorkerOptions(
        entrypoint_fnc=entrypoint,
    )

    cli.run_app(options)


if __name__ == "__main__":
    main()
'''

        (agent_path / "main.py").write_text(content)

    def _create_env_template(self, agent_path: Path):
        """Create .env.template file"""
        content = '''# LiveKit Configuration
LIVEKIT_URL=wss://your-livekit-server.com
LIVEKIT_API_KEY=your_api_key
LIVEKIT_API_SECRET=your_api_secret

# AI Provider Keys
OPENAI_API_KEY=your_openai_key
DEEPGRAM_API_KEY=your_deepgram_key

# Optional
LOG_LEVEL=INFO
'''

        (agent_path / ".env.template").write_text(content)

    def _create_requirements(self, agent_path: Path, config: Dict[str, Any]):
        """Create requirements.txt file"""
        stt_provider = config.get('stt', {}).get('provider', 'deepgram')
        tts_provider = config.get('tts', {}).get('provider', 'openai')

        plugins = ['openai', 'silero']
        if stt_provider == 'deepgram':
            plugins.append('deepgram')
        if tts_provider == 'elevenlabs':
            plugins.append('elevenlabs')
        if tts_provider == 'cartesia':
            plugins.append('cartesia')

        plugins_str = ','.join(plugins)

        content = f'''# LiveKit Agents Framework
livekit-agents[{plugins_str}]>=1.0.0
python-dotenv>=1.0.0
'''

        (agent_path / "requirements.txt").write_text(content)

    def update_agent(self, agent_id: str, config: Dict[str, Any]) -> Dict[str, Any]:
        """Update an existing agent's configuration"""
        agent_path = self.agents_dir / agent_id
        if not agent_path.exists():
            raise FileNotFoundError(f"Agent {agent_id} not found")

        self._create_config_file(agent_path, config)
        self._create_agent_logic(agent_path, config)

        logger.info(f"Updated agent {agent_id}")

        return {
            "agent_id": agent_id,
            "path": str(agent_path),
            "status": "updated",
            "files_updated": ["config.py", "agent_logic.py"]
        }

    def delete_agent(self, agent_id: str) -> Dict[str, Any]:
        """Delete an agent"""
        import shutil
        agent_path = self.agents_dir / agent_id
        if not agent_path.exists():
            raise FileNotFoundError(f"Agent {agent_id} not found")

        shutil.rmtree(agent_path)
        logger.info(f"Deleted agent {agent_id}")

        return {
            "agent_id": agent_id,
            "status": "deleted"
        }

    def get_agent(self, agent_id: str) -> Dict[str, Any]:
        """Get agent information"""
        agent_path = self.agents_dir / agent_id
        if not agent_path.exists():
            raise FileNotFoundError(f"Agent {agent_id} not found")

        config_file = agent_path / "config.py"
        main_file = agent_path / "main.py"

        return {
            "agent_id": agent_id,
            "path": str(agent_path),
            "has_config": config_file.exists(),
            "has_main": main_file.exists(),
            "last_modified": agent_path.stat().st_mtime
        }

    def list_agents(self) -> list:
        """List all agents"""
        agents = []

        if not self.agents_dir.exists():
            return agents

        for agent_dir in self.agents_dir.iterdir():
            if not agent_dir.is_dir() or agent_dir.name.startswith('.'):
                continue

            agents.append({
                "agent_id": agent_dir.name,
                "path": str(agent_dir),
                "last_modified": agent_dir.stat().st_mtime
            })

        return sorted(agents, key=lambda x: x['last_modified'], reverse=True)


# Singleton instance
agent_creator = AgentCreator()
