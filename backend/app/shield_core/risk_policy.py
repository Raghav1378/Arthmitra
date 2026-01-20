"""
Shield Core - Risk Policy Engine

Deterministic policy rules for risk classification.
NO ML - purely rule-based logic.

This module defines:
1. Risk tier thresholds
2. Policy rules that can adjust scores
3. Recommended actions per risk level
4. Human-readable explanations
"""

from typing import List, Dict, Tuple
from .schemas import RiskLevel, RecommendedAction, PolicyRule, ModelScore


# =============================================================================
# RISK TIER CONFIGURATION
# =============================================================================

RISK_THRESHOLDS = {
    RiskLevel.LOW: (0, 39),
    RiskLevel.MEDIUM: (40, 69),
    RiskLevel.HIGH: (70, 100),
}


def get_risk_level(score: int) -> RiskLevel:
    """
    Classify score into risk level.
    
    Args:
        score: Unified risk score (0-100)
        
    Returns:
        RiskLevel enum
    """
    score = max(0, min(100, score))  # Clamp to 0-100
    
    if score <= 39:
        return RiskLevel.LOW
    elif score <= 69:
        return RiskLevel.MEDIUM
    else:
        return RiskLevel.HIGH


# =============================================================================
# POLICY RULES
# =============================================================================

