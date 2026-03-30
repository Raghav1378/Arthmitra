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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)