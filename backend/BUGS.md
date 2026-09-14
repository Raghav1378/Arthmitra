# ArthMitra — Bug Tracker

Live audit findings. Status: `OPEN` → `FIXING` → `FIXED` (verified) / `WONTFIX`.
Rule: no fix without root cause + failing test first.

---

## 🔴 Critical — FP regressions from Phase-2-fix regexes (audit 2026-09-12)

### BUG-001: `emergency impersonation` fires on genuine family SMS
- **Status:** FIXED (rule layer) / ML residual documented
- **Fix shipped:** signal now requires money component (`bhejo|send|transfer|pay|rupees|rs|₹`) + family term. "Mummy admitted to hospital" → SAFE 0, zero signals. Self-tests added.
- **Residual (documented, by architecture):** "Papa urgent: call me back" — ML says high_risk (TF-IDF negation-blind + no safe personal-message training data) AND the LLM independently flags it as social engineering (HIGH_RISK 80). Two-engine consensus on an ambiguous message = defensible verdict, not a bug. Attempts to fix via ML: new training families ✗ (collapses otp_phish/romance/crypto recall 0.79→0.07; quality gate correctly ABORTed), oversampling ✗, negation-marking preprocessor ✗ (fixes FPs, poisons scam recall AND breaks T17). Bag-of-words cannot represent negation — this is the LLM Stage-2's job.

### BUG-002: `credential harvest` fires on banks' own security advice
- **Status:** FIXED (rule layer + LLM layer)
- **Fix shipped:** negative lookahead `(?=never|do not|dont) ask|share|verify|request)` blocks negated advice. "HDFC never ask" → no strong signal. Final verdict SAFE 14 via Stage-2 LLM benign dissent (verified live). ML remains negation-blind (architecture ceiling, same as BUG-001).
- **Known ceiling:** adversarial "never asks, but confirm your password now" also blocked by whole-text negation — same ceiling as existing `sensitive info request` lookbehinds.

### BUG-003: MSG2 regression (original Phase-1 failure case)
- **Status:** FIXED
- **Fix shipped:** combo regex now matches bare `5000 bhejo` (digit + transfer verb, no ₹ prefix). MSG2 → HIGH_RISK 70 without LLM. Self-test added.

---

## 🟡 Medium

### BUG-004: `normalize_text` not applied to SCAM_TYPE_PATTERNS / ML input
- **Status:** FIXED (scam_type). ML left on raw text by design (trained on typo noise).
- **Fix shipped:** scam-type lookup runs on typo-normalized text. T03 → scam_type `kyc` (was unknown).

### BUG-005: lookahead regexes match across sentence boundaries
- **Status:** MITIGATED (documented ceiling)
- The money-component requirement (BUG-001 fix) and negation guard (BUG-002 fix) make cross-sentence FPs require a money word or bank+credential in the same message. `ponytail:` comments in code name the ceiling. Real SMS are short — accepted.

---

## 🟢 Verified clean (audit 2026-09-12)

- Payment decision mode (`/scam/decision`) — works, DO_NOT_PAY correct
- Link/UPI mode, behavior mode — functional
- OTP guard ordering — strip before scoring, no double count
- Hybrid path, `_build_result`, hard breakers — intact
- All self-test suites pass (gap: they don't cover BUG-001..003 — that's why bugs survived; add tests when fixing)

---

## Notes

- **Dataset/model state:** `generate_dataset_v2.py` now includes `personal_family_message` + `bank_security_advice` safe families (kept for future feature work and safe-side eval coverage; 580 rows). The DEPLOYED model was trained BEFORE these families — retraining on the expanded dataset was attempted and **correctly blocked by the quality gate** (val F1 0.874 < 0.90; the new families collapse otp_phish/romance/crypto_pump scam recall because TF-IDF cannot distinguish "never share" from "share"). Do not retrain expecting an improvement without a negation-aware feature representation.
- **Architecture lesson:** negation ("never ask" vs "ask") is irreducible at the bag-of-words layer. The three-layer design already handles it: rules have lookbehind/lookahead negation guards, the LLM handles it semantically (verified live: "HDFC never share" → SAFE 14 via LLM benign dissent). ML stays pattern-level.
- OOD recall jump 0.92 → 0.996: legitimate (new patterns catch ~19 more hinglish scams), NOT a bug. But flat full-split FPR masked BUG-001..003 — dataset safe rows lack family-emergency phrasing and bank security advice. **Dataset blind spot** (partially addressed by the new safe families for FUTURE evals).
- Pending: 05:47 IST hybrid eval (Groq quota reset). Results → `scripts/data/hybrid_eval_results.json` key `hybrid_s200`.