class PolicyEngine:
    """
    Applies business policy rules to adjust risk scores.
    
    Rules can:
    - Increase risk (red flags)
    - Decrease risk (trust signals)
    - Stay neutral (informational)
    """
    
    def __init__(self):
        self.triggered_rules: List[PolicyRule] = []
    
    def evaluate(
        self, 
        model_scores: List[ModelScore],
        user_context: Dict = None
    ) -> Tuple[int, List[PolicyRule]]:
        """
        Evaluate all policy rules and return score adjustment.
        
        Args:
            model_scores: List of ML model outputs
            user_context: Optional user/session context
            
        Returns:
            Tuple of (total_adjustment, triggered_rules)
        """
        self.triggered_rules = []
        user_context = user_context or {}
        
        # Get model flags
        text_score = None
        numeric_score = None
        
        for ms in model_scores:
            if ms.model_name == "text_scam":
                text_score = ms
            elif ms.model_name == "transaction_risk":
                numeric_score = ms
        
        # ---------- RED FLAG RULES (Increase Risk) ----------
        
        # Rule 1: Both models flag as risky
        if text_score and numeric_score:
            if text_score.is_flagged and numeric_score.is_flagged:
                self._add_rule(
                    "R001", "Double Confirmation",
                    triggered=True, impact="increase", adjustment=15,
                    desc="Both text and transaction analysis indicate high risk"
                )
        
        # Rule 2: Very high confidence from any model
        for ms in model_scores:
            if ms.confidence >= 0.90 and ms.is_flagged:
                self._add_rule(
                    "R002", "High Confidence Detection",
                    triggered=True, impact="increase", adjustment=10,
                    desc=f"{ms.model_name} detected with {ms.confidence:.0%} confidence"
                )
                break  # Only apply once
        
        # Rule 3: Known scam keywords detected
        scam_keywords = {'collect', 'blocked', 'kyc', 'expired', 'lottery', 'winner'}
        if text_score:
            found_keywords = set(k.lower() for k in text_score.keywords) & scam_keywords
            if found_keywords:
                self._add_rule(
                    "R003", "Known Scam Pattern",
                    triggered=True, impact="increase", adjustment=10,
                    desc=f"Detected known scam keywords: {', '.join(found_keywords)}"
                )
        
        # Rule 4: New device + new receiver (transaction context)
        if numeric_score and numeric_score.reasons:
            reasons_text = ' '.join(numeric_score.reasons).lower()
            if 'new device' in reasons_text and 'new receiver' in reasons_text:
                self._add_rule(
                    "R004", "Suspicious Context",
                    triggered=True, impact="increase", adjustment=15,
                    desc="Transaction from new device to unknown receiver"
                )
        
        # Rule 5: Large transaction spike
        if numeric_score:
            for reason in numeric_score.reasons:
                if 'higher than your average' in reason.lower():
                    # Extract multiplier if present
                    if '10x' in reason or any(f'{i}x' in reason for i in range(10, 100)):
                        self._add_rule(
                            "R005", "Extreme Amount Spike",
                            triggered=True, impact="increase", adjustment=10,
                            desc="Transaction amount far exceeds normal spending"
                        )
                        break
        
        # ---------- TRUST SIGNAL RULES (Decrease Risk) ----------
        
        # Rule 6: Known trusted user
        if user_context.get('is_verified_user'):
            self._add_rule(
                "R006", "Verified User",
                triggered=True, impact="decrease", adjustment=-10,
                desc="User account is verified and has good history"
            )
        
        # Rule 7: Regular recipient
        if user_context.get('is_regular_recipient'):
            self._add_rule(
                "R007", "Regular Recipient",
                triggered=True, impact="decrease", adjustment=-15,
                desc="Transaction to a frequently used recipient"
            )
        
        # Rule 8: Low risk across all models
        all_low_risk = all(
            ms.normalized_score < 30 
            for ms in model_scores
        )
        if all_low_risk and len(model_scores) >= 1:
            self._add_rule(
                "R008", "Consistently Low Risk",
                triggered=True, impact="decrease", adjustment=-5,
                desc="All risk indicators show low risk"
            )
        
        # ---------- ANOMALY DETECTION RULES ----------
        # PRINCIPLE: Anomaly models are SUPPORTING signals, not decisive triggers.
        # Text anomaly ALONE cannot escalate risk to HIGH.
        # Anomaly escalation requires corroborating evidence.
        
        # Get anomaly model scores
        text_anomaly_score = None
        txn_anomaly_score = None
        
        for ms in model_scores:
            if ms.model_name == "text_anomaly":
                text_anomaly_score = ms
            elif ms.model_name == "transaction_anomaly":
                txn_anomaly_score = ms
        
        # Determine context: is this text-only or combined input?
        has_transaction = numeric_score is not None
        has_text = text_score is not None
        text_only_input = has_text and not has_transaction
        
        # Check for corroborating evidence (supervised models ACTIVELY flagging)
        # Key: Use is_flagged (model's decision) not just score threshold
        supervised_text_flagged = text_score and text_score.is_flagged  # Model says it's a scam
        supervised_txn_flagged = numeric_score and numeric_score.is_flagged  # Model says it's risky
        both_anomalies_flag = (
            text_anomaly_score and text_anomaly_score.normalized_score >= 70 and
            txn_anomaly_score and txn_anomaly_score.normalized_score >= 60
        )
        
        # Check for payment intent keywords (supports escalation)
        payment_intent_detected = False
        if text_score and text_score.keywords:
            payment_keywords = {'pay', 'collect', 'upi', 'transfer', 'send', 'receive', 'rs'}
            found_payment = any(
                kw in ' '.join(text_score.keywords).lower() 
                for kw in payment_keywords
            )
            payment_intent_detected = found_payment
        
        # Rule 9: Anomaly Escalation (REFINED)
        # Text anomaly ALONE must NOT escalate to HIGH.
        # Requires corroborating evidence from supervised models or transaction context.
        high_text_anomaly = text_anomaly_score and text_anomaly_score.normalized_score >= 70
        high_txn_anomaly = txn_anomaly_score and txn_anomaly_score.normalized_score >= 70
        
        # Determine if we have corroborating evidence for escalation
        corroborating_evidence = any([
            supervised_text_flagged,         # Supervised text model sees concern
            supervised_txn_flagged,          # Supervised txn model sees concern
            both_anomalies_flag,             # Both anomaly models flag
            high_txn_anomaly and has_transaction,  # Transaction anomaly (stronger signal)
        ])
        
        # Only escalate if: high anomaly detected AND corroborating evidence exists
        if high_text_anomaly or high_txn_anomaly:
            if corroborating_evidence:
                # Full escalation allowed - we have supporting evidence
                self._add_rule(
                    "R009", "Anomaly Escalation (Corroborated)",
                    triggered=True, impact="increase", adjustment=20,
                    desc="Unusual pattern confirmed by multiple risk signals"
                )
            elif text_only_input and high_text_anomaly:
                # TEXT-ONLY + HIGH ANOMALY: Cap escalation to prevent false positives
                # Maximum adjustment is +10 (keeps in MEDIUM range, never HIGH from anomaly alone)
                self._add_rule(
                    "R009", "Anomaly Signal (Text-Only, Capped)",
                    triggered=True, impact="increase", adjustment=10,
                    desc="Unusual text pattern detected - anomaly alone, escalation capped"
                )
            # Note: If no corroborating evidence and txn-only, txn anomaly still applies below in R010
        
        # Rule 10: Novel Pattern Warning (Moderate anomaly)
        # Only apply if not already triggered R009
        r009_triggered = any(r.rule_id == "R009" and r.triggered for r in self.triggered_rules)
        
        moderate_text_anomaly = text_anomaly_score and 50 <= text_anomaly_score.normalized_score < 70
        moderate_txn_anomaly = txn_anomaly_score and 50 <= txn_anomaly_score.normalized_score < 70
        
        if not r009_triggered and (moderate_text_anomaly or moderate_txn_anomaly):
            # Moderate anomaly: small adjustment as caution
            adjustment = 5 if text_only_input else 10  # Lower for text-only
            self._add_rule(
                "R010", "Novel Pattern Warning",
                triggered=True, impact="increase", adjustment=adjustment,
                desc="Activity differs from typical patterns - supporting signal only"
            )
        
        # Calculate total adjustment
        total_adjustment = sum(
            r.score_adjustment 
            for r in self.triggered_rules 
            if r.triggered
        )
        
        return total_adjustment, self.triggered_rules
    
    def _add_rule(
        self, 
        rule_id: str, 
        rule_name: str,
        triggered: bool,
        impact: str,
        adjustment: int,
        desc: str
    ):
        """Add a policy rule to the triggered list."""
        self.triggered_rules.append(PolicyRule(
            rule_id=rule_id,
            rule_name=rule_name,
            triggered=triggered,
            impact=impact,
            score_adjustment=adjustment,
            description=desc
        ))


