"""
Planner Unified API
-------------------
The main entry point for Module 3: The Planner.
Aggregates logic from Goals, Budgeting, and Subscriptions.
"""

from typing import Dict, Any, List, Optional
from .goals.goal_api import analyze_goal
from .budgeting.budget_api import get_daily_budget_guidance
from .subscriptions.subscription_api import analyze_subscriptions

def analyze_financial_plan(
    goals: Optional[Dict[str, Any]] = None,
    budget_params: Optional[Dict[str, Any]] = None,
    transactions: Optional[List[Dict[str, Any]]] = None
) -> Dict[str, Any]:
    """
    Run a comprehensive financial analysis.
    
    Args:
        goals: Dict containing goal parameters (e.g., {"goal_name": "Retirement", ...}).
               Currently supports analyzing ONE primary goal for this API version.
        budget_params: Dict for safe-to-spend (income, fixed, variable, days_left).
        transactions: List of transaction objects for subscription detection.
        
    Returns:
        Unified analysis dictionary.
    """
    result = {
        "goal_analysis": None,
        "budget_analysis": None,
        "subscription_analysis": None,
        "planner_health_score": 0
    }
    
    # 1. Analyze Goals
    if goals:
        result["goal_analysis"] = analyze_goal(
            goal_name=goals.get("goal_name", "My Goal"),
            current_cost=goals.get("current_cost", 0),
            years=goals.get("years", 10),
            current_savings=goals.get("current_savings", 0),
            monthly_savings_capacity=goals.get("monthly_savings_capacity", 0),
            inflation_rate=goals.get("inflation_rate", 6.0),
            expected_return=goals.get("expected_return", 10.0)
        )
        
    # 2. Analyze Budget
    if budget_params:
        result["budget_analysis"] = get_daily_budget_guidance(
            income=budget_params.get("monthly_income", 0),
            fixed_costs=budget_params.get("fixed_expenses", 0),
            planned_variable=budget_params.get("variable_commitments", 0),
            days_left=budget_params.get("days_remaining", 30)
        )
        
    # 3. Analyze Subscriptions
    if transactions:
        result["subscription_analysis"] = analyze_subscriptions(transactions)
        
    # 4. Calculate Health Score (Simple Heuristic for now)
    score = 50 # Base score
    
    # Improve if budget is SAFE
    if result["budget_analysis"] and result["budget_analysis"].get("status") == "SAFE":
        score += 20
    elif result["budget_analysis"] and result["budget_analysis"].get("status") == "CRITICAL":
        score -= 20
        
    # Improve if Goal Risk is LOW
    if result["goal_analysis"] and result["goal_analysis"].get("risk_level") == "LOW":
        score += 20
    if result["goal_analysis"] and result["goal_analysis"].get("risk_level") == "HIGH":
        score -= 10
        
    # Clamp score
    result["planner_health_score"] = max(0, min(100, score))
    
    return result
