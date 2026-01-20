"""
Shield Core - Data Schemas

Pydantic models for the unified risk assessment layer.
These provide type safety, validation, and serialization.

NO DEPENDENCIES ON:
- LangChain, LangGraph, Ollama
- ML training code
- Database models
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Optional, List, Dict, Any
from datetime import datetime


class RiskLevel(str, Enum):
    """
    Risk classification tiers.
    
    Thresholds:
    - LOW: 0-39 (auto-approve, minimal friction)
    - MEDIUM: 40-69 (additional verification needed)
    - HIGH: 70-100 (block or manual review)
    """
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class RecommendedAction(str, Enum):
    """
    Actions recommended based on risk level.
    """
    ALLOW = "allow"              # Low risk - proceed normally
    VERIFY = "verify"            # Medium risk - request OTP/2FA
    WARN = "warn"                # Medium-high risk - show warning
    BLOCK = "block"              # High risk - block transaction
    MANUAL_REVIEW = "manual_review"  # Very high risk - escalate


@dataclass
class RiskInput:
    """
    Input parameters for risk assessment.
    
    At least one of text or transaction must be provided.
    """
    text: Optional[str] = None
    transaction: Optional[Dict[str, Any]] = None
    user_context: Optional[Dict[str, Any]] = None
    
    # Optional metadata
    request_id: Optional[str] = None
    timestamp: Optional[datetime] = None
    
    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.now()
        if not self.text and not self.transaction:
            raise ValueError("At least one of 'text' or 'transaction' must be provided")


@dataclass
class ModelScore:
    """
    Individual ML model output.
    """
    model_name: str           # "text_scam" or "transaction_risk"
    raw_score: float          # 0.0 to 1.0 or 0 to 100
    normalized_score: int     # 0 to 100 (standardized)
    is_flagged: bool          # Model's binary decision
    confidence: float         # Model's confidence
    keywords: List[str] = field(default_factory=list)  # Top indicators
    reasons: List[str] = field(default_factory=list)   # Human-readable reasons


@dataclass
class PolicyRule:
    """
    A policy rule that was triggered.
    """
    rule_id: str              # Unique identifier
    rule_name: str            # Human-readable name
    triggered: bool           # Whether rule fired
    impact: str               # "increase", "decrease", or "neutral"
    score_adjustment: int     # Points added/subtracted
    description: str          # Why this rule matters


@dataclass
class DecisionTrace:
    """
    Complete audit trail of the risk decision.
    
    Used for:
    - Debugging
    - Compliance/audit
    - User explanations
    - Model improvement
    """
    # Input summary
    input_type: str           # "text_only", "transaction_only", "combined"
    has_text: bool
    has_transaction: bool
    has_user_context: bool
    
    # Model outputs
    models_used: List[str]
    model_scores: List[ModelScore]
    
    # Score calculation
    raw_combined_score: float
    policy_adjustments: int
    final_score: int
    
    # Policy
    triggered_rules: List[PolicyRule]
    risk_level: RiskLevel
    
    # Explanation
    primary_reason: str
    all_reasons: List[str]
    human_explanation: str
    
    # Metadata
    processing_time_ms: float = 0.0
    timestamp: datetime = field(default_factory=datetime.now)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "input_type": self.input_type,
            "models_used": self.models_used,
            "model_scores": [
                {
                    "model": s.model_name,
                    "score": s.normalized_score,
                    "flagged": s.is_flagged,
                    "reasons": s.reasons
                }
                for s in self.model_scores
            ],
            "final_score": self.final_score,
            "risk_level": self.risk_level.value,
            "triggered_rules": [r.rule_name for r in self.triggered_rules if r.triggered],
            "explanation": self.human_explanation,
            "processing_time_ms": self.processing_time_ms,
        }


@dataclass
class RiskDecision:
    """
    Final risk assessment decision.
    
    This is the main output returned by assess_financial_risk().
    """
    # Core decision
    risk_score: int                    # 0-100 unified score
    risk_level: RiskLevel              # LOW, MEDIUM, HIGH
    is_risky: bool                     # Quick boolean check
    
    # Recommended action
    action: RecommendedAction          # What to do
    action_reason: str                 # Why this action
    
    # Explanation (user-facing)
    summary: str                       # One-line summary
    reasons: List[str]                 # Bullet points
    
    # For UI display
    display_message: str               # User-friendly message
    display_severity: str              # "success", "warning", "danger"
    
    # Full trace (for debugging/compliance)
    trace: Optional[DecisionTrace] = None
    
    def to_dict(self, include_trace: bool = False) -> Dict[str, Any]:
        """Convert to dictionary for API response."""
        result = {
            "risk_score": self.risk_score,
            "risk_level": self.risk_level.value,
            "is_risky": self.is_risky,
            "action": self.action.value,
            "action_reason": self.action_reason,
            "summary": self.summary,
            "reasons": self.reasons,
            "display": {
                "message": self.display_message,
                "severity": self.display_severity
            }
        }
        if include_trace and self.trace:
            result["trace"] = self.trace.to_dict()
        return result
