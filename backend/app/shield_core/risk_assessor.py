"""
Shield Core - Risk Assessor

Main unified risk assessment function that:
1. Calls Shield ML models based on input
2. Combines model outputs into unified score
3. Applies policy rules
4. Returns structured risk decision

This is the primary entry point for the risk assessment layer.
"""

from typing import Optional, Dict, Any

from .schemas import (
    RiskInput, RiskDecision, RiskLevel, RecommendedAction, ModelScore
)
from .risk_policy import (
    PolicyEngine, get_risk_level, get_recommended_action, get_display_config
)
from .decision_trace import (
    TraceBuilder, generate_summary, format_reasons_for_ui
)


# =============================================================================
# SCORE COMBINATION WEIGHTS
# =============================================================================

# How to weight model scores when combining
MODEL_WEIGHTS = {
    "text_scam": 0.6,        # Text analysis slightly more important
    "transaction_risk": 0.7,  # Transaction analysis weighted higher
    "text_anomaly": 0.3,      # Anomaly detection (supporting signal)
    "transaction_anomaly": 0.3,  # Anomaly detection (supporting signal)
}

# Default weight for unknown models
DEFAULT_WEIGHT = 0.5


# =============================================================================
# MAIN ASSESSMENT FUNCTION
# =============================================================================

def assess_financial_risk(
    *,
    text: Optional[str] = None,
    transaction: Optional[Dict[str, Any]] = None,
    user_context: Optional[Dict[str, Any]] = None,
    include_trace: bool = True
) -> RiskDecision:
    """
    Unified financial risk assessment.
    
    Combines Shield ML model outputs with policy rules to produce
    a single, explainable risk decision.
    
    Args:
        text: Text message to analyze (SMS, email, etc.)
        transaction: Transaction details dict with keys:
            - transaction_amount (float)
            - avg_transaction_amount (float)
            - transactions_last_24h (int)
            - is_new_receiver (0/1)
            - is_new_device (0/1)
            - time_since_last_txn_minutes (float)
        user_context: Optional user/session context:
            - is_verified_user (bool)
            - is_regular_recipient (bool)
            - account_age_days (int)
        include_trace: Whether to include full decision trace
        
    Returns:
        RiskDecision with:
            - risk_score (0-100)
            - risk_level (LOW/MEDIUM/HIGH)
            - is_risky (bool)
            - action (ALLOW/VERIFY/WARN/BLOCK/MANUAL_REVIEW)
            - reasons (list)
            - trace (optional)
            
    Example:
        >>> decision = assess_financial_risk(
        ...     text="Pay Rs.10 to receive Rs.50000 cashback!",
        ...     transaction={"transaction_amount": 10, "is_new_receiver": 1}
        ... )
        >>> print(decision.risk_level)  # RiskLevel.HIGH
        >>> print(decision.action)       # RecommendedAction.BLOCK
    """
    # Validate input
    if not text and not transaction:
        raise ValueError("At least one of 'text' or 'transaction' must be provided")
    
    user_context = user_context or {}
    
    # Initialize trace builder
    trace_builder = TraceBuilder()
    trace_builder.set_input(
        has_text=bool(text),
        has_transaction=bool(transaction),
        has_user_context=bool(user_context)
    )
    
    # Collect model scores
    model_scores = []
    
    # ---------- TEXT SCAM DETECTION ----------
    if text:
        text_result = _call_text_model(text)
        model_scores.append(text_result)
        trace_builder.add_model_score(text_result)
    
    # ---------- TRANSACTION RISK DETECTION ----------
    if transaction:
        numeric_result = _call_numeric_model(transaction)
        model_scores.append(numeric_result)
        trace_builder.add_model_score(numeric_result)
    
    # ---------- ANOMALY DETECTION (SUPPORTING SIGNALS) ----------
    # Only call anomaly models if corresponding supervised models were called
    
    if text:
        text_anomaly_result = _call_text_anomaly_model(text)
        if text_anomaly_result:
            model_scores.append(text_anomaly_result)
            trace_builder.add_model_score(text_anomaly_result)
    
    if transaction:
        txn_anomaly_result = _call_transaction_anomaly_model(transaction)
        if txn_anomaly_result:
            model_scores.append(txn_anomaly_result)
            trace_builder.add_model_score(txn_anomaly_result)
    
    # ---------- COMBINE SCORES ----------
    combined_score = _combine_scores(model_scores)
    trace_builder.set_combined_score(combined_score)
    
    # ---------- APPLY POLICY RULES ----------
    policy_engine = PolicyEngine()
    adjustment, rules = policy_engine.evaluate(model_scores, user_context)
    trace_builder.set_policy_results(adjustment, rules)
    
    # Calculate final score
    final_score = max(0, min(100, int(combined_score + adjustment)))
    
    # Determine risk level
    risk_level = get_risk_level(final_score)
    trace_builder.set_final_decision(final_score, risk_level)
    
    # Build trace
    trace = trace_builder.build() if include_trace else None
    
    # Get recommended action
    action, action_reason = get_recommended_action(risk_level, final_score)
    
    # Get display config
    display_message, display_severity = get_display_config(risk_level)
    
    # Generate summary and reasons
    summary = generate_summary(trace) if trace else f"Risk score: {final_score}"
    reasons = format_reasons_for_ui(trace) if trace else []
    
    # Build final decision
    return RiskDecision(
        risk_score=final_score,
        risk_level=risk_level,
        is_risky=risk_level != RiskLevel.LOW,
        action=action,
        action_reason=action_reason,
        summary=summary,
        reasons=reasons,
        display_message=display_message,
        display_severity=display_severity,
        trace=trace
    )


