"""
Numeric Transaction Risk Prediction Module

This module provides the predict_transaction_risk() function for
real-time fraud/risk scoring of UPI and banking transactions.

Usage:
    from app.shield_ml.numeric_predict import predict_transaction_risk
    
    result = predict_transaction_risk({
        "transaction_amount": 50000,
        "avg_transaction_amount": 2000,
        "transactions_last_24h": 15,
        "amount_spike_ratio": 25.0,
        "is_new_receiver": 1,
        "is_new_device": 1,
        "time_since_last_txn_minutes": 5
    })
    # Returns: {"risk_score": 87, "risk_level": "high", "reasons": [...]}
"""

import os
import joblib
import numpy as np
from typing import Dict, List, Optional

from .numeric_features import (
    validate_features,
    prepare_feature_vector,
    calculate_derived_features,
    FEATURE_ORDER,
    FEATURE_DEFINITIONS
)

# Model path
MODELS_DIR = os.path.join(os.path.dirname(__file__), 'models')
MODEL_PATH = os.path.join(MODELS_DIR, 'numeric_model.pkl')

# Global model cache
_model = None


def _load_model():
    """Lazy load model on first prediction call."""
    global _model
    
    if _model is None:
        if not os.path.exists(MODEL_PATH):
            raise FileNotFoundError(
                f"Model not found at {MODEL_PATH}. "
                "Please run train_numeric_model.py first."
            )
        
        _model = joblib.load(MODEL_PATH)
        print(f"[OK] Loaded transaction risk model from {MODELS_DIR}")


def _calculate_risk_score(fraud_probability: float) -> int:
    """
    Convert model probability to 0-100 risk score.
    
    Calibration:
    - 0.0 - 0.3 probability → 0-30 score (low risk)
    - 0.3 - 0.6 probability → 30-60 score (medium risk)
    - 0.6 - 1.0 probability → 60-100 score (high risk)
    
    This scaling gives more granularity in the middle range
    where human review is most likely needed.
    """
    score = int(fraud_probability * 100)
    return min(100, max(0, score))


def _determine_risk_level(score: int) -> str:
    """
    Categorize risk score into levels.
    
    Thresholds based on typical fraud prevention rules:
    - Low (0-39): Auto-approve, minimal friction
    - Medium (40-69): Additional verification (OTP, 2FA)
    - High (70-100): Block or manual review required
    """
    if score < 40:
        return "low"
    elif score < 70:
        return "medium"
    else:
        return "high"


def _generate_risk_reasons(features: Dict, fraud_probability: float) -> List[str]:
    """
    Generate human-readable explanations for the risk score.
    
    These reasons help users and reviewers understand
    WHY a transaction was flagged.
    """
    reasons = []
    
    # High amount spike
    spike = features.get("amount_spike_ratio", 0)
    if spike > 10:
        reasons.append(f"Amount is {spike:.1f}x higher than your average")
    elif spike > 5:
        reasons.append(f"Unusual amount ({spike:.1f}x your average)")
    
    # New receiver
    if features.get("is_new_receiver") == 1:
        reasons.append("First transaction to this receiver")
    
    # New device
    if features.get("is_new_device") == 1:
        reasons.append("Transaction from new/unrecognized device")
    
    # High velocity
    txn_count = features.get("transactions_last_24h", 0)
    if txn_count > 15:
        reasons.append(f"Unusually high transaction velocity ({txn_count} in 24h)")
    elif txn_count > 10:
        reasons.append(f"Multiple transactions in short period ({txn_count} in 24h)")
    
    # Rapid succession
    time_since = features.get("time_since_last_txn_minutes", 1000)
    if time_since < 5:
        reasons.append(f"Very quick succession ({time_since:.1f} min since last txn)")
    elif time_since < 15:
        reasons.append(f"Transaction in quick succession")
    
    # Large amount
    amount = features.get("transaction_amount", 0)
    if amount > 100000:
        reasons.append(f"Large transaction amount (₹{amount:,.0f})")
    elif amount > 50000:
        reasons.append(f"Significant transaction amount (₹{amount:,.0f})")
    
    # If no specific reasons but still risky, add generic reason
    if not reasons and fraud_probability > 0.5:
        reasons.append("Combination of factors indicates elevated risk")
    
    # Limit to top 5 reasons
    return reasons[:5]


