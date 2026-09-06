# 🔱 ArthMitra v3.0

> **Personal finance assistant + hybrid scam-detection engine for the Indian digital payments landscape.**

ArthMitra combines an LLM-powered financial chat assistant with a **deterministic rules + ML hybrid scam engine** — the same message always produces the same risk score, no LLM arithmetic in the decision path.

---

## 🛡️ Scam Shield — Hybrid Detection Engine

Four detection modes, all deterministic and reproducible:

| Mode | What it does | Example catch |
| :--- | :--- | :--- |
| **Message Scanner** | Keyword/signal rules + TF-IDF ML blend on SMS or chat text | KYC phishing, Cyber-Cell extortion, job traps |
| **Link/UPI Shield** | URL + VPA heuristics: defanged URLs (`hxxps`, `[.]`), burner TLDs (`.xyz .top .online`), brand/gov impersonation | `sbi-secure.xyz`, `gov-refund-dept@okicici` |
| **Behavior Engine** | Transaction pattern analysis: ₹1–10 verification pings, 12 AM–6 AM timing, repeated collect requests | ₹5 UPI request at 2 AM, 6 attempts in 10 min |
| **Payment Decision** | "Should I pay X?" — threat/KYC/urgency/reward/impersonation signals → PAY / VERIFY_FIRST / DO_NOT_PAY | "Send ₹2000 to this FedEx agent?" |

### Hybrid scoring pipeline

```
rule score (strong=40 / medium=20 / weak=5)
        │
        ▼
ML blend: 0.6·rules + 0.4·TF-IDF classifier  (high-confidence ML → floor 75)
        │
        ▼
hard circuit breakers (deterministic, override everything):
  • verified bank/gov domain (sbi.co.in, hdfcbank.com, *.gov.in) → cap 10
  • legitimate OTP alert (4–6 digit code, no links) → cap 10
  • government VPA impersonation on generic PSP → floor 85
  • bank brand on burner TLD → floor 85
  • authority wording on non-standard TLD → floor 85
```

Defanged URL sanitization (`[.]` → `.`, `hxxp` → `http`) runs before parsing, so analyst-style obfuscated links are scored, not skipped.

Every flagged message returns a matching **RBI guideline reference** — e.g. the 3-working-day **Zero Liability** rule for unauthorized electronic transactions.

**ML model:** TF-IDF (1–2 grams) + Logistic Regression, trained on 5,000 synthetic Indian financial messages (legit alerts, KYC phishing, extortion, job traps, UPI collects — with defanged-URL/Hinglish/typo noise). ~3.5 ms inference, lazy-loaded, falls back to rules-only if the model file is missing.

---

## 🤖 Assistant Features

- **Dual-mode RAG**: local document brain (ChromaDB + sentence-transformers) + Tavily live search when enabled
- **Agent routing**: keyword router sends queries to The Auditor (math/tax), The Shield (security), or The Mitra (general finance)
- **Provider switch**: Ollama (local, default) or Groq cloud — set via env, no code change
- **Expense tracking** with natural-language chart generation (bar/line/area/pie)
- **Document upload** (PDF/bank statements) with per-session RAG context
- **Chat history** persisted server-side, session migration from localStorage

---

## 🎨 UI

Blue / gold / white fintech design system ("Sapphire Court"): Fraunces + IBM Plex typography, guilloche texture, glass panels. Next.js 14 + Tailwind + Framer Motion.

---

## 🛠️ Tech Stack

| Layer | Technology |
| :--- | :--- |
| Frontend | Next.js 14, TypeScript, Tailwind, Framer Motion, Lucide |
| Backend | FastAPI, Python 3.10+, SQLite (SQLAlchemy + databases) |
| LLM | Ollama (`llama3.2:3b` default) or Groq |
| ML | scikit-learn (TF-IDF + LogisticRegression), joblib |
| RAG | ChromaDB, sentence-transformers |
| Search | Tavily (only when live search is enabled) |

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

`run_dev.ps1` kills any stale process on port 8000 and starts uvicorn with `--reload-exclude` for models/data/DB files — so retraining ML or writing chat data never restarts the server mid-request.

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
| `LLM_PROVIDER` | `ollama` | `ollama` or `groq` |
| `OLLAMA_CHAT_MODEL` | `llama3.2:3b` | local chat model |
| `GROQ_API_KEY` | – | required for Groq |
| `GROQ_MODEL` | `openai/gpt-oss-120b` | Groq model |
| `TAVILY_API_KEY` | – | required for live search |

---

## 🧪 Testing

```powershell
cd backend
python app\scam_engine.py       # full regression suite (~35 asserts)
```

Covers: defanged URLs, burner-TLD impersonation, gov-VPA handles, legit OTP/bank alerts (false-positive guards), UPI verification scams, determinism checks.

Retrain the ML model:

```powershell
python scripts\generate_synthetic_scams.py     # 5,000-row dataset
python -m ml_engine.train                      # trains + exports joblib
```

---

## 📁 Layout

```
backend/
  app/scam_engine.py        # rules + hybrid scoring + RBI guidelines + test suite
  app/shield_ml/            # legacy numeric/text ML models (auto-trained at startup)
  ml_engine/                # hybrid TF-IDF model (train.py, models/)
  scripts/                  # synthetic dataset generator
  routes/                   # chats, documents routers
  rag/                      # dual-mode retrieval
  main.py                   # FastAPI app, providers, streaming chat
frontend/
  src/components/           # Chat, ScamShield, ExpenseTracker, Sidebar, ...
```
