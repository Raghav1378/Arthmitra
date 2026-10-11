# ArthMitra: Product and LinkedIn Video Brief

This document explains the current product flow and provides a fact-checked prompt for creating a five-minute LinkedIn product explainer. It was checked against the current frontend and backend code. Where older project documents make broader claims, this brief prefers the behavior implemented in the application.

## ArthMitra in one sentence

ArthMitra is a personal-finance and financial-safety workspace. Its central differentiator is Scam Shield: users can submit suspicious messages or payment details for a reasoned risk assessment. Other tools help users review spending, recurring costs, savings goals, loan scenarios, and financial questions.

ArthMitra is not only an investing app. The current main feature set does not provide stock trading, brokerage, portfolio management, or a live stock-market feed.

## End-to-end product flow

1. The user signs in and chooses a tool in the web app.
2. The Next.js frontend sends the submitted question or data to the FastAPI backend.
3. The backend applies the appropriate logic: deterministic scam checks, a classifier, an optional language model, database operations, or financial calculations.
4. The frontend displays the response: an explained risk assessment, an assistant answer, or a financial summary.
5. Supported records, such as expenses, goals, subscriptions, and scam scans, are stored for the authenticated user.

The product is user-initiated. It does not continuously monitor a user's SMS inbox, bank account, payment activity, or investment portfolio.

## Scam Shield: the primary product story

Scam Shield helps a person pause and inspect warning signs in information they choose to provide. Depending on the selected mode, a user can:

- Submit an SMS or chat message for analysis.
- Upload a screenshot; the backend extracts text with OCR and analyzes it if the OCR engine is installed and available.
- Check a URL or UPI ID against programmed heuristics.
- Describe a payment situation and receive a rules-based `PAY`, `VERIFY_FIRST`, or `DO_NOT_PAY` assessment.
- Enter transaction details such as amount, time, and frequency for a behavior-pattern assessment.
- Review saved scan history, manage trusted phone numbers or UPI IDs, and submit feedback about a scan.

### Message analysis, step by step

1. **Prepare the input.** The engine normalizes some invisible characters, common misspellings, and defanged URLs such as `hxxps` or `[.]`.
2. **Collect rule evidence.** Deterministic patterns look for signals such as threats, urgency, requests for payment or credentials, reward bait, and impersonation.
3. **Inspect links and recipient context.** URLs and UPI-style handles are evaluated with programmed checks. A phone number or handle not in the user's trusted contacts can be a supporting signal in a money-request context.
4. **Add classifier evidence.** A TF-IDF and Logistic Regression text classifier can add a `safe`, `suspicious`, or `high_risk` prediction. It is one input, not the final decision.
5. **Optionally add semantic context.** If the backend has a Groq API key, a Groq language model may assess contextual signals such as social engineering, impersonation, or an emergency pretext. If unavailable, this stage can be skipped; the rest of the pipeline still produces a result.
6. **Resolve the evidence with policy.** A deterministic policy engine is the final authority for the message verdict. It considers corroboration and applies hard rules such as protections for certain verified-domain and legitimate OTP-notification shapes. The LLM does not decide alone.
7. **Explain the result.** The response can include `SAFE`, `SUSPICIOUS`, or `HIGH_RISK`, a risk score, confidence, evidence/signals, reasoning, advice, and relevant guidance. Risk score and confidence are different quantities.
8. **Save it for review.** The app can store the scan in per-user history and accept user feedback. Do not claim feedback automatically retrains the model.

The linked domain checks are heuristics, not a live website inspection or a guarantee that a URL or payment recipient is safe. A behavior check sees only the details the user supplies; it is not observing a bank transaction. Payment-decision output is advice; the product does not execute or block payments.

### A good illustrative Scam Shield scene

Use a clearly fictional message such as: “Your account may be restricted today. Verify now at `example-check.invalid`.” Show the user choosing to submit it, the scan highlighting urgency and a suspicious link, and the result explaining that they should verify through an independent official channel. Label all sample content as illustrative. Do not invent a score or verdict: if the film shows a numerical result, run the exact example against the current app first and use its actual output.

## Mitra Chat: ask questions, explore information

Mitra Chat is the main streaming assistant. The app lets the user select local Ollama or Groq cloud, subject to the backend configuration. The configured default provider is local Ollama unless environment settings select an available Groq provider.

The chat can:

- Stream a response and route its response style using simple keyword-based categories such as finance, scam safety, or general questions. In this chat path, describe routing as prompt/style selection, not several autonomous agents collaborating.
- Accept files and use relevant content from session documents as answer context.
- Use optional Tavily web search and deep research when configured. The backend can also request search for time-sensitive questions; do not imply that every answer is live web research.
- Display supported charts and maintain chat history.

