"""
UPI Risk Score - Score Aggregation Logic

Combines individual rule scores into a final risk assessment.
Normalizes to 0-100 scale and determines risk level.
"""

from typing import Dict, List, Optional, Tuple

from .upi_parser import parse_upi_id, extract_handle_features
from .upi_risk_rules import (
    rule_excessive_digits,
    rule_random_pattern,
    rule_handle_length,
    rule_repeated_chars,
    rule_sequential_digits,
    rule_unknown_suffix,
    rule_scam_keywords_in_handle,
    rule_name_mismatch,
    rule_trust_clean_handle,
    rule_trust_known_merchant_suffix,
    rule_trust_name_matches_handle
)


# Risk level thresholds
RISK_THRESHOLDS = {
    "LOW": (0, 39),
    "MEDIUM": (40, 69),
    "HIGH": (70, 100)
}

# Maximum possible raw score (for normalization reference)
MAX_RAW_SCORE = 150


def calculate_risk_score(
    upi_id: str,
    display_name: Optional[str] = None
) -> Dict:
    """
    Calculate comprehensive UPI risk score.
    
    Args:
        upi_id: The UPI ID to analyze
        display_name: Optional display name associated with UPI ID
        
    Returns:
        Dict with:
        - upi_id: Original UPI ID
        - valid: Whether format is valid
        - risk_score: 0-100 normalized score
        - risk_level: LOW | MEDIUM | HIGH
        - reasons: List of human-readable explanations
        - details: Breakdown of rule contributions
    """
    # Parse UPI ID
    parsed = parse_upi_id(upi_id)
    
    if not parsed:
        return {
            "upi_id": upi_id,
            "valid": False,
            "risk_score": 0,
            "risk_level": "INVALID",
            "reasons": ["Invalid UPI ID format"],
            "details": {}
        }
    
    handle = parsed["handle"]
    handle_features = extract_handle_features(handle)
    
    # Collect scores from all rules
    raw_score = 0
    reasons = []
    details = {}
    
    # ==========================================================================
    # RISK RULES (Positive Scores)
    # ==========================================================================
    
    # Rule 1: Excessive digits
    score, reason = rule_excessive_digits(handle_features)
    if score:
        raw_score += score
        reasons.append(reason)
        details["excessive_digits"] = score
    
    # Rule 2: Random pattern
    score, reason = rule_random_pattern(handle_features)
    if score:
        raw_score += score
        reasons.append(reason)
        details["random_pattern"] = score
    
    # Rule 3: Handle length
    score, reason = rule_handle_length(handle_features)
    if score:
        raw_score += score
        reasons.append(reason)
        details["handle_length"] = score
    
    # Rule 4: Repeated characters
    score, reason = rule_repeated_chars(handle_features)
    if score:
        raw_score += score
        reasons.append(reason)
        details["repeated_chars"] = score
    
    # Rule 5: Sequential digits
    score, reason = rule_sequential_digits(handle_features)
    if score:
        raw_score += score
        reasons.append(reason)
        details["sequential_digits"] = score
    
    # Rule 6: Unknown suffix
    score, reason = rule_unknown_suffix(parsed)
    if score:
        raw_score += score
        reasons.append(reason)
        details["unknown_suffix"] = score
    
    # Rule 7: Scam keywords
    score, keyword_reasons = rule_scam_keywords_in_handle(handle)
    if score:
        raw_score += score
        reasons.extend(keyword_reasons)
        details["scam_keywords"] = score
    
    # Rule 8: Name mismatch
    score, mismatch_reasons = rule_name_mismatch(
        handle, display_name, parsed["suffix_type"]
    )
    if score:
        raw_score += score
        reasons.extend(mismatch_reasons)
        details["name_mismatch"] = score
    
    # ==========================================================================
    # TRUST RULES (Negative Scores)
    # ==========================================================================
    
    # Trust Rule 1: Clean handle
    score, reason = rule_trust_clean_handle(handle_features)
    if score:
        raw_score += score  # score is negative
        reasons.append(reason)
        details["trust_clean_handle"] = score
    
    # Trust Rule 2: Merchant suffix
    score, reason = rule_trust_known_merchant_suffix(parsed)
    if score:
        raw_score += score
        reasons.append(reason)
        details["trust_merchant_suffix"] = score
    
    # Trust Rule 3: Name matches handle
    score, reason = rule_trust_name_matches_handle(handle, display_name)
    if score:
        raw_score += score
        reasons.append(reason)
        details["trust_name_match"] = score
    
    # ==========================================================================
    # NORMALIZE AND CLASSIFY
    # ==========================================================================
    
    # Clamp raw score to reasonable bounds
    raw_score = max(-30, min(raw_score, MAX_RAW_SCORE))
    
    # Normalize to 0-100
    # Map [-30, MAX_RAW_SCORE] to [0, 100]
    normalized = int(((raw_score + 30) / (MAX_RAW_SCORE + 30)) * 100)
    normalized = max(0, min(100, normalized))
    
    # Determine risk level
    risk_level = "LOW"
    for level, (low, high) in RISK_THRESHOLDS.items():
        if low <= normalized <= high:
            risk_level = level
            break
    
    # Add default reason if none
    if not reasons:
        reasons.append("No specific risk indicators detected")
    
    return {
        "upi_id": upi_id,
        "valid": True,
        "normalized_upi": parsed["normalized"],
        "risk_score": normalized,
        "raw_score": raw_score,
        "risk_level": risk_level,
        "reasons": reasons,
        "details": details,
        "handle_info": {
            "handle": handle,
            "suffix": parsed["suffix"],
            "suffix_type": parsed["suffix_type"],
            "suffix_known": parsed["suffix_known"]
        }
    }


def get_risk_level(score: int) -> str:
    """
    Get risk level string from numeric score.
    """
    if score <= 39:
        return "LOW"
    elif score <= 69:
        return "MEDIUM"
    else:
        return "HIGH"
