"""
Stage 3 — deterministic policy engine. FINAL AUTHORITY for the scam verdict.

Input: Stage-1 evidence (rules, ML, URL/UPI, behavior) + optional Stage-2
LLM semantic analysis. Output: final risk score, confidence, verdict, and an
explicit engine-disagreement record.

Fusion principles:
- Hard deterministic safety rules (verified-domain cap, OTP-alert cap,
  verified-domain ceiling) are authoritative and applied LAST — no stage can
  override them.
- Rules, ML, and LLM are three INDEPENDENT evidence sources. The engine
  resolves conflicts by concordance and evidence direction, never by
  averaging or max() of two scores.
- Risk (estimated danger) and confidence (evidence quality/agreement) are
  computed by separate functions and never derived from each other.
"""

from typing import Dict, List, Optional

# Verdict bands — unchanged from scam_engine
HIGH_RISK_AT = 70
SUSPICIOUS_AT = 30

# ML evidence thresholds (ml_score = ML_SCORE_WEIGHTS label weight)
ML_SCAM_SIDE = 60          # suspicious (60) or high_risk (90)
ML_HIGH_RISK = 90
LLM_SCAM_SIDE = 60         # llm_risk >= this = semantic scam evidence
LLM_SAFE_SIDE = 30         # llm_risk <= this + high confidence = semantic benign
LLM_MIN_CONFIDENCE = 60    # below this the LLM result is too unsure to use


def _band(score: int) -> str:
    if score >= HIGH_RISK_AT:
        return "HIGH_RISK"
    if score >= SUSPICIOUS_AT:
        return "SUSPICIOUS"
    return "SAFE"


