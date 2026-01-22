# ArthMitra Backend - Active Features Detailed Breakdown

This document provides a comprehensive list of all currently active and deployed features in the ArthMitra backend.

---

## 🛡️ 1. Shield ML - Multi-Layer Fraud Detection
*A robust, hybrid AI system for real-time financial security.*

### A. Supervised Detection Layer (Known Patterns)
These models are trained on labeled datasets of known scams and legitimate transactions.
- **Text Scam Detector**:
    - **Algorithm**: TF-IDF Vectorization + Logistic Regression.
    - **Function**: Analyzes SMS/Text content.
    - **Detects**: Phishing links, urgent calls to action ("KYC update", "Account blocked"), lottery scams.
    - **Accuracy**: ~91% on test set.
- **Transaction Risk Detector**:
    - **Algorithm**: RandomForest Classifier.
    - **Function**: Analyzes numeric transaction metadata.
    - **Detects**: High-value transfers to new receivers, unusual velocity (many txns in short time), device mismatches.
    - **Accuracy**: ~95% on test set.

### B. Unsupervised Anomaly Layer (Novel Patterns)
These models learn "normal" behavior and flag anything that deviates, catching new/unknown attacks.
- **Text Anomaly Detector**:
    - **Algorithm**: One-Class SVM.
    - **Function**: Flags text patterns that deviate from standard banking communication.
    - **Role**: Acts as a "novelty detector" for new scam scripts.
- **Transaction Anomaly Detector**:
    - **Algorithm**: Isolation Forest.
    - **Function**: Flags transactions that are statistical outliers (e.g., huge amount at 3 AM from a new device).
    - **Role**: Catches "structuring" (smurfing) and sophisticated money laundering patterns.

### C. Policy Engine (Decision Layer)
- **10-Rule System**: A deterministic rules engine (R001-R010) that combines scores from all ML models.
- **Smart Escalation**:
    - **Corroboration**: Anomaly signals alone cannot trigger a BLOCK; they require supporting evidence (policy rule R009).
    - **Trust Signals**: Deducts risk score for verified users (R006) or regular recipients (R007).
    - **Risk Levels**: Maps final scores to LOW (0-39), MEDIUM (40-69), or HIGH (70-100).

### D. Unified Assessment API
- **Endpoint**: `POST /api/shield/assess-risk`
- **Capability**: Accepts BOTH text and transaction data in a single call.
- **Output**: Returns a holistic risk decision, score, and *human-readable reasons* (e.g., "High Confidence Detection", "Novel Pattern Warning").

---

## 🔍 2. UPI ID Validator & Risk Meter
*Preventive safety check to stop scams before payment initiation.*

### Core Capabilities
- **Pre-Payment Analysis**: Validates UPI IDs (e.g., `refund@ybl`) instantly.
- **Rule-Based Scoring**: Uses 11 heuristic rules, NO black box AI.
- **Advisory Output**: Returns a Risk Score (0-100) and detailed reasons.

### Detection Logic
- **Impersonation**: Detects mismatches between Display Name and Handle (e.g., Name="SBI Support" but Handle=`user123@okicici` → HIGH RISK).
- **Scam Keywords**: Aggressively flags handles containing "refund", "cashback", "offer", "verification".
- **Structural Analysis**: Flags handles with random patterns, excessive digits, or known "burner" patterns.
- **Trust Signals**: Lowers risk for clean, alphabetic handles or verified merchant suffixes.

### Endpoints
- `POST /api/shield/validate-upi`: Detailed analysis.
- `GET /api/shield/validate-upi-quick`: Lightweight check for UI integration.

---

## 🧠 3. The Brain - Financial RAG System
*Retrieval-Augmented Generation for grounded, fact-based financial answers.*

### Core Capabilities
- **Knowledge Base**: Built on verified documents (RBI Circulars, Consumer Protection Act, Tax Laws).
- **Vector Search**: Uses `all-minilm` (via Ollama) to find the most relevant document chunks.
- **Strict Source Discipline**:
    - **Anti-Hallucination**: If the answer isn't in the valid context, it explicitly returns "I don't have verified information".
    - **Confidence Scoring**: Returns HIGH/MEDIUM/LOW confidence based on context overlap.
    - **Zero-Guessing Policy**: Temperature set to 0.1 to prevent creative fabrication of financial rules.

### Usage in Code
You can import the RAG function directly into any FastAPI router or specialized agent:
```python
from app.brain.brain_api import ask_financial_question

# Returns dict with 'answer', 'sources', and 'confidence'
response = ask_financial_question("What is the penalty for late ITR?")
```

### Endpoints
- `POST /api/brain/ask`: Query the knowledge base.
- `POST /api/brain/summarize`: Summarize complex financial documents.

---

## 📈 4. Financial Planner Engine
*Deterministic logic for personal finance calculations.*

### Core Capabilities
- **Goal Retro-Planning**:
    - **Logic**: Calculates required monthly investments (SIP) to reach a future financial goal.
    - **Inflation Aware**: Automatically adjusts future target amounts based on inflation (default 6%).
    - **Projection**: Shows the gap between current savings path vs. required path.
- **Budget Guardian (Safe-to-Spend)**:
    - **Logic**: Calculates the daily spending limit based on defined income and fixed expenses.
    - **Dynamic Updating**: If you overspend today, the daily limit for tomorrow decreases automatically.

### Endpoints
- `POST /api/planner/analyze`: Run full analysis (Budget + Goals).
- `POST /api/planner/calculate-goal`: Calculate SIP requirements for a specific target.
- `POST /api/planner/check-budget`: Get today's "Safe-to-Spend" number.

---

## 🤖 5. Intelligent Multi-Agent Chat
*Context-aware AI assistance for financial queries.*

### The Agent Swarm
1.  **Auditor Agent (`auditor`)**:
    - **Model**: `deepseek-r1:7b`
    - **Specialty**: Precision math, Tax calculations, EMI schedules.
    - **Personality**: Analytical, precise.
    - **Tools**: Access to Planner Engine.
2.  **Shield Agent (`shield`)**:
    - **Model**: `qwen2.5-coder:7b`
    - **Specialty**: Security auditing, explaining why a transaction was blocked, safety tips.
    - **Personality**: Cautious, protective.
    - **Tools**: Access to Shield ML models.
3.  **Mitra Agent (`mitra`)**:
    - **Model**: `gemma3:latest`
    - **Specialty**: General financial literacy, definitions, banking advice.
    - **Personality**: Friendly, educational.
    - **Tools**: Access to "The Brain" (RAG).
4.  **Groq Agent (`groq`)**:
    - **Model**: `llama-3.1-8b-instant` (Cloud)
    - **Specialty**: Rapid responses for simple queries.

### Smart Router
- **Auto-Routing**: The system parses user messages for keywords (e.g., "tax" → Auditor, "scam" → Shield) and routes to the best expert automatically.
- **Clean Output**: All AI responses are post-processed to remove artifacts (`\n`, markdown clutter) for clean UI relationships.

---

## 🔌 6. API & Infrastructure
- **FastAPI Framework**: High-performance async backend.
- **Swagger Documentation**: Interactive API testing available at `/docs`.
- **Model Transparency**: Every API response includes a `models_used` field, telling the frontend exactly which algorithms contributed to the decision.
- **Health Checks**: Standard `/health` endpoint for monitoring.
