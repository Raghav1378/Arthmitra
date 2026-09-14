import os
import logging
import asyncio
import io
import time
from collections import defaultdict, deque
import pandas as pd
from typing import Optional, List, Dict, Any
from datetime import datetime
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, File, UploadFile, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel, Field
import json
from uuid import uuid4
import sqlite3
from sqlalchemy import create_engine, MetaData, Table, Column, Integer, String, Float, DateTime, select, insert, delete
from databases import Database

# ── Database Config ────────────────────────────────────────────────────────────
DATABASE_URL = "sqlite:///./finance.db"
database = Database(DATABASE_URL)
metadata = MetaData()

expenses_table = Table(
    "expenses",
    metadata,
    Column("id", String, primary_key=True),
    Column("amount", Float),
    Column("category", String),
    Column("description", String),
    Column("date", String), # Storing as ISO string for simplicity
    Column("type", String),
)

scam_scans_table = Table(
    "scam_scans",
    metadata,
    Column("id", String, primary_key=True),
    Column("message_text", String),
    Column("risk", String),
    Column("risk_score", Integer),
    Column("confidence", Integer),
    Column("scam_type", String),
    Column("source", String),  # 'text' | 'image'
    Column("created_at", String),
)

engine = create_engine(DATABASE_URL)
metadata.create_all(engine)

# Load .env from backend directory, then fallback to PROJECT ROOT
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"), override=True)
_env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
if os.path.exists(_env_path):
    load_dotenv(dotenv_path=_env_path, override=True)

# Heavy LLM imports deferred to first use: langchain_groq drags in
# transformers+torch (~30s import on this machine) — don't pay at startup.
# ponytail: move to module-level if groq import latency ever matters elsewhere

from routes.documents import documents_router
from routes.chats import chats_router
from app.shield_api import shield_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ── LLM Provider Config ────────────────────────────────────────────────────────
# Default: local Ollama (free, no key). Set LLM_PROVIDER=groq + GROQ_API_KEY to switch.
LLM_PROVIDER = os.getenv("LLM_PROVIDER", "ollama").lower()
OLLAMA_CHAT_MODEL = os.getenv("OLLAMA_CHAT_MODEL", "llama3.2:3b")
OLLAMA_SMALL_MODEL = os.getenv("OLLAMA_SMALL_MODEL", "llama3.2:3b")
GROQ_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
_groq_available = bool(os.getenv("GROQ_API_KEY"))


def get_llm(provider: str = "ollama", temperature: float = 0.4, small: bool = False, streaming: bool = False):
    """Single factory for every LLM call in the app."""
    from langchain_groq import ChatGroq
    from langchain_ollama import ChatOllama
    if provider == "groq" and _groq_available:
        return ChatGroq(
            api_key=os.getenv("GROQ_API_KEY"),
            model=GROQ_MODEL,
            temperature=temperature,
            streaming=streaming,
        )
    model = OLLAMA_SMALL_MODEL if small else OLLAMA_CHAT_MODEL
    return ChatOllama(model=model, temperature=temperature)


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
def run_tavily_deep_search(query: str, search_depth: str = "advanced") -> Dict[str, Any]:
    tavily_key = os.getenv("TAVILY_API_KEY")
    if not tavily_key:
        logger.warning("TAVILY_API_KEY not found – deep search skipped.")
        return {"context": "", "sources": []}
    try:
        from tavily import TavilyClient
        client = TavilyClient(api_key=tavily_key)
        response = client.search(query=query, search_depth=search_depth, include_answer=True, max_results=5)
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
    history: Optional[List[Dict[str, str]]] = None  # [{"role": "user"|"bot", "content": "..."}]
    is_local_only: Optional[bool] = False
    deep_research: Optional[bool] = False
    live_search: Optional[bool] = False
    agent: Optional[str] = None
    provider: Optional[str] = None  # None = follow LLM_PROVIDER env default

# ── Context Management ─────────────────────────────────────────────────────────
HISTORY_TURNS = 10        # last N messages sent back to the LLM
MSG_CHAR_CAP = 2000       # per-message truncation — old walls of text don't eat the window

