# 🔱 ArthMitra

> **Protect your money. Understand your choices. Move with confidence.**
>
> A personal-finance and financial-safety workspace for the Indian digital payments landscape—with Scam Shield at its heart.

[![Next.js](https://img.shields.io/badge/Frontend-Next.js-black?logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Frontend-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

**[▶ Watch the ArthMitra product explainer](arthmitra-video/ArthMitra-Product-Explainer-1080p.mp4)** · [Product details and five-minute video brief](docs/ARTHMITRA_PRODUCT_AND_VIDEO_BRIEF.md)

ArthMitra brings financial safety and everyday money tools together in one app. Its signature feature, **Scam Shield**, helps users inspect suspicious messages and payment details before acting. Mitra Chat and practical trackers help users explore financial questions, understand cash flow, plan savings, and compare loan scenarios.

> **Important:** ArthMitra provides user-initiated checks and financial tools. It does not continuously monitor SMS or bank accounts, execute or block payments, or provide brokerage, trading, or portfolio management.

## Contents

- [Why ArthMitra](#why-arthmitra)
- [Scam Shield](#-scam-shield--three-stage-hybrid-engine)
- [More ways to manage money](#more-ways-to-manage-money)
- [How it works](#how-it-works)
- [Technology](#-tech-stack)
- [Get started](#-quick-start)
- [Configuration](#configuration-backendenv)
- [Run checks](#-testing)
- [Repository layout](#-layout)
- [Product and video brief](#product-and-video-brief)

## Why ArthMitra

Financial wellbeing is about more than investing. People also need ways to question a suspicious payment request, make sense of spending, keep recurring costs visible, and plan toward goals. ArthMitra brings those jobs together—with **Scam Shield** as its central financial-safety experience.

### Highlights

- **A reasoned scam-risk assessment:** Combines deterministic signals, a text classifier, optional semantic analysis, and a policy engine.
- **More than message scanning:** User-submitted checks include screenshots (when OCR is available), URLs and UPI IDs, payment scenarios, and transaction behavior.
- **Financial tools for everyday decisions:** Track income and expenses, savings goals, recurring subscriptions, and compare two loan scenarios.
- **An assistant with configurable providers:** Mitra Chat supports Ollama or Groq, depending on server configuration, with document context and optional search capabilities.
- **Clear separation between tools:** Advisor is a distinct local-Ollama feature; Scam Shield verdicts are resolved by deterministic policy, not by the language model alone.

## Product and video brief

See [the end-to-end product and LinkedIn video brief](docs/ARTHMITRA_PRODUCT_AND_VIDEO_BRIEF.md) for the verified feature walkthrough, accuracy caveats, and a ready-to-use prompt for a five-minute product explainer.

---

## 🛡️ Scam Shield — Three-Stage Hybrid Engine

Scam Shield is designed to help users **pause, inspect warning signs, and choose a safer next step**. The user submits the content or details they want checked; the app does not monitor messages or payments in the background.

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

Groq semantic analysis is optional and can be skipped when it is not configured or available. URL and UPI checks are heuristics—not proof that a link or recipient is safe. Payment guidance does not authorize, execute, or block a transaction.

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
| **Screenshot Scanner** | Extracts text with OCR and analyzes it when the OCR dependency is available |
| **Link/UPI Shield** | URL + VPA heuristics incl. defanged URLs (`hxxps`, `[.]`) |
| **Behavior Engine** | Evaluates transaction details supplied by the user |
| **Payment Decision** | "Should I pay X?" → PAY / VERIFY_FIRST / DO_NOT_PAY |

Scans can be saved to user history; users can manage trusted contacts and submit feedback. Feedback does not automatically retrain the detector.

## More ways to manage money

| Tool | What it helps with |
| :--- | :--- |
| **Mitra Chat** | Ask financial questions and receive streamed responses. Select Ollama or Groq when configured; session documents and search can provide additional context. |
| **Wealth Auditor / Ledger** | Record and categorize income and expenses, review cash-flow summaries and charts, import CSV transactions, and view brief AI-generated spending insights. |
| **Savings Goals** | Track a target, contributions, and progress, with a simple monthly-to-target estimate when a target date is supplied. |
| **Subscriptions** | Manually track recurring costs, monthly/yearly totals, and due dates. |
| **EMI Compare** | Compare two user-entered loan scenarios using estimated EMI, repayment, and interest calculations. |
| **Advisor** | A separate local-Ollama assistant that can use a snapshot of tracked goals, subscriptions, and recent Scam Shield history. |

These features are user-driven: the Ledger does not connect to a bank, subscriptions are not automatically discovered or cancelled, goals do not invest automatically, and EMI Compare does not fetch live lender offers. Advisor's snapshot does not include Ledger expenses.

## How it works

1. A user chooses a tool and submits a question or information in the web app.
2. The Next.js frontend sends the request to the FastAPI backend.
3. The backend runs the relevant checks, model-assisted workflow, financial calculation, or data operation.
4. The app presents the result—such as Scam Shield evidence and guidance, an assistant response, or a financial summary.
5. Supported user records are stored for later use in the app.

Mitra Chat can use optional document context and Tavily search when configured. The backend may also request search for time-sensitive questions, so not every response should be described as live web research. Choosing a local model does not mean every app feature or request necessarily stays on-device.

---

## 🎨 UI

The Scam Shield panel shows:
- risk score, verdict, confidence (separate visual treatments — they are different concepts)
- exact signal chips (urgency, threat, payment request, suspicious link, …)
- **AI Semantic Analysis panel** (only when the LLM actually ran)
- **amber "Engines Disagree" banner** when ML and LLM assessments conflict

The frontend uses Next.js, Tailwind CSS, and Framer Motion.

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
| Search | Tavily (optional; configured by API key) |

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
