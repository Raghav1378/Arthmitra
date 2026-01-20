"""
UPI Risk Validator Module

Provides UPI ID validation and risk scoring for fraud prevention.

Public API:
    from app.shield_ml.upi import predict_upi_risk
    
    result = predict_upi_risk("example@okicici")
    # Returns: {
    #     "upi_id": "example@okicici",
    #     "risk_score": 15,
    #     "risk_level": "LOW",
    #     "reasons": ["Clean alphabetic handle"]
    # }

This module is ADVISORY ONLY - never blocks transactions automatically.
"""

from .upi_predict import predict_upi_risk

__all__ = ["predict_upi_risk"]

__version__ = "1.0.0"
