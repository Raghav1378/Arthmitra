import os
import logging
import io
import pandas as pd
from typing import Optional, List, Dict, Any
from datetime import datetime
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import json
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

engine = create_engine(DATABASE_URL)
metadata.create_all(engine)

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


@app.on_event("startup")
async def startup_event():
    """Start the database and ML models."""
    await database.connect()
    try:
        from app.shield_ml import check_or_train
        check_or_train()
        logger.info("Scam Shield ML models verified/trained.")
    except Exception as e:
        logger.error(f"Failed to initialize Scam Shield ML: {e}")

@app.on_event("shutdown")
async def shutdown_event():
    await database.disconnect()

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "ArthMitra API + SQLite Active"}


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


# ── Scam Shield Endpoint ───────────────────────────────────────────────────────

class ScamAnalyzeRequest(BaseModel):
    message_text: str
    time_of_message: Optional[str] = None
    message_frequency: Optional[str] = None

SCAM_SHIELD_SYSTEM_PROMPT = """You are "Scam Shield Antigravity v2", an advanced fraud detection AI designed for REAL-WORLD financial scam detection.

Your goal is HIGH RECALL with TARGETED PRECISION:
- Do not miss scams
- But do NOT classify everything as HIGH_RISK or SCAM
- Use balanced judgment with proper confidence
- Understand Hinglish + Indian context (SBI, HDFC, RBI, Paytm, PhonePe, BHIM)

---
STEP 1: SIGNAL DETECTION
Detect the following signals strictly. Do NOT over-interpret neutral text:

STRONG SIGNALS:
- Threat: ONLY classify if explicit negative consequence mentioned ("account will be blocked", "legal action will be taken", "account suspended"). Do NOT mark "verify account" or "confirm request" as threats.
- Payment request: UPI, OTP, fee, collect request
- Suspicious link: fake domains, shortened URLs
- Sensitive info request: OTP, password, CVV

MEDIUM SIGNALS:
- Urgency: "urgent", "act now", "limited time"
- Authority impersonation: SBI, RBI, Paytm, Govt, etc.
- Prize / job / reward claims

WEAK SIGNALS:
- Simple reminders
- Mild urgency without threat
- Generic system notifications

---
STEP 2: RISK SCORING (IMPORTANT)
Assign internal score:
- Each STRONG signal = +40
- Each MEDIUM signal = +20
- Each WEAK signal = +5

Add behavioral modifiers:
- Odd timing = +10 (ONLY TRUE if between 12:00 AM - 6:00 AM, OR late-night spam pattern after 11 PM with repetition. DO NOT mark morning/afternoon/early evening as odd timing.)
- Repeated messages = +10

---
STEP 3: DECISION RULE & VERDICT MAPPING
Rule of thumb:
- Payment request alone -> SUSPICIOUS
- Urgency alone -> SAFE or SUSPICIOUS
- Link + payment -> HIGH_RISK
- Threat + urgency -> HIGH_RISK

Map risk score to final verdict strictly:
- 0-29 -> SAFE (no real scam signals exist)
- 30-69 -> SUSPICIOUS (borderline cases, partial signals)
- 70-100 -> HIGH_RISK (multiple strong signals)

---
STEP 4: CONFIDENCE CALIBRATION (CRITICAL)
Confidence must vary and reflect true signal strength. Do NOT default to 75 or 90.
- 85-95 -> multiple strong signals (clear scam)
- 65-85 -> strong + medium signals
- 45-65 -> only medium signals
- 25-45 -> weak signals only
- 10-25 -> no meaningful signals

---
STEP 5: SCAM TYPE DETECTION
Choose one:
- kyc
- upi
- phishing
- job
- lottery
- delivery
- impersonation
- unknown

---
STEP 6: OUTPUT (STRICT JSON)
{
  "final_decision": {
    "risk": "SAFE | SUSPICIOUS | HIGH_RISK",
    "confidence": 0-100,
    "risk_score": 0-100,
    "scam_type": "type"
  },
  "signals_detected": {
    "strong": ["list of detected strong signals"],
    "medium": ["list of detected medium signals"],
    "weak": ["list of detected weak signals"],
    "behavioral": ["list of detected behavioral modifiers"]
  },
  "reasoning": {
    "summary": "short explanation",
    "detailed_reasons": [
      "reason 1",
      "reason 2"
    ]
  },
  "user_advice": [
    "clear actionable advice"
  ]
}

---
RULES:
- Be precise, not paranoid. Do NOT classify everything as scam.
- Use SUSPICIOUS properly for borderline cases.
- SAFE must be used when no real scam signals exist.
- Return ONLY the JSON object, no other text."""

