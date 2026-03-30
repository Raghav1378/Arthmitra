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

from routes.documents import documents_router
from routes.chats import chats_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ── Routing ────────────────────────────────────────────────────────────────────
AUDITOR_KW = ["tax", "math", "calculate", "loan", "emi", "interest", "investment", "budget", "salary"]
SHIELD_KW  = ["scam", "link", "upi", "safe", "phishing", "fraud", "hack", "suspicious"]

def route(text: str, force: Optional[str]) -> str:
    if force in ["auditor", "shield", "mitra", "groq"]: return force
    t = text.lower()
    if any(k in t for k in AUDITOR_KW): return "auditor"
    if any(k in t for k in SHIELD_KW):  return "shield"
    return "mitra"

# ── System Prompts ─────────────────────────────────────────────────────────────
PROMPTS = {
    "auditor": (
        "You are a professional Financial Auditor. "
        "Always respond in clear, fluent ENGLISH. "
        "Only switch to Hindi or Hinglish if the user EXPLICITLY asks you to speak Hindi. "
        "Give expert financial and mathematical answers. Be highly CONCISE and strict. "
        "Do NOT include any URLs, links, or source citations inside your response text "
        "(they are handled in the Evidence panel). "
        "CRITICAL: If context is provided, answer EXACTLY what is asked based ONLY on that context without adding unrequested details."
    ),
    "shield": (
        "You are an expert Cyber-Security Specialist. "
        "Always respond in clear, fluent ENGLISH. "
        "Only switch to Hindi or Hinglish if the user EXPLICITLY asks you to speak Hindi. "
        "Analyze risks, scam patterns, and phishing threats thoroughly but CONCISELY. "
        "Do NOT include any URLs, links, or source citations inside your response text. "
        "CRITICAL: If context is provided, answer EXACTLY what is asked based ONLY on that context without adding unrequested details."
    ),
    "mitra": (
        "You are Mitra, a friendly and expert Financial Consultant. "
        "Always respond in clear, fluent ENGLISH. "
        "Only switch to Hindi or Hinglish if the user EXPLICITLY uses Hindi or asks you to speak Hindi. "
        "Provide accurate, helpful financial guidance but be very CONCISE. "
        "Do NOT include any URLs, links, or source citations inside your response text. "
        "NEW FEATURE: If the user asks for a chart, visualization, or trend (e.g., 'Plot my expenses'), you can generate an interactive chart. "
        "To generate a chart, include a JSON block in this EXACT format (only use numeric values for 'value'): "
        "[CHART:{\"type\":\"bar|line|area|pie\",\"data\":[{\"name\":\"Label\",\"value\":10},...],\"title\":\"Chart Title\"}] "
        "CRITICAL: If context is provided, answer EXACTLY what is asked based ONLY on that context without adding unrequested details. Stop when you have answered."
    ),
}

# ── Tavily Deep Search ─────────────────────────────────────────────────────────
def run_tavily_deep_search(query: str) -> Dict[str, Any]:
    tavily_key = os.getenv("TAVILY_API_KEY")
    if not tavily_key:
        logger.warning("TAVILY_API_KEY not found – deep search skipped.")
        return {"context": "", "sources": []}
    try:
        from tavily import TavilyClient
        client = TavilyClient(api_key=tavily_key)
        response = client.search(query=query, search_depth="advanced", include_answer=True, max_results=5)
        results = response.get("results", [])
        answer  = response.get("answer", "")
        context_lines = []
        if answer:
            context_lines.append(f"[Web Summary]: {answer}")
        for r in results:
            context_lines.append(f"\n[Source: {r.get('title','')}]\nURL: {r.get('url','')}\n{r.get('content','')[:300]}")
        sources = [{"title": r.get("title", r.get("url","")), "url": r.get("url","")} for r in results if r.get("url")]
        return {"context": "\n".join(context_lines), "sources": sources}
    except Exception as e:
        logger.error(f"Tavily error: {e}")
        return {"context": f"[Web search failed: {e}]", "sources": []}


# ── FastAPI App ────────────────────────────────────────────────────────────────
class ChatRequest(BaseModel):
    message: str
    user_id: Optional[str] = "default_user"
    session_id: Optional[str] = None          # for RAG context
    is_local_only: Optional[bool] = False
    deep_research: Optional[bool] = False
    agent: Optional[str] = None

app = FastAPI(title="ArthMitra API v3 — Dual-Mode RAG")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register the documents and chats routers
app.include_router(documents_router, prefix="/documents", tags=["documents"])
app.include_router(chats_router, prefix="/chats", tags=["chats"])


@app.post("/chat/stream")
async def streaming_chat(request: ChatRequest):
    message       = request.message
    is_local_only = request.is_local_only
    deep_research = request.deep_research
    session_id    = request.session_id
    agent_name    = route(message, request.agent)

    logger.info(
        f"► MODE={'OFFLINE' if is_local_only else 'ONLINE'} | DEEP={deep_research} "
        f"| AGENT={agent_name} | SESSION={session_id} | MSG={message[:60]}"
    )

    # Pick LLM
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
            extra_context = ""
            sources: List[Dict] = []
            rag_sources: List[str] = []

            # ── Step 1: Dual RAG Query ────────────────────────────────────────
            if session_id:
                from rag.retriever import query_dual_rag
                rag_result = await query_dual_rag(query=message, session_id=session_id, top_k=5)
                if rag_result["has_results"]:
                    extra_context += f"\n\n--- RELEVANT DOCUMENT CONTEXT ---\n{rag_result['formatted']}\n-----------------------------------\n\nIf the answer to the user's question is in the context above, strictly use it and be concise. Do NOT add unrequested info."
                    rag_sources = rag_result["sources"]
                    if rag_sources:
                        yield f"data: {json.dumps({'rag_sources': rag_sources})}\n\n"

            # ── Step 2: Tavily Deep Search (Online + Deep only) ───────────────
            if deep_research:
                logger.info(f"► Tavily deep search: {message[:60]}")
                tavily_result = run_tavily_deep_search(message)
                if tavily_result["context"]:
                    extra_context += f"\n\nWEB RESEARCH CONTEXT:\n{tavily_result['context']}"
                sources = tavily_result["sources"]
                if sources:
                    yield f"data: {json.dumps({'sources': sources})}\n\n"

            # ── Step 3: Build prompt + stream ─────────────────────────────────
            system_content = PROMPTS.get(agent_name, PROMPTS["mitra"])
            if extra_context:
                system_content += extra_context

            messages = [SystemMessage(content=system_content), HumanMessage(content=message)]

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
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no"},
    )


@app.get("/")
async def root():
    return {
        "status": "online",
        "groq_key": bool(os.getenv("GROQ_API_KEY")),
        "tavily_key": bool(os.getenv("TAVILY_API_KEY")),
        "service": "ArthMitra v3 — Dual-Mode RAG",
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)