Chat may discuss investment concepts as educational conversation. It is not a broker, trade-execution platform, or guaranteed investment adviser.

Selecting a local model is not a blanket privacy guarantee for every app feature: cloud model selection, optional web research, uploaded files, and backend configuration affect how requests are processed. Avoid unsupported claims such as “everything always stays on-device.”

## Wealth Auditor / Ledger: make everyday cash flow legible

The Ledger is titled **Wealth Auditor** in the interface. Users can record income and spending, assign categories, and see inflow, outflow, net amounts, and charts. They can import a CSV statement; CSV rows are parsed and stored, while other supported text-based extraction uses a language model.

The app can separately analyze a supplied transaction description and details such as amount and time for risk patterns. It can also generate brief AI-written spending insights from submitted expense summaries. These are distinct from Scam Shield's message verdict and should not be presented as a complete financial audit.

The Ledger does not automatically connect to banks or fetch live transactions.

## Other money tools

### Savings Goals

Users can create a goal, target amount, saved amount, and optional target date, then add contributions and see progress. If a date is supplied, the interface estimates a simple amount to save per month to cover the remaining target. It is a tracker and calculation—not automatic investing or an SIP service.

### Subscriptions

Users manually add recurring payments with a frequency and optional due date. The app shows active subscriptions and calculated monthly/yearly costs and due-date information. It does not discover subscriptions from a bank account or cancel them.

### EMI Compare

The user enters two loan amounts, annual rates, and tenures. The app calculates monthly EMI, estimated total repayment, interest, and the difference between the scenarios. It does not fetch or verify live lender offers; a lower total cost may still have a less affordable monthly payment.

### Advisor

Advisor is separate from Mitra Chat. It uses local Ollama in the current implementation and can answer using a snapshot of the user's active subscriptions, savings goals, and recent Scam Shield history. It does not receive the Ledger's expense history in that snapshot.

### Market Intel

The current Market Intel screen is a fraud-vendor comparison/visualization with hardcoded frontend data. Its “rescrape” interaction is a timed UI simulation, not a demonstrated live vendor scrape. This is not stock-market intelligence and should not be used to make claims about independently verified competitor benchmarks.

## Claims to avoid in the video

- “ArthMitra prevents all scams,” “guarantees safe payments,” or “blocks fraudulent payments.”
- “Automatically monitors your bank, SMS, UPI payments, or investments.”
- “100% accurate,” “bank-grade,” “RBI-approved,” or an unsupported accuracy/latency guarantee.
- “A verified link or UPI handle proves the recipient is genuine.”
- “All chat answers use live/current web data,” or “every feature stays on your device.”
- “Mitra is a stock picker,” “ArthMitra recommends guaranteed returns,” “manages portfolios,” or “executes trades.”
- “Market Intel tracks live stocks or independently benchmarks fraud vendors.”
- “Advisor reads all financial data”; its current snapshot is limited to subscriptions, goals, and scam-scan history.
- “User feedback immediately trains or updates the detector.”

## Ready-to-use prompt for a five-minute LinkedIn explainer