def build_history_messages(history: Optional[List[Dict[str, str]]]):
    """Recent turns, newest last, each capped. role 'bot' maps to AI."""
    msgs = []
    for h in (history or [])[-HISTORY_TURNS:]:
        content = (h.get("content") or "")[:MSG_CHAR_CAP]
        if not content:
            continue
        role = "assistant" if h.get("role") in ("bot", "assistant") else "user"
        msgs.append({"role": role, "content": content})
    return msgs

app = FastAPI(title="ArthMitra API v3 — Dual-Mode RAG")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Rate Limiting ───────────────────────────────────────────────────────────────
# In-memory sliding window per client IP. Zero deps.
# ponytail: per-process dict — add Redis if you ever run multiple workers.
RATE_LIMITS = {"/chat/stream": (6, 60), "/scam/": (30, 60)}   # (max requests, window secs)
DEFAULT_LIMIT = (60, 60)
_rate_hits: Dict[str, deque] = defaultdict(deque)

@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    ip = request.client.host if request.client else "unknown"
    for prefix, (limit, window) in RATE_LIMITS.items():
        if request.url.path.startswith(prefix):
            break
    else:
        limit, window = DEFAULT_LIMIT
    now = time.monotonic()
    hits = _rate_hits[ip]
    while hits and hits[0] <= now - window:
        hits.popleft()
    if len(hits) >= limit:
        return JSONResponse(status_code=429, content={"detail": "Rate limit exceeded. Slow down."})
    hits.append(now)
    return await call_next(request)

# Register the documents and chats routers
app.include_router(documents_router, prefix="/documents", tags=["documents"])
app.include_router(chats_router, prefix="/chats", tags=["chats"])
app.include_router(shield_router)  # prefix /api/shield set in shield_api.py


@app.on_event("startup")
async def startup_event():
    """Connect DB; train shield ML in background so /health answers immediately."""
    try:
        await database.connect()
    except Exception as e:
        # A locked/missing finance.db must not kill the whole app —
        # expense endpoints fail individually with clear errors instead.
        logger.error(f"Database connect failed: {e}")

    async def _init_ml():
        try:
            from app.shield_ml import check_or_train
            check_or_train()
            logger.info("Scam Shield ML models verified/trained.")
        except Exception as e:
            logger.error(f"Failed to initialize Scam Shield ML: {e}")
        # Warm heavy imports (torch/groq, ~30s on cold cache) in a worker
        # thread so the first real request doesn't pay the import cost.
        def _warm():
            try:
                import langchain_groq  # noqa: F401
                import langchain_ollama  # noqa: F401
                from rag.embedder import get_embedder
                get_embedder()
                logger.info("LLM + embedder imports warmed.")
            except Exception as e:
                logger.warning(f"Warmup skipped: {e}")
        await asyncio.to_thread(_warm)

    asyncio.get_event_loop().create_task(_init_ml())

@app.on_event("shutdown")
async def shutdown_event():
    await database.disconnect()

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "ArthMitra API + SQLite Active"}


@app.get("/config")
async def app_config():
    """Expose provider capabilities without exposing secret values."""
    return {
        "groq_available": _groq_available,
        "tavily_available": bool(os.getenv("TAVILY_API_KEY")),
        "default_provider": "groq" if _groq_available and LLM_PROVIDER == "groq" else "ollama",
        "local_model": OLLAMA_CHAT_MODEL,
        "groq_model": GROQ_MODEL,
    }


