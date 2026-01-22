# ArthMitra - Detailed Backend Engineering Report

This document provides a deep technical dive into the ArthMitra backend. It explains the *why*, *how*, and *what* of every major component we have built, designed for developers and stakeholders to understand the system's core mechanics.

---

## 🏗️ 1. High-Level Architecture

ArthMitra is not just a chatbot; it is a **Hybrid AI System**. This means it combines two very different types of Artificial Intelligence to get the best of both worlds:
1.  **Deterministic AI (Shield ML):** Fast, rule-based, and zero-hallucination models for security.
2.  **Generative AI (The Brain):** Creative, understanding, and context-aware LLMs for advice.

### System Flow
```mermaid
graph TD
    User[User Request] --> API[FastAPI Router]
    
    subgraph "Layer 1: Security Shield"
        API -->|Scam Check| ML[Shield ML Engine]
        ML -->|Text| TFIDF[TF-IDF + LogReg]
        ML -->|Transaction| RFC[Random Forest]
        ML -->|Patterns| Anomaly[Anomaly Detection]
        TFIDF & RFC & Anomaly --> Policy[Policy Engine (10 Rules)]
        Policy -->|Block/Safe| API
    end
    
    subgraph "Layer 2: The Brain (Intelligence)"
        API -->|Chat/Query| Router[Agent Router]
        Router -->|Math/Tax| Auditor[Auditor Agent (DeepSeek)]
        Router -->|Security Info| ShieldAg[Shield Agent (Qwen)]
        Router -->|General Help| Mitra[Mitra Agent (Gemma)]
        
        Auditor & ShieldAg & Mitra --> RAG[RAG Knowledge Base]
        RAG -->|Retrieve Docs| VectorDB[(ChromaDB)]
        VectorDB -->|Context| RAG
    end
```

---

## 🛡️ 2. Shield ML: The Security Core
**Problem:** Large Language Models (LLMs) are too slow (average 2-5 seconds) and prone to "hallucnination" (making things up) to be trusted with real-time fraud blocking.
**Solution:** We built a dedicated, lightweight Machine Learning module that runs locally and gives answers in milliseconds.

### A. Text Scam Detector
*   **How it works:** It turns text into numbers (TF-IDF) and checks for "scammy" words.
*   **The "Secret Sauce":** It doesn't just look for words like "bank"; it looks for *combinations* that indicate **urgency** + **threat** (e.g., "KYC Expires Today" + "Link").
*   **Tech Stack:** `scikit-learn`, `LogisticRegression`.
*   **Key File:** `app/shield_ml/text_predict.py`

### B. Transaction Risk Engine
*   **How it works:** It looks at the *metadata* of a transfer, not the content.
*   **What it catches:**
    *   **Velocity:** 10 transfers in 1 minute? Flag it.
    *   **New Receiver:** Sending ₹50,000 to a brand new person at 2 AM? Flag it.
*   **Tech Stack:** `RandomForestClassifier`.

### C. The Policy Engine (Decision Maker)
We don't let the AI decide alone. We use a **Deterministic Policy Layer**.
*   **Rule R009 (Corroboration):** If the Anomaly Detector says "Weird" but the Risk Engine says "Safe", we just **WARN**, we don't **BLOCK**.
*   **Rule R001 (Critical):** If a known phishing link is found, **BLOCK** immediately, no matter what else happens.

---

## 🧠 3. The Brain: Financial RAG (Retrieval-Augmented Generation)
**Problem:** LLMs like GPT or Llama don't know the specific rules of the *Income Tax Act 1961* or the latest *RBI Circular on Credit Cards*. They guess.
**Solution:** RAG (Retrieval-Augmented Generation). We "teach" the AI by giving it an open-book test.

### How a Query is Answered:
1.  **User Asks:** "What is the penalty for late ITR filing?"
2.  **Retrieval:** The system searches our local database (ChromaDB) for official government documents (PDFs) that mention "ITR penalty".
3.  **Context Injection:** It finds passage: *"Section 234F: Late fee of Rs 5,000..."*
4.  **Generation:** The LLM is told: *"Answer the user ONLY using this passage."*
5.  **Result:** Accurate, legally-cited answer.

### Special Feature: Source Discipline
We added a special safety check. If the LLM tries to answer without finding a source document, the system **forces** it to say "I don't know" instead of guessing.

---

## 🤖 4. The Agent Swarm
**Problem:** One AI model cannot be good at everything. A model good at writing poetry is usually bad at math.
**Solution:** A "Swarm" of specialized agents.

| Agent Name | Model Used | Specialty | Why? |
| :--- | :--- | :--- | :--- |
| **Auditor** | `deepseek-r1` | Math & Logic | This model is fine-tuned for reasoning. It won't mess up EMI checks. |
| **Shield** | `qwen2.5-coder`| Code & Security | Designed to understand code and technical threats like SQL Injection or Phishing URLs. |
| **Mitra** | `gemma3` | General Conversation | Friendly, lightweight, and great for explaining simple concepts to users. |

### The "Router"
We built a smart classifier that listens to the user.
*   User: *"Calculate my tax"* -> Router sends to **Auditor**.
*   User: *"Is this link safe?"* -> Router sends to **Shield**.

---

## 🔌 5. Infrastructure & Engineering Standards

### Folder Structure
We organized the backend to be modular. You can delete the "Brain" folder, and the "Shield" will still work perfectly.
```text
backend/
├── app/
│   ├── brain/          # LLM, RAG, and Agents
│   │   ├── rag/        # Vector DB and Ingestion scripts
│   │   └── agents/     # Prompts and Router logic
│   ├── shield_ml/      # Pure ML models (pkl files)
│   └── main.py         # The entry point
```

### Git Hygiene & Security
We realized early on that committing large files crashes Git.
*   **Fixed:** Added `*.pkl` (Model files) and `chroma_db/` (Vector store) to `.gitignore`.
*   **Fixed:** Added `.env` to `.gitignore` to prevent leaking API keys.

---

## 6. What's Next? (Roadmap)
*   **Frontend Integration:** Connecting this powerful backend to the React UI.
*   **Voice Mode:** Adding Speech-to-Text to let users talk to Mitra.
*   **Real Deployment:** Dockerizing the app for cloud hosting.
