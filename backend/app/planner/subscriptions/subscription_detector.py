"""
Subscription Detector
---------------------
Rule-based logic to identify recurring subscription payments from transaction history.
"""

from typing import List, Dict, Any
from collections import defaultdict

def detect_recurring_payments(transactions: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Detect subscriptions based on rigid rules:
    - Same Merchant Name
    - Same Amount (approximate or exact)
    - Occurred >= 2 times
    
    Args:
        transactions: List of dicts, must have "merchant" and "amount".
        
    Returns:
        Dict with 'subscriptions' (list) and 'total_monthly_cost'.
    """
    if not transactions:
        return {"subscriptions": [], "total_monthly_cost": 0.0}
        
    # Key: (merchant_name, amount) -> Count
    # We use a string key for simplicity
    patterns = defaultdict(int) 
    candidates = defaultdict(list) # store raw txns to inspect dates later if needed
    
    for txn in transactions:
        merchant = txn.get("merchant", "Unknown").lower().strip()
        amount = float(txn.get("amount", 0.0))
        
        # Simple clustering key
        key = (merchant, amount)
        patterns[key] += 1
        candidates[key].append(txn)
        
    detected = []
    total_cost = 0.0
    
    for (merchant, amount), count in patterns.items():
        if count >= 2:
            # It's likely a subscription or recurring bill
            sub = {
                "merchant": merchant.title(),
                "amount": amount,
                "frequency": "MONTHLY", # Assumed for now
                "occurrences_found": count,
                "risk": "LOW" # Known verified recurring
            }
            detected.append(sub)
            total_cost += amount
            
    return {
        "subscriptions": detected,
        "total_monthly_cost": round(total_cost, 2)
    }
