"""
Subscription API
----------------
Internal API for the Subscription Detection module.
"""

from typing import List, Dict, Any
from .subscription_detector import detect_recurring_payments

def analyze_subscriptions(transactions: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Analyze transactions to find subscriptions.
    
    Args:
        transactions: List of transaction dicts.
        
    Returns:
        Analysis result with detected subscriptions.
    """
    return detect_recurring_payments(transactions)
