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
            self._create_env_template(agent_path, config)
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

        # Get default voice based on provider
        tts_provider = tts.get('provider', 'openai')
        tts_voice = tts.get('voice', '')
        if not tts_voice:
            if tts_provider == 'openai':
                tts_voice = 'nova'
            elif tts_provider == 'elevenlabs':
                tts_voice = '21m00Tcm4TlvDq8ikWAM'  # Rachel
            elif tts_provider == 'cartesia':
                tts_voice = '248be419-c632-4f23-adf1-5324ed7dbf1d'  # Helpful Woman
            elif tts_provider == 'deepgram':
                tts_voice = 'aura-asteria-en'  # Asteria
            else:
                tts_voice = 'nova'

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

TTS_PROVIDER = "{tts_provider}"
TTS_VOICE = "{tts_voice}"

# ElevenLabs specific settings (if using ElevenLabs)
ELEVENLABS_MODEL = "eleven_turbo_v2_5"  # Ultra-low latency model

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
        tts_provider = config.get('tts', {}).get('provider', 'openai')
        stt_provider = config.get('stt', {}).get('provider', 'deepgram')
        tools = config.get('tools', [])
        rag_config = config.get('rag', {})
        agent_id = config.get('agentId', '')

        # Build imports based on providers
        plugin_imports = ['silero']
        if tts_provider == 'openai':
            plugin_imports.append('openai')
        elif tts_provider == 'elevenlabs':
            plugin_imports.append('elevenlabs')
        elif tts_provider == 'cartesia':
            plugin_imports.append('cartesia')
        elif tts_provider == 'deepgram':
            if 'deepgram' not in plugin_imports:
                plugin_imports.append('deepgram')

        if stt_provider == 'deepgram':
            if 'deepgram' not in plugin_imports:
                plugin_imports.append('deepgram')

        # Always need openai for LLM
        if 'openai' not in plugin_imports:
            plugin_imports.append('openai')

        imports_str = ', '.join(plugin_imports)

        # Build TTS initialization based on provider
        if tts_provider == 'elevenlabs':
            tts_init = 'elevenlabs.TTS(voice_id=TTS_VOICE, model="eleven_turbo_v2_5")'
        elif tts_provider == 'cartesia':
            tts_init = 'cartesia.TTS(voice=TTS_VOICE)'
        elif tts_provider == 'deepgram':
            tts_init = 'deepgram.TTS(voice=TTS_VOICE)'
        else:  # default to openai
            tts_init = 'openai.TTS(voice=TTS_VOICE)'

        # Generate tool functions and registrations
        tool_functions, tool_registrations = self._generate_tools_code(tools)

        # Generate RAG function if knowledge bases are configured
        rag_function = ""
        rag_registration = ""
        if rag_config.get('enabled', False) and agent_id:
            rag_function = self._generate_rag_function(agent_id, rag_config)
            rag_registration = "    agent.add_function(search_knowledge_base)\n"

        # Additional imports for tools and RAG
        extra_imports = ""
        if tools or rag_config.get('enabled', False):
            extra_imports = """
import asyncio
import aiohttp
from typing import Annotated
from livekit.agents import function_context"""

        content = f'''"""
Agent Logic
Auto-generated from Epic AI agent builder
"""
import logging
from livekit.agents import Agent, AgentSession, JobContext
from livekit.agents.voice import MetricsCollectedEvent
from livekit.agents import metrics
from livekit.plugins import {imports_str}{extra_imports}

from config import (
    AGENT_NAME,
    LLM_MODEL,
    LLM_TEMPERATURE,
    STT_MODEL,
    TTS_VOICE,
    TTS_PROVIDER,
    VAD_ENABLED,
    PREEMPTIVE_GENERATION,
    RESUME_FALSE_INTERRUPTION,
    TRANSCRIPTION_ENABLED,
)

logger = logging.getLogger(__name__)

{tool_functions}

{rag_function}

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
    logger.info(f"Using TTS provider: {{TTS_PROVIDER}}")

    # Create agent session with configured TTS provider
    session = AgentSession(
        vad=silero.VAD.load() if VAD_ENABLED else None,
        llm=openai.LLM(model=LLM_MODEL, temperature=LLM_TEMPERATURE),
        stt=deepgram.STT(model=STT_MODEL, language="multi"),
        tts={tts_init},
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

    # Create agent with function calling tools
    agent = {class_name}()
{tool_registrations}{rag_registration}
    # Start the session
    await session.start(agent=agent, room=ctx.room)
'''

        (agent_path / "agent_logic.py").write_text(content)

    def _generate_tools_code(self, tools: list) -> tuple:
        """Generate Python code for function calling tools"""
        if not tools:
            return "", ""

        tool_functions = []
        tool_registrations = []

        for tool in tools:
            if not tool.get('isActive', True):
                continue

            name = tool.get('name', 'unnamed_tool')
            description = tool.get('description', '')
            tool_type = tool.get('type', 'WEBHOOK')
            parameters = tool.get('parameters', {}).get('properties', {})
            required_params = tool.get('requiredParams', [])

            # Generate function signature
            func_name = self._sanitize_function_name(name)
            params_code = self._generate_params_code(parameters, required_params)

            # Generate function body based on tool type
            if tool_type == 'WEBHOOK':
                func_body = self._generate_webhook_function(tool, func_name, description, params_code)
            elif tool_type == 'BUILTIN':
                func_body = self._generate_builtin_function(tool, func_name, description, params_code)
            else:  # FUNCTION
                func_body = self._generate_custom_function(tool, func_name, description, params_code)

            tool_functions.append(func_body)
            tool_registrations.append(f"    agent.add_function({func_name})")

        functions_str = "\n\n".join(tool_functions)
        registrations_str = "\n".join(tool_registrations) + "\n" if tool_registrations else ""

        return functions_str, registrations_str

    def _sanitize_function_name(self, name: str) -> str:
        """Convert tool name to valid Python function name"""
        name = re.sub(r'[^a-zA-Z0-9_]', '_', name.lower())
        if name[0].isdigit():
            name = '_' + name
        return name

    def _generate_params_code(self, parameters: dict, required_params: list) -> str:
        """Generate function parameter annotations"""
        if not parameters:
            return ""

        params = []
        for param_name, param_def in parameters.items():
            param_type = param_def.get('type', 'string')
            description = param_def.get('description', '')
            is_required = param_name in required_params

            # Map JSON types to Python types
            type_map = {
                'string': 'str',
                'number': 'float',
                'integer': 'int',
                'boolean': 'bool',
                'array': 'list',
                'object': 'dict'
            }
            py_type = type_map.get(param_type, 'str')

            # Build annotated parameter
            if description:
                param_str = f'{param_name}: Annotated[{py_type}, function_context.TypeInfo(description="{description}")]'
            else:
                param_str = f'{param_name}: {py_type}'

            if not is_required:
                param_str += ' = None'

            params.append(param_str)

        return ', '.join(params)

    def _generate_webhook_function(self, tool: dict, func_name: str, description: str, params_code: str) -> str:
        """Generate a webhook function"""
        webhook_url = tool.get('webhookUrl', '')
        webhook_method = tool.get('webhookMethod', 'POST')
        webhook_headers = tool.get('webhookHeaders', {})
        auth_type = tool.get('authType')
        auth_config = tool.get('authConfig', {})
        timeout_ms = tool.get('timeoutMs', 10000)
        retry_count = tool.get('retryCount', 1)

        # Build headers code
        headers_str = json.dumps(webhook_headers) if webhook_headers else '{}'

        # Build auth code
        auth_code = ""
        if auth_type == 'bearer':
            token = auth_config.get('token', '')
            auth_code = f'''
        headers["Authorization"] = f"Bearer {token}"'''
        elif auth_type == 'api_key':
            header_name = auth_config.get('headerName', 'X-API-Key')
            api_key = auth_config.get('apiKey', '')
            auth_code = f'''
        headers["{header_name}"] = "{api_key}"'''
        elif auth_type == 'basic':
            username = auth_config.get('username', '')
            password = auth_config.get('password', '')
            auth_code = f'''
        import base64
        credentials = base64.b64encode(f"{username}:{password}".encode()).decode()
        headers["Authorization"] = f"Basic {{credentials}}"'''

        param_names = self._extract_param_names(params_code)
        params_dict = '{' + ', '.join(f'"{p}": {p}' for p in param_names) + '}' if param_names else '{}'

        return f'''@function_context.ai_callable(description="{description}")
async def {func_name}({params_code if params_code else ''}):
    """
    {description}
    Webhook: {webhook_url}
    """
    logger.info(f"Calling {func_name} webhook")
    headers = {headers_str}
    headers["Content-Type"] = "application/json"{auth_code}

    payload = {params_dict}

    timeout = aiohttp.ClientTimeout(total={timeout_ms / 1000})
    retries = {retry_count}

    for attempt in range(retries + 1):
        try:
            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.{webhook_method.lower()}("{webhook_url}", headers=headers, json=payload) as response:
                    if response.status >= 200 and response.status < 300:
                        result = await response.json()
                        logger.info(f"{func_name} succeeded: {{result}}")
                        return result
                    else:
                        error_text = await response.text()
                        logger.error(f"{func_name} failed with status {{response.status}}: {{error_text}}")
                        if attempt == retries:
                            return {{"error": f"Request failed with status {{response.status}}", "details": error_text}}
        except asyncio.TimeoutError:
            logger.error(f"{func_name} timeout on attempt {{attempt + 1}}")
            if attempt == retries:
                return {{"error": "Request timed out"}}
        except Exception as e:
            logger.error(f"{func_name} error on attempt {{attempt + 1}}: {{e}}")
            if attempt == retries:
                return {{"error": str(e)}}

    return {{"error": "Unknown error"}}'''

    def _generate_builtin_function(self, tool: dict, func_name: str, description: str, params_code: str) -> str:
        """Generate a built-in function"""
        builtin_type = tool.get('builtinType', '')
        builtin_config = tool.get('builtinConfig', {})

        if builtin_type == 'transfer_call':
            transfer_number = builtin_config.get('transferNumber', '')
            return f'''@function_context.ai_callable(description="{description}")
async def {func_name}({params_code if params_code else 'reason: str = None'}):
    """Transfer the call to another number"""
    logger.info(f"Transferring call: {{reason}}")
    # TODO: Implement actual call transfer via SIP
    return {{"status": "transferring", "target": "{transfer_number}", "reason": reason}}'''

        elif builtin_type == 'end_call':
            return f'''@function_context.ai_callable(description="{description}")
async def {func_name}({params_code if params_code else 'reason: str = None'}):
    """End the current call"""
    logger.info(f"Ending call: {{reason}}")
    # TODO: Implement actual call termination
    return {{"status": "ending", "reason": reason}}'''

        elif builtin_type == 'send_sms':
            return f'''@function_context.ai_callable(description="{description}")
async def {func_name}(phone_number: str, message: str):
    """Send an SMS message"""
    logger.info(f"Sending SMS to {{phone_number}}")
    # TODO: Implement SMS sending via Twilio or other provider
    return {{"status": "sent", "to": phone_number}}'''

        elif builtin_type == 'send_email':
            return f'''@function_context.ai_callable(description="{description}")
async def {func_name}(email: str, subject: str, body: str):
    """Send an email"""
    logger.info(f"Sending email to {{email}}")
    # TODO: Implement email sending
    return {{"status": "sent", "to": email}}'''

        elif builtin_type == 'schedule_callback':
            return f'''@function_context.ai_callable(description="{description}")
async def {func_name}(phone_number: str, callback_time: str, notes: str = None):
    """Schedule a callback"""
    logger.info(f"Scheduling callback to {{phone_number}} at {{callback_time}}")
    # TODO: Implement callback scheduling
    return {{"status": "scheduled", "phone": phone_number, "time": callback_time}}'''

        elif builtin_type == 'lookup_crm':
            return f'''@function_context.ai_callable(description="{description}")
async def {func_name}(phone_number: str = None, email: str = None, name: str = None):
    """Look up customer information in CRM"""
    logger.info(f"Looking up customer: phone={{phone_number}}, email={{email}}, name={{name}}")
    # TODO: Implement CRM lookup via Epic AI API
    return {{"status": "found", "customer": {{"name": "John Doe", "email": email or "unknown"}}}}'''

        elif builtin_type == 'create_lead':
            return f'''@function_context.ai_callable(description="{description}")
async def {func_name}(name: str, phone: str = None, email: str = None, notes: str = None):
    """Create a new lead in the CRM"""
    logger.info(f"Creating lead: {{name}}")
    # TODO: Implement lead creation via Epic AI API
    return {{"status": "created", "lead": {{"name": name, "phone": phone, "email": email}}}}'''

        elif builtin_type == 'check_availability':
            return f'''@function_context.ai_callable(description="{description}")
async def {func_name}(date: str, duration_minutes: int = 30):
    """Check calendar availability"""
    logger.info(f"Checking availability for {{date}}")
    # TODO: Implement calendar availability check
    return {{"available": True, "slots": ["9:00 AM", "10:00 AM", "2:00 PM"]}}'''

        elif builtin_type == 'book_appointment':
            return f'''@function_context.ai_callable(description="{description}")
async def {func_name}(date: str, time: str, customer_name: str, notes: str = None):
    """Book an appointment"""
    logger.info(f"Booking appointment for {{customer_name}} at {{date}} {{time}}")
    # TODO: Implement appointment booking
    return {{"status": "booked", "date": date, "time": time, "customer": customer_name}}'''

        else:
            return f'''@function_context.ai_callable(description="{description}")
async def {func_name}({params_code if params_code else ''}):
    """Built-in function: {builtin_type}"""
    logger.info(f"Executing builtin: {builtin_type}")
    return {{"status": "executed", "type": "{builtin_type}"}}'''

    def _generate_custom_function(self, tool: dict, func_name: str, description: str, params_code: str) -> str:
        """Generate a custom function placeholder"""
        return f'''@function_context.ai_callable(description="{description}")
async def {func_name}({params_code if params_code else ''}):
    """
    {description}
    Custom function - implement your logic here
    """
    logger.info(f"Executing custom function: {func_name}")
    # TODO: Implement custom logic
    return {{"status": "executed", "function": "{func_name}"}}'''

    def _generate_rag_function(self, agent_id: str, rag_config: dict) -> str:
        """Generate RAG knowledge base lookup function"""
        api_url = rag_config.get('apiUrl', 'http://localhost:3000')
        max_results = rag_config.get('maxResults', 5)
        min_score = rag_config.get('minScore', 0.7)

        return f'''@function_context.ai_callable(description="Search the knowledge base for relevant information to answer questions. Use this when you need specific facts, policies, or documentation to provide accurate answers.")
async def search_knowledge_base(query: Annotated[str, function_context.TypeInfo(description="The question or topic to search for in the knowledge base")]):
    """
    Search across all linked knowledge bases for relevant information.
    Returns contextual information to help answer user questions accurately.
    """
    logger.info(f"RAG search: {{query}}")

    try:
        timeout = aiohttp.ClientTimeout(total=10)
        async with aiohttp.ClientSession(timeout=timeout) as session:
            async with session.post(
                "{api_url}/api/voice/agents/{agent_id}/rag",
                headers={{"Content-Type": "application/json"}},
                json={{"query": query, "maxResults": {max_results}}}
            ) as response:
                if response.status == 200:
                    result = await response.json()
                    context = result.get("context", "")
                    matches = result.get("totalMatches", 0)

                    if context:
                        logger.info(f"RAG found {{matches}} relevant chunks")
                        return {{
                            "found": True,
                            "context": context,
                            "matches": matches,
                            "instruction": "Use the context above to provide an accurate and helpful response. If the context doesn't fully answer the question, acknowledge what you know and what might need further clarification."
                        }}
                    else:
                        logger.info("RAG search: no relevant context found")
                        return {{
                            "found": False,
                            "message": "No relevant information found in the knowledge base for this query.",
                            "instruction": "Politely acknowledge that you don't have specific information about this topic in your knowledge base, and offer to help with related questions or suggest the caller contact support for more details."
                        }}
                else:
                    error_text = await response.text()
                    logger.error(f"RAG search failed: {{response.status}} - {{error_text}}")
                    return {{"found": False, "error": "Knowledge base search temporarily unavailable"}}

    except asyncio.TimeoutError:
        logger.error("RAG search timeout")
        return {{"found": False, "error": "Knowledge base search timed out"}}
    except Exception as e:
        logger.error(f"RAG search error: {{e}}")
        return {{"found": False, "error": str(e)}}'''

    def _extract_param_names(self, params_code: str) -> list:
        """Extract parameter names from params code"""
        if not params_code:
            return []
        # Extract just the parameter names before the colon
        names = []
        for param in params_code.split(','):
            param = param.strip()
            if ':' in param:
                name = param.split(':')[0].strip()
                names.append(name)
        return names

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

    def _create_env_template(self, agent_path: Path, config: Dict[str, Any] = None):
        """Create .env.template file"""
        tts_provider = config.get('tts', {}).get('provider', 'openai') if config else 'openai'

        content = '''# LiveKit Configuration
LIVEKIT_URL=wss://your-livekit-server.com
LIVEKIT_API_KEY=your_api_key
LIVEKIT_API_SECRET=your_api_secret

# AI Provider Keys
OPENAI_API_KEY=your_openai_key
DEEPGRAM_API_KEY=your_deepgram_key

# TTS Provider Keys (based on your selection)
'''
        if tts_provider == 'elevenlabs':
            content += 'ELEVEN_API_KEY=your_elevenlabs_key  # Required for ElevenLabs TTS\n'
        elif tts_provider == 'cartesia':
            content += 'CARTESIA_API_KEY=your_cartesia_key  # Required for Cartesia TTS\n'

        content += '''
# Optional
LOG_LEVEL=INFO
'''

        (agent_path / ".env.template").write_text(content)

    def _create_requirements(self, agent_path: Path, config: Dict[str, Any]):
        """Create requirements.txt file"""
        stt_provider = config.get('stt', {}).get('provider', 'deepgram')
        tts_provider = config.get('tts', {}).get('provider', 'openai')
        tools = config.get('tools', [])

        plugins = ['openai', 'silero']
        if stt_provider == 'deepgram' and 'deepgram' not in plugins:
            plugins.append('deepgram')
        if tts_provider == 'elevenlabs':
            plugins.append('elevenlabs')
        elif tts_provider == 'cartesia':
            plugins.append('cartesia')
        elif tts_provider == 'deepgram' and 'deepgram' not in plugins:
            plugins.append('deepgram')

        plugins_str = ','.join(plugins)

        content = f'''# LiveKit Agents Framework
livekit-agents[{plugins_str}]>=1.0.0
python-dotenv>=1.0.0

# Additional dependencies for {tts_provider} TTS
'''
        if tts_provider == 'elevenlabs':
            content += '# ElevenLabs provides 75ms ultra-low latency\n'
            content += 'elevenlabs>=1.0.0\n'

        # Add aiohttp if tools are configured
        if tools:
            content += '\n# Function calling tools\n'
            content += 'aiohttp>=3.9.0\n'

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
