"""
NexusAI Agent with Dynamic Model Selection
==========================================

Core AI agent with:
- Dynamic model selection (GPT-4o-mini, GPT-4o, etc.)
- Web search integration
- Semantic memory
- Image/Vision support
- Streaming responses
"""

from typing import List, Generator, Optional, Callable
import base64
from langchain_openai import ChatOpenAI
from langchain_tavily import TavilySearch
from langgraph.prebuilt import create_react_agent
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage

from config import (
    OPENAI_API_KEY,
    AVAILABLE_MODELS,
    DEFAULT_MODEL,
    OPENAI_TEMPERATURE,
    TAVILY_API_KEY,
    TAVILY_MAX_RESULTS,
    TAVILY_TOPIC,
    SYSTEM_PROMPT
)
from memory import NexusMemory


class NexusAgent:
    """
    NexusAI Agent with dynamic model selection and multimodal support.
    """
    
    def __init__(self, session_id: str = "default", model_name: str = None):
        """
        Initialize agent with specified model.
        
        Args:
            session_id: Unique session identifier
            model_name: Display name of model (e.g., "GPT-4o-mini")
        """
        self.session_id = session_id
        self.model_name = model_name or DEFAULT_MODEL
        self.chat_history: List = []
        self.memory = NexusMemory(session_id=session_id)
        self.last_tool_used = None
        self.sources = []
        
        # Get model ID from config
        model_config = AVAILABLE_MODELS.get(self.model_name, AVAILABLE_MODELS[DEFAULT_MODEL])
        self.model_id = model_config["id"]
        self.supports_vision = model_config["supports_vision"]
        
        # Initialize LLM
        self.llm = ChatOpenAI(
            model=self.model_id,
            temperature=OPENAI_TEMPERATURE,
            openai_api_key=OPENAI_API_KEY,
            streaming=True
        )
        
        # Initialize tools
        self.tools = self._create_tools()
        
        # Create agent
        self.agent = create_react_agent(
            model=self.llm,
            tools=self.tools,
            prompt=SYSTEM_PROMPT
        )
    
    def _create_tools(self) -> List:
        """Create available tools."""
        tavily_search = TavilySearch(
            max_results=TAVILY_MAX_RESULTS,
            topic=TAVILY_TOPIC,
            tavily_api_key=TAVILY_API_KEY
        )
        return [tavily_search]
    
    def _get_memory_context(self, query: str) -> str:
        """Get relevant context from memory."""
        try:
            return self.memory.get_relevant_context(query)
        except Exception as e:
            print(f"Memory error: {e}")
            return ""
    
    def _encode_image(self, image_bytes: bytes) -> str:
        """Encode image to base64."""
        return base64.b64encode(image_bytes).decode("utf-8")
    
    def change_model(self, model_name: str):
        """Switch to a different model."""
        if model_name in AVAILABLE_MODELS:
            self.model_name = model_name
            model_config = AVAILABLE_MODELS[model_name]
            self.model_id = model_config["id"]
            self.supports_vision = model_config["supports_vision"]
            
            # Reinitialize LLM with new model
            self.llm = ChatOpenAI(
                model=self.model_id,
                temperature=OPENAI_TEMPERATURE,
                openai_api_key=OPENAI_API_KEY,
                streaming=True
            )
            
            # Recreate agent
            self.agent = create_react_agent(
                model=self.llm,
                tools=self.tools,
                prompt=SYSTEM_PROMPT
            )
    
    def chat(self, user_message: str, image_bytes: Optional[bytes] = None) -> str:
        """
        Send a message and get response.
        
        Args:
            user_message: User's text input
            image_bytes: Optional image data
            
        Returns:
            AI response string
        """
        try:
            self.last_tool_used = None
            self.sources = []
            
            # Get memory context
            memory_context = self._get_memory_context(user_message)
            
            # Prepare input
            if memory_context:
                enhanced_input = f"{memory_context}\n\nCurrent query: {user_message}"
            else:
                enhanced_input = user_message
            
            # Handle image if provided and model supports vision
            if image_bytes and self.supports_vision:
                image_b64 = self._encode_image(image_bytes)
                content = [
                    {"type": "text", "text": enhanced_input},
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_b64}"}}
                ]
                messages = self.chat_history + [HumanMessage(content=content)]
            else:
                messages = self.chat_history + [HumanMessage(content=enhanced_input)]
            
            # Invoke agent
            response = self.agent.invoke({"messages": messages})
            
            # Extract response
            ai_response = ""
            if "messages" in response:
                for msg in reversed(response["messages"]):
                    if isinstance(msg, AIMessage) and msg.content:
                        ai_response = msg.content
                        break
                    if hasattr(msg, 'tool_calls') and msg.tool_calls:
                        self.last_tool_used = "web_search"
            
            if not ai_response:
                ai_response = "I couldn't generate a response. Please try again."
            
            # Update history
            self.chat_history.append(HumanMessage(content=user_message))
            self.chat_history.append(AIMessage(content=ai_response))
            
            # Store in memory
            self.memory.add_message("user", user_message)
            self.memory.add_message("assistant", ai_response)
            
            return ai_response
            
        except Exception as e:
            return f"Error: {str(e)}"
    
    def chat_stream(
        self, 
        user_message: str, 
        image_bytes: Optional[bytes] = None,
        on_tool_start: Optional[Callable] = None,
        on_tool_end: Optional[Callable] = None
    ) -> Generator[str, None, None]:
        """
        Stream response word by word.
        
        Args:
            user_message: User's text input
            image_bytes: Optional image data
            on_tool_start: Callback when tool starts
            on_tool_end: Callback when tool ends
            
        Yields:
            Response chunks
        """
        try:
            self.last_tool_used = None
            self.sources = []
            
            # Get memory context
            memory_context = self._get_memory_context(user_message)
            
            # Prepare input
            if memory_context:
                enhanced_input = f"{memory_context}\n\nCurrent query: {user_message}"
            else:
                enhanced_input = user_message
            
            # Handle image
            if image_bytes and self.supports_vision:
                image_b64 = self._encode_image(image_bytes)
                content = [
                    {"type": "text", "text": enhanced_input},
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_b64}"}}
                ]
                messages = self.chat_history + [HumanMessage(content=content)]
            else:
                messages = self.chat_history + [HumanMessage(content=enhanced_input)]
            
            full_response = ""
            
            # Stream response
            for chunk in self.agent.stream({"messages": messages}):
                # Check for tool usage
                if "agent" in chunk:
                    for msg in chunk["agent"].get("messages", []):
                        if hasattr(msg, 'tool_calls') and msg.tool_calls:
                            self.last_tool_used = "web_search"
                            if on_tool_start:
                                on_tool_start("Searching the web...")
                
                # Check for tool response
                if "tools" in chunk:
                    if on_tool_end:
                        on_tool_end()
                
                # Extract content
                if "agent" in chunk:
                    for msg in chunk["agent"].get("messages", []):
                        if isinstance(msg, AIMessage) and msg.content:
                            content = msg.content
                            full_response += content
                            # Yield word by word
                            words = content.split(' ')
                            for i, word in enumerate(words):
                                if i < len(words) - 1:
                                    yield word + ' '
                                else:
                                    yield word
            
            # Update history
            self.chat_history.append(HumanMessage(content=user_message))
            self.chat_history.append(AIMessage(content=full_response))
            
            # Store in memory
            self.memory.add_message("user", user_message)
            self.memory.add_message("assistant", full_response)
            
        except Exception as e:
            yield f"Error: {str(e)}"
    
    def was_search_used(self) -> bool:
        """Check if web search was used."""
        return self.last_tool_used == "web_search"
    
    def clear_history(self):
        """Clear conversation history."""
        self.chat_history = []
        self.memory.clear_session()
    
    def get_history(self) -> List[dict]:
        """Get formatted history."""
        history = []
        for msg in self.chat_history:
            if isinstance(msg, HumanMessage):
                history.append({"role": "user", "content": msg.content})
            elif isinstance(msg, AIMessage):
                history.append({"role": "assistant", "content": msg.content})
        return history


def create_agent(session_id: str = "default", model_name: str = None) -> NexusAgent:
    """Factory function to create agent."""
    return NexusAgent(session_id=session_id, model_name=model_name)
