"""
NexusAI Configuration
=====================

Central configuration for all settings, models, and prompts.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from parent directory (project root)
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(env_path)

# =============================================================================
# API KEYS
# =============================================================================

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")

# =============================================================================
# AVAILABLE MODELS (Dynamic Selection)
# =============================================================================

AVAILABLE_MODELS = {
    "GPT-4o-mini": {
        "id": "gpt-4o-mini",
        "description": "Fast & efficient",
        "supports_vision": True
    },
    "GPT-4o": {
        "id": "gpt-4o",
        "description": "High quality",
        "supports_vision": True
    },
    "GPT-4-turbo": {
        "id": "gpt-4-turbo",
        "description": "Balanced",
        "supports_vision": True
    },
    "o1-mini": {
        "id": "o1-mini",
        "description": "Advanced reasoning",
        "supports_vision": False
    }
}

DEFAULT_MODEL = "GPT-4o-mini"

# =============================================================================
# OPENAI SETTINGS
# =============================================================================

OPENAI_TEMPERATURE = 0.7

# =============================================================================
# PINECONE SETTINGS
# =============================================================================

PINECONE_INDEX_NAME = os.getenv("PINECONE_INDEX_NAME", "nexusai-memory")
PINECONE_DIMENSION = 1536
PINECONE_METRIC = "cosine"
PINECONE_CLOUD = "aws"
PINECONE_REGION = "us-east-1"

# =============================================================================
# TAVILY SETTINGS
# =============================================================================

TAVILY_MAX_RESULTS = 5
TAVILY_TOPIC = "general"

# =============================================================================
# MEMORY SETTINGS
# =============================================================================

MEMORY_BUFFER_SIZE = 10
MEMORY_RETRIEVAL_K = 5

# =============================================================================
# CREATOR INFO (Portfolio)
# =============================================================================

CREATOR_NAME = "Hemant Pandey"
CREATOR_TITLE = "AI/ML Engineer"
GITHUB_URL = "https://github.com/Hemant277123"
LINKEDIN_URL = "https://www.linkedin.com/in/hemantpandey-f4/"
EMAIL = ""

CREATOR_SKILLS = [
    "Python",
    "LLM Integration",
    "LangChain",
    "RAG Architecture",
    "Vector Databases",
    "API Development",
    "Full-Stack Development",
    "UI/UX Design"
]

# =============================================================================
# PROJECT INFO (About Page)
# =============================================================================

PROJECT_DESCRIPTION = """
NexusAI is a production-ready AI assistant that demonstrates advanced 
AI engineering capabilities. Built as a portfolio piece, it showcases 
LLM integration, real-time web search, semantic memory, and vision AI 
in a professional, Claude-like interface.
"""

PROJECT_FEATURES = [
    {"icon": "⚡", "title": "Streaming Responses", "desc": "Real-time word-by-word text generation"},
    {"icon": "🔍", "title": "Web Search", "desc": "Tavily API for current information"},
    {"icon": "💾", "title": "Semantic Memory", "desc": "Pinecone vector database for context"},
    {"icon": "👁️", "title": "Vision AI", "desc": "Image understanding capability"},
    {"icon": "🔄", "title": "Multi-Model", "desc": "Dynamic model selection"},
    {"icon": "🎨", "title": "Theme Support", "desc": "Light and dark mode"},
]

TECH_STACK = [
    {"name": "OpenAI GPT", "category": "LLM"},
    {"name": "LangChain", "category": "Framework"},
    {"name": "Tavily", "category": "Search"},
    {"name": "Pinecone", "category": "Vector DB"},
    {"name": "FastAPI", "category": "Backend"},
    {"name": "Next.js", "category": "Frontend"},
    {"name": "React", "category": "UI"},
    {"name": "Python", "category": "Language"},
]

# =============================================================================
# SYSTEM PROMPT (For Antigravity-style responses)
# =============================================================================

SYSTEM_PROMPT = """You are NexusAI, an AI assistant built by Hemant Pandey.

## How to Respond:

**Be natural and conversational.** 
- For simple questions, give simple answers. Don't over-format.
- For complex topics, use appropriate structure (headings, lists, code blocks).
- Match your response length and style to the question.

**Simple questions = Simple answers:**
- "Who are you?" → "I'm NexusAI, an AI assistant created by Hemant Pandey. I can help you with questions, research, coding, analysis, and more. How can I help you today?"
- "What's 2+2?" → "4"
- "Hello" → "Hello! How can I help you today?"

**Complex questions = Structured answers:**
- Technical explanations → Use code blocks, bullet points
- Comparisons → Consider using tables
- Multi-step processes → Use numbered lists
- Analysis → Use clear sections

## Your Capabilities:

1. **General Knowledge** — Answer questions from your training data
2. **Web Search** — Use tavily_search for current events, news, real-time info
3. **Memory** — Remember context from this conversation
4. **Vision** — Analyze images when provided

## Guidelines:

- Be helpful, accurate, and concise
- Don't use excessive emojis or over-formatted responses
- Only use markdown formatting when it genuinely helps readability
- For simple questions, respond conversationally in 1-3 sentences
- Admit when you don't know something
- When using web search, briefly cite where the info came from

## About You:

If asked about yourself, you can share:
- You are NexusAI, created by Hemant Pandey
- You're built with OpenAI models, LangChain, and can search the web
- You have memory to maintain conversation context
- You can analyze images

Keep responses natural and human-like. Don't be robotic or overly formal unless the context requires it.
"""



# =============================================================================
# UI CONFIGURATION
# =============================================================================

APP_TITLE = "NexusAI"
APP_SUBTITLE = "AI Assistant with Intelligence"

# =============================================================================
# VALIDATION
# =============================================================================

def validate_config():
    """Validate required configuration."""
    missing = []
    if not OPENAI_API_KEY:
        missing.append("OPENAI_API_KEY")
    if not TAVILY_API_KEY:
        missing.append("TAVILY_API_KEY")
    if not PINECONE_API_KEY:
        missing.append("PINECONE_API_KEY")
    
    if missing:
        raise ValueError(f"Missing: {', '.join(missing)}")
    return True