@app.post("/chat/stream")
async def streaming_chat(request: ChatRequest):
    message       = request.message
    is_local_only = request.is_local_only
    session_id    = request.session_id
    agent_name    = route(message, request.agent)
    provider      = request.provider if request.provider in ["ollama", "groq"] else LLM_PROVIDER
    if provider == "groq" and not _groq_available:
        provider = "ollama"

    logger.info(
        f"► MODE={'OFFLINE' if is_local_only else 'ONLINE'} | DEEP={request.deep_research} "
        f"| PROVIDER={provider} | AGENT={agent_name} | SESSION={session_id} | MSG={message[:60]}"
    )

    # Pick LLM — Ollama by default, Groq only if configured
    if provider == "groq":
        model_display = f"Groq {GROQ_MODEL}"
    else:
        model_display = OLLAMA_CHAT_MODEL
    llm = get_llm(provider=provider, temperature=0.4, streaming=True)

    async def generate():
        try:
            extra_context = ""
            sources: List[Dict] = []
            rag_sources: List[str] = []

            # Tavily fires only when: Live Search / Deep Research toggled on,
            # or the question looks time-sensitive. Provider never forces it.
            TIME_KW = ("current", "today", "latest", "now", "recent", "news",
                       "rate", "price", "2024", "2025", "2026")
            time_sensitive = any(k in message.lower() for k in TIME_KW)
            tavily_wanted = (not is_local_only) and os.getenv("TAVILY_API_KEY") and (
                request.deep_research or request.live_search or time_sensitive
            )
            search_depth = "advanced" if request.deep_research else "basic"

            # ── Step 1+2: RAG and Tavily in parallel ─────────────────────────
            async def run_rag():
                if not session_id:
                    return None
                from rag.retriever import query_dual_rag
                return await query_dual_rag(query=message, session_id=session_id, top_k=5)

            def run_tavily():
                if not tavily_wanted:
                    return None
                return run_tavily_deep_search(message, search_depth=search_depth)

            rag_result, tavily_result = await asyncio.gather(
                run_rag(), asyncio.to_thread(run_tavily)
            )

            if rag_result and rag_result["has_results"]:
                extra_context += f"\n\n--- RELEVANT DOCUMENT CONTEXT ---\n{rag_result['formatted']}\n-----------------------------------\n\nIf the answer to the user's question is in the context above, strictly use it and be concise. Do NOT add unrequested info."
                rag_sources = rag_result["sources"]
                if rag_sources:
                    yield f"data: {json.dumps({'rag_sources': rag_sources})}\n\n"

            if tavily_result and tavily_result["context"]:
                extra_context += f"\n\nWEB RESEARCH CONTEXT:\n{tavily_result['context']}"
                sources = tavily_result["sources"]
                if sources:
                    yield f"data: {json.dumps({'sources': sources})}\n\n"

            # ── Step 3: Build prompt + stream ─────────────────────────────────
            system_content = PROMPTS.get(agent_name, PROMPTS["mitra"])
            if extra_context:
                system_content += extra_context

            from langchain_core.messages import HumanMessage, SystemMessage
            messages = [SystemMessage(content=system_content)]
            messages.extend(build_history_messages(request.history))
            messages.append(HumanMessage(content=message))

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


# ── Scam Shield Endpoint ───────────────────────────────────────────────────────

class ScamAnalyzeRequest(BaseModel):
    message_text: str = Field(..., min_length=1, max_length=5000)
    time_of_message: Optional[str] = None
    message_frequency: Optional[str] = None

@app.post("/scam/analyze")
async def scam_analyze(request: ScamAnalyzeRequest):
    """
    Scam Shield — three-stage hybrid fraud analysis:
    Stage 1 deterministic rules + ML + URL/UPI evidence,
    Stage 2 Groq semantic analysis (gpt-oss-20b, non-fatal),
    Stage 3 deterministic policy engine (final authority).
    Groq failure degrades to Stage 1 + Stage 3 with identical response shape.
    """
    from app.scam_engine import analyze_message_hybrid
    result = await analyze_message_hybrid(
        request.message_text,
        time_of_message=request.time_of_message,
        message_frequency=request.message_frequency,
    )
    await _record_scan(request.message_text, result, "text")
    return result


async def _record_scan(text: str, result: dict, source: str):
    """Persist a scan for the history dashboard. Never fails the request."""
    try:
        fd = result["final_decision"]
        await database.execute(insert(scam_scans_table).values(
            id=uuid4().hex,
            message_text=text[:500],
            risk=fd["risk"],
            risk_score=fd["risk_score"],
            confidence=fd["confidence"],
            scam_type=fd.get("scam_type", "unknown"),
            source=source,
            created_at=datetime.now().isoformat(),
        ))
    except Exception as e:
        logger.warning(f"scan history write failed: {e}")


@app.get("/scam/history")
async def scam_history(limit: int = 50):
    """Recent scans + aggregate stats for the dashboard."""
    rows = await database.fetch_all(
        select(scam_scans_table).order_by(scam_scans_table.c.created_at.desc()).limit(min(limit, 200))
    )
    rows = [dict(r) for r in rows]
    # Stats over ALL scans, not just the page
    all_rows = await database.fetch_all(
        select(scam_scans_table.c.risk, scam_scans_table.c.scam_type)
    )
    counts: Dict[str, int] = defaultdict(int)
    types: Dict[str, int] = defaultdict(int)
    for r in all_rows:
        counts[r["risk"]] += 1
        types[r["scam_type"] or "unknown"] += 1
    return {
        "scans": rows,
        "stats": {
            "total": len(all_rows),
            "by_risk": dict(counts),
            "top_scam_types": sorted(types.items(), key=lambda kv: -kv[1])[:5],
        },
    }


