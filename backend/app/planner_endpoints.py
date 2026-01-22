"""
Planner Endpoints
-----------------
FastAPI Router for the Planner module.
Exposes financial planning capabilities to the frontend.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from app.planner.planner_api import analyze_financial_plan

planner_router = APIRouter(prefix="/api/planner", tags=["Planner - Personal Finance"])

# ==========================================
# Pydantic Models for Input Validation
# ==========================================

class GoalRequest(BaseModel):
    goal_name: str = Field(..., example="Tesla Model 3")
    current_cost: float = Field(..., gt=0, example=4000000)
    years: int = Field(..., gt=0, example=3)
    current_savings: float = Field(0.0, ge=0, example=500000)
    monthly_savings_capacity: float = Field(0.0, ge=0, example=60000)
    inflation_rate: float = Field(6.0, ge=0, example=6.0)
    expected_return: float = Field(10.0, ge=0, example=12.0)

class BudgetRequest(BaseModel):
    monthly_income: float = Field(..., gt=0, example=150000)
    fixed_expenses: float = Field(..., ge=0, example=50000)
    variable_commitments: float = Field(0.0, ge=0, example=20000)
    days_remaining: int = Field(..., gt=0, le=31, example=10)

class TransactionItem(BaseModel):
    merchant: str = Field(..., example="Netflix")
    amount: float = Field(..., gt=0, example=649.0)

class PlannerAnalyzeRequest(BaseModel):
    goals: Optional[GoalRequest] = None
    budget: Optional[BudgetRequest] = None
    transactions: Optional[List[TransactionItem]] = None

# ==========================================
# API Endpoints
# ==========================================

@planner_router.post("/analyze")
async def analyze_financial_plan_endpoint(request: PlannerAnalyzeRequest):
    """
    Run a specific analysis on Goals, Budget, or Subscriptions.
    Pass only the sections you want to analyze.
    """
    try:
        # Convert Pydantic models to Dicts for the internal API
        goals_dict = request.goals.dict() if request.goals else None
        budget_dict = request.budget.dict() if request.budget else None
        transactions_list = [t.dict() for t in request.transactions] if request.transactions else None

        result = analyze_financial_plan(
            goals=goals_dict,
            budget_params=budget_dict,
            transactions=transactions_list
        )
        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Planner analysis failed: {str(e)}")

@planner_router.post("/calculate-goal")
async def calculate_goal_only(goal: GoalRequest):
    """
    Convenience endpoint for just Goal calculation.
    """
    try:
        return analyze_financial_plan(goals=goal.dict()).get("goal_analysis", {})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@planner_router.post("/check-budget")
async def check_budget_today(budget: BudgetRequest):
    """
    Convenience endpoint for just Safe-to-Spend check.
    """
    try:
        return analyze_financial_plan(budget_params=budget.dict()).get("budget_analysis", {})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
