# ArthMitra — Demo Pitch Guide

End-to-end demo script. Only live, working features. Honest framing.

---

## One-line pitch

> "ArthMitra — UPI fraud detection with deterministic rules + RBI guideline citations, a full expense ledger with per-transaction risk auditing, and an AI assistant. Runs locally, end to end, in under 50ms per scan."

---

## Pre-demo checklist (2 minutes before)

```powershell
# 1. Kill any zombie backend on port 8000
Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue |
  ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }

# 2. Start backend (from backend/)
cd C:\Users\91800\Desktop\arthmitra\backend
.\run_dev.ps1
# Wait for: "Application startup complete." (~10s)

# 3. Start frontend (new terminal, from frontend/)
cd C:\Users\91800\Desktop\arthmitra\frontend
npm run dev
# Open http://localhost:3000
```

**Dry-run the test messages below once before the audience arrives.** No surprises on stage.

---

## Demo flow (5 acts, ~10 minutes)

### Act 1 — The Hook: Scam Shield catches what humans miss (3 min)

Open the **Scam Shield** tab. Paste these one at a time:

**1. The Cyber-Cell extortion scam (HIGH risk):**
```
Your mobile number will be deactivated in 2 hours by Telecom Regulatory Authority. A case has been registered under Cyber Crime. Press 1 to talk to officer.
```
→ HIGH risk. Show: risk score, reasoning, advice list, RBI guideline reference.

**2. The moment that wins the room — real bank OTP reads SAFE:**
```
Your OTP for netbanking login is 482913. Do NOT share with anyone, including HDFC Bank employees. Never share OTP/Card details.
```
→ SAFE (score ≤ 10). Point out: "Most naive classifiers flag every OTP message as fraud. Ours has a circuit breaker — legitimate bank alerts pass through."

**3. Defanged phishing link (the sneaky one):**
```
Dear customer your KYC is pending, update now: hxxp://hdfcbank.com.login-auth-sec[.]top/verify
```
→ HIGH. "Attackers defang URLs to bypass filters — we de-fang them back and score the real domain."

**4. Government VPA impersonation:**
```
UPI collect request from gov-refund-dept@okicici of Rs 1,50,000
```
→ HIGH 85. "Government departments never collect money through a personal ICICI handle."

**Talking point:** "Every verdict is deterministic — same input, same output, under 50 milliseconds. No LLM in the decision path, so it can't hallucinate a risk score. And each verdict cites the relevant RBI guideline — like the Zero Liability rule that protects you if you report fraud within 3 days."

---

### Act 2 — The Ledger: expenses with a security audit (3 min)

Open the **Ledger** tab.

**1. Add a normal entry** — type in the entry bar:
```
Rs 850 groceries from kirana store
```
→ Entry appears, category auto-detected (Groceries), inflow/outflow figures update.

**2. Add a suspicious one:**
```
Rs 5000 transfer to unknown at 2 AM
```
→ Entry + **Run Audit** → flagged HIGH: odd timing, suspicious context. Security Pulse score drops, "Action Req" badge appears. Click the Security Pulse → threat modal with reasoning, advice, and signals (suspicious timing, repeat pattern).

**3. CSV import** — click the **+ / Import** button, pick a small CSV bank statement:
- Live progress bar, item-by-item extraction
- Each row becomes an audited ledger entry

**4. Persistence proof** (if asked): "The ledger is SQLite-backed — restart the app, your data is still there."

---

### Act 3 — AI Assistant (1 min)

Chat tab. Ask:
```
Someone is asking me to share my OTP to receive a refund. What should I do?
```
→ Groq-powered streaming answer, grounded in Indian context.

**Talking point:** "Groq gives near-instant responses. The assistant is for explanation — the risk verdicts stay deterministic."

---

### Act 4 — Document Intelligence (1 min, optional)

Documents tab: upload a PDF (e.g., RBI circular), ask a question about it — retrieval-grounded answer from the ingested document.

---

### Act 5 — Close (30 sec)

> "Detection, ledger, audit, and an assistant — one local app. The engine has 35+ regression tests around real Indian scam patterns: KYC phishing, Cyber-Cell extortion, job traps, lottery bait, defanged links."

---

## Architecture slide (if asked)

```
Next.js (dark theme, 142 kB first load)
        │
FastAPI ── /scam/analyze     ── hybrid engine (60% rules + 40% TF-IDF classifier,
        │                       hard circuit breakers, RBI guideline lookup)
        ├─ /expenses CRUD     ── SQLite (persists across restarts)
        ├─ /expense/extract   ── CSV → LLM extraction
        ├─ /expense/insights  ── Groq "Wealth Strategist"
        └─ /chat              ── Groq streaming
```

---

## Honest answers for likely questions

| If they ask… | Say… |
|---|---|
| "Is the ML model trained on real data?" | "The statistical layer is trained on a synthetic dataset of 5,000 Indian scam templates — it's a template classifier, deliberately conservative. Real data would be a fine-tuning step; the rules layer is what does the heavy lifting today." |
| "Is it multi-agent?" | "It's a routing pipeline — input type routes to the right analyzer. 'Multi-agent' would oversell it." |
| "Production ready?" | "It's a local single-user prototype. Auth, multi-tenancy, and deployment hardening are the next milestone." |
| "False positives?" | "The biggest problem in this space is flagging every bank SMS as fraud. We built circuit breakers specifically for that — verified domains and legitimate OTP alerts cap at safe." |
| "Why not just an LLM?" | "LLMs hallucinate and cost latency. Risk scores must be reproducible and instant. LLMs are used where they shine: explanations, insights, and extraction." |

---

## What NOT to say

- "Trained ML model" (it's a template classifier on synthetic data)
- "Multi-agent system" (it's a keyword router)
- "Production-ready" (local prototype, no auth, permissive CORS)

Understate, then overdeliver.