@app.delete("/scam/history")
async def clear_scam_history():
    await database.execute(delete(scam_scans_table))
    return {"status": "all_deleted"}


@app.post("/scam/scan_image")
async def scam_scan_image(file: UploadFile = File(...)):
    """
    Screenshot scan: OCR the image, then run the same three-stage pipeline.
    """
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Image too large (max 10 MB).")

    text = None
    try:
        import pytesseract
        from PIL import Image
        import io as _io
        import shutil as _shutil
        # Windows default install path fallback — PATH lags after fresh install
        if not _shutil.which("tesseract"):
            _tess = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
            if not os.path.exists(_tess):
                raise RuntimeError("tesseract is not installed")
            pytesseract.pytesseract.tesseract_cmd = _tess
        text = pytesseract.image_to_string(Image.open(_io.BytesIO(content))).strip()
    except Exception as e:
        msg = str(e)
        if "tesseract is not installed" in msg.lower() or "tesseract" in msg.lower():
            raise HTTPException(
                status_code=503,
                detail="OCR engine not installed on server. Install Tesseract OCR (UB-Mannheim build) and restart.",
            )
        raise HTTPException(status_code=400, detail="Could not read image.")

    if not text:
        raise HTTPException(status_code=400, detail="No readable text found in image.")

    from app.scam_engine import analyze_message_hybrid
    result = await analyze_message_hybrid(text)
    await _record_scan(text, result, "image")
    result["ocr_text"] = text
    return result

# ── Decision Shield Endpoint ───────────────────────────────────────────────────────

class DecisionAnalyzeRequest(BaseModel):
    input_value: str

@app.post("/scam/decision")
async def scam_decision(request: DecisionAnalyzeRequest):
    """
    Mitra AI — Payment Decision Engine (deterministic rules).
    """
    from app.scam_engine import analyze_decision
    return analyze_decision(request.input_value)

# ── Expense Insights Endpoint ───────────────────────────────────────────────────────

class ExpenseItem(BaseModel):
    id: Optional[str] = None
    category: str
    amount: float
    description: str
    date: Optional[str] = None
    type: Optional[str] = 'spend'

class ExpenseInsightsRequest(BaseModel):
    expenses: List[ExpenseItem]

@app.post("/expense/insights")
async def get_expense_insights(request: ExpenseInsightsRequest):
    """
    Generate deep financial strategy insights using Ollama (Llama 3.2).
    Acts as an 'ArthMitra Wealth Strategist'.
    """
    try:
        if not request.expenses:
            return {"insight": "Awaiting resource audit. Load transactions to begin your wealth strategy analysis."}

        # Analyze flow logic
        inflow = sum(e.amount for e in request.expenses if e.amount > 0)
        outflow = sum(abs(e.amount) for e in request.expenses if e.amount < 0)
        
        summary = {}
        for exp in request.expenses:
            summary[exp.category] = summary.get(exp.category, 0) + abs(exp.amount)

        summary_text = "\n".join([f"- {cat}: ₹{amt}" for cat, amt in summary.items()])
        
        prompt = (
            f"AUDIT COMMAND: You are the ArthMitra Wealth Strategist (Precision Analytics v4.5).\n"
            f"DATA INPUT: {summary_text}\n"
            f"SESSION TOTALS: Inflow: ₹{inflow}, Outflow: ₹{outflow}\n\n"
            f"TASK: Provide a high-precision financial audit.\n"
            f"1. LIQUIDITY GRADE: (A+ to F) based on Inflow vs Outflow.\n"
            f"2. WASTE DETECTION: Identify heaviest category and give 1 data-driven tactic to cut it.\n"
            f"3. STRATEGIC RECALCULATION: 1 actionable tip based on current net flow of {inflow - outflow}.\n"
            f"TONE: Efficient, Expert, Professional Auditor. No fluff. MAX 50 words."
        )

        from langchain_core.messages import HumanMessage, SystemMessage
        llm = get_llm(temperature=0.6)
        response = await llm.ainvoke([
            SystemMessage(content="You are ArthMitra Wealth Strategist. Provide audit-grade financial advice based on data."),
            HumanMessage(content=prompt)
        ])

        return {"insight": response.content.strip()}
    except Exception as e:
        logger.error(f"Expense insights error: {e}")
        return {"insight": "Auditing liquidity patterns... Maintain current flow until the next trace sync."}



