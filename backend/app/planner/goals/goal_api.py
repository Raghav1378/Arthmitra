"""
Goal API
--------
Internal API for the Goal Planning module.
Exposes high-level functions to be used by the Unified Planner or other modules.
"""

from typing import Dict, Any, Optional
from .goal_calculator import (
    calculate_future_goal_cost,
    calculate_monthly_savings_required,
    assess_goal_risk
)

# Constants for defaults
DEFAULT_INFLATION_RATE = 6.0       # Conservative 6% inflation
DEFAULT_INVESTMENT_RETURN = 10.0   # Conservative 10% equity/hybrid return

def analyze_goal(
    goal_name: str,
    current_cost: float,
    years: int,
    current_savings: float = 0.0,
    monthly_savings_capacity: float = 0.0,
    inflation_rate: float = DEFAULT_INFLATION_RATE,
    expected_return: float = DEFAULT_INVESTMENT_RETURN
) -> Dict[str, Any]:
    """
    Analyze a single financial goal.
    
    Args:
        goal_name: Name of the goal (e.g., "Retirement").
        current_cost: Cost of the goal in today's money.
        years: Years to achieve the goal.
        current_savings: Amount explicitly saved for this goal so far.
        monthly_savings_capacity: How much the user *can* save per month (optional, for risk calc).
        inflation_rate: Expected annual inflation %.
        expected_return: Expected annual investment return %.
        
    Returns:
        Dict containing future cost, required savings, and risk analysis.
    """
    try:
        # 1. Calculate Inflation-Adjusted Cost
        future_cost = calculate_future_goal_cost(current_cost, years, inflation_rate)
        
        # 2. Calculate Required Monthly Savings
        required_monthly = calculate_monthly_savings_required(
            target_amount=future_cost,
            years=years,
            current_savings=current_savings,
            rate_of_return=expected_return
        )
        
        # 3. Assess Risk (if capacity provided)
        risk_level = "UNKNOWN"
        if monthly_savings_capacity > 0:
            risk_level = assess_goal_risk(required_monthly, monthly_savings_capacity)
            
        return {
            "goal_name": goal_name,
            "years_to_goal": years,
            "current_cost": current_cost,
            "inflation_rate": inflation_rate,
            "future_cost": future_cost,
            "required_monthly_savings": required_monthly,
            "current_shortfall": max(0, future_cost - current_savings),
            "risk_level": risk_level
        }
        
    except Exception as e:
        return {
            "goal_name": goal_name,
            "error": str(e),
            "status": "failed"
        }
