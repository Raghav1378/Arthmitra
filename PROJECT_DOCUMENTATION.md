# 🔱 ArthMitra v3.0 - Project Documentation

**Project Name:** ArthMitra  
**Status:** v3.0 (Dual-Mode Intelligence)  
**Architecture:** Hybrid AI Swarm (Local Ollama + Groq Cloud + Deterministic ML)

---

## 1. Executive Summary

ArthMitra is a comprehensive financial security and intelligence ecosystem. It is designed to bridge the gap between complex financial regulations and user safety through a "Defense-in-Depth" strategy. 

### Key Design Principles:
- **Calibrated Risk:** Uses a realistic "Fraud Analyst" confidence model to avoid over-blocking.
- **Dual-Mode RAG:** Synchronizes private local document retrieval with real-time web research (Tavily).
- **Hybrid Inference:** Seamlessly toggles between local offline models (Ollama/Qwen) and high-speed cloud models (Groq/Llama 3.1).
- **Visual Intelligence:** Translates dry financial data into interactive charts (Bar, Line, Pie).

---

## 2. System Architecture (v3.0)

### A. Frontend Console (`/frontend`)
- **Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, Framer Motion.
- **Interface Pillars:**
    - **Mitra AI Chat:** The primary command center for financial advice and chart generation.
    - **Scam Shield v2:** A dual-tabbed security module (Message Scanner + Behavior Engine).
    - **RAG Dashboard:** Manage and query uploaded financial documents with source verification.

### B. Distributed Backend (`/backend`)
- **Tech Stack:** FastAPI, LangChain, LangGraph, Scikit-Learn.
- **Logic Layers:**
    1. **Intelligent Swarm Router:** Automatically routes intent to specialized agents (Auditor, Shield, Mitra).
    2. **Scam Shield Antigravity v2:** Combines supervised ML screening with LLM-based behavioral reasoning.
    3. **The Behavior Engine:** Analyzes transaction patterns (amounts, timing, frequency) using a realistic analyst confidence model.

---

## 3. Core Technical Capabilities

### 🛡️ A. Scam Shield Antigravity (Security)
*Objective: Professional-grade fraud detection for the Indian digital ecosystem.*

1. **Message Scanner (Text UI)**
   - **Logic:** Detects threats, payment requests, and suspicious links (SBI, Paytm, HDFC contexts).
   - **Calibration:** Strictly separates "Informational" from "Threat" (e.g., distinguishing "Verify info" vs "Account Blocked").

2. **Behavior Engine (Transaction UI)**
   - **Logic:** Identifies "pings" (₹1-₹10 verification scams) and high-velocity attacks.
   - **Confidence Model:** Uses a 10%-92% realistic clamping system. Starts at 50% baseline and adds/subtracts points based on "Anomaly Weights."

### 🧠 B. Integrated Brain (Knowledge)
*Objective: Unifying local documents with the live web.*

1. **Dual-Mode RAG**
   - **Private Layer:** ChromaDB stores indexed RBI circulars, tax laws, and user-uploaded PDFs.
   - **Public Layer:** Tavily API performs "Deep Research" for real-time market trends or breaking consumer laws.

2. **Interactive Visualizer**
   - **Mechanism:** Mitra Agent generates structured JSON chart blocks.
   - **Output:** Native React components render bar/pie/line charts for any numeric trend found in the conversation.

---

## 4. Setup & Deployment

### Prerequisites
- Python 3.10+, Node.js 18+
- Ollama (running locally)
- API Keys: `GROQ_API_KEY`, `TAVILY_API_KEY` (in `.env`)

### 🛠️ Quick Command reference
- **Backend:** `uvicorn main:app --reload` (Port 8000)
- **Frontend:** `npm run dev` (Port 3000)

---

## 5. Development Roadmap (Changelog)

- **v3.0:** Integrated **Behavior Engine** with realistic confidence clamping.
- **v3.0:** Added **Tavily Deep Research** toggle for online information extraction.
- **v2.5:** Implemented **Intelligent Swarm Router** (Auditor/Shield/Mitra separation).
- **v2.0:** Migrated infrastructure to **Groq Cloud** for 10x faster streaming response times.
- **v1.5:** Built original **Shield ML** TF-IDF/Random Forest pipeline.

---
*Document Version: 3.1.0 (March 2026)*
