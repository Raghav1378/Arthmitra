# 🔱 ArthMitra v4.0

> **Personal finance assistant + three-stage hybrid scam-detection engine for the Indian digital payments landscape.**

ArthMitra combines an LLM-powered financial chat assistant with a **three-stage scam engine**: deterministic rules + ML → Groq LLM semantic analysis → policy fusion. Deterministic evidence is the final authority; the LLM adds semantic depth (emergency impersonation, wrong-number bait) that rules and statistics cannot see.

---

## 🛡️ Scam Shield — Three-Stage Hybrid Engine

### Pipeline

```
USER MESSAGE
    │
    ▼
Stage 1 — DETERMINISTIC EVIDENCE (scam_engine.collect_stage1_evidence)
    rule signals (strong=40 / medium=20 / weak=5 + behavioral + combos)
    TF-IDF + LogisticRegression classifier (3-class, ~3 ms)
    URL/UPI analysis: defanged URLs, burner TLDs, brand/gov impersonation
    behavior: ₹1–10 verification pings, 12 AM–6 AM timing, repeats
    │
    ▼
Stage 2 — LLM SEMANTIC ANALYSIS (llm_analyzer, Groq gpt-oss-20b)
    structured JSON via pydantic schema, temperature=0
    fixed indicator vocabulary (no free-form output)
    prompt-injection defense: message framed as UNTRUSTED DATA
    <think>-channel stripping, 300-char reason cap
    FULLY NON-FATAL: timeout/error/schema violation → None → pipeline continues
    │
    ▼
Stage 3 — POLICY FUSION (policy_engine.decide — FINAL AUTHORITY)
    concordance-based conflict resolution — never averaging, never max(ml, llm)
    ML safe dampens uncorroborated single rule signals (calibrated 0.6·r+2)
    lone ML high_risk held at SUSPICIOUS (45); LLM concordance can raise to 90
    lone-ML + confident-LLM-benign → SAFE (2 of 3 engines win)
    risk and confidence computed INDEPENDENTLY
    ML/LLM disagreement explicitly recorded for the UI
    │
    ▼
HARD CIRCUIT BREAKERS (applied LAST, nothing can override):
  • verified bank/gov domain + clean link → cap 10
  • all URLs verified + no strong rule → cap 65
  • legitimate OTP notification (code, no links, no ask-to-share) → cap 10
  • government VPA impersonation → floor 85
  • bank brand on burner TLD → floor 85
    │
    ▼
FINAL VERDICT: SAFE / SUSPICIOUS / HIGH_RISK + confidence + evidence + RBI guideline
```

### What each stage catches

| Stage | Catches | Example |
| :--- | :--- | :--- |
| **Rules + ML** | Pattern scams: KYC phishing, extortion, job traps, burner-TLD links, UPI collects | `sbi-secure.xyz`, "account will be blocked" |
| **LLM semantic** | Context scams with no links/keywords: emergency impersonation, wrong-number bait | "Papa ka dost hoon, phone gir gaya, turant ₹5000 bhejo" |
| **Policy** | Scam-shaped legitimate messages: COD delivery, insurance claims, courier alerts | "PhonePe: order delivered, keep ₹499 handy if COD" |

### Evaluation (test split = 3,034 unseen phrasings)

- Dataset v2: **semantic families (family_emergency, wrong_number) are test-only** — genuine OOD for the ML model, isolating the LLM's contribution
- ML-only on the semantic OOD class: **39.6% recall (36/91)** — the measurable gap Stage 2 exists to close
- ML+Policy full split: accuracy 0.844, recall 0.888, FPR 0.171, ROC-AUC 0.932
- Paired ML vs hybrid evaluation harness: `scripts/eval_hybrid.py --mode ml|hybrid --sample N` (identical rows, per-row CSV dumps, Groq throttling/backoff, all 15 metrics incl. adversarial recall, hard-negative FPR, OOD subgroups)
- Every FP/FN attributed by family; no result inflation; failed runs recorded and labeled

### Detection modes

| Mode | What it does |
| :--- | :--- |
| **Message Scanner** | Full three-stage pipeline on SMS/chat text |
| **Link/UPI Shield** | URL + VPA heuristics incl. defanged URLs (`hxxps`, `[.]`) |
| **Behavior Engine** | Transaction pattern analysis |
| **Payment Decision** | "Should I pay X?" → PAY / VERIFY_FIRST / DO_NOT_PAY |

---

## 🤖 Assistant Features

