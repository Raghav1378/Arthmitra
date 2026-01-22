"""
Safe-to-Spend Calculator
------------------------
Calculates dynamic daily spending limits based on disposable income and time remaining.
"""

from typing import Dict, Any

def calculate_safe_spend(
    monthly_income: float,
    fixed_expenses: float,
    variable_commitments: float,
    days_remaining: int
) -> Dict[str, Any]:
    """
    Calculate the Daily Safe-To-Spend limit.
    
    Logic:
        Disposable = Income - Fixed - Variable Commitments (SAVINGS are treated as FIXED here)
        Daily Safe = Disposable / Days Remaining
        
    Args:
        monthly_income: Total monthly inflow.
        fixed_expenses: Rent, EMIs, Bills, SIPs (Non-negotiable).
        variable_commitments: Planned/Committed variable spends (e.g., specific event fees).
        days_remaining: Number of days left in the month (including today).
        
    Returns:
        Dict with safe_limit, status, and health message.
    """
    if days_remaining <= 0:
        return {
            "safe_per_day": 0.0,
            "status": "RISKY",
            "message": "Month is over or invalid days remaining."
        }
        
    total_committed = fixed_expenses + variable_commitments
    disposable_income = monthly_income - total_committed
    
    if disposable_income <= 0:
        return {
            "safe_per_day": 0.0,
            "buffer_remaining": round(disposable_income, 2),
            "status": "CRITICAL",
            "message": "Expenses exceed income. Stop spending immediately."
        }
        
    safe_daily = disposable_income / days_remaining
    
    # Analyze status
    # Simple heuristic: Is safe_daily 'livable'?
    # We don't know the user's COL, but we can give generic flags.
    status = "SAFE"
    if safe_daily < 100: # Arbitrary low threshold for India (INR)
        status = "WARNING"
    if safe_daily < 0:
        status = "CRITICAL"
        
    return {
        "safe_per_day": round(safe_daily, 2),
        "buffer_remaining": round(disposable_income, 2),
        "status": status,
        "message": f"You can safely spend ₹{round(safe_daily)} per day for the next {days_remaining} days."
    }
