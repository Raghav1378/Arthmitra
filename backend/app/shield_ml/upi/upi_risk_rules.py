"""
UPI Risk Rules - Individual Rule Implementations

Each rule analyzes a specific aspect of the UPI ID and returns a score contribution.
Positive scores indicate risk, negative scores indicate trust.

Rules are deterministic and do not require external data.
"""

import re
from typing import Dict, List, Tuple, Optional


# =============================================================================
# SCAM KEYWORD PATTERNS
# =============================================================================

SCAM_KEYWORDS = {
    # High risk keywords (often in scam handles)
    "high": [
        "refund", "cashback", "prize", "lottery", "winner", "reward",
        "bonus", "offer", "claim", "lucky", "congratulations", "selected",
        "verification", "kyc", "update", "submit", "approve"
    ],
    # Authority impersonation keywords
    "authority": [
        "rbi", "govt", "government", "bank", "sbi", "icici", "hdfc",
        "axis", "pnb", "baroda", "rbisupport", "bankhelp", "support",
        "customer", "service", "helpdesk", "care", "official", "verify",
        "office", "manager"
    ],
    # Payment-related scam keywords
    "payment": [
        "pay", "payment", "upi", "collect", "request", "transfer"
    ]
}


# =============================================================================
# RULE FUNCTIONS
# =============================================================================

def rule_excessive_digits(handle_features: Dict) -> Tuple[int, str]:
    """
    Rule: Excessive digits in handle indicate potential fake/temporary UPI ID.
    
    Scoring:
    - >70% digits: +25 points
    - 50-70% digits: +15 points
    - 30-50% digits: +5 points
    - All digits (phone number): +20 points
    """
    ratio = handle_features.get("digit_ratio", 0)
    is_all_digits = handle_features.get("is_all_digits", False)
    
    if is_all_digits:
        return 20, "UPI handle is entirely numeric (likely phone number)"
    elif ratio > 0.7:
        return 25, "Handle has excessive digits (>70%)"
    elif ratio > 0.5:
        return 15, "Handle has many digits (>50%)"
    elif ratio > 0.3:
        return 5, "Handle contains significant digits"
    
    return 0, ""


def rule_random_pattern(handle_features: Dict) -> Tuple[int, str]:
    """
    Rule: Random alphanumeric patterns suggest temporary/fake accounts.
    """
    if handle_features.get("looks_random", False):
        return 20, "Handle appears randomly generated"
    return 0, ""


def rule_handle_length(handle_features: Dict) -> Tuple[int, str]:
    """
    Rule: Very short or very long handles are suspicious.
    
    Normal range: 4-20 characters
    """
    length = handle_features.get("length", 0)
    
    if length < 3:
        return 15, "Handle is suspiciously short (<3 chars)"
    elif length > 30:
        return 15, "Handle is unusually long (>30 chars)"
    elif length > 20:
        return 5, "Handle is somewhat long (>20 chars)"
    
    return 0, ""


def rule_repeated_chars(handle_features: Dict) -> Tuple[int, str]:
    """
    Rule: Repeated characters (xxxx, 1111, aaaa) suggest low-effort fake IDs.
    """
    if handle_features.get("has_repeated_chars", False):
        return 15, "Handle contains repeated character sequences"
    return 0, ""


def rule_sequential_digits(handle_features: Dict) -> Tuple[int, str]:
    """
    Rule: Sequential digits (1234, 9876) are common in fake UPIs.
    """
    if handle_features.get("has_sequential_digits", False):
        return 10, "Handle contains sequential digit pattern"
    return 0, ""


def rule_unknown_suffix(suffix_info: Dict) -> Tuple[int, str]:
    """
    Rule: Unknown PSP suffix is suspicious.
    """
    if not suffix_info.get("suffix_known", True):
        return 20, f"Unknown UPI suffix: @{suffix_info.get('suffix', 'unknown')}"
    return 0, ""


def rule_scam_keywords_in_handle(handle: str) -> Tuple[int, List[str]]:
    """
    Rule: Scam-related keywords in handle indicate high risk.
    
    Returns total score and list of reasons.
    """
    handle_lower = handle.lower()
    # Split handle into parts for better keyword matching
    handle_parts = set(re.split(r'[._-]', handle_lower))
    
    score = 0
    reasons = []
    
    # Check high-risk keywords
    for keyword in SCAM_KEYWORDS["high"]:
        if keyword in handle_lower:
            score += 35  # Boosted from 25
            reasons.append(f"Handle contains scam keyword: '{keyword}'")
            # Bonus if it's a distinct part
            if keyword in handle_parts:
                score += 15 # Boosted from 10
            
            # Additional penalty for multiple keywords
            matches = sum(1 for k in SCAM_KEYWORDS["high"] if k in handle_lower)
            if matches > 1:
                score += 20 * (matches - 1)
            break  # Only count base score once
    
    # Check authority impersonation (only if looks personal)
    for keyword in SCAM_KEYWORDS["authority"]:
        if keyword in handle_lower: 
            if len(handle) > 5:
                score += 30 # Boosted from 20
                reasons.append(f"Handle impersonates authority: '{keyword}'")
                break
    
    return score, reasons