# =============================================================================
# ML MODEL ADAPTERS
# =============================================================================

def _call_text_model(text: str) -> ModelScore:
    """
    Call Shield ML text scam detection model.
    
    Wraps the ML output in a standardized ModelScore.
    """
    try:
        from app.shield_ml import predict_text_scam
        
        result = predict_text_scam(text)
        
        # Normalize confidence to 0-100 score
        confidence = result.get("confidence", 0.5)
        normalized_score = int(confidence * 100)
        
        return ModelScore(
            model_name="text_scam",
            raw_score=confidence,
            normalized_score=normalized_score,
            is_flagged=result.get("is_scam", False),
            confidence=confidence,
            keywords=result.get("top_keywords", []),
            reasons=_build_text_reasons(result)
        )
    except Exception as e:
        print(f"Text model error: {e}")
        # Return safe default
        return ModelScore(
            model_name="text_scam",
            raw_score=0.0,
            normalized_score=0,
            is_flagged=False,
            confidence=0.0,
            keywords=[],
            reasons=[f"Text analysis unavailable: {str(e)}"]
        )


def _call_numeric_model(transaction: Dict[str, Any]) -> ModelScore:
    """
    Call Shield ML transaction risk model.
    
    Wraps the ML output in a standardized ModelScore.
    """
    try:
        from app.shield_ml import predict_transaction_risk
        
        result = predict_transaction_risk(transaction)
        
        risk_score = result.get("risk_score", 0)
        risk_level = result.get("risk_level", "low")
        
        # Convert 0-100 score to confidence
        confidence = risk_score / 100.0
        
        return ModelScore(
            model_name="transaction_risk",
            raw_score=risk_score,
            normalized_score=risk_score,
            is_flagged=risk_level in ["medium", "high"],
            confidence=confidence,
            keywords=[],  # Numeric model doesn't have keywords
            reasons=result.get("reasons", [])
        )
    except Exception as e:
        print(f"Numeric model error: {e}")
        # Return safe default
        return ModelScore(
            model_name="transaction_risk",
            raw_score=0.0,
            normalized_score=0,
            is_flagged=False,
            confidence=0.0,
            keywords=[],
            reasons=[f"Transaction analysis unavailable: {str(e)}"]
        )


