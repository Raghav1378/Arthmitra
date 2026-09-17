# ArthMitra — Demo Pitch Guide

End-to-end demo script. Only live, working features. Honest framing.

---

## One-line pitch

> "ArthMitra is a financial safety layer for India: it checks suspicious messages, links, UPI handles, and spending behaviour before money leaves your account, then explains the decision with RBI-grounded guidance."

## Best 90-second pitch

> "Digital payments are fast, but scams are designed to make people act before they think. A caller can impersonate a bank, a police officer, or a family member and create pressure in seconds. The problem is bigger than any single headline: official complaint counts only show reported incidents, and many victims never report.
>
> ArthMitra is my answer to that gap. I built one local financial-safety app with four connected capabilities: Scam Shield analyses messages, links, and UPI handles; the behaviour engine checks suspicious transactions such as unusual timing or repeated small verification payments; the ledger keeps expenses and attaches a security audit; and the assistant explains what happened using Indian financial context and RBI guidance.
>
> The important design choice is trust. The final risk decision is reproducible: deterministic rules and a statistical model do the first check, policy logic resolves conflicts, and hard circuit breakers protect legitimate OTPs and verified bank alerts. AI is used for explanations and context, not as an unaccountable yes-or-no gate.
>
> In the demo, I will show a real bank OTP passing as safe, a defanged KYC link being caught, and a government-impersonation UPI request being blocked. That is ArthMitra: detect the pressure, explain the risk, and help the user pause before paying."

### Why this pitch works

- It starts with a human consequence: scams create urgency before a person can verify.
- It makes a specific product promise instead of claiming to solve all fraud.
- It distinguishes reported public incidents from ArthMitra's own measured test results.
- It shows the strongest product proof: safe legitimate messages pass, while disguised scams are still examined.

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

### Live public evidence (optional 45-second add-on)

Use the Chat tab with the live-research/Tavily mode enabled and ask:

```text
Find the latest official Indian cyber-fraud complaint and reported-loss figures.
Give the source organisation, publication date, reporting period, URL, and a
one-line caveat about under-reporting. Do not estimate victims from complaints.
```

Say:

> "This is a live public-data context check, not a fake real-time victim counter. Complaint data tells us what was reported; it does not tell us the true number of victims. ArthMitra uses that context to explain urgency, while its own performance is measured separately on regression tests and held-out evaluation data."

**The honest out-of-10 framing:** do not say "6 out of 10 Indians get scammed" unless a named survey supports that exact figure. Complaint totals cannot be converted into a probability for ten people. If the audience asks for a simple example, say: "For every 10 suspicious messages, the goal is to give each person a fast, explainable second opinion before they pay" - that is a product goal, not a population statistic.

If you need a dated statistic on a slide, show the exact reporting period and source next to it. Never label an annual official total as live or real-time.

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

> "Detection, ledger, audit, and an assistant — one local app. I built the safety layer around real Indian scam patterns: KYC phishing, Cyber-Cell extortion, job traps, lottery bait, defanged links, suspicious timing, and UPI impersonation. The result is not just a warning; it is a reasoned decision, a safer next action, and an audit trail."

### What you made, in one sentence

> "I built ArthMitra as a local-first financial safety assistant that combines deterministic scam detection, ML pattern screening, policy-based decisioning, RBI-grounded explanations, expense tracking, and an AI assistant in one workflow."

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
