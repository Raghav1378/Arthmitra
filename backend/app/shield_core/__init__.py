"""
Shield Core - Unified Risk Assessment Layer

This module provides a production-grade risk assessment layer that:
1. Combines Shield ML model outputs
2. Applies business policy rules
3. Produces explainable risk decisions

USAGE:
    from app.shield_core import assess_financial_risk, RiskLevel
    
    # Text-only assessment
    decision = assess_financial_risk(text="Your KYC expired...")
    
    # Transaction-only assessment
    decision = assess_financial_risk(transaction={...})
    
    # Combined assessment
    decision = assess_financial_risk(
        text="Pay Rs.10 to receive cashback",
        transaction={"transaction_amount": 10, ...}
    )
    
    # Quick checks
    from app.shield_core import quick_assess, is_risky
    result = quick_assess("suspicious message")
    if is_risky(text="scam message"):
        print("Blocked!")

ARCHITECTURE:
    Input (text/transaction)
        │
        ▼
    ┌─────────────────────┐
    │   Shield ML Models  │  ◄── predict_text_scam, predict_transaction_risk
    └─────────────────────┘
        │
        ▼
    ┌─────────────────────┐
    │   Score Combiner    │  ◄── Weighted average of model scores
    └─────────────────────┘
        │
        ▼
    ┌─────────────────────┐
    │   Policy Engine     │  ◄── Deterministic rules, adjustments
    └─────────────────────┘
        │
        ▼
    ┌─────────────────────┐
    │   Decision Trace    │  ◄── Explainability, audit trail
    └─────────────────────┘
        │
        ▼
    RiskDecision (unified output)

NO DEPENDENCIES ON:
    - LangChain, LangGraph, Ollama
    - ML training code
    - Database/persistence layer
"""

# Version
__version__ = "1.0.0"

# Main assessment function
from .risk_assessor import (
    assess_financial_risk,
    quick_assess,
    is_risky
)

# Schemas for type hints
from .schemas import (
    RiskInput,
    RiskDecision,
    RiskLevel,
    RecommendedAction,
    DecisionTrace,
    ModelScore,
    PolicyRule
)

# Policy utilities (for customization)
from .risk_policy import (
    PolicyEngine,
    get_risk_level,
    get_recommended_action,
    RISK_THRESHOLDS
)

# Trace utilities (for debugging)
from .decision_trace import (
    TraceBuilder,
    generate_summary,
    format_reasons_for_ui
)

__all__ = [
    # Main API
    "assess_financial_risk",
    "quick_assess",
    "is_risky",
    
    # Schemas
    "RiskInput",
    "RiskDecision",
    "RiskLevel",
    "RecommendedAction",
    "DecisionTrace",
    "ModelScore",
    "PolicyRule",
    
    # Policy
    "PolicyEngine",
    "get_risk_level",
    "get_recommended_action",
    "RISK_THRESHOLDS",
    
    # Trace
    "TraceBuilder",
    "generate_summary",
    "format_reasons_for_ui",
]
