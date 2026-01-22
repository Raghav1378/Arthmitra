"""
Goal Calculator
---------------
Provides deterministic mathematical functions for financial goal planning.
Handles inflation adjustments, future value calculations, and savings gap analysis.
"""

import math

def calculate_future_goal_cost(current_cost: float, years: int, inflation_rate: float) -> float:
    """
    Calculate the Future Value (FV) of a financial goal based on inflation.
    
    Formula: FV = PV * (1 + r)^n
    
    Args:
        current_cost: The cost of the goal today (Present Value).
        years: Number of years until the goal is needed.
        inflation_rate: Annual inflation rate (as a percentage, e.g., 6.0 for 6%).
        
    Returns:
        float: The estimated future cost.
    """
    if years < 0:
        raise ValueError("Years cannot be negative.")
    if inflation_rate < 0:
        raise ValueError("Inflation rate cannot be negative.")
        
    rate_decimal = inflation_rate / 100.0
    future_value = current_cost * ((1 + rate_decimal) ** years)
    return round(future_value, 2)

def calculate_monthly_savings_required(target_amount: float, years: int, current_savings: float, rate_of_return: float) -> float:
    """
    Calculate the monthly savings required to reach a target amount.
    
    Uses the Future Value of an Annuity formula (solved for PMT), accounting for initial lump sum growth.
    
    Args:
        target_amount: The goal amount needed in the future.
        years: Time horizon in years.
        current_savings: Amount already saved/invested.
        rate_of_return: Expected annual return on investments (percentage).
        
    Returns:
        float: Monthly savings required. Returns 0 if current savings already suffice.
    """
    if years == 0:
        return 0.0 if current_savings >= target_amount else (target_amount - current_savings)
    
    months = years * 12
    monthly_rate = (rate_of_return / 100.0) / 12
    
    # 1. Grow the current savings
    # FV_lump = PV * (1 + r)^n
    fv_lump_sum = current_savings * ((1 + monthly_rate) ** months)
    
    # 2. Determine remaining gap
    remaining_needed = target_amount - fv_lump_sum
    
    if remaining_needed <= 0:
        return 0.0
    
    # 3. Calculate PMT for the remaining amount
    # PMT = FV * r / ((1 + r)^n - 1)
    if monthly_rate == 0:
        pmt = remaining_needed / months
    else:
        pmt = remaining_needed * monthly_rate / (((1 + monthly_rate) ** months) - 1)
        
    return round(pmt, 2)

def assess_goal_risk(monthly_saving_required: float, current_monthly_savings_capacity: float) -> str:
    """
    Assess the achievability of the goal.
    
    Args:
        monthly_saving_required: New required savings amount.
        current_monthly_savings_capacity: User's actual current savings/surplus.
        
    Returns:
        str: "LOW", "MEDIUM", or "HIGH" risk.
    """
    if monthly_saving_required <= 0:
        return "LOW"
        
    # If required is more than capacity
    if current_monthly_savings_capacity <= 0:
        return "HIGH"
        
    ratio = monthly_saving_required / current_monthly_savings_capacity
    
    if ratio <= 0.8:
        return "LOW"    # Comfortable (uses <= 80% of capacity)
    elif ratio <= 1.0:
        return "MEDIUM" # Tight (uses 80-100% of capacity)
    else:
        return "HIGH"   # Unrealistic (requires more than capacity)
