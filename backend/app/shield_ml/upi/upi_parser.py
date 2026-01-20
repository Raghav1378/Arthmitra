"""
UPI Parser - Validation and Normalization

Handles UPI ID format validation, parsing, and normalization.
Extracts handle and PSP suffix for analysis.
"""

import re
from typing import Optional, Tuple, Dict


# Valid UPI ID pattern: handle@psp
# Handle: 1-100 chars, alphanumeric + dots/underscores
# PSP: 2-50 chars, alphanumeric
UPI_PATTERN = re.compile(
    r'^([a-zA-Z0-9._-]{1,100})@([a-zA-Z0-9]{2,50})$',
    re.IGNORECASE
)

# Known payment service provider (PSP) suffixes
# Grouped by type for risk analysis
PSP_SUFFIXES = {
    # Major banks - Personal handles
    "personal_bank": [
        "okicici", "oksbi", "okhdfcbank", "okaxis", "ybl", "ibl", 
        "sbi", "icici", "hdfcbank", "axisbank", "upi", "barodampay",
        "pnb", "canarabank", "unionbank", "bob", "kotak", "indus",
        "federal", "rbl", "dbs", "hsbc", "citi", "sc"
    ],
    # Payment apps - Personal handles
    "personal_app": [
        "paytm", "gpay", "phonepe", "freecharge", "mobikwik",
        "airtel", "jio", "amazonpay", "slice", "cred", "jupiter"
    ],
    # Merchant-specific suffixes
    "merchant": [
        "paytm", "razorpay", "yesbank", "yesbankltd", "hdfcbankqr",
        "axisb", "icicibank", "sbiupi"
    ],
    # Rare/unknown - higher suspicion
    "rare": []
}

# Flatten for quick lookup
ALL_KNOWN_SUFFIXES = set()
for category in PSP_SUFFIXES.values():
    ALL_KNOWN_SUFFIXES.update(category)


def validate_upi_format(upi_id: str) -> bool:
    """
    Check if UPI ID matches valid format.
    
    Args:
        upi_id: The UPI ID string to validate
        
    Returns:
        True if valid format, False otherwise
    """
    if not upi_id or not isinstance(upi_id, str):
        return False
    
    return bool(UPI_PATTERN.match(upi_id.strip()))


def parse_upi_id(upi_id: str) -> Optional[Dict[str, str]]:
    """
    Parse UPI ID into components.
    
    Args:
        upi_id: The UPI ID to parse
        
    Returns:
        Dict with handle, suffix, original, normalized
        None if invalid format
    """
    if not upi_id or not isinstance(upi_id, str):
        return None
    
    upi_id = upi_id.strip()
    match = UPI_PATTERN.match(upi_id)
    
    if not match:
        return None
    
    handle = match.group(1)
    suffix = match.group(2).lower()
    
    return {
        "original": upi_id,
        "normalized": f"{handle.lower()}@{suffix}",
        "handle": handle,
        "handle_lower": handle.lower(),
        "suffix": suffix,
        "suffix_known": suffix in ALL_KNOWN_SUFFIXES,
        "suffix_type": get_suffix_type(suffix)
    }


def get_suffix_type(suffix: str) -> str:
    """
    Determine the type of PSP suffix.
    
    Returns: "personal_bank", "personal_app", "merchant", or "unknown"
    """
    suffix = suffix.lower()
    
    for stype, suffixes in PSP_SUFFIXES.items():
        if suffix in suffixes:
            return stype
    
    return "unknown"


def normalize_upi_id(upi_id: str) -> Optional[str]:
    """
    Normalize UPI ID to lowercase.
    
    Args:
        upi_id: The UPI ID to normalize
        
    Returns:
        Normalized UPI ID or None if invalid
    """
    parsed = parse_upi_id(upi_id)
    return parsed["normalized"] if parsed else None


def extract_handle_features(handle: str) -> Dict:
    """
    Extract features from UPI handle for risk analysis.
    
    Args:
        handle: The UPI handle (part before @)
        
    Returns:
        Dict with various handle features
    """
    if not handle:
        return {"valid": False}
    
    handle_lower = handle.lower()
    
    # Count character types
    digits = sum(c.isdigit() for c in handle)
    letters = sum(c.isalpha() for c in handle)
    specials = len(handle) - digits - letters
    
    # Pattern detection
    has_repeated = bool(re.search(r'(.)\1{3,}', handle))  # 4+ repeated chars
    has_sequential_digits = bool(re.search(r'(0123|1234|2345|3456|4567|5678|6789|9876|8765|7654|6543|5432|4321|3210)', handle))
    is_all_digits = handle.isdigit()
    is_all_alpha = handle.isalpha()
    looks_random = _looks_random(handle_lower)
    
    return {
        "valid": True,
        "length": len(handle),
        "digit_count": digits,
        "letter_count": letters,
        "special_count": specials,
        "digit_ratio": digits / len(handle) if handle else 0,
        "is_all_digits": is_all_digits,
        "is_all_alpha": is_all_alpha,
        "has_repeated_chars": has_repeated,
        "has_sequential_digits": has_sequential_digits,
        "looks_random": looks_random
    }


def _looks_random(handle: str) -> bool:
    """
    Heuristic to detect random alphanumeric patterns.
    Random patterns often have mixed case, digits scattered among letters,
    and no recognizable words.
    """
    if len(handle) < 6:
        return False
    
    # Check for alternating letters and digits (suspicious pattern)
    transitions = 0
    for i in range(1, len(handle)):
        if handle[i].isdigit() != handle[i-1].isdigit():
            transitions += 1
    
    # High transition rate = likely random
    transition_rate = transitions / (len(handle) - 1) if len(handle) > 1 else 0
    
    # More than 40% transitions is suspicious
    return transition_rate > 0.4
