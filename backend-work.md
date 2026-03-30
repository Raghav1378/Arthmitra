# 🔱 ArthMitra v3.0 - Backend Engineering Deep-Dive

This report details the technical architecture of the ArthMitra backend (FastAPI/LangChain). It summarizes the design decisions behind the version 3.0 upgrades.

---

## 🏗️ 1. Orchestration: The Intelligent Router

The backend uses a **Functional Agent Swarm**. Instead of a monolithic LLM, the `Swarm Router` classifies incoming requests based on keywords and intent:

| Entity | Agent Label | Domain expertise | Logic Path |
| :---: | :--- | :--- | :--- |
| 🧮 | **The Auditor** | Tax, Math, Interest, EMI | `auditor` |
| 🛡️ | **The Shield** | Phishing, Safety, Scams, Security | `shield` |
| 🤝 | **The Mitra** | General guidance, Charts, Budgeting | `mitra` |

**Routing Logic:**
- **Deterministic Check:** Scans `message` for keywords like "tax," "scam," or "upi."
- **Fallback:** Routes undefined intent to **The Mitra** for conversational assistance.

---

## 🛡️ 2. Scam Shield v2 Architecture (Antigravity Engine)

The version 3.0 upgrade brings **Antigravity Calibration** to the fraud detection layer.

### A. The Two-Stage Text Pipeline (`/scam/analyze`)
1.  **ML Pre-screen:** The system first passes the text through a local `TF-IDF + Logistic Regression` classifier in `shield_ml`. It provides a "statistical nudge" without calling the cloud.
2.  **LLM Reasoning:** The raw text + ML context are sent to **Llama 3.1 8B**. The `SHIELD_SYSTEM_PROMPT` enforces:
    - **High Recall:** Catching subtle threats (e.g., specific UPI collect requests).
    - **Balanced Verdict:** Avoiding over-flagging neutral verification requests.

### B. The Behavior Engine (`/scam/behavior`)
*Objective: Mimic a human bank fraud analyst.*

Instead of hard rules, the Behavior Engine uses a **Probability Weight Model**:
- **Baseline:** Starts at 50% confidence.
- **Modifiers:**
    - **Amount:** `₹1-₹10` pings add significant risk (+20 pts).
    - **Timing:** Transactions between 12 AM – 6 AM add moderate risk (+10 pts).
    - **Frequency:** Rapid repetition (10+ per hour) triggers "Attack Pattern" logic (+20 pts).
- **Clamping:** Results are clamped between 10% and 92% to avoid the "90% Default" hallucination commonly seen in AI models.

---

## 🧠 3. Dual-Mode Retrieval (RAG v3.0)

Version 3.0 introduces a **Merged Retrieval Pipeline** (Local + Remote).

### A. Local Doc Store
Uses **ChromaDB** with `SentenceTransformers` embeddings. It provides grounded answers from:
- RBI Financial Guidelines (indexed PDFs).
- Income Tax Act (indexed text files).

### B. Remote Knowledge (Tavily)
If `deep_research` is toggled in the request:
- The system uses **Tavily Advanced Search** to crawl the live web.
- It extracts grounded snippets to answer questions about breaking financial news (e.g., "What is the new tax slab as of today?").

---

## 🚀 4. Performance & Hybrid Inference

We've optimized the backend for **Low-Latency Streaming**:
- **Cloud Path:** Uses **Groq LPU Inference** (Llama 3.1) for high-speed <500ms initial token response.
- **Local Path:** Uses **ChatOllama** (Qwen 2.5 4B) for air-gapped, private execution.
- **Chart Logic:** Mitra automatically detects requests for data trends and generates structured JSON blocks for the React frontend visualizer.

---

## 🔧 5. Backend Folder Organization (Code Standards)

```text
backend/
├── app/
│   ├── brain/          # Core AI logic (Swarm Router, Agent Prompts)
│   ├── routes/         # FastAPI Route Endpoints (Chats, Docs, Scam)
│   └── shield_ml/      # Scikit-learn Supervised ML pipelines
├── rag/
│   ├── retriever.py    # Merged Local + Tavily logic
│   └── data/           # Raw PDF/Text datasets
└── main.py             # Entry point (Unified API)
```

---
*Technical Lead: Raghav1378*