# =============================================================================
# RECOMMENDED ACTIONS
# =============================================================================

def get_recommended_action(risk_level: RiskLevel, score: int) -> Tuple[RecommendedAction, str]:
    """
    Determine recommended action based on risk level.
    
    Args:
        risk_level: Classified risk tier
        score: Exact risk score
        
    Returns:
        Tuple of (action, reason)
    """
    if risk_level == RiskLevel.LOW:
        return (
            RecommendedAction.ALLOW,
            "Risk indicators are within acceptable range"
        )
    
    elif risk_level == RiskLevel.MEDIUM:
        if score >= 60:
            return (
                RecommendedAction.WARN,
                "Multiple risk indicators detected - proceed with caution"
            )
        else:
            return (
                RecommendedAction.VERIFY,
                "Some risk indicators present - additional verification recommended"
            )
    
    else:  # HIGH
        if score >= 85:
            return (
                RecommendedAction.BLOCK,
                "High probability of fraud - transaction should be blocked"
            )
        else:
            return (
                RecommendedAction.MANUAL_REVIEW,
                "Significant risk detected - manual review required"
            )


# =============================================================================
# DISPLAY CONFIGURATION
# =============================================================================

def get_display_config(risk_level: RiskLevel) -> Tuple[str, str]:
    """
    Get UI display configuration for risk level.
    
    Returns:
        Tuple of (message, severity_class)
    """
    configs = {
        RiskLevel.LOW: (
            "This appears to be safe",
            "success"
        ),
        RiskLevel.MEDIUM: (
            "Please verify before proceeding",
            "warning"
        ),
        RiskLevel.HIGH: (
            "Warning: High risk detected!",
            "danger"
        ),
    }
    return configs.get(risk_level, ("Unknown risk", "neutral"))
