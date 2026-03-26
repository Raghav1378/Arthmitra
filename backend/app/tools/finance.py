import json
import pandas as pd
from pathlib import Path
from sklearn.ensemble import IsolationForest
from langchain_core.tools import tool

# Get the backend directory path
BACKEND_DIR = Path(__file__).parent.parent.parent

def get_transactions() -> list:
    """Load transactions from data directory."""
    try:
        transaction_path = BACKEND_DIR / 'data' / 'transactions.json'
        with open(transaction_path, 'r') as f:
            return json.load(f)
    except Exception as e:
        print(f"Warning: Could not load transactions: {e}")
        return []

def get_profiles() -> list:
    """Load user profiles from data directory."""
    try:
        profile_path = BACKEND_DIR / 'data' / 'synthetic_data.json'
        with open(profile_path, 'r') as f:
            data = json.load(f)
            return data.get('profiles', [])
    except Exception as e:
        print(f"Warning: Could not load profiles: {e}")
        return []

@tool
def analyze_transactions(user_id: str = "default_user"):
    """Uses AI to detect spending anomalies in user transactions."""
    transactions = get_transactions()
    if not transactions:
        return {
            "message": "No transactions found to analyze.",
            "total_analyzed": 0,
            "anomalies_detected": 0,
            "anomalies": []
        }

    df = pd.DataFrame(transactions)

    # Check if required columns exist
    required_cols = ['amount', 'timestamp']
    if not all(col in df.columns for col in required_cols):
        return {
            "message": "Transactions missing required columns (amount, timestamp)",
            "total_analyzed": 0,
            "anomalies_detected": 0,
            "anomalies": []
        }

    # Simple feature: amount and hour of day
    try:
        df['hour'] = pd.to_datetime(df['timestamp']).dt.hour
        X = df[['amount', 'hour']].fillna(0)

        model = IsolationForest(contamination=0.05, random_state=42)
        df['anomaly_score'] = model.fit_predict(X)

        anomalies = df[df['anomaly_score'] == -1].to_dict(orient='records')

        return {
            "total_analyzed": len(df),
            "anomalies_detected": len(anomalies),
            "sample_anomalies": anomalies[:5] if len(anomalies) > 0 else []
        }
    except Exception as e:
        return {
            "message": f"Error analyzing transactions: {str(e)}",
            "total_analyzed": len(df),
            "anomalies_detected": 0,
            "anomalies": []
        }

@tool
def predict_loan_eligibility(user_income: float, credit_score: int, total_emi_load: float):
    """Predicts loan eligibility based on income, credit score, and current EMI load."""
    try:
        ratio = total_emi_load / user_income if user_income > 0 else 1.0

        status = "Approved" if credit_score > 700 and ratio < 0.4 else "Review Required"
        if credit_score < 500:
            status = "Rejected"

        credit_tier = "Excellent" if credit_score > 750 else "Good" if credit_score > 650 else "Fair" if credit_score > 500 else "Poor"

        return {
            "status": status,
            "debt_to_income_ratio": round(ratio * 100, 2),  # Return as percentage
            "credit_score_tier": credit_tier,
            "credit_score": credit_score,
            "monthly_income": user_income,
            "total_emi": total_emi_load,
            "reasoning_summary": f"Based on {ratio*100:.1f}% EMI load and credit score of {credit_score}."
        }
    except Exception as e:
        return {
            "error": f"Loan eligibility check failed: {str(e)}",
            "status": "Error"
        }