def _call_text_anomaly_model(text: str) -> ModelScore:
    """
    Call Shield ML text anomaly detection model (One-Class SVM).
    
    Returns anomaly score as a supporting signal.
    """
    try:
        from app.shield_ml.anomaly import get_text_anomaly_score
        
        result = get_text_anomaly_score(text)
        
        if result.get("error"):
            return None  # Model not available, skip silently
        
        anomaly_score = result.get("anomaly_score", 0.0)
        is_anomaly = result.get("is_anomaly", False)
        
        # Normalize to 0-100 scale
        normalized_score = int(anomaly_score * 100)
        
        return ModelScore(
            model_name="text_anomaly",
            raw_score=anomaly_score,
            normalized_score=normalized_score,
            is_flagged=is_anomaly,
            confidence=anomaly_score,
            keywords=[],
            reasons=[result.get("reason", "")] if is_anomaly else []
        )
    except Exception as e:
        print(f"Text anomaly model error: {e}")
        return None  # Fail silently - anomaly is supplementary


def _call_transaction_anomaly_model(transaction: Dict[str, Any]) -> ModelScore:
    """
    Call Shield ML transaction anomaly detection model (Isolation Forest).
    
    Returns anomaly score as a supporting signal.
    """
    try:
        from app.shield_ml.anomaly import get_transaction_anomaly_score
        
        result = get_transaction_anomaly_score(transaction)
        
        if result.get("error"):
            return None  # Model not available, skip silently
        
        anomaly_score = result.get("anomaly_score", 0.0)
        is_anomaly = result.get("is_anomaly", False)
        
        # Normalize to 0-100 scale
        normalized_score = int(anomaly_score * 100)
        
        return ModelScore(
            model_name="transaction_anomaly",
            raw_score=anomaly_score,
            normalized_score=normalized_score,
            is_flagged=is_anomaly,
            confidence=anomaly_score,
            keywords=[],
            reasons=[result.get("reason", "")] if is_anomaly else []
        )
    except Exception as e:
        print(f"Transaction anomaly model error: {e}")
        return None  # Fail silently - anomaly is supplementary

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def _combine_scores(model_scores: list) -> float:
    """
    Combine multiple model scores into unified score.
    
    Uses weighted average with importance weights.
    IMPORTANT: Anomaly models are SUPPORTING signals only.
    Score boost only occurs if SUPERVISED models flag risk.
    """
    if not model_scores:
        return 0.0
    
    weighted_sum = 0.0
    total_weight = 0.0
    max_supervised_score = 0
    supervised_flagged = False
    
    # Separate supervised and anomaly model handling
    supervised_models = ["text_scam", "transaction_risk"]
    anomaly_models = ["text_anomaly", "transaction_anomaly"]
    
    for ms in model_scores:
        weight = MODEL_WEIGHTS.get(ms.model_name, DEFAULT_WEIGHT)
        
        # If supervised model says SAFE but anomaly says risky,
        # reduce anomaly weight to prevent false positives
        if ms.model_name in anomaly_models:
            # Check if corresponding supervised model flagged
            supervised_for_this = None
            if ms.model_name == "text_anomaly":
                supervised_for_this = next(
                    (s for s in model_scores if s.model_name == "text_scam"), 
                    None
                )
            elif ms.model_name == "transaction_anomaly":
                supervised_for_this = next(
                    (s for s in model_scores if s.model_name == "transaction_risk"), 
                    None
                )
            
            # If supervised says SAFE (not flagged), heavily discount anomaly contribution
            if supervised_for_this and not supervised_for_this.is_flagged:
                weight = weight * 0.3  # Reduce to 30% of original weight
        
        weighted_sum += ms.normalized_score * weight
        total_weight += weight
        
        # Only track supervised model flags for boost logic
        if ms.model_name in supervised_models:
            max_supervised_score = max(max_supervised_score, ms.normalized_score)
            if ms.is_flagged:
                supervised_flagged = True
    
    # Weighted average
    if total_weight > 0:
        avg_score = weighted_sum / total_weight
    else:
        avg_score = 0.0
    
    # Only boost if SUPERVISED models flag as risky (not anomaly alone)
    if supervised_flagged:
        combined = max(avg_score, max_supervised_score * 0.8)
    else:
        combined = avg_score
    
    return combined