def predict_transaction_risk(features: Dict) -> Dict:
    """
    Predict fraud risk for a transaction.
    
    Args:
        features: Dictionary with transaction features:
            - transaction_amount (float): Amount in INR
            - avg_transaction_amount (float): User's average
            - transactions_last_24h (int): Count of recent txns
            - amount_spike_ratio (float): Optional, calculated if missing
            - is_new_receiver (0/1): First txn to this receiver?
            - is_new_device (0/1): From new device?
            - time_since_last_txn_minutes (float): Time gap
            
    Returns:
        dict with keys:
            - risk_score (int): 0-100 risk score
            - risk_level (str): "low", "medium", or "high"
            - reasons (list): Human-readable risk explanations
            
    Example:
        >>> predict_transaction_risk({
        ...     "transaction_amount": 75000,
        ...     "avg_transaction_amount": 3000,
        ...     "transactions_last_24h": 12,
        ...     "is_new_receiver": 1,
        ...     "is_new_device": 1,
        ...     "time_since_last_txn_minutes": 3
        ... })
        {
            "risk_score": 92,
            "risk_level": "high",
            "reasons": [
                "Amount is 25.0x higher than your average",
                "First transaction to this receiver",
                "Transaction from new device"
            ]
        }
    """
    # Load model
    _load_model()
    
    # Calculate derived features if missing
    features = calculate_derived_features(features)
    
    # Validate features
    is_valid, errors = validate_features(features)
    if not is_valid:
        # Return safe default with validation errors
        return {
            "risk_score": 50,  # Medium as we can't properly assess
            "risk_level": "medium",
            "reasons": ["Unable to fully assess: " + "; ".join(errors)]
        }
    
    # Prepare feature vector
    feature_vector = prepare_feature_vector(features)
    
    # Get fraud probability
    fraud_probability = _model.predict_proba(feature_vector)[0][1]
    
    # Calculate risk score (0-100)
    risk_score = _calculate_risk_score(fraud_probability)
    
    # Determine risk level
    risk_level = _determine_risk_level(risk_score)
    
    # Generate reasons
    reasons = _generate_risk_reasons(features, fraud_probability)
    
    return {
        "risk_score": risk_score,
        "risk_level": risk_level,
        "reasons": reasons
    }


def batch_predict(transactions: List[Dict]) -> List[Dict]:
    """
    Predict risk for multiple transactions.
    
    More efficient for batch processing.
    """
    return [predict_transaction_risk(t) for t in transactions]


# Quick test function
def _test():
    """Run quick tests on sample transactions."""
    test_cases = [
        # High risk: Account takeover pattern
        {
            "transaction_amount": 75000,
            "avg_transaction_amount": 2000,
            "transactions_last_24h": 8,
            "is_new_receiver": 1,
            "is_new_device": 1,
            "time_since_last_txn_minutes": 2
        },
        # Medium risk: Some suspicious factors
        {
            "transaction_amount": 15000,
            "avg_transaction_amount": 5000,
            "transactions_last_24h": 5,
            "is_new_receiver": 1,
            "is_new_device": 0,
            "time_since_last_txn_minutes": 30
        },
        # Low risk: Normal transaction
        {
            "transaction_amount": 1500,
            "avg_transaction_amount": 2000,
            "transactions_last_24h": 1,
            "is_new_receiver": 0,
            "is_new_device": 0,
            "time_since_last_txn_minutes": 480  # 8 hours
        },
    ]
    
    print("\n" + "=" * 60)
    print("TRANSACTION RISK DETECTION - TEST RESULTS")
    print("=" * 60)
    
    for i, features in enumerate(test_cases, 1):
        result = predict_transaction_risk(features)
        
        level_emoji = {"low": "✅", "medium": "⚠️", "high": "🚨"}[result['risk_level']]
        
        print(f"\n{level_emoji} Test Case {i}: {result['risk_level'].upper()} RISK (Score: {result['risk_score']})")
        print(f"  Amount: ₹{features['transaction_amount']:,}")
        print(f"  Reasons:")
        for reason in result['reasons']:
            print(f"    - {reason}")


if __name__ == "__main__":
    _test()
