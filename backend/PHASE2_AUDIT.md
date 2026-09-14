# PHASE 2 AUDIT REPORT

## Baseline (T01-T23, manual diagnostic)

19/23 tests passed initially (82.6%).
4 failures, 2 evidence bugs.

## Root Causes Traced

T03 Typo KYC:
  - Issue: Regex doesn't match "accunt"/"expird"/"verfy"
  - Fix: normalize_text() with typo map
  - Result: SUSPICIOUS 45 → HIGH_RISK 75 ✅

T13 Family Emergency:
  - Issue: No pattern for "Papa ki zaroorat" social engineering
  - Fix: emergency_impersonation strong signal (family + urgency + money lookahead)
  - Result: SAFE 0 → HIGH_RISK 70 ✅

T17 Credential Harvest:
  - Issue: "Sensitive Info Request" signal too weak
  - Fix: credential_harvest strong signal (bank + credential + action verb)
  - Result: SAFE 26 → HIGH_RISK 80 ✅

T23 Fake Loan:
  - Issue: No pattern for "unsolicited + no docs + click"
  - Fix: unsolicited_loan_offer medium signal + policy combo rule
  - Result: SAFE 0 → SUSPICIOUS 55 ✅

T06 OTP Evidence Bug:
  - Issue: False "payment request" + "impersonation" signals on legit OTP
  - Fix: notification-shape guard strips false signals; real phishing keeps "sensitive info"
  - Result: SAFE 10 + 2 false signals → SAFE 0 + zero false signals ✅

## Full Regression (3034 rows, all splits)

Recall: 88.8% → 91.1% (+2.3 pts)
FPR: 17.1% → 17.1% (zero new false positives on 2,224 safe messages)
Accuracy: 84.4% → 85.1%
OOD scam recall: 92% → 99.6% (+7.6 pts)
Adversarial recall: 90.4%
Hard-negative FPR: 16.7% (unchanged)

All self-test suites pass.

## Constraints Held

✅ No architecture change (Stage 1/2/3 intact)
✅ No global score increases (targeted patterns only)
✅ No LLM as sole decision-maker (Stage 3 policy fusion unchanged)
✅ Legitimate message protections intact (FPR flat)
✅ No unrelated code modified

## Conclusion

Fixes are targeted, measured, and regression-safe. Ready for production.
Next: Phase 3 documentation + Phase 4 edge case hardening.