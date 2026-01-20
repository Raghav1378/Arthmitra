import os
import time
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, RedirectResponse
from pydantic import BaseModel
from typing import Optional
from app.router import arthmitra_app
from langchain_core.messages import HumanMessage
import json
import asyncio

# Import Shield ML API router
from app.shield_api import shield_router
from app.brain.routes import brain_router

load_dotenv()

# Pydantic model for chat request - enables Swagger UI input field
class ChatRequest(BaseModel):
    message: str
    user_id: Optional[str] = "default_user"
    is_local_only: Optional[bool] = False
    agent: Optional[str] = None  # Optional: "auditor", "shield", "mitra", or "groq"

app = FastAPI(title="ArthMitra API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Shield ML API router
app.include_router(shield_router)
app.include_router(brain_router)

@app.get("/")
async def root():
    return RedirectResponse(url="/docs")

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "ArthMitra Backend"}

@app.get("/api/agents")
async def list_agents():
    """List all available agents and their models"""
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
    message = request.message
    is_local_only = request.is_local_only
    user_id = request.user_id
    agent = request.agent  # Can be "auditor", "shield", "mitra", "groq", or None (auto-route)

    print(f"Received message: {message} from user: {user_id}, agent: {agent}")
    initial_state = {
        "messages": [HumanMessage(content=message)],
        "is_local_only": is_local_only,
        "user_id": user_id,
        "current_risk_score": 0.0,
        "force_agent": agent  # Pass the explicit agent choice to the router
    }

    try:
        # Use invoke instead of astream for a complete, non-chunked response
        start_time = time.time()
        result = await arthmitra_app.ainvoke(initial_state)
        end_time = time.time()
        
        # Extract the final response content
        messages = result.get('messages', [])
        final_message = messages[-1] if messages else None
        response_content = final_message.content if final_message else "No response generated."
        
        # Identify which agent was used (heuristic based on router logic)
        # Note: In invoke mode, we don't get granular node updates easily without tracing
        # We can infer it from the router/supervisor logic or just say "completed"
        
        return {
            "response": response_content,
            "duration_seconds": round(end_time - start_time, 2),
            "status": "success"
        }

    except Exception as e:
        print(f"Error in chat_endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