```text
Create a polished, approximately five-minute LinkedIn product-explainer video for ArthMitra using the verified product brief below. First understand the product accurately; then create one cohesive story with a beginning, middle, and end. Do not simply make a fast feature montage.

PRIMARY POSITIONING
ArthMitra is a personal-finance and financial-safety workspace, not just an investing app. Investing is only one part of financial wellbeing: protecting money from suspicious requests, understanding everyday spending, tracking recurring costs, setting savings goals, comparing loan scenarios, and asking useful financial questions matter too.

Make Scam Shield the central differentiator and give it the most screen time. The key audience takeaway should be: “When a suspicious message or payment request creates pressure, ArthMitra helps you pause, inspect the warning signs, and make a more informed decision.”

FACT-CHECKED PRODUCT BEHAVIOR
Scam Shield:
- The user chooses what to submit: a message, screenshot (OCR must be available), URL/UPI ID, payment scenario, or transaction details.
- Message analysis gathers deterministic rule evidence, checks relevant URL/UPI and recipient signals, and may use a TF-IDF + Logistic Regression classifier.
- If configured, Groq may provide optional semantic context. Groq is not always available and does not decide the final message verdict.
- A deterministic policy engine is the final authority for the message verdict and resolves the evidence.
- The UI can show a risk category, risk score, confidence, signals/evidence, reasoning, and advice. Risk score is not accuracy; confidence is a separate value.
- Link/UPI checks are programmed heuristics, not proof that a site or recipient is safe. Behavior analysis uses submitted information, not a live bank feed. Payment guidance does not execute, authorize, or block payments.
- Scans may be saved to history, and users can manage trusted contacts and submit feedback. Do not claim feedback automatically trains the model.

Other current features:
- Mitra Chat streams answers and can use local Ollama or Groq cloud depending on configuration. Uploaded session documents may provide context. Optional Tavily search/deep research is available when configured; the backend may also search for time-sensitive queries. Do not suggest every answer is live.
- Wealth Auditor/Ledger lets users record income and expenses, categorize activity, view summaries/charts, import CSV transactions, separately run transaction risk analysis, and get brief AI-generated spending insights. It does not automatically connect to a bank.
- Savings Goals tracks manually entered targets, contributions, progress, and a simple monthly-to-target estimate when a date is provided. It does not automatically invest.
- Subscriptions are manually tracked. The app summarizes recurring monthly/yearly costs and due dates; it does not auto-detect or cancel subscriptions.
- EMI Compare calculates and compares two user-entered loan scenarios; it does not fetch live lender offers.
- Advisor is distinct from Mitra Chat, uses local Ollama in the current implementation, and can use a snapshot of tracked subscriptions, savings goals, and recent Scam Shield history. It does not read the Ledger in that snapshot.
- Market Intel is currently a fraud-vendor comparison screen with hardcoded frontend data and a simulated rescrape interaction. It is not live stock-market intelligence or a verified competitor benchmark; omit it from the hero story.
- The main feature set has no stock brokerage, trade execution, portfolio management, or guaranteed investment recommendations.

STORY AND APPROXIMATE SCENE TIMING
0:00–0:25 — Open on a clearly fictional, urgent scam-style message. Create tension through believable wording, not horror or fearmongering. Use fictional names and domains.
0:25–0:55 — Establish the human problem: urgency and pressure make it difficult to inspect a message before paying. Introduce the idea that financial wellbeing is about both protecting and managing money.
0:55–2:40 — Hero sequence: demonstrate the real Scam Shield journey. Show a user submitting the fictional message; visualize normalization and signal checks; reveal urgency/link evidence; show optional semantic analysis as conditional; clearly show the policy engine as final decision-maker; present an understandable result and a next step such as verifying independently through an official channel. Do not invent verdicts, scores, accuracy, or performance metrics. If displaying an exact numeric result, verify it with the running product first.
2:40–3:20 — Mitra Chat: show a practical financial question and a streaming answer. Briefly and accurately distinguish selectable local Ollama and Groq cloud from optional document context and optional live research.
3:20–4:05 — Wealth Auditor/Ledger: show example income/expense entries, a readable cash-flow summary, and the separate transaction audit. Label examples as illustrative and do not imply bank syncing.
4:05–4:40 — Savings goals, recurring subscriptions, and EMI Compare. Show one tangible use for each and make clear they are planning/tracking tools, not automatic investing, cancellation, or live lender feeds.
4:40–4:52 — Advisor: show how it can discuss the user's tracked goals, subscriptions, and scam-scan history; identify it as the separate local-Ollama assistant.
4:52–5:00 — Close on calm confidence and the ArthMitra brand. Suggested line: “Protect your money. Understand your choices. Move with confidence.” Do not invent a signup offer, pricing, availability, or launch claim.

VISUAL DIRECTION
Use refined, editorial financial-product design consistent with ArthMitra's actual interface. Prioritize readable interface details, thoughtful typography, clear transitions, and deliberate pacing. Preserve risk-color meaning if using risk colors: mint/safe, amber/caution, coral/danger. Make the Scam Shield evidence-to-policy-to-result flow visually understandable.

Avoid generic cyber imagery, code rain, hooded hackers, excessive glowing padlocks, fake bank screens, false alert animations, and frantic editing. Keep the tone reassuring, human, credible, and confident—not alarmist. Use on-screen text sparingly and hold it long enough to read. Include captions suitable for silent LinkedIn viewing. Use a concise voiceover that explains rather than repeats every label. Clearly mark any recreated interface or sample figures as illustrative.

DELIVERABLE
Provide a scene-by-scene storyboard with timestamps, narration, on-screen copy, visuals/motion, and transitions. Keep the full version close to five minutes and do not rush the Scam Shield story. Also suggest a short teaser cut derived from the same footage, but do not replace the requested full explainer with the teaser.

Before finalizing, audit every product claim against the verified facts above. Explicitly list any proposed claim you removed because it was unsupported. Never claim guaranteed fraud prevention, automatic monitoring, bank integration, payment blocking, perfect accuracy, live stocks, trading, portfolio management, or guaranteed returns.
```