@app.post("/scam/analyze")
async def scam_analyze(request: ScamAnalyzeRequest):
    """
    Scam Shield — AI-powered fraud analysis.
    Uses Groq LLM with ML pre-screening for structured scam detection.
    """
    try:
        # ── 1. ML Pre-screen with existing Shield ML ──────────────────────────
        ml_context = ""
        try:
            from app.shield_ml import predict_text_scam
            from app.shield_ml.anomaly import get_text_anomaly_score
            ml_result = predict_text_scam(request.message_text)
            anomaly = get_text_anomaly_score(request.message_text)
            ml_is_scam = ml_result.get("is_scam", False)
            ml_confidence = ml_result.get("confidence", 0.0)
            ml_keywords = ml_result.get("top_keywords", [])
            ml_context = (
                f"\n\nML Pre-screen signals: is_scam={ml_is_scam}, confidence={ml_confidence:.2f}, "
                f"top_keywords={ml_keywords}, is_anomaly={anomaly.get('is_anomaly', False)}"
            )
        except Exception as ml_err:
            logger.warning(f"ML pre-screen failed (non-fatal): {ml_err}")
            ml_context = ""

        # ── 2. Build user message ─────────────────────────────────────────────
        user_msg = f"message_text: {request.message_text}"
        if request.time_of_message:
            user_msg += f"\ntime_of_message: {request.time_of_message}"
        if request.message_frequency:
            user_msg += f"\nmessage_frequency: {request.message_frequency}"
        user_msg += ml_context

        # ── 3. Groq LLM analysis ──────────────────────────────────────────────
        llm = ChatGroq(model="llama-3.1-8b-instant", temperature=0.1)
        response = await llm.ainvoke([
            SystemMessage(content=SCAM_SHIELD_SYSTEM_PROMPT),
            HumanMessage(content=user_msg),
        ])

        raw = response.content.strip()

        # Extract JSON from response (handle if model wraps in markdown)
        if "```json" in raw:
            raw = raw.split("```json")[1].split("```")[0].strip()
        elif "```" in raw:
            raw = raw.split("```")[1].split("```")[0].strip()

        result = json.loads(raw)
        return result

    except json.JSONDecodeError as e:
        logger.error(f"Scam Shield JSON parse error: {e}\nRaw: {raw}")
        raise HTTPException(status_code=500, detail="Analysis returned malformed output")
    except Exception as e:
        logger.error(f"Scam Shield error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ── Decision Shield Endpoint ───────────────────────────────────────────────────────

class DecisionAnalyzeRequest(BaseModel):
    input_value: str

SCAM_DECISION_SYSTEM_PROMPT = """You are Mitra AI — a financial decision assistant that helps users decide whether to send money.

Your job is to:
- analyze the situation
- detect scam patterns
- give a clear decision (PAY / VERIFY_FIRST / DO_NOT_PAY)
- respond like a real fintech safety system

--------------------------------------

CRITICAL RULES:
- Return ONLY valid JSON
- No markdown, no explanation, no extra text
- Output MUST start with { and end with }
- All fields are mandatory
- confidence must be integer

--------------------------------------

INPUT:
{input_value}

--------------------------------------

STEP 1: CONTEXT UNDERSTANDING

Extract:

- payment_intent → user is planning to send money
- urgency → "urgent", "immediately", "now"
- threat → "account blocked", "legal action"
- kyc_scam → OTP / KYC / verification request
- reward_trap → lottery / prize / refund bait
- unknown_receiver → unclear or unknown person

--------------------------------------

STEP 2: RISK EVALUATION

Initialize risk_score = 0

- urgency → +25  
- threat → +30  
- kyc_scam → +40  
- reward_trap → +30  
- unknown_receiver → +20  

--------------------------------------

STEP 3: RISK LEVEL

- risk_score <= 20 → SAFE  
- 21–50 → LOW  
- 51–75 → SUSPICIOUS  
- >75 → HIGH  

--------------------------------------

STEP 4: DECISION LOGIC

SAFE → PAY  
LOW → VERIFY_FIRST  
SUSPICIOUS → DO_NOT_PAY  
HIGH → DO_NOT_PAY  

--------------------------------------

STEP 5: CONFIDENCE

SAFE → 85–95  
LOW → 65–85  
SUSPICIOUS → 50–70  
HIGH → 75–95  

--------------------------------------

STEP 6: FRONTEND-READY OUTPUT

Return EXACTLY:

{
  "type": "payment_decision",
  "decision": "PAY | VERIFY_FIRST | DO_NOT_PAY",
  "risk": "SAFE | LOW | SUSPICIOUS | HIGH",
  "confidence": integer,
  "risk_score": integer,

  "ui": {
    "verdict_label": "SAFE | VERIFY | DO NOT PAY",
    "color": "green | yellow | orange | red",
    "icon": "shield-check | alert | warning | danger",
    "primary_message": "Clear final decision for user",
    "secondary_message": "Short reason explaining why"
  },

  "signals_detected": {
    "urgency": boolean,
    "threat": boolean,
    "kyc_scam": boolean,
    "reward_trap": boolean,
    "unknown_receiver": boolean
  },

  "reasoning": {
    "summary": "One-line explanation",
    "details": [
      "Key factor 1",
      "Key factor 2"
    ]
  },

  "advice": [
    "Call the person directly",
    "Verify via official app",
    "Do not send money under pressure"
  ]
}
"""

@app.post("/scam/decision")
async def scam_decision(request: DecisionAnalyzeRequest):
    """
    Mitra AI — Payment Decision Engine.
    """
    try:
        user_msg = f"input_value: {request.input_value}"

        llm = ChatGroq(model="llama-3.1-8b-instant", temperature=0.1)
        response = await llm.ainvoke([
            SystemMessage(content=SCAM_DECISION_SYSTEM_PROMPT),
            HumanMessage(content=user_msg),
        ])

        raw = response.content.strip()

        if "```json" in raw:
            raw = raw.split("```json")[1].split("```")[0].strip()
        elif "```" in raw:
            raw = raw.split("```")[1].split("```")[0].strip()

        result = json.loads(raw)
        return result

    except json.JSONDecodeError as e:
        logger.error(f"Scam Decision JSON parse error: {e}\nRaw: {raw}")
        raise HTTPException(status_code=500, detail="Analysis returned malformed output")
    except Exception as e:
        logger.error(f"Scam Decision error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

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

        groq_key = os.getenv("GROQ_API_KEY")
        if not groq_key:
            return {"insight": "Audit Engine offline. Verify Cloud API Key to restore Strategic Intelligence."}

        llm = ChatGroq(api_key=groq_key, model="llama-3.1-8b-instant", temperature=0.6)
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

        groq_key = os.getenv("GROQ_API_KEY")
        if not groq_key:
            raise HTTPException(status_code=500, detail="GROQ_API_KEY missing")

        llm = ChatGroq(api_key=groq_key, model="llama-3.1-8b-instant", temperature=0.1)
        response = await llm.ainvoke([
            SystemMessage(content=SCAM_EXPENSE_SYSTEM_PROMPT),
            HumanMessage(content=user_msg)
        ])

        raw = response.content.strip()
        if "```json" in raw: raw = raw.split("```json")[1].split("```")[0].strip()
        elif "```" in raw: raw = raw.split("```")[1].split("```")[0].strip()

        return json.loads(raw)
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
            
            # Smart Date Normalization: If dates are old, shift them to the current week
            # to make the charts look realistically populated in real-time.
            now = datetime.now()
            dt_key = next((k for k in ["date", "time", "timestamp"] if k in cols), None)
            
            # Heuristic: Find the max date in the CSV and shift it to 'Today'
            date_shift = None
            if dt_key:
                try:
                    df_dates = pd.to_datetime(df[cols[dt_key]])
                    max_csv_date = df_dates.max()
                    date_shift = now - max_csv_date
                except: pass

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
                
                # Extract/Shift Date
                dt_obj = now
                if dt_key:
                    try: 
                        dt_obj = pd.to_datetime(row[cols[dt_key]])
                        if date_shift: dt_obj = dt_obj + date_shift
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
                
                exp_id = str(abs(hash(f"{desc}{dt_str}{amount}")))
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

        llm = ChatGroq(model="llama-3.1-8b-instant", temperature=0.1)
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
            e["id"] = e.get("id") or str(abs(hash(f"{e['description']}{e['date']}")))
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
    exp_id = e.id or str(abs(hash(f"{e.description}{e.date}{e.amount}")))
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

SCAM_BEHAVIOR_SYSTEM_PROMPT = """You are "Scam Shield Behavior Analyst", an advanced AI that mimics real-world fraud detection systems used by banks and UPI platforms.

Your goal is to analyze transaction behavior and classify risk realistically using:
- amount
- time_of_transaction
- frequency

You must behave like a fraud analyst:
- Detect patterns
- Avoid overreaction
- Avoid underreaction
- Maintain logical consistency

---

INPUT:
- amount (₹ value)
- time_of_transaction (e.g., 02:30 PM)
- frequency (e.g., "3 requests in 1 hour")

---

STEP 1: AMOUNT CLASSIFICATION (PRIMARY SIGNAL)

- ₹1-₹10 -> VERY LOW (strong scam pattern)
- ₹11-₹999 -> LOW
- ₹1000-₹10000 -> MEDIUM
- ₹10000+ -> HIGH

IMPORTANT:
- ₹1-₹10 is a known verification scam pattern -> strong signal
- ₹11+ must NEVER be labeled "very_low"

---

STEP 2: TIME ANALYSIS

- 12:00 AM - 6:00 AM -> ODD TIMING (suspicious)
- Otherwise -> NORMAL

IMPORTANT:
- Time alone must NEVER produce HIGH_RISK
- Late-night always adds mild suspicion

---

STEP 3: FREQUENCY ANALYSIS

- 1-3 requests/hour -> WEAK signal (normal behavior)
- 4-10 -> MODERATE signal
- 10+ -> STRONG signal (attack pattern)

---

STEP 4: SIGNAL PRIORITY

1. Amount (primary)
2. Combined signals
3. Time (secondary)
4. Repetition (modifier)

---

STEP 5: DECISION LOGIC

HIGH_RISK only if:
- ₹1-₹10 + (odd timing OR repetition)
OR
- STRONG repetition (10+) + odd timing

---

SUSPICIOUS if:
- Any anomaly exists:
  - LOW amount (₹11-₹999)
  - ODD timing
  - MODERATE/WEAK repetition
  - HIGH amount at odd timing
  - Medium combinations

---

SAFE only if ALL are true:
- MEDIUM or HIGH amount (₹1000+)
- NORMAL time
- NO repetition (1 request only)

IMPORTANT:
- If ANY anomaly exists -> DO NOT classify SAFE
- Use SUSPICIOUS for gray cases

---

STEP 6: CONFIDENCE CALIBRATION (CRITICAL)

Confidence must reflect certainty realistically.

STRICT RULES:

SAFE:
- 10-40 only

SUSPICIOUS:
- 40-70 only

HIGH_RISK:
- 75-92 only

---

CONFIDENCE LOGIC:

Start baseline: 50

Adjust:
+20 -> very low amount (₹1-₹10)
+15 -> strong repetition
+10 -> odd timing

-15 -> normal amount (₹1000+)
-10 -> normal time
-10 -> single request

Clamp:
- Minimum: 10
- Maximum: 92

IMPORTANT:
- NEVER output >92
- NEVER assign SAFE if confidence >40
- NEVER assign HIGH_RISK if confidence <75

---

STEP 7: CONSISTENCY RULES

- SAFE must NOT contain any anomaly
- If confidence >40 -> NOT SAFE
- If weak anomaly exists -> SUSPICIOUS
- Do NOT ignore signals
- Do NOT generate fake "normal" reasoning

---

STEP 8: OUTPUT FORMAT (STRICT JSON)

{
  "risk": "SAFE | SUSPICIOUS | HIGH_RISK",
  "confidence": 0-100,
  "risk_score": 0-100,

  "signals_detected": {
    "amount_pattern": "very_low | low | medium | high",
    "odd_timing": true,
    "repetition_pattern": "none | weak | moderate | strong"
  },

  "reasoning": {
    "summary": "short explanation",
    "details": [
      "reason 1",
      "reason 2"
    ]
  },

  "advice": [
    "clear actionable advice"
  ]
}

---

FINAL RULE:

You must behave like a real fraud detection system:
- Balanced
- Logical
- Consistent
- Not paranoid
- Not careless

Every decision must match:
signals -> logic -> confidence -> classification"""

@app.post("/scam/behavior")
async def scam_behavior(request: BehaviorAnalyzeRequest):
    """
    Scam Shield Behavior Engine — purely transaction-based analysis.
    """
    try:
        user_msg = f"amount: {request.amount}"
        if request.time_of_transaction:
            user_msg += f"\ntime_of_transaction: {request.time_of_transaction}"
        if request.frequency:
            user_msg += f"\nfrequency: {request.frequency}"

        llm = ChatGroq(model="llama-3.1-8b-instant", temperature=0.1)
        response = await llm.ainvoke([
            SystemMessage(content=SCAM_BEHAVIOR_SYSTEM_PROMPT),
            HumanMessage(content=user_msg),
        ])
        
        raw = response.content.strip()

        # Extract JSON from response (handle if model wraps in markdown)
        if "```json" in raw:
            raw = raw.split("```json")[1].split("```")[0].strip()
        elif "```" in raw:
            raw = raw.split("```")[1].split("```")[0].strip()

        result = json.loads(raw)
        return result

    except json.JSONDecodeError as e:
        logger.error(f"Scam Behavior JSON parse error: {e}\nRaw: {raw}")
        raise HTTPException(status_code=500, detail="Analysis returned malformed output")
    except Exception as e:
        logger.error(f"Scam Behavior error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


class LinkAnalyzeRequest(BaseModel):
    input_value: str

SCAM_LINK_UPI_SYSTEM_PROMPT = """You are a cybersecurity analysis engine for detecting scam links and UPI IDs.

CRITICAL OUTPUT RULES:
- You MUST return ONLY valid JSON.
- Do NOT include explanations, markdown, headings, or text before/after JSON.
- Output MUST start with { and end with }.
- If you fail, the system will crash.

--------------------------------------

INPUT:
{input_value}

--------------------------------------

STEP 1: IDENTIFY TYPE
- If contains "http", "https", "www" → type = "url"
- If contains "@" → type = "upi"
- Else → type = "unknown"

--------------------------------------

STEP 2: URL ANALYSIS (if type = url)
Check:
- fake_domain (typos like paytm-secure, g00gle)
- brand_impersonation (sbi, paytm, phonepe, gpay misuse)
- suspicious_tld (.xyz, .top, .click, .ru)
- shortened_link (bit.ly, tinyurl)

--------------------------------------

STEP 3: UPI ANALYSIS (if type = upi)

IMPORTANT:
- Numbers in UPI IDs are COMMON in India → NOT a strong risk signal
- Do NOT mark UPI as suspicious just because it contains numbers

Check:

HIGH RISK:
- impersonation words → "support", "help", "bank", "refund", "kyc", "official"
- examples: sbi-support@upi, helpdesk@okaxis

MEDIUM RISK:
- suspicious words → "urgent", "claim", "lottery", "prize", "win"

LOW RISK (NORMAL):
- name + numbers → rahul123@okaxis
- firstname.lastname@bank

--------------------------------------

STEP 4: RISK SCORING

Initialize risk_score = 0

URL:
- fake_domain → +40
- impersonation → +30
- suspicious_tld → +20
- shortened → +10

UPI:
- impersonation → +50
- suspicious words → +30
- random numbers ONLY → +5 (very weak signal)

--------------------------------------

STEP 5: FINAL LABEL

risk_score <= 20 → SAFE  
21–50 → LOW  
51–75 → SUSPICIOUS  
>75 → HIGH  

--------------------------------------

STEP 6: CONFIDENCE

SAFE → 80–95  
LOW → 60–80  
SUSPICIOUS → 40–70  
HIGH → 70–95  

--------------------------------------

STEP 7: OUTPUT FORMAT

Return ONLY this JSON:

{
  "type": "url | upi | unknown",
  "risk": "SAFE | LOW | SUSPICIOUS | HIGH",
  "confidence": number,
  "risk_score": number,
  "signals_detected": {
    "fake_domain": boolean,
    "brand_impersonation": boolean,
    "suspicious_tld": boolean,
    "shortened_link": boolean,
    "random_upi": boolean
  },
  "reasoning": {
    "summary": "short explanation",
    "details": ["point 1", "point 2"]
  },
  "advice": ["action 1", "action 2"]
}
"""

@app.post("/scam/link_upi")
async def scam_link_upi(request: LinkAnalyzeRequest):
    """
    Scam Shield Link & UPI Analyst — detects phishing links and suspicious payment handles.
    """
    try:
        llm = ChatGroq(model="llama-3.1-8b-instant", temperature=0.1)
        response = await llm.ainvoke([
            SystemMessage(content=SCAM_LINK_UPI_SYSTEM_PROMPT),
            HumanMessage(content=f"input_value: {request.input_value}"),
        ])
        
        raw = response.content.strip()

        # Extract JSON from response (handle if model wraps in markdown)
        if "```json" in raw:
            raw = raw.split("```json")[1].split("```")[0].strip()
        elif "```" in raw:
            raw = raw.split("```")[1].split("```")[0].strip()

        result = json.loads(raw)
        return result

    except json.JSONDecodeError as e:
        logger.error(f"Scam Link/UPI JSON parse error: {e}\nRaw: {raw}")
        raise HTTPException(status_code=500, detail="Analysis returned malformed output")
    except Exception as e:
        logger.error(f"Scam Link/UPI error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)