def decide(evidence: Dict, llm: Optional[Dict] = None) -> Dict:
    """
    Fuse evidence into the final decision.

    evidence: dict from scam_engine.collect_stage1_evidence()
    llm: dict from llm_analyzer.analyze_semantic(), or None (skipped/failed)
    """
    rule_score = evidence["rule_score"]
    ml_score = evidence.get("ml_score")
    strong = evidence["strong"]
    medium = evidence["medium"]
    weak = evidence["weak"]

    base = rule_score
    resolution_steps: List[str] = []

    # ── ML evidence (statistical/pattern) ────────────────────────────────
    # A confident high_risk ML prediction corroborated by ANY rule signal
    # floors at 75 (existing behavior). A LONE ML high_risk with zero rule
    # signals is real but unexplained evidence: it lands the message in
    # SUSPICIOUS (45), not HIGH_RISK — Stage 2 may strengthen it. Conversely,
    # a confident ML 'safe' on an uncorroborated single rule signal is benign
    # statistical evidence that dampens the rule score (the calibrated
    # rules x 0.6 + 2 suppression the 60/40 blend performed on 2.2k safe
    # test messages — 852 of them are single-signal rule FPs the model vetoes).
    if ml_score is not None:
        if ml_score >= ML_HIGH_RISK:
            if rule_score > 0:
                base = max(base, 75)
                resolution_steps.append("ML high_risk corroborated by rule signals -> floor 75")
            else:
                base = max(base, 45)
                resolution_steps.append("ML high_risk with no rule signals -> unexplained statistical evidence, held at SUSPICIOUS (45)")
        elif ml_score >= ML_SCAM_SIDE:
            if rule_score > 0:
                # ML 'suspicious' corroborated by any rule signal -> solidly
                # SUSPICIOUS (band-equivalent to the old blend's 0.6r+24)
                base = max(base, 45)
                resolution_steps.append("ML suspicious corroborated by rule signals -> SUSPICIOUS (45)")
            # lone ML 'suspicious' (no rules) is weak evidence: stays SAFE (old behavior)
        elif rule_score > 0:
            # ML 'safe' dissent: dampen uncorroborated rule evidence.
            # Multi-signal rule scores (>=60) still stay in/SUSPICIOUS+ bands.
            dampened = min(base, int(0.6 * rule_score) + 2)
            resolution_steps.append(
                f"ML 'safe' vs rule evidence (disagreement) -> rule score {rule_score} "
                f"dampened to {dampened} by benign statistical evidence")
            base = dampened

    # ── LLM evidence (semantic/contextual) ───────────────────────────────
    llm_usable = llm is not None and llm["llm_confidence"] >= LLM_MIN_CONFIDENCE
    if llm_usable:
        ml_agrees_scam = ml_score is not None and ml_score >= ML_SCAM_SIDE
        rules_see_something = rule_score > 0
        if llm["llm_risk"] >= LLM_SCAM_SIDE:
            if ml_agrees_scam or rules_see_something:
                # Two independent evidence sources (semantic + statistical or
                # semantic + deterministic) concordant on scam: semantic depth
                # sets the final level, capped at 90 (LLM alone never 95+).
                base = max(base, min(90, llm["llm_risk"]))
                resolution_steps.append(
                    "LLM semantic scam evidence concordant with "
                    + ("ML" if ml_agrees_scam else "rule")
                    + " evidence -> semantic risk adopted (capped 90)")
            elif llm["llm_confidence"] >= 70:
                # Pure semantic catch: no rules, no ML. Real semantic evidence
                # (emergency impersonation etc.) -> SUSPICIOUS floor 60.
                base = max(base, 60)
                resolution_steps.append("LLM-only semantic scam evidence (conf>=70) -> SUSPICIOUS floor 60")
            else:
                base = max(base, 45)
                resolution_steps.append("LLM-only semantic scam evidence (low confidence) -> held at 45")
        elif llm["llm_risk"] <= LLM_SAFE_SIDE and llm["llm_confidence"] >= 70:
            # Confident semantic benign evidence vs a LONE unexplained ML
            # high_risk (no rules): 2 of 3 engines say benign -> SAFE.
            # Never applies when rules fired (deterministic evidence outranks
            # semantic opinion) or when ML corroborates rules.
            if ml_score is not None and ml_score >= ML_HIGH_RISK and rule_score == 0:
                base = min(base, 20)
                resolution_steps.append("lone unexplained ML high_risk + confident LLM benign -> resolved to SAFE (20)")
            else:
                resolution_steps.append("LLM benign assessment recorded as dissent; rule/ML evidence unchanged")

    # ── Verdict band ─────────────────────────────────────────────────────
    verdict = _band(base)

    # ── Engine disagreement record ───────────────────────────────────────
    ml_assessment = (
        f"{evidence.get('ml_label')} (score {ml_score})" if ml_score is not None else "unavailable"
    )
    llm_assessment = (
        f"risk {llm['llm_risk']}, confidence {llm['llm_confidence']}, "
        f"indicators: {', '.join(llm['semantic_indicators'])}"
        if llm is not None else "skipped"
    )
    ml_band = _band(ml_score) if ml_score is not None else None
    llm_band = _band(llm["llm_risk"]) if llm is not None else None
    disagreement = False
    disagreement_reason = "engines agree or one engine unavailable"
    if ml_band and llm_band and ml_band != llm_band:
        disagreement = True
        disagreement_reason = (
            f"ML assesses {ml_band} but LLM assesses {llm_band} — the two "
            "engines disagree on the scam/legitimate boundary"
        )
    resolution = (
        f"Policy resolution: {'; '.join(resolution_steps) if resolution_steps else 'rule evidence only'}; "
        f"final risk {min(base, _apply_hard_rules(base, evidence))}"
    )

    # ── Hard deterministic rules — applied LAST, authoritative ───────────
    final_score = _apply_hard_rules(base, evidence)
    final_verdict = _band(final_score)

    confidence = _confidence(evidence, llm, final_verdict)

    return {
        "risk_score": final_score,
        "risk": final_verdict,
        "confidence": confidence,
        "pre_breaker_score": base,
        "engine_disagreement": {
            "ml_assessment": ml_assessment,
            "llm_assessment": llm_assessment,
            "disagreement": disagreement,
            "reason": disagreement_reason,
            "policy_resolution": resolution,
        },
    }


def _apply_hard_rules(score: int, evidence: Dict) -> int:
    """Circuit breakers and ceilings, verbatim from scam_engine (authoritative)."""
    urls = evidence["urls"]
    strong = evidence["strong"]
    verified_urls = evidence["verified_urls"]
    max_link_score = evidence["max_link_score"]

    # Verified-domain ceiling: every URL verified + no STRONG rule -> cap at 65
    if urls and len(verified_urls) == len(urls) and not strong:
        score = min(score, 65)
    # Hard breaker: verified bank/government domain with a clean link -> cap 10
    if verified_urls and max_link_score <= 20:
        score = min(score, 10)
    # Hard breaker: OTP notification shape (code + no links/VPAs) -> cap 10
    if evidence["otp_alert"]:
        score = min(score, 10)
    return score