# ── Fraud-Aware Expense Analyzer ───────────────────────────────────────────────────

SCAM_EXPENSE_SYSTEM_PROMPT = """You are "Fraud-Aware Expense Analyzer", an advanced AI system that combines personal finance tracking with fraud detection.

Your job is to analyze a user expense and determine:
1. Financial category
2. Risk level (SAFE / SUSPICIOUS / HIGH_RISK)
3. Confidence score
4. Behavioral and scam signals
5. Helpful user advice

---
STEP 1: EXTRACT CONTEXT
Identify:
- amount (₹ value)
- category (food, rent, fuel, shopping, transfer, etc.)
- payment type (UPI / cash / unknown)

---
STEP 2: APPLY FRAUD DETECTION LOGIC
A. AMOUNT ANALYSIS:
- ₹1–₹10 -> VERY HIGH scam signal (verification scams)
- ₹11–₹999 -> LOW anomaly
- ₹1000–₹10000 -> NORMAL
- ₹10000+ -> context dependent

B. TIME ANALYSIS:
- 12 AM – 6 AM -> suspicious timing
- otherwise normal

C. FREQUENCY:
- 1–3 -> weak
- 4–10 -> moderate
- 10+ -> strong anomaly

D. CONTEXTUAL SIGNALS:
- mentions of UPI / request / verify -> suspicious
- unknown receiver -> suspicious
- food / normal purchase -> safe

---
STEP 3: RISK DECISION
HIGH_RISK:
- ₹1–₹10 + UPI context OR late night OR repetition
- strong anomaly patterns

SUSPICIOUS:
- any anomaly present (time OR repetition OR unclear receiver)
- medium risk patterns

SAFE:
- normal expense (food, fuel, rent)
- no suspicious signals

IMPORTANT:
- If ANY anomaly exists -> prefer SUSPICIOUS over SAFE
- Do NOT overuse HIGH_RISK

---
STEP 4: CONFIDENCE CALIBRATION (Clamp 10-92)
SAFE: 10-40
SUSPICIOUS: 40-70
HIGH_RISK: 75-92

Start at 50:
+20 -> strong scam pattern
+10 -> odd timing
+10 -> repetition
-15 -> normal expense category
-10 -> normal time

---
STEP 5: OUTPUT FORMAT (STRICT JSON)
{
  "category": "food | rent | fuel | shopping | transfer | other",
  "risk": "SAFE | SUSPICIOUS | HIGH_RISK",
  "confidence": 0-100,
  "risk_score": 0-100,
  "signals_detected": {
    "amount_pattern": "very_low | low | medium | high",
    "odd_timing": boolean,
    "repetition_pattern": "none | weak | moderate | strong",
    "suspicious_context": boolean
  },
  "reasoning": {
    "summary": "short explanation",
    "details": ["reason 1", "reason 2"]
  },
  "advice": ["clear actionable advice"]
}"""

class ExpenseAnalyzeRequest(BaseModel):
    expense_text: str
    amount: Optional[float] = None
    time_of_transaction: Optional[str] = None
    frequency: Optional[int] = 1

