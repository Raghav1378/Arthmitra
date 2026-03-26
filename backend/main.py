import os
import time
import logging
from typing import Optional
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, RedirectResponse, JSONResponse
from pydantic import BaseModel
from fastapi.encoders import jsonable_encoder

from app.router import arthmitra_app
from langchain_core.messages import HumanMessage, AIMessage
import json
import asyncio

# Import Shield ML API router
from app.shield_api import shield_router
from app.brain.routes import brain_router
from app.planner_endpoints import planner_router

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

# Pydantic model for chat request - enables Swagger UI input field
class ChatRequest(BaseModel):
    message: str
    user_id: Optional[str] = "default_user"
    is_local_only: Optional[bool] = False
    agent: Optional[str] = None  # Optional: "auditor", "shield", "mitra", or "groq"

app = FastAPI(
    title="ArthMitra API",
    description="AI Financial Guardian - Secure, Smart, and Scalable Financial Orchestrator",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify actual origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routers
app.include_router(shield_router)
app.include_router(brain_router)
app.include_router(planner_router)


@app.get("/")
async def root():
    """Redirect to API documentation."""
    return RedirectResponse(url="/docs")


@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring."""
    return {
        "status": "healthy",
        "service": "ArthMitra Backend",
        "timestamp": time.time()
    }


@app.get("/api/agents")
async def list_agents():
    """List all available agents and their models."""
    return {
        "agents": [
            {
                "name": "auditor",
                "model": "deepseek-r1:7b",
                "provider": "ollama (local)",
                "best_for": "Math, calculations, reasoning, EMI, tax",
                "keywords": ["tax", "audit", "math", "spend", "loan", "emi", "calculate"]
            },
            {
                "name": "shield",
                "model": "qwen2.5-coder:7b",
                "provider": "ollama (local)",
                "best_for": "Security analysis, fraud detection, UPI verification",
                "keywords": ["scam", "link", "verify", "upi", "safe", "url", "phishing"]
            },
            {
                "name": "mitra",
                "model": "gemma3:latest",
                "provider": "ollama (local)",
                "best_for": "General chat, financial advice, explanations",
                "keywords": ["(default - any other message)"]
            },
            {
                "name": "groq",
                "model": "llama-3.1-8b-instant",
                "provider": "groq (cloud - FAST!)",
                "best_for": "Quick responses, general questions",
                "keywords": ["fast", "quick", "groq", "instant"]
            }
        ],
        "usage": {
            "auto_routing": "Just ask naturally - keywords trigger the right agent",
            "explicit": "Pass 'agent' parameter with name: auditor, shield, mitra, or groq"
        }
    }


@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest):
    """
    Main chat endpoint that routes to appropriate agents based on intent.

    Streaming response provides tokens as they are generated.
    """
    message = request.message
    is_local_only = request.is_local_only
    user_id = request.user_id
    agent = request.agent

    logger.info(f"Chat request from user: {user_id}, agent: {agent}, message: {message[:50]}...")

    if not message or not message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    initial_state = {
        "messages": [HumanMessage(content=message)],
        "is_local_only": is_local_only,
        "user_id": user_id,
        "current_risk_score": 0.0,
        "force_agent": agent
    }

    async def stream_generator():
        try:
            # Generate response using LangGraph
            result = await arthmitra_app.ainvoke(initial_state)
            messages = result.get('messages', [])

            if not messages:
                yield f"data: {json.dumps({'error': 'No response generated'})}\n\n"
                return

            final_content = ""
            for msg in messages:
                if isinstance(msg, AIMessage):
                    final_content += msg.content

            if not final_content:
                yield f"data: {json.dumps({'error': 'Empty response from agent'})}\n\n"
                return

            # Stream content in chunks for typing effect
            chunk_size = 15
            for i in range(0, len(final_content), chunk_size):
                chunk = final_content[i:i+chunk_size]
                yield f"data: {json.dumps({'content': chunk, 'done': False})}\n\n"
                await asyncio.sleep(0.015)  # Typing effect delay

            # Send completion signal
            yield f"data: {json.dumps({'content': '', 'done': True})}\n\n"

        except Exception as e:
            logger.error(f"Chat error: {str(e)}", exc_info=True)
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(stream_generator(), media_type="text/event-stream")


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler for unhandled errors."""
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "message": str(exc)}
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")