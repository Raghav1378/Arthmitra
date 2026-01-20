# ArthMitra - End-to-End Project Documentation

**Project Name:** ArthMitra  
**Description:** Next-Gen AI Financial Assistant & Scam Prevention Shield  
**Architecture:** Hybrid AI System (Deterministic ML + LLM Swarm)

---

## 1. Executive Summary

ArthMitra is a comprehensive financial security platform designed to protect users from modern financial fraud while providing accurate, regulation-grounded financial advice. It combines **deterministic Machine Learning** (for high-speed, explainable scam detection) with **Generative AI** (for complex reasoning and conversational assistance).

The system is built on a "Privacy & Reliability First" principle:
- **Local Inference:** Uses local LLMs (via Ollama) where possible to ensure data privacy.
- **Strict Grounding:** The RAG system prioritizes official regulatory documents over general LLM knowledge.
- **Explainable AI:** Every risk assessment explains *why* a transaction was flagged (e.g., "High Velocity", "Keyword Match").

---

## 2. System Architecture

ArthMitra operates as a Monorepo with two distinct layers:

### A. Frontend (`/frontend`)
- **Tech Stack:** React, Vite, TailwindCSS (assumed).
- **Role:** Provides the user interface for:
    - **Chat Interface:** Interactive conversation with financial agents.
    - **Panic Button:** One-click emergency response.
    - **Scam Check UI:** Utilities to validate UPI IDs or Paste text for analysis.

### B. Backend (`/backend`)
- **Tech Stack:** FastAPI (Python), LangChain, Scikit-Learn.
- **Role:** Handles all logic, AI inference, and database interactions.
- **Components:**
    1.  **Router/API Layer:** Exposes REST endpoints.
    2.  **Shield Module (`shield_ml`):** Non-LLM machine learning for fraud detection.
    3.  **Brain Module (`brain`):** RAG system and Agent Swarm orchestration.

---

## 3. Deep Dive: Key Technical Capabilities

### 🛡️ A. Shield ML (Scam Detection Layer)
*Objective: Catch frauds without the latency or hallucination risks of LLMs.*

1.  **Text Scam Detector**
    - **Model:** TF-IDF Vectorizer + Logistic Regression.
    - **Logic:** Trained on scam SMS/Emails to detect urgency ("ACT NOW"), threats ("KYC BLOCKED"), and phishing links.
    - **Performance:** High speed (<50ms), ~91% accuracy on test data.

2.  **Transaction Risk Engine**
    - **Model:** Random Forest Classifier.
    - **Logic:** Analyzes metadata (Amount, Time, Receiver History) to detect patterns like "Smurfing" (many small transfers) or "Account Takeover" (sudden high value to new payee).
    - **Performance:** ~95% accuracy.

3.  **Anomaly Detection (Unsupervised)**
    - **Models:** One-Class SVM (Text), Isolation Forest (Transactions).
    - **Role:** Flags "Unknown Unknowns" - patterns that don't look like known scams but are statistically weird.

4.  **Policy Engine**
    - **Mechanism:** A set of 10 deterministic rules (R001-R010) that aggregate scores from all models to make a final `BLOCK`, `WARN`, or `ALLOW` decision.

### 🧠 B. The Brain (RAG & Knowledge)
*Objective: Provide legal/financial answers that are legally accurate.*

1.  **Source Discipline**
    - **Strict Priority:** 1. Regulatory Docs (RBI/Laws) -> 2. Official Guidelines -> 3. General Knowledge.
    - **Anti-Hallucination:** If confidence is low, the system explicitly states "I cannot find this in my connected documents" rather than guessing.
    - **Tone:** Neutral, professional, non-advisory (avoids "You should invest in X").

2.  **Vector Store**
    - **Tech:** ChromaDB.
    - **Content:** Indexed PDFs/Text of RBI Circulars, Income Tax Act, etc.

### 🤖 C. Intelligent Agent Swarm
*Objective: Route queries to the best expert.*

The system uses a **Router** to classify user intent and direct it to one of three specialized agents:
- **Auditor (`deepseek-r1`):** Mathematical precision, tax calculations, EMI logic.
- **Shield Agent (`qwen2.5-coder`):** Explains security risks, cybersecurity advice.
- **Mitra (`gemma3`):** General banking concepts, friendly financial literacy.

---

## 4. Setup & Installation Guide

### Prerequisites
- **Python:** 3.10 or higher
- **Node.js:** 18+
- **Ollama:** Installed and running.

### A. Environment Setup

1.  **Clone & Prepare**
    ```bash
    git clone <repo_url>
    cd arthmitra
    ```

2.  **Backend Setup**
    ```bash
    cd backend
    python -m venv .venv
    .venv\Scripts\activate  # Windows
    pip install -r requirements.txt
    ```

3.  **Frontend Setup**
    ```bash
    cd frontend
    npm install
    ```

4.  **AI Model Setup (Ollama)**
    Pull the required models:
    ```bash
    ollama pull deepseek-r1:7b
    ollama pull qwen2.5-coder:7b
    ollama pull gemma3:latest
    ollama pull nomic-embed-text
    ```

### B. Running the Application

1.  **Start Backend**
    ```bash
    # Terminal 1
    cd backend
    .venv\Scripts\activate
    uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
    ```
    *API Docs will be available at: http://localhost:8000/docs*

2.  **Start Frontend**
    ```bash
    # Terminal 2
    cd frontend
    npm run dev
    ```
    *App will be available at: http://localhost:5173*

---

## 5. Development Workflow

- **Git Strategy:**
    - A comprehensive `.gitignore` protects sensitive files (`.env`, `*.pkl`) and build artifacts (`node_modules`, `__pycache__`).
    - Always run tests and linting before committing.

- **Adding New Features:**
    1.  **ML:** Add training data to `shield_ml/data`, retrain using `train_models.py`.
    2.  **RAG:** Add new PDFs to `brain/rag/data`, run ingestion script.
    3.  **Agents:** Define new agent prompt in `brain/prompts`, update Router logic.

---

## 6. Recent Achievements (Changelog)

- **Feature:** Implemented End-to-End standalone `shield_ml` module with training pipeline and synthetic data generation.
- **Hardening:** Enforced strict source citation in RAG to prevent regulatory misinformation.
- **Fix:** Resolved Pydantic validation errors in RAG endpoints.
- **Infra:** Configured comprehensive Git ignore rules and resolved index locking issues.