def rule_name_mismatch(
    handle: str, 
    display_name: Optional[str], 
    suffix_type: str
) -> Tuple[int, List[str]]:
    """
    Rule: Display name claiming authority but handle looks personal/random.
    
    HIGH RISK: Name says "Bank Support" but handle is "random123@okicici"
    """
    if not display_name:
        return 0, []
    
    name_lower = display_name.lower()
    handle_lower = handle.lower()
    score = 0
    reasons = []
    
    # Authority keywords in display name
    authority_names = [
        "bank", "rbi", "support", "customer", "service", "refund",
        "helpdesk", "official", "government", "govt", "sbi", "hdfc",
        "icici", "axis", "paytm", "phonepe", "gpay", "amazon", "flipkart"
    ]
    
    name_claims_authority = any(kw in name_lower for kw in authority_names)
    
    # Check if handle looks personal (personal bank suffix + random/numeric handle)
    # We treat ALL personal suffixes as suspicious if name claims authority
    is_personal_suffix = suffix_type in ["personal_bank", "personal_app", "unknown"]
    
    # Check if handle contains digits OR doesn't contain the authority name
    handle_suspicious = any(c.isdigit() for c in handle) or (
        name_claims_authority and not any(kw in handle_lower for kw in authority_names if kw in name_lower)
    )
    
    if name_claims_authority and is_personal_suffix:
        # If handle is suspicious (digits or mismatched name)
        if handle_suspicious:
            score = 50 # Boosted from 30
            reasons.append(
                f"Display name '{display_name}' claims authority but handle looks personal"
            )
        else:
             # Even if handle is clean, personal suffix for authority is risky
             score += 25
             reasons.append(f"Authority name '{display_name}' using personal handle suffix")
            
    
    # Check if name and handle completely different
    company_names = ["amazon", "flipkart", "paytm", "phonepe", "gpay", "zomato", "swiggy"]
    for company in company_names:
        if company in name_lower and company not in handle_lower:
            score += 40 # Boosted from 25
            reasons.append(f"Name mentions '{company}' but handle doesn't match")
            break
    
    return score, reasons


def rule_trust_clean_handle(handle_features: Dict) -> Tuple[int, str]:
    """
    Rule: Clean, short alphabetic handles are trustworthy.
    
    Negative score = trust signal
    """
    length = handle_features.get("length", 0)
    is_all_alpha = handle_features.get("is_all_alpha", False)
    
    if is_all_alpha and 4 <= length <= 15:
        return -15, "Clean alphabetic handle"
    elif is_all_alpha:
        return -5, "Alphabetic handle"
    
    return 0, ""


def rule_trust_known_merchant_suffix(suffix_info: Dict) -> Tuple[int, str]:
    """
    Rule: Known merchant suffix increases trust.
    """
    if suffix_info.get("suffix_type") == "merchant":
        return -10, "Known merchant payment suffix"
    return 0, ""


def rule_trust_name_matches_handle(
    handle: str, 
    display_name: Optional[str]
) -> Tuple[int, str]:
    """
    Rule: When display name roughly matches handle, it's more trustworthy.
    """
    if not display_name:
        return 0, ""
    
    # Normalize for comparison
    handle_clean = re.sub(r'[^a-z]', '', handle.lower())
    name_clean = re.sub(r'[^a-z]', '', display_name.lower())
    
    # Check if significant overlap
    if len(handle_clean) >= 4 and len(name_clean) >= 4:
        if handle_clean in name_clean or name_clean in handle_clean:
            return -10, "Display name matches handle"
    
    return 0, ""


# =============================================================================
# RULE COLLECTION
# =============================================================================

def get_all_rules():
    """
    Returns list of all risk rules for documentation/introspection.
    """
    return [
        ("R-UPI-001", "Excessive Digits", rule_excessive_digits),
        ("R-UPI-002", "Random Pattern", rule_random_pattern),
        ("R-UPI-003", "Handle Length", rule_handle_length),
        ("R-UPI-004", "Repeated Characters", rule_repeated_chars),
        ("R-UPI-005", "Sequential Digits", rule_sequential_digits),
        ("R-UPI-006", "Unknown Suffix", rule_unknown_suffix),
        ("R-UPI-007", "Scam Keywords", rule_scam_keywords_in_handle),
        ("R-UPI-008", "Name Mismatch", rule_name_mismatch),
        ("R-UPI-T01", "Trust: Clean Handle", rule_trust_clean_handle),
        ("R-UPI-T02", "Trust: Merchant Suffix", rule_trust_known_merchant_suffix),
        ("R-UPI-T03", "Trust: Name Matches", rule_trust_name_matches_handle),
    ]
