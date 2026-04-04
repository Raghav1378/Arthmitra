"""
UPI Predict - Public API

Provides the main predict_upi_risk() function for UPI ID risk assessment.
This is the only function that should be imported from outside the module.
"""

from typing import Dict, Optional

from .upi_risk_score import calculate_risk_score


def predict_upi_risk(
    upi_id: str,
    display_name: Optional[str] = None
) -> Dict:
    """
    Analyze a UPI ID and return risk assessment.
    
    This function performs preventive safety checks on a UPI ID
    before payment is initiated. It is ADVISORY ONLY and should
    never automatically block transactions.
    
    Args:
        upi_id: The UPI ID to analyze (e.g., "example@okicici")
        display_name: Optional display name associated with the UPI ID.
                     Helps detect impersonation scams.
    
    Returns:
        Dict with:
        - upi_id: The analyzed UPI ID
        - risk_score: 0-100 normalized risk score
        - risk_level: "LOW" | "MEDIUM" | "HIGH" | "INVALID"
        - reasons: List of human-readable explanation strings
        
    Examples:
        >>> predict_upi_risk("ramesh@okicici")
        {
            "upi_id": "ramesh@okicici",
            "risk_score": 15,
            "risk_level": "LOW",
            "reasons": ["Clean alphabetic handle"]
        }
        
        >>> predict_upi_risk("refund123456@ybl", "SBI Bank Refund")
        {
            "upi_id": "refund123456@ybl",
            "risk_score": 82,
            "risk_level": "HIGH",
            "reasons": [
                "Handle contains scam keyword: 'refund'",
                "Handle has excessive digits (>70%)",
                "Display name 'SBI Bank Refund' claims authority but handle looks personal"
            ]
        }
    
    Risk Level Thresholds:
        - 0-39:  LOW    (Safe for transaction)
        - 40-69: MEDIUM (Proceed with caution)
        - 70-100: HIGH  (Warning - likely scam)
    
    IMPORTANT: This is an advisory signal only. 
    It should NOT automatically block transactions.
    """
    # Input validation
    if not upi_id or not isinstance(upi_id, str):
        return {
            "upi_id": str(upi_id) if upi_id else "",
            "risk_score": 0,
            "risk_level": "INVALID",
            "reasons": ["Invalid or empty UPI ID provided"]
        }
    
    # Clean input
    upi_id = upi_id.strip()
    if display_name:
        display_name = display_name.strip()
    
    # Calculate risk
    result = calculate_risk_score(upi_id, display_name)
    
    # Return simplified public format
    return {
        "upi_id": result["upi_id"],
        "risk_score": result["risk_score"],
        "risk_level": result["risk_level"],
        "reasons": result["reasons"]
    }


def predict_upi_risk_detailed(
    upi_id: str,
    display_name: Optional[str] = None
) -> Dict:
    """
    Same as predict_upi_risk but returns detailed breakdown.
    
    Includes rule-by-rule scoring details for debugging/auditing.
    """
    if not upi_id or not isinstance(upi_id, str):
        return {
            "upi_id": str(upi_id) if upi_id else "",
            "valid": False,
            "risk_score": 0,
            "risk_level": "INVALID",
            "reasons": ["Invalid or empty UPI ID provided"],
            "details": {}
        }
    
    return calculate_risk_score(upi_id.strip(), display_name)


# =============================================================================
# QUICK HELPERS
# =============================================================================

def is_upi_high_risk(upi_id: str, display_name: Optional[str] = None) -> bool:
    """
    Quick check if UPI ID is high risk.
    
    Returns True if risk_level is HIGH.
    """
    result = predict_upi_risk(upi_id, display_name)
    return result["risk_level"] == "HIGH"


def is_upi_valid(upi_id: str) -> bool:
    """
    Quick check if UPI ID has valid format.
    """
    result = predict_upi_risk(upi_id)
    return result["risk_level"] != "INVALID"
