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
from app.shield_ml import check_or_train

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load .env - check both current and parent directory
load_dotenv()
if not os.getenv("GROQ_API_KEY"):
    parent_env = os.path.join(os.path.dirname(__file__), "..", ".env")
    if os.path.exists(parent_env):
        load_dotenv(parent_env)

# Startup health check
def perform_startup_checks():
    """Perform startup health checks for Ollama and model files."""
    import requests

    logger.info("=" * 60)
    logger.info("STARTUP HEALTH CHECK")
    logger.info("=" * 60)

    # 1. Check Groq Connectivity
    groq_key = os.getenv("GROQ_API_KEY")
    if groq_key:
        masked_key = f"{groq_key[:4]}...{groq_key[-4:]}"
        logger.info(f"[OK] Groq API Key found: {masked_key}")
    else:
        logger.warning("[MISSING] GROQ_API_KEY not found in .env. Cloud agents will fail.")

    # 2. Check model files
    models_dir = os.path.join(os.path.dirname(__file__), "app", "shield_ml", "models")
    required_pkl_files = ["text_model.pkl", "text_vectorizer.pkl", "numeric_model.pkl"]

    for pkl_file in required_pkl_files:
        pkl_path = os.path.join(models_dir, pkl_file)
        if os.path.exists(pkl_path):
            logger.info(f"[OK] Model file exists: {pkl_file}")
        else:
            logger.warning(f"[MISSING] Model file not found: {pkl_file}. Run train_text_model.py and train_numeric_model.py")

    logger.info("=" * 60)

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
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "https://*.vercel.app",    # Vercel preview & production deployments
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",  # catch all Vercel subdomains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Accel-Buffering", "Cache-Control"],
)

# Register API routers
app.include_router(shield_router)
app.include_router(brain_router)
app.include_router(planner_router)


@app.on_event("startup")
async def startup_event():
    """Run startup health checks and ensure ML models are trained."""
    # Check and train models if needed
    try:
        check_or_train()
    except Exception as e:
        logger.warning(f"[Shield ML] Model check/train failed: {e}")

    # Run other health checks
    perform_startup_checks()


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
                "model": "llama-3.3-70b-versatile",
                "provider": "groq (cloud)",
                "best_for": "Math, calculations, reasoning, EMI, tax",
                "keywords": ["tax", "audit", "math", "spend", "loan", "emi", "calculate"]
            },
            {
                "name": "shield",
                "model": "llama-3.1-8b-instant",
                "provider": "groq (cloud)",
                "best_for": "Security analysis, fraud detection, UPI verification",
                "keywords": ["scam", "link", "verify", "upi", "safe", "url", "phishing"]
            },
            {
                "name": "mitra",
                "model": "llama-3.1-8b-instant",
                "provider": "groq (cloud)",
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

    Streaming response provides tokens as they are generated using LangGraph's astream().
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
            # Use LangGraph's astream for true streaming
            async for event in arthmitra_app.astream(initial_state, stream_mode="messages"):
                if isinstance(event, tuple) and len(event) == 2:
                    msg, metadata = event
                    if isinstance(msg, AIMessage) and msg.content:
                        token: str = msg.content
                        yield f"data: {json.dumps({'token': token})}\n\n"

            # Sentinel — frontend stops reading on this
            yield "data: [DONE]\n\n"

        except Exception as e:
            logger.error(f"Chat error: {str(e)}", exc_info=True)
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
            yield "data: [DONE]\n\n"

    sse_headers = {
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",
        "Content-Type": "text/event-stream",
    }
    return StreamingResponse(
        stream_generator(),
        media_type="text/event-stream",
        headers=sse_headers,
    )


# Alias: /chat/stream → same handler as /api/chat (used by Next.js frontend)
@app.post("/chat/stream")
async def chat_stream_alias(request: ChatRequest):
    """Alias for /api/chat — canonical SSE streaming endpoint."""
    return await chat_endpoint(request)


@app.post("/api/chat/static")
async def chat_static_endpoint(request: ChatRequest):
    """
    Non-streaming version of the chat endpoint for easier testing in Swagger UI.
    Waits for the full response and returns it as JSON.
    """
    message = request.message
    is_local_only = request.is_local_only
    user_id = request.user_id
    agent = request.agent

    logger.info(f"Static chat request from user: {user_id}, message: {message[:50]}...")

    if not message or not message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    initial_state = {
        "messages": [HumanMessage(content=message)],
        "is_local_only": is_local_only,
        "user_id": user_id,
        "current_risk_score": 0.0,
        "force_agent": agent
    }

    try:
        # Use ainvoke for non-streaming execution
        result = await arthmitra_app.ainvoke(initial_state)
        
        # Get the last message from the list
        final_message = result['messages'][-1].content
        
        return {
            "answer": final_message,
            "user_id": user_id,
            "status": "success"
        }

    except Exception as e:
        logger.error(f"Static chat error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


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