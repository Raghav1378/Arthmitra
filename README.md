# ArthMitra Backend - Verified Features

This repository hosts the backend for ArthMitra, a comprehensive financial security and intelligence platform. It exposes a robust API powered by local LLMs, deterministic ML models, and a unified policy engine.

## ✅ Working E2E Features (Verified)

The following modules are fully implemented, verified, and active.

### 🛡️ 1. Shield ML (Scam Detection)
*High-performance fraud detection independent of LLMs.*

*   **Text Scam Detector**:
    *   **Method**: TF-IDF + Logistic Regression (Supervised).
    *   **Function**: Analyzes SMS/Text for phishing urgency ("KYC Blocked") and scam keywords.
    *   **Endpoint**: `POST /api/shield/analyze-text`
    
*   **Transaction Risk Score**:
    *   **Method**: Random Forest Classifier (Supervised).
    *   **Function**: Evaluates transaction metadata (velocity, amount spikes, new payee).
    *   **Endpoint**: `POST /api/shield/analyze-transaction`

*   **Anomaly Detection Layer**:
    *   **Method**: One-Class SVM (Text) & Isolation Forest (Transactions).
    *   **Function**: "Novelty detection" for unknown attack vectors.
    
*   **Unified Policy Engine**:
    *   **Method**: Deterministic Rules (R001-R010).
    *   **Function**: Aggregates ML scores to output a final `BLOCK`, `WARNING`, or `SAFE` decision.
    *   **Endpoint**: `POST /api/shield/assess-risk`

### 🔍 2. UPI ID Risk Validator
*Pre-payment safety check for Unified Payments Interface.*

*   **Method**: Rule-based Heuristics (11 Checkpoints).
*   **Function**: Validates UPI handles (e.g., `refund@sbi`) against known scam patterns and impersonation tactics.
*   **Endpoints**:
    *   `POST /api/shield/validate-upi` (Full Report)
    *   `GET /api/shield/validate-upi-quick` (Fast Check)

### 🧠 3. The Brain (Financial RAG)
*Retrieval-Augmented Generation for regulatory queries.*

*   **Core**: LangChain + ChromaDB (Vector Store).
*   **Data Sources**: Indexed RBI Circulars, Consumer Rights Acts, Tax Laws.
*   **Feature**: Generates grounded answers with strict source citation and **self-corrected confidence scoring**.
*   **Endpoint**: `POST /api/brain/ask`

### 🤖 4. Intelligent Swarm Router
*Multi-Agent orchestration for specialized tasks.*

*   **Architecture**: LangGraph Supervisor.
*   **Agents**:
    *   **Auditor** (`deepseek-r1`): Math, Tax, EMI calculations.
    *   **Shield** (`qwen2.5`): Security explanations.
    *   **Mitra** (`gemma3`): General guidance.
    *   **Groq** (`llama-3.1`): Cloud fallback for speed.
*   **Function**: Automatically routes user queries to the best-suited agent based on intent.
*   **Endpoint**: `POST /api/chat`

---

## 🛠️ Tech Stack

*   **Framework**: FastAPI (Python)
*   **Orchestration**: LangChain, LangGraph
*   **Local Inference**: Ollama
*   **Vector Database**: ChromaDB
*   **ML Libraries**: Scikit-Learn, Pandas

---

## 🚀 Usage

**Health Check:**
```bash
curl http://localhost:8000/health
```

**Assess Risk (Unified):**
```bash
curl -X POST "http://localhost:8000/api/shield/assess-risk" \
     -H "Content-Type: application/json" \
     -d '{"text": "Win lottery now", "transaction": {"transaction_amount": 50000, "avg_transaction_amount": 2000}}'
```