def _build_text_reasons(result: Dict) -> list:
    """Build human-readable reasons from text model output."""
    reasons = []
    
    if result.get("is_scam"):
        confidence = result.get("confidence", 0)
        if confidence >= 0.8:
            reasons.append(f"Strong scam indicators detected")
        elif confidence >= 0.6:
            reasons.append(f"Suspicious patterns identified")
        else:
            reasons.append(f"Some concerning elements found")
        
        # Add keyword info
        keywords = result.get("top_keywords", [])
        # Filter out technical labels
        clean_keywords = [k for k in keywords if not k.isupper()]
        if clean_keywords:
            reasons.append(f"Keywords: {', '.join(clean_keywords[:3])}")
    
    return reasons


# =============================================================================
# CONVENIENCE FUNCTIONS
# =============================================================================

def quick_assess(text: str) -> Dict[str, Any]:
    """
    Quick text-only assessment returning dict.
    
    Convenience wrapper for simple use cases.
    """
    decision = assess_financial_risk(text=text, include_trace=False)
    return decision.to_dict()


def is_risky(text: str = None, transaction: dict = None) -> bool:
    """
    Quick boolean check if input is risky.
    
    Returns True if risk level is MEDIUM or HIGH.
    """
    decision = assess_financial_risk(
        text=text, 
        transaction=transaction, 
        include_trace=False
    )
    return decision.is_risky


# =============================================================================
# TEST FUNCTION
# =============================================================================

def _test():
    """Run quick tests."""
    print("\n" + "=" * 60)
    print("SHIELD CORE - UNIFIED RISK ASSESSMENT TEST")
    print("=" * 60)
    
    # Test 1: Text only (scam)
    print("\n[Test 1] Text scam message:")
    decision = assess_financial_risk(
        text="URGENT: Your KYC expired. Update now: http://bit.ly/12345"
    )
    print(f"  Score: {decision.risk_score}")
    print(f"  Level: {decision.risk_level.value}")
    print(f"  Action: {decision.action.value}")
    print(f"  Summary: {decision.summary}")
    
    # Test 2: Text only (safe)
    print("\n[Test 2] Legitimate message:")
    decision = assess_financial_risk(
        text="Your SBI A/c XX1234 debited Rs.500. Ref: 123456"
    )
    print(f"  Score: {decision.risk_score}")
    print(f"  Level: {decision.risk_level.value}")
    print(f"  Action: {decision.action.value}")
    
    # Test 3: Transaction only (high risk)
    print("\n[Test 3] High risk transaction:")
    decision = assess_financial_risk(
        transaction={
            "transaction_amount": 75000,
            "avg_transaction_amount": 2000,
            "transactions_last_24h": 10,
            "is_new_receiver": 1,
            "is_new_device": 1,
            "time_since_last_txn_minutes": 5
        }
    )
    print(f"  Score: {decision.risk_score}")
    print(f"  Level: {decision.risk_level.value}")
    print(f"  Action: {decision.action.value}")
    print(f"  Reasons: {decision.reasons}")
    
    # Test 4: Combined (text + transaction)
    print("\n[Test 4] Combined assessment:")
    decision = assess_financial_risk(
        text="Pay Rs.10 to receive Rs.50000 cashback!",
        transaction={
            "transaction_amount": 10,
            "avg_transaction_amount": 1000,
            "transactions_last_24h": 1,
            "is_new_receiver": 1,
            "is_new_device": 0,
            "time_since_last_txn_minutes": 60
        }
    )
    print(f"  Score: {decision.risk_score}")
    print(f"  Level: {decision.risk_level.value}")
    print(f"  Action: {decision.action.value}")
    if decision.trace:
        print(f"  Models used: {decision.trace.models_used}")
    
    print("\n[OK] All tests completed!")


if __name__ == "__main__":
    _test()
