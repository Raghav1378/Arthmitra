"""
Budget API
----------
Internal API for the Budgeting module.
"""

from typing import Dict, Any
from .safe_to_spend import calculate_safe_spend

def get_daily_budget_guidance(
    income: float,
    fixed_costs: float,
    planned_variable: float,
    days_left: int
) -> Dict[str, Any]:
    """
    Get daily budget guidance.
    
    Args:
        income: Total monthly income.
        fixed_costs: Sum of all fixed expenses.
        planned_variable: Sum of known variable commitments.
        days_left: Days remaining in the cycle.
        
    Returns:
        Structured budget guidance.
    """
    return calculate_safe_spend(
        monthly_income=income,
        fixed_expenses=fixed_costs,
        variable_commitments=planned_variable,
        days_remaining=days_left
    )
