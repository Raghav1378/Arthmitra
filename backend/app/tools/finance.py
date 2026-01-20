import json
import pandas as pd
from sklearn.ensemble import IsolationForest
from langchain_core.tools import tool
from langchain_ollama import ChatOllama

def get_transactions():
    try:
        with open('backend/data/transactions.json', 'r') as f:
            return json.load(f)
    except:
        return []

def get_profiles():
    try:
        with open('backend/data/synthetic_data.json', 'r') as f:
            data = json.load(f)
            return data.get('profiles', [])
    except:
        return []

@tool
def analyze_transactions(user_id: str = "default_user"):
    """Uses AI to detect spending anomalies in user transactions."""
    transactions = get_transactions()
    if not transactions:
        return "No transactions found to analyze."
    
    df = pd.DataFrame(transactions)
    # Simple feature: amount and hour of day
    df['hour'] = pd.to_datetime(df['timestamp']).dt.hour
    X = df[['amount', 'hour']]
    
    model = IsolationForest(contamination=0.05, random_state=42)
    df['anomaly_score'] = model.fit_predict(X)
    
    anomalies = df[df['anomaly_score'] == -1].to_dict(orient='records')
    
    return {
        "total_analyzed": len(df),
        "anomalies_detected": len(anomalies),
        "sample_anomalies": anomalies[:5]
    }

@tool
def predict_loan_eligibility(user_income: float, credit_score: int, total_emi_load: float):
    """Predicts loan eligibility based on income, credit score, and current EMI load."""
    # DeepSeek-R1 logic is handled by the node invoking this tool or as a standalone call
    # Here we simulate the reasoning logic
    ratio = total_emi_load / user_income if user_income > 0 else 1.0
    
    status = "Approved" if credit_score > 700 and ratio < 0.4 else "Review Required"
    if credit_score < 500: status = "Rejected"
    
    return {
        "status": status,
        "debt_to_income_ratio": round(ratio, 2),
        "credit_score_tier": "Excellent" if credit_score > 750 else "Average",
        "reasoning_summary": f"Based on {ratio*100}% EMI load and score of {credit_score}."
    }
