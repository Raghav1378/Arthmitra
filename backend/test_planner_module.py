import sys
import os
import json

# Add current directory to path so we can import 'app'
sys.path.append(os.getcwd())

from app.planner.planner_api import analyze_financial_plan

def test_planner():
    print("Testing Planner Module...")
    
    # 1. Goal Data
    goals = {
        "goal_name": "Buy a Car",
        "current_cost": 1000000, # 10 Lakh
        "years": 5,
        "current_savings": 200000,
        "monthly_savings_capacity": 15000,
        "inflation_rate": 6.0,
        "expected_return": 10.0
    }
    
    # 2. Budget Data
    budget = {
        "monthly_income": 80000,
        "fixed_expenses": 30000,
        "variable_commitments": 10000,
        "days_remaining": 15
    }
    
    # 3. Transaction Data (for Subscriptions)
    transactions = [
        {"merchant": "Netflix", "amount": 649},
        {"merchant": "Netflix", "amount": 649}, # Should be detected
        {"merchant": "Spotify", "amount": 119},
        {"merchant": "Spotify", "amount": 119}, # Should be detected
        {"merchant": "Uber", "amount": 200},    # Only once, not sub
        {"merchant": "Zomato", "amount": 400},   # Only once, not sub
    ]
    
    result = analyze_financial_plan(goals, budget, transactions)
    
    with open("test_output.txt", "w") as f:
        f.write("\n--- PLANNER RESULT ---\n")
        f.write(json.dumps(result, indent=2))
        f.write("\n")
        
        # Simple Assertions
        try:
            assert result["goal_analysis"]["future_cost"] > 1000000, "Inflation check failed"
            assert result["budget_analysis"]["status"] == "SAFE", "Budget check failed"
            assert len(result["subscription_analysis"]["subscriptions"]) == 2, "Subscription count failed"
            f.write("\n✅ Planner Module Verification PASSED!\n")
        except AssertionError as e:
            f.write(f"\n❌ VERIFICATION FAILED: {str(e)}\n")
        except Exception as e:
            f.write(f"\n❌ ERROR: {str(e)}\n")

if __name__ == "__main__":
    test_planner()
