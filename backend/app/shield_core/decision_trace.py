"""
Shield Core - Decision Trace Builder

Builds explainability traces for risk decisions.
Used for debugging, compliance, and user explanations.

This module provides:
1. Trace building during assessment
2. Human-readable explanation generation
3. Summary formatting for UI
"""

from typing import List, Optional
from datetime import datetime
import time

from .schemas import (
    DecisionTrace, ModelScore, PolicyRule, RiskLevel
)


class TraceBuilder:
    """
    Builds a complete decision trace during risk assessment.
    
    Usage:
        builder = TraceBuilder()
        builder.set_input(has_text=True, has_transaction=True)
        builder.add_model_score(text_score)
        builder.add_model_score(numeric_score)
        builder.set_policy_results(adjusted_score, rules)
        trace = builder.build()
    """
    
    def __init__(self):
        self._start_time = time.time()
        self._has_text = False
        self._has_transaction = False
        self._has_user_context = False
        self._model_scores: List[ModelScore] = []
        self._raw_combined_score = 0.0
        self._policy_adjustments = 0
        self._final_score = 0
        self._triggered_rules: List[PolicyRule] = []
        self._risk_level: Optional[RiskLevel] = None
    
    def set_input(
        self, 
        has_text: bool = False, 
        has_transaction: bool = False,
        has_user_context: bool = False
    ):
        """Record what inputs were provided."""
        self._has_text = has_text
        self._has_transaction = has_transaction
        self._has_user_context = has_user_context
    
    def add_model_score(self, score: ModelScore):
        """Add an ML model's output to the trace."""
        self._model_scores.append(score)
    
    def set_combined_score(self, raw_score: float):
        """Set the raw combined score before policy adjustments."""
        self._raw_combined_score = raw_score
    
    def set_policy_results(
        self, 
        adjustments: int, 
        rules: List[PolicyRule]
    ):
        """Set policy evaluation results."""
        self._policy_adjustments = adjustments
        self._triggered_rules = rules
    
    def set_final_decision(self, final_score: int, risk_level: RiskLevel):
        """Set the final decision."""
        self._final_score = final_score
        self._risk_level = risk_level
    
    def build(self) -> DecisionTrace:
        """Build the complete decision trace."""
        processing_time = (time.time() - self._start_time) * 1000  # ms
        
        # Determine input type
        if self._has_text and self._has_transaction:
            input_type = "combined"
        elif self._has_text:
            input_type = "text_only"
        elif self._has_transaction:
            input_type = "transaction_only"
        else:
            input_type = "unknown"
        
        # Collect all reasons
        all_reasons = []
        for ms in self._model_scores:
            all_reasons.extend(ms.reasons)
        
        for rule in self._triggered_rules:
            if rule.triggered:
                all_reasons.append(rule.description)
        
        # Determine primary reason
        primary_reason = all_reasons[0] if all_reasons else "No specific concerns"
        
        # Generate human explanation
        human_explanation = self._generate_explanation()
        
        return DecisionTrace(
            input_type=input_type,
            has_text=self._has_text,
            has_transaction=self._has_transaction,
            has_user_context=self._has_user_context,
            models_used=[ms.model_name for ms in self._model_scores],
            model_scores=self._model_scores,
            raw_combined_score=self._raw_combined_score,
            policy_adjustments=self._policy_adjustments,
            final_score=self._final_score,
            triggered_rules=self._triggered_rules,
            risk_level=self._risk_level,
            primary_reason=primary_reason,
            all_reasons=all_reasons,
            human_explanation=human_explanation,
            processing_time_ms=round(processing_time, 2),
            timestamp=datetime.now()
        )
    
    def _generate_explanation(self) -> str:
        """Generate a human-readable explanation of the decision."""
        parts = []
        
        # Intro based on risk level
        if self._risk_level == RiskLevel.HIGH:
            parts.append("This has been flagged as HIGH RISK.")
        elif self._risk_level == RiskLevel.MEDIUM:
            parts.append("This requires additional verification.")
        else:
            parts.append("This appears to be safe.")
        
        # Model contributions
        for ms in self._model_scores:
            if ms.is_flagged:
                if ms.model_name == "text_scam":
                    parts.append(f"Text analysis detected scam patterns with {ms.confidence:.0%} confidence.")
                elif ms.model_name == "transaction_risk":
                    parts.append(f"Transaction analysis shows elevated risk (score: {ms.normalized_score}).")
        
        # Key reasons
        triggered_rule_names = [
            r.rule_name for r in self._triggered_rules 
            if r.triggered and r.impact == "increase"
        ]
        if triggered_rule_names:
            parts.append(f"Risk indicators: {', '.join(triggered_rule_names[:3])}.")
        
        return " ".join(parts)


def generate_summary(trace: DecisionTrace) -> str:
    """
    Generate a one-line summary for the decision.
    
    Args:
        trace: Complete decision trace
        
    Returns:
        Short summary string
    """
    level_emoji = {
        RiskLevel.LOW: "[OK]",
        RiskLevel.MEDIUM: "[CAUTION]",
        RiskLevel.HIGH: "[ALERT]"
    }
    
    emoji = level_emoji.get(trace.risk_level, "")
    
    if trace.risk_level == RiskLevel.HIGH:
        return f"{emoji} High risk detected (score: {trace.final_score})"
    elif trace.risk_level == RiskLevel.MEDIUM:
        return f"{emoji} Medium risk - verification recommended (score: {trace.final_score})"
    else:
        return f"{emoji} Low risk - appears safe (score: {trace.final_score})"


def format_reasons_for_ui(trace: DecisionTrace, max_reasons: int = 5) -> List[str]:
    """
    Format reasons for UI display.
    
    Args:
        trace: Decision trace
        max_reasons: Maximum number of reasons to include
        
    Returns:
        List of formatted reason strings
    """
    reasons = []
    
    # Add model-specific reasons
    for ms in trace.model_scores:
        if ms.is_flagged:
            for reason in ms.reasons[:2]:  # Max 2 per model
                reasons.append(reason)
    
    # Add triggered policy rules
    for rule in trace.triggered_rules:
        if rule.triggered and rule.impact == "increase":
            reasons.append(rule.description)
    
    # Deduplicate and limit
    seen = set()
    unique_reasons = []
    for r in reasons:
        if r.lower() not in seen:
            seen.add(r.lower())
            unique_reasons.append(r)
    
    return unique_reasons[:max_reasons]