- **Dual-mode RAG**: local document brain (ChromaDB + sentence-transformers) + Tavily live search
- **Agent routing**: The Auditor (math/tax), The Shield (security), The Mitra (general finance)
- **Provider switch**: Ollama (local, default) or Groq cloud — set via env
- **Expense tracking** with natural-language chart generation
- **Document upload** (PDF/bank statements) with per-session RAG context
- **Chat history** persisted server-side, session migration from localStorage

---

## 🎨 UI

Blue / gold / white fintech design system ("Sapphire Court"). The Scam Shield panel shows:
- risk score, verdict, confidence (separate visual treatments — they are different concepts)
- exact signal chips (urgency, threat, payment request, suspicious link, …)
- **AI Semantic Analysis panel** (only when the LLM actually ran)
- **amber "Engines Disagree" banner** when ML and LLM assessments conflict

Next.js 14 + Tailwind + Framer Motion.

---

## 🛠️ Tech Stack

| Layer | Technology |
| :--- | :--- |
| Frontend | Next.js 14, TypeScript, Tailwind, Framer Motion, Lucide |
| Backend | FastAPI, Python 3.10+, SQLite (SQLAlchemy + databases) |
| Chat LLM | Ollama (`llama3.2:3b` default) or Groq |
| Scam Stage 2 | Groq `openai/gpt-oss-20b` (structured output, 6 s timeout, non-fatal) |
| ML | scikit-learn (TF-IDF + LogisticRegression), joblib |
| RAG | ChromaDB, sentence-transformers |
| Search | Tavily (only when live search enabled) |

---

## 🚀 Quick Start

### Backend

```powershell
cd backend
python -m venv arthmitra
.\arthmitra\Scripts\activate
pip install -r requirements.txt
copy .env.example .env          # fill in keys as needed
.\run_dev.ps1                   # starts uvicorn with correct reload excludes
```

Startup takes 1–2 minutes (embedder + ML model load). Health check:

```powershell
curl http://127.0.0.1:8000/health
```

### Frontend

```powershell
cd frontend
npm install
npm run dev                     # http://localhost:3000
```

### Configuration (backend/.env)

| Variable | Default | Purpose |
| :--- | :--- | :--- |
| `LLM_PROVIDER` | `ollama` | `ollama` or `groq` (chat assistant) |
| `OLLAMA_CHAT_MODEL` | `llama3.2:3b` | local chat model |
| `GROQ_API_KEY` | – | required for Groq (chat + scam Stage 2) |
| `GROQ_MODEL` | `openai/gpt-oss-20b` | Groq model (chat + scam Stage 2) |
| `TAVILY_API_KEY` | – | required for live search |

API key is strictly server-side — never exposed to the frontend.

---

## 🧪 Testing

```powershell
cd backend
python -m app.scam_engine       # Stage 1 + end-to-end regression suite
python -m app.policy_engine     # Stage 3 fusion self-checks
python -m app.llm_analyzer      # Stage 2 schema + fallback self-checks (mocked, no network)
```

Covers: the two original regression cases (motapanda reward scam, father's-friend
emergency impersonation), hard negatives (COD delivery, OTP alerts, insurance),
prompt-injection attempts, Hinglish ("OTP batao"), oversize input (HTTP 422), Groq-down
fallback, determinism checks.

### Retrain + evaluate

```powershell
python scripts\generate_dataset_v2.py         # 19.5k rows, semantic families test-only
python -m ml_engine.train                     # trains + exports joblib
python scripts\eval_hybrid.py --mode ml       # full-split ML+Policy baseline
python scripts\eval_hybrid.py --mode hybrid --sample 200   # paired hybrid run (live Groq)
```

Note: Groq free tier allows ~200k tokens/day — a 200-row hybrid run uses ~140k. Don't run two large hybrid evals in one day.

---

## 📁 Layout

```
backend/
  app/scam_engine.py        # Stage 1 evidence + hybrid entrypoint + RBI guidelines + tests
  app/llm_analyzer.py       # Stage 2: Groq semantic analysis (structured, non-fatal)
  app/policy_engine.py      # Stage 3: evidence fusion, final authority, hard breakers
  app/shield_ml/            # legacy numeric/text ML models (auto-trained at startup)
  ml_engine/                # TF-IDF classifier (train.py, models/)
  scripts/                  # dataset generator v2, eval_hybrid.py
  routes/                   # chats, documents routers
  rag/                      # dual-mode retrieval
  main.py                   # FastAPI app, providers, streaming chat
frontend/
  src/components/           # Chat, ScamShield, ExpenseTracker, Sidebar, ...
```
