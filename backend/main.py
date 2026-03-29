import os
import logging
from typing import Optional, List, Dict, Any
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import json

# Load .env from PROJECT ROOT (one level up from backend/)
_env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
load_dotenv(dotenv_path=_env_path, override=True)

from langchain_groq import ChatGroq
from langchain_ollama import ChatOllama
from langchain_core.messages import HumanMessage, SystemMessage

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ── Routing ───────────────────────────────────────────────────────────────────
AUDITOR_KW = ["tax", "math", "calculate", "loan", "emi", "interest", "investment", "budget", "salary"]
SHIELD_KW  = ["scam", "link", "upi", "safe", "phishing", "fraud", "hack", "suspicious"]

def route(text: str, force: Optional[str]) -> str:
    if force in ["auditor", "shield", "mitra", "groq"]: return force
    t = text.lower()
    if any(k in t for k in AUDITOR_KW): return "auditor"
    if any(k in t for k in SHIELD_KW):  return "shield"
    return "mitra"

# ── System Prompts ────────────────────────────────────────────────────────────
PROMPTS = {
    "auditor": (
        "You are a professional Financial Auditor. "
        "Always respond in clear, fluent ENGLISH. "
        "Only switch to Hindi or Hinglish if the user EXPLICITLY asks you to speak Hindi. "
        "Give expert financial and mathematical answers. Be detailed but concise. "
        "Do NOT include any URLs, links, or source citations inside your response text — "
        "sources are handled separately and will be shown in the Evidence panel."
    ),
    "shield": (
        "You are an expert Cyber-Security Specialist. "
        "Always respond in clear, fluent ENGLISH. "
        "Only switch to Hindi or Hinglish if the user EXPLICITLY asks you to speak Hindi. "
        "Analyze risks, scam patterns, and phishing threats thoroughly. "
        "Do NOT include any URLs, links, or source citations inside your response text — "
        "sources are handled separately and will be shown in the Evidence panel."
    ),
    "mitra": (
        "You are Mitra, a friendly and expert Financial Consultant. "
        "Always respond in clear, fluent ENGLISH. "
        "Only switch to Hindi or Hinglish if the user EXPLICITLY uses Hindi or asks you to speak Hindi. "
        "Provide accurate, helpful financial guidance. "
        "Do NOT include any URLs, links, or source citations inside your response text — "
        "sources are handled separately and will be shown in the Evidence panel."
    ),
}

# ── Tavily Deep Search ────────────────────────────────────────────────────────
def run_tavily_deep_search(query: str) -> Dict[str, Any]:
    """
    Runs a Tavily advanced search and returns:
      - context: formatted text to inject into the LLM prompt
      - sources: list of {title, url} for frontend display
    Only called when mode is Online + Deep Research.
    """
    tavily_key = os.getenv("TAVILY_API_KEY")
    if not tavily_key:
        logger.warning("TAVILY_API_KEY not found – deep search skipped.")
        return {"context": "", "sources": []}

    try:
        from tavily import TavilyClient
        client = TavilyClient(api_key=tavily_key)
        response = client.search(
            query=query,
            search_depth="advanced",
            include_answer=True,
            max_results=5,
        )
        results = response.get("results", [])
        answer  = response.get("answer", "")

        # Build context block to inject into LLM
        context_lines = []
        if answer:
            context_lines.append(f"[Web Summary]: {answer}")
        for r in results:
            title   = r.get("title", "")
            url     = r.get("url", "")
            snippet = r.get("content", "")[:300]
            context_lines.append(f"\n[Source: {title}]\nURL: {url}\n{snippet}")

        sources = [{"title": r.get("title", r.get("url", "")), "url": r.get("url", "")} for r in results if r.get("url")]
        return {"context": "\n".join(context_lines), "sources": sources}

    except Exception as e:
        logger.error(f"Tavily search failed: {e}")
        return {"context": f"[Web search failed: {e}]", "sources": []}


# ── FastAPI ──────────────────────────────────────────────────────────────────
class ChatRequest(BaseModel):
    message: str
    user_id: Optional[str] = "default_user"
    is_local_only: Optional[bool] = False
    deep_research: Optional[bool] = False
    agent: Optional[str] = None

app = FastAPI(title="ArthMitra API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/chat/stream")
async def streaming_chat(request: ChatRequest):
    message       = request.message
    is_local_only = request.is_local_only
    deep_research = request.deep_research and not is_local_only  # Deep only in Online mode
    agent_name    = route(message, request.agent)

    logger.info(f"► MODE={'OFFLINE (Ollama)' if is_local_only else 'ONLINE (Groq)'} | DEEP={deep_research} | AGENT={agent_name} | MSG={message[:60]}")

    # ── Pick model ───────────────────────────────────────────────────────────
    if is_local_only:
        model_display = "Qwen 3 (4B)" if agent_name in ["auditor", "shield"] else "Llama 3.2 (3B)"
        llm_model_id  = "qwen3:4b"    if agent_name in ["auditor", "shield"] else "llama3.2:3b"
        llm = ChatOllama(model=llm_model_id, temperature=0.4)
    else:
        model_display = "Llama 3.1 8B"
        groq_key = os.getenv("GROQ_API_KEY")
        if not groq_key:
            async def key_err():
                yield f"data: {json.dumps({'token': 'ERROR: GROQ_API_KEY missing from .env'})}\n\n"
                yield "data: [DONE]\n\n"
            return StreamingResponse(key_err(), media_type="text/event-stream", headers={"Cache-Control": "no-cache"})
        llm = ChatGroq(api_key=groq_key, model="llama-3.1-8b-instant", temperature=0.4, streaming=True)

    async def generate():
        try:
            web_context = ""
            sources: List[Dict] = []

            # ── Step 1: Tavily Deep Research (Online + Deep only) ─────────────
            if deep_research:
                logger.info(f"► Running Tavily deep search for: {message[:60]}")
                result = run_tavily_deep_search(message)
                web_context = result["context"]
                sources     = result["sources"]

                if sources:
                    # Send sources metadata event BEFORE streaming begins
                    yield f"data: {json.dumps({'sources': sources})}\n\n"

            # ── Step 2: Build LLM messages ────────────────────────────────────
            system_content = PROMPTS.get(agent_name, PROMPTS["mitra"])
            if web_context:
                system_content += f"\n\nWEB RESEARCH CONTEXT (use this to answer):\n{web_context}"

            messages = [SystemMessage(content=system_content), HumanMessage(content=message)]

            # ── Step 3: Stream tokens ─────────────────────────────────────────
            async for chunk in llm.astream(messages):
                token = chunk.content
                if token:
                    yield f"data: {json.dumps({'token': token, 'model': model_display})}\n\n"

            yield "data: [DONE]\n\n"

        except Exception as e:
            logger.error(f"Stream error: {e}")
            yield f"data: {json.dumps({'token': f' [Error: {str(e)}]'})}\n\n"
            yield "data: [DONE]\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@app.get("/")
async def root():
    return {
        "status": "online",
        "groq_key": bool(os.getenv("GROQ_API_KEY")),
        "tavily_key": bool(os.getenv("TAVILY_API_KEY")),
        "service": "ArthMitra v2.3",
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)