@app.post("/expense/analyze")
async def analyze_expense_risk(request: ExpenseAnalyzeRequest):
    """
    Fraud-Aware Expense Analyzer — analyzes a single transaction for financial risk.
    """
    try:
        user_msg = f"expense_text: {request.expense_text}"
        if request.amount: user_msg += f"\namount: ₹{request.amount}"
        if request.time_of_transaction: user_msg += f"\ntime_of_transaction: {request.time_of_transaction}"
        if request.frequency: user_msg += f"\nfrequency: {request.frequency}"

        # Deterministic: text signals + transaction pattern, take the worse score
        from app.scam_engine import analyze_message, analyze_behavior
        result = analyze_message(
            request.expense_text,
            time_of_message=request.time_of_transaction,
            message_frequency=str(request.frequency) if request.frequency else None,
        )
        if request.amount is not None:
            behavior = analyze_behavior(
                str(request.amount),
                time_of_transaction=request.time_of_transaction,
                frequency=str(request.frequency) if request.frequency else None,
            )
            if behavior["risk_score"] > result["final_decision"]["risk_score"]:
                result["final_decision"]["risk"] = behavior["risk"]
                result["final_decision"]["risk_score"] = behavior["risk_score"]
                result["final_decision"]["confidence"] = behavior["confidence"]
                result["signals_detected"]["behavioral"].extend(
                    f"{k}: {v}" for k, v in behavior["signals_detected"].items() if v and v != "none"
                )
        # Flatten to the shape ExpenseTracker.tsx expects (risk/risk_score/
        # reasoning/advice at top level), not the nested final_decision shape.
        fd = result["final_decision"]
        behavioral = result["signals_detected"].get("behavioral", [])
        signals = {
            "amount_pattern": next((s.split(": ")[1] for s in behavioral if s.startswith("amount_pattern: ")), None),
            "odd_timing": "odd timing" in " ".join(behavioral) or "odd_timing: True" in behavioral,
            "repetition_pattern": next((s.split(": ")[1] for s in behavioral if s.startswith("repetition_pattern: ")), None),
            "suspicious_context": bool(result["signals_detected"].get("strong")),
        }
        return {
            "risk": fd["risk"],
            "risk_score": fd["risk_score"],
            "confidence": fd["confidence"],
            "scam_type": fd["scam_type"],
            "signals_detected": result["signals_detected"],
            "signals": signals,
            "reasoning": result["reasoning"],
            "advice": result["user_advice"],
            "rbi_guideline": result.get("rbi_guideline"),
        }
    except Exception as e:
        logger.error(f"Expense analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ── Expense File Extraction Endpoint ───────────────────────────────────────────────────────

EXPENSE_EXTRACTION_SYSTEM_PROMPT = """You are "ArthMitra OCR Assistant". Your task is to extract financial transactions from raw text.
Output MUST be a JSON list of objects: [{"amount": float, "description": str, "date": "ISO-8601", "type": "spend" | "receive", "category": str}]

Categorization Logic:
1. If the description mentions "internship", "job", "work", or any "company", set "type" to "receive" and category to "Earnings".
2. Otherwise, set "type" to "spend" and category to an appropriate expense category: "Food", "Housing", "Utilities", "Transport", "Shopping", or "Misc".

Format strictly as JSON."""

@app.post("/expense/extract")
async def extract_expenses_from_file(file: UploadFile = File(...)):
    """
    Extract transactions from an uploaded file (CSV, TXT, or PDF text).
    If CSV, uses pandas for 100% precision. Else, uses LLM.
    """
    try:
        content = await file.read()
        filename = file.filename.lower()
        extracted = []

        # ─── Robust CSV Parsing (Pandas) ────────────────────────────────────────────────
        if filename.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(content))
            # Standardize columns (ignore case)
            cols = {c.lower(): c for c in df.columns}
            
            now = datetime.now()
            dt_key = next((k for k in ["date", "time", "timestamp"] if k in cols), None)

            for _, row in df.iterrows():
                # Extract Amount
                amount = 0
                amt_key = next((k for k in ["amount", "value", "amt", "price"] if k in cols), None)
                if amt_key: 
                    val = str(row[cols[amt_key]])
                    amount = float(val.replace(',', '').replace('₹', '').replace('-', ''))
                
                # Extract Description
                desc = next((str(row[cols[k]]) for k in ["name", "description", "details", "notes"] if k in cols), "Unknown Transaction")
                
                # Extract Category
                cat = next((str(row[cols[k]]) for k in ["category", "type", "tag"] if k in cols), "Misc")
                
                # Extract Date (use the real date — fraud timing analysis depends on it)
                dt_obj = now
                if dt_key:
                    try:
                        dt_obj = pd.to_datetime(row[cols[dt_key]])
                    except: pass
                dt_str = dt_obj.isoformat()

                # ─── High-Precision Inflow Detection ───────────────────────────────────
                raw_type = str(row[cols['type']]).lower() if 'type' in cols else ""
                raw_cat = str(row[cols['category']]).lower() if 'category' in cols else ""
                raw_desc = desc.lower()

                # Priority logic for Inflow classification
                is_inflow = False
                if any(k in raw_type for k in ["inflow", "receive", "income", "credit", "+"]):
                    is_inflow = True
                elif any(k in raw_cat for k in ["earnings", "income", "salary", "stipend"]):
                    is_inflow = True
                else:
                    is_inflow = any(k in raw_desc for k in ["salary", "internship", "job", "payout", "income", "work", "credited", "refund", "got", "receive", "inflow"])
                
                exp_id = uuid4().hex
                exp_data = {
                    "id": exp_id,
                    "amount": round(amount, 2),
                    "description": desc,
                    "category": ("Earnings" if is_inflow else cat),
                    "date": dt_str,
                    "type": "receive" if is_inflow else "spend"
                }
                extracted.append(exp_data)
                
                # PERSIST TO DB
                query = insert(expenses_table).values(**exp_data)
                await database.execute(query)
            
            return {"expenses": extracted}

        # ─── Unstructured Data Fallback (LLM) ───────────────────────────────────────────
        text_content = content.decode("utf-8", errors="ignore")
        if not text_content.strip(): return {"expenses": []}

        from langchain_core.messages import HumanMessage, SystemMessage
        llm = get_llm(temperature=0.1, small=True)
        response = await llm.ainvoke([
            SystemMessage(content=EXPENSE_EXTRACTION_SYSTEM_PROMPT),
            HumanMessage(content=f"Extract transactions from this text:\n\n{text_content}")
        ])

        raw = response.content.strip()
        if "```json" in raw: raw = raw.split("```json")[1].split("```")[0].strip()
        elif "```" in raw: raw = raw.split("```")[1].split("```")[0].strip()

        extracted = json.loads(raw)
        # Store in DB
        for e in extracted:
            e["id"] = e.get("id") or uuid4().hex
            query = insert(expenses_table).values(
                id=e["id"],
                amount=e['amount'],
                category=e['category'],
                description=e['description'],
                date=e['date'],
                type=e['type']
            )
            await database.execute(query)
        return {"expenses": extracted}

    except Exception as e:
        logger.error(f"Expense extraction error: {e}")
        raise HTTPException(status_code=500, detail="Document format unreadable or corrupt.")

# ── Persistence Endpoints ─────────────────────────────────────────────────────

@app.get("/expenses")
async def get_all_expenses():
    query = select(expenses_table)
    rows = await database.fetch_all(query)
    return [dict(row) for row in rows]

@app.post("/expenses")
async def add_single_expense(e: ExpenseItem):
    exp_id = e.id or uuid4().hex
    exp_data = {
        "id": exp_id,
        "amount": e.amount,
        "category": e.category,
        "description": e.description,
        "date": e.date or datetime.now().isoformat(),
        "type": e.type
    }
    query = insert(expenses_table).values(**exp_data)
    await database.execute(query)
    return exp_data

@app.delete("/expenses/{item_id}")
async def delete_expense(item_id: str):
    query = delete(expenses_table).where(expenses_table.c.id == item_id)
    await database.execute(query)
    return {"status": "deleted"}

@app.delete("/expenses")
async def clear_all_expenses():
    query = delete(expenses_table)
    await database.execute(query)
    return {"status": "all_deleted"}

class BehaviorAnalyzeRequest(BaseModel):
    amount: str
    time_of_transaction: Optional[str] = None
    frequency: Optional[str] = None

@app.post("/scam/behavior")
async def scam_behavior(request: BehaviorAnalyzeRequest):
    """
    Scam Shield Behavior Engine — deterministic transaction-pattern analysis.
    """
    from app.scam_engine import analyze_behavior
    return analyze_behavior(
        request.amount,
        time_of_transaction=request.time_of_transaction,
        frequency=request.frequency,
    )


class LinkAnalyzeRequest(BaseModel):
    input_value: str

@app.post("/scam/link_upi")
async def scam_link_upi(request: LinkAnalyzeRequest):
    """
    Scam Shield Link & UPI Analyst — deterministic URL/UPI heuristics.
    """
    from app.scam_engine import analyze_link_upi
    return analyze_link_upi(request.input_value)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)