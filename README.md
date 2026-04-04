# 🔱 ArthMitra v3.0

> **Empowering Financial Intelligence with Hybrid AI & Autonomous Security.**

ArthMitra is a state-of-the-art financial security and intelligence platform. It combines high-performance LLM orchestration with dedicated ML-risk engines to provide users with expert guidance and defense against financial fraud.

---

## ⚡ Core Pillars

### 🛡️ 1. Scam Shield Antigravity v2
A dual-engine fraud detection system designed for the Indian digital payment landscape.
*   **Message Scanner**: Detects phishing, KYC threats, and lottery scams in texts using supervised ML and LLM reasoning.
*   **Behavior Engine**: Mimics real-world bank fraud analysts to flag suspicious transactions based on amount patterns (e.g., UPI ₹1 pings), odd timing (12 AM–6 AM), and frequency spikes.

### 🧠 2. Dual-Mode RAG (Retrieval-Augmented Generation)
*   **Local Brain**: Zero-latency retrieval from your private documents (RBI circulars, Tax laws, EMI guides) using ChromaDB.
*   **Global Research**: Advanced Tavily integration for deep-web extraction and real-time market analysis.

### 🤖 3. Intelligent Swarm Router
Queries are automatically routed to specialized autonomous agents:
*   **The Auditor**: Precise math, calculations, and tax auditing.
*   **The Shield**: Security-first analysis of suspicious links and messages.
*   **The Mitra**: Friendly, proactive financial consultancy and budget planning.

---

## 🎨 Professional UI Experience
*   **Glassmorphism Console**: A premium, dark-themed command center built with Next.js and Tailwind CSS.
*   **Interactive Charts**: Effortlessly visualize your finances. Simply ask "Plot my monthly savings," and the AI generates real-time Bar, Line, or Pie charts.
*   **Micro-Animations**: Powered by Framer Motion for a fluid, responsive interaction experience.

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | Next.js 14, TypeScript, Framer Motion, Lucide Icons |
| **Backend** | FastAPI, Python 3.10+ |
| **Orchestration**| LangChain, LangGraph |
| **LLMs** | Llama 3.1 (Groq Cloud), Qwen 2.5 (Local), Gemma (Local) |
| **Database** | ChromaDB (Vector Store), Scikit-Learn (ML screening) |
| **Research** | Tavily Search API |

---

## 🚀 Quick Start

### 1. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
python main.py
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### 3. Environment Configuration
Create a `.env` file in the root:
```env
GROQ_API_KEY=your_key_here
TAVILY_API_KEY=your_key_here
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

---

## 🛡️ Trust & Privacy
ArthMitra supports **Offline-First Mode**. Toggle to "Local Only" in the Shield console to use local Ollama models (Llama 3.2), ensuring your sensitive financial data never leaves your machine.

---
*Developed by Raghav1378 — Redefining Financial Security.*