def _confidence(evidence: Dict, llm: Optional[Dict], final_verdict: str) -> int:
    """
    Confidence in the ASSESSMENT — evidence quality and engine agreement.
    Completely independent of the risk level.
    """
    conf = 40  # baseline: deterministic rules only
    if evidence["strong"]:
        conf += 25
    elif evidence["medium"]:
        conf += 15
    elif evidence["weak"]:
        conf += 5

    ml_score = evidence.get("ml_score")
    if ml_score is not None:
        if _band(ml_score) == final_verdict:
            conf += 15  # ML corroborates the final verdict
        else:
            conf -= 10  # ML contradicts the final verdict

    if llm is not None:
        if llm["llm_confidence"] < LLM_MIN_CONFIDENCE:
            conf -= 5  # an unsure LLM weakens the overall assessment
        elif _band(llm["llm_risk"]) == final_verdict:
            conf += 15  # LLM corroborates
        else:
            conf -= 10  # LLM contradicts
    else:
        conf = min(conf, 75)  # no semantic evidence -> cap confidence

    if evidence["verified_urls"]:
        conf = min(conf, 40)  # verified official domain caps certainty (existing calibration)
    return max(15, min(95, conf))


def _test():
    def ev(rule_score=0, strong=None, medium=None, weak=None, ml_label=None, ml_score=None,
            urls=None, verified=None, max_link=0, otp=False):
        return {"rule_score": rule_score, "strong": strong or [], "medium": medium or [],
                "weak": weak or [], "ml_label": ml_label, "ml_score": ml_score,
                "urls": urls or [], "verified_urls": verified or [],
                "max_link_score": max_link, "otp_alert": otp}

    # MSG2 shape: rules 0, ML high_risk, LLM concordant scam -> HIGH_RISK
    llm = {"llm_risk": 85, "llm_confidence": 80, "semantic_indicators": ["impersonation", "emergency_pretext"],
           "scam_type": "impersonation", "brief_reason": "x"}
    llm_safe = {"llm_risk": 15, "llm_confidence": 80, "semantic_indicators": ["none"],
                "scam_type": "none", "brief_reason": "x"}
    r = decide(ev(ml_label="high_risk", ml_score=90), llm)
    assert r["risk"] == "HIGH_RISK" and r["risk_score"] == 85, r
    assert r["engine_disagreement"]["disagreement"] is False

    # Same message, Groq down (llm=None): stays SUSPICIOUS 45, not diluted to 36
    r = decide(ev(ml_label="high_risk", ml_score=90), None)
    assert r["risk"] == "SUSPICIOUS" and r["risk_score"] == 45, r

    # Disagreement: ML high_risk vs confident LLM benign -> recorded, resolved to SAFE
    r = decide(ev(ml_label="high_risk", ml_score=90), llm_safe)
    assert r["risk"] == "SAFE" and r["risk_score"] == 20, r
    d = r["engine_disagreement"]
    assert d["disagreement"] and "ML assesses HIGH_RISK but LLM assesses SAFE" in d["reason"]

    # LLM benign can NEVER lower rule evidence; ML 'safe' dampens but a
    # multi-signal rule score (80) stays HIGH_RISK
    r = decide(ev(rule_score=80, strong=["threat"], ml_label="safe", ml_score=5), llm_safe)
    assert r["risk_score"] == 50 and r["risk"] == "SUSPICIOUS", r  # int(0.6*80)+2
    # Single uncorroborated rule signal + ML safe -> dampened to SAFE band
    r = decide(ev(rule_score=40, strong=["suspicious link"], ml_label="safe", ml_score=5), llm_safe)
    assert r["risk_score"] == 26 and r["risk"] == "SAFE", r
    # LLM benign alone changes nothing
    r = decide(ev(rule_score=80, strong=["threat"]), llm_safe)
    assert r["risk_score"] == 80 and r["risk"] == "HIGH_RISK", r

    # Hard breakers override everything, including a scam LLM
    r = decide(ev(ml_label="high_risk", ml_score=90, urls=["https://sbi.co.in"],
                  verified=["https://sbi.co.in"], max_link=0), llm)
    assert r["risk_score"] == 10 and r["risk"] == "SAFE", r

    # OTP alert breaker
    r = decide(ev(rule_score=40, strong=["payment request"], otp=True), llm)
    assert r["risk_score"] == 10, r

    # Not averaging, not max(): lone LLM scam with no ML/rules -> 60, not llm_risk
    r = decide(ev(), {"llm_risk": 95, "llm_confidence": 90, "semantic_indicators": ["social_engineering"],
                      "scam_type": "phishing", "brief_reason": "x"})
    assert r["risk_score"] == 60, r

    # Low-confidence LLM is ignored entirely
    r = decide(ev(), {"llm_risk": 95, "llm_confidence": 40, "semantic_indicators": ["urgency"],
                      "scam_type": "x", "brief_reason": "x"})
    assert r["risk_score"] == 0 and r["risk"] == "SAFE", r

    # Confidence is agreement-based, not risk-derived
    r = decide(ev(rule_score=40, strong=["threat"]), llm)
    assert r["confidence"] != r["risk_score"]

    print("[OK] policy_engine: all fusion self-checks passed")


if __name__ == "__main__":
    _test()
