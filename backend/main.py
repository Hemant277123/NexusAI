"""
NexusAI FastAPI Backend
========================

REST API for the NexusAI agent with:
- Chat endpoint with streaming
- Model selection
- Image upload support
- Chat history management
"""

from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List, Dict
import uuid
import json
import asyncio
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import (
    AVAILABLE_MODELS,
    DEFAULT_MODEL,
    CREATOR_NAME,
    GITHUB_URL,
    LINKEDIN_URL,
    PROJECT_DESCRIPTION,
    PROJECT_FEATURES,
    TECH_STACK,
    CREATOR_SKILLS,
    validate_config
)
from agent import create_agent, NexusAgent

app = FastAPI(title="NexusAI API", version="1.0.0")

# CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for sessions and chats
sessions: Dict[str, NexusAgent] = {}
chats: Dict[str, Dict] = {}

# =============================================================================
# MODELS
# =============================================================================

class ChatRequest(BaseModel):
    message: str
    session_id: str
    model: str = DEFAULT_MODEL
    chat_id: Optional[str] = None

class ChatMessage(BaseModel):
    role: str
    content: str
    timestamp: str

class Chat(BaseModel):
    id: str
    title: str
    messages: List[ChatMessage]
    starred: bool
    created: str
    model: str

# =============================================================================
# ENDPOINTS
# =============================================================================

@app.get("/")
async def root():
    return {"status": "ok", "service": "NexusAI API"}

@app.get("/api/config")
async def get_config():
    """Get app configuration."""
    try:
        validate_config()
        return {
            "valid": True,
            "models": AVAILABLE_MODELS,
            "default_model": DEFAULT_MODEL,
            "creator": {
                "name": CREATOR_NAME,
                "github": GITHUB_URL,
                "linkedin": LINKEDIN_URL,
                "skills": CREATOR_SKILLS
            },
            "project": {
                "description": PROJECT_DESCRIPTION,
                "features": PROJECT_FEATURES,
                "tech_stack": TECH_STACK
            }
        }
    except Exception as e:
        return {"valid": False, "error": str(e)}

@app.post("/api/chat")
async def chat(request: ChatRequest):
    """Send a message and get a response."""
    try:
        # Get or create session
        if request.session_id not in sessions:
            sessions[request.session_id] = create_agent(
                session_id=request.session_id,
                model_name=request.model
            )
        
        agent = sessions[request.session_id]
        
        # Change model if different
        if agent.model_name != request.model:
            agent.change_model(request.model)
        
        # Get response
        response = agent.chat(request.message)
        
        return {
            "success": True,
            "response": response,
            "search_used": agent.was_search_used()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/chat/stream")
async def chat_stream(request: ChatRequest):
    """Stream a chat response."""
    try:
        # Get or create session
        if request.session_id not in sessions:
            sessions[request.session_id] = create_agent(
                session_id=request.session_id,
                model_name=request.model
            )
        
        agent = sessions[request.session_id]
        
        if agent.model_name != request.model:
            agent.change_model(request.model)
        
        async def generate():
            try:
                for chunk in agent.chat_stream(request.message):
                    yield f"data: {json.dumps({'chunk': chunk})}\n\n"
                    await asyncio.sleep(0.01)
                yield f"data: {json.dumps({'done': True, 'search_used': agent.was_search_used()})}\n\n"
            except Exception as e:
                yield f"data: {json.dumps({'error': str(e)})}\n\n"
        
        return StreamingResponse(
            generate(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/chat/image")
async def chat_with_image(
    message: str = Form(...),
    session_id: str = Form(...),
    model: str = Form(DEFAULT_MODEL),
    image: UploadFile = File(...)
):
    """Send a message with an image."""
    try:
        if session_id not in sessions:
            sessions[session_id] = create_agent(
                session_id=session_id,
                model_name=model
            )
        
        agent = sessions[session_id]
        
        if agent.model_name != model:
            agent.change_model(model)
        
        image_bytes = await image.read()
        response = agent.chat(message, image_bytes=image_bytes)
        
        return {
            "success": True,
            "response": response,
            "search_used": agent.was_search_used()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/chats")
async def get_chats(session_id: str):
    """Get all chats for a session."""
    session_chats = {k: v for k, v in chats.items() if v.get("session_id") == session_id}
    return {"chats": list(session_chats.values())}

@app.post("/api/chats")
async def create_chat(session_id: str = Form(...), title: str = Form("New Chat")):
    """Create a new chat."""
    from datetime import datetime
    
    chat_id = str(uuid.uuid4())[:8]
    chats[chat_id] = {
        "id": chat_id,
        "session_id": session_id,
        "title": title,
        "messages": [],
        "starred": False,
        "created": datetime.now().isoformat(),
        "model": DEFAULT_MODEL
    }
    return chats[chat_id]

@app.put("/api/chats/{chat_id}")
async def update_chat(chat_id: str, title: Optional[str] = None, starred: Optional[bool] = None):
    """Update chat metadata."""
    if chat_id not in chats:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    if title is not None:
        chats[chat_id]["title"] = title
    if starred is not None:
        chats[chat_id]["starred"] = starred
    
    return chats[chat_id]

@app.delete("/api/chats/{chat_id}")
async def delete_chat(chat_id: str):
    """Delete a chat."""
    if chat_id not in chats:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    del chats[chat_id]
    return {"success": True}

@app.post("/api/session/clear")
async def clear_session(session_id: str):
    """Clear a session's agent memory."""
    if session_id in sessions:
        sessions[session_id].clear_history()
    return {"success": True}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
