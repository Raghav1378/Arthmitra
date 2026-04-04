import sys
import os
import json

# Add project root to path so we can import 'app'
sys.path.append(os.getcwd())

try:
    from app.planner.planner_api import analyze_financial_plan
except ImportError:
    # Fallback if running from inside backend/
    sys.path.append(os.path.join(os.getcwd(), ".."))
    from app.planner.planner_api import analyze_financial_plan

def run_demo():
    print("🚀 Running Planner Module Demo...\n")

    # ==========================================
    # 1. SCENARIO: "I want to buy a car in 3 years"
    # ==========================================
    goals = {
        "goal_name": "Tesla Model 3",
        "current_cost": 4000000,       # ₹40 Lakhs today
        "years": 3,                    # In 3 years
        "current_savings": 500000,     # I have ₹5 Lakhs saved
        "monthly_savings_capacity": 60000, # I can save ₹60k/month
        "inflation_rate": 6.0,         # 6% Inflation
        "expected_return": 12.0        # 12% SIP returns
    }

    # ==========================================
    # 2. SCENARIO: "Can I spend ₹2000 today?"
    # ==========================================
    budget = {
        "monthly_income": 150000,      # ₹1.5 Lakh/month
        "fixed_expenses": 50000,       # Rent, EMIs
        "variable_commitments": 20000, # Planned trips, fees
        "days_remaining": 10           # 10 days left in month
    }

    # ==========================================
    # 3. SCENARIO: "Find my hidden subscriptions"
    # ==========================================
    transactions = [
        {"merchant": "Netflix", "amount": 649},
        {"merchant": "Netflix", "amount": 649},    # Recurring!
        {"merchant": "Spotify", "amount": 119},
        {"merchant": "Spotify", "amount": 119},    # Recurring!
        {"merchant": "Uber", "amount": 450},       # One-off
        {"merchant": "Zomato", "amount": 800},     # One-off
        {"merchant": "Apple Cloud", "amount": 219},
        {"merchant": "Apple Cloud", "amount": 219} # Recurring!
    ]

    # Run Analysis
    result = analyze_financial_plan(goals, budget, transactions)

    # Print Results nicely
    print(json.dumps(result, indent=2))

    print("\n✅ Demo Complete!")

if __name__ == "__main__":
    run_demo()
