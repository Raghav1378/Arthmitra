"""
Anomaly Detection Prediction Functions

Provides normalized anomaly scores (0-1) for transactions and text messages.

IMPORTANT: These scores are SUPPORTING SIGNALS only!
- Do NOT use to directly label scam/not-scam
- Use to increase risk scores or trigger escalation
- Combine with supervised model predictions

SCORE INTERPRETATION:
- 0.0 - 0.3: Normal behavior, no concern
- 0.3 - 0.6: Slightly unusual, worth monitoring
- 0.6 - 0.8: Unusual behavior, increase risk score
- 0.8 - 1.0: Highly anomalous, definitely escalate
"""

import os
import sys
import numpy as np
import joblib
from typing import Dict, Optional

# Add parent to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from numeric_features import FEATURE_ORDER, prepare_feature_vector
from text_features import preprocess_text

# Model paths
MODELS_DIR = os.path.join(os.path.dirname(__file__), 'models')
ISOLATION_FOREST_PATH = os.path.join(MODELS_DIR, 'isolation_forest.pkl')
ONE_CLASS_SVM_PATH = os.path.join(MODELS_DIR, 'one_class_svm.pkl')
ANOMALY_VECTORIZER_PATH = os.path.join(MODELS_DIR, 'anomaly_vectorizer.pkl')

# Lazy-loaded models (load on first use)
_isolation_forest = None
_one_class_svm = None
_anomaly_vectorizer = None


def _load_isolation_forest():
    """Load Isolation Forest model (lazy loading)."""
    global _isolation_forest
    if _isolation_forest is None:
        if not os.path.exists(ISOLATION_FOREST_PATH):
            raise FileNotFoundError(
                f"Isolation Forest model not found at {ISOLATION_FOREST_PATH}. "
                "Run train_isolation_forest.py first."
            )
        _isolation_forest = joblib.load(ISOLATION_FOREST_PATH)
    return _isolation_forest


def _load_one_class_svm():
    """Load One-Class SVM model and vectorizer (lazy loading)."""
    global _one_class_svm, _anomaly_vectorizer
    if _one_class_svm is None:
        if not os.path.exists(ONE_CLASS_SVM_PATH):
            raise FileNotFoundError(
                f"One-Class SVM model not found at {ONE_CLASS_SVM_PATH}. "
                "Run train_one_class_svm.py first."
            )
        if not os.path.exists(ANOMALY_VECTORIZER_PATH):
            raise FileNotFoundError(
                f"Anomaly vectorizer not found at {ANOMALY_VECTORIZER_PATH}. "
                "Run train_one_class_svm.py first."
            )
        _one_class_svm = joblib.load(ONE_CLASS_SVM_PATH)
        _anomaly_vectorizer = joblib.load(ANOMALY_VECTORIZER_PATH)
    return _one_class_svm, _anomaly_vectorizer


def _normalize_isolation_forest_score(raw_score: float) -> float:
    """
    Normalize Isolation Forest decision_function output to 0-1.
    
    Isolation Forest decision_function returns:
    - Positive values for normal points (inliers)
    - Negative values for anomalies (outliers)
    - Values typically range from -0.5 to 0.5
    
    We invert and scale so:
    - 0.0 = clearly normal
    - 1.0 = highly anomalous
    """
    # Typical range is roughly -0.5 to 0.3
    # Clip and scale to [0, 1]
    # Lower raw score = more anomalous
    
    # Invert: negative becomes high anomaly score
    inverted = -raw_score
    
    # Typical inverted range: -0.3 to 0.5
    # Scale to [0, 1] using sigmoid-like transformation
    # Add offset so that 0 raw score maps to ~0.5 anomaly score
    normalized = 1 / (1 + np.exp(-inverted * 5))
    
    return float(np.clip(normalized, 0.0, 1.0))


def _normalize_svm_score(raw_score: float) -> float:
    """
    Normalize One-Class SVM decision_function output to 0-1.
    
    One-Class SVM decision_function returns:
    - Positive values for normal points (inside boundary)
    - Negative values for anomalies (outside boundary)
    
    We invert and scale so:
    - 0.0 = clearly normal
    - 1.0 = highly anomalous
    """
    # Invert: negative becomes high anomaly score
    inverted = -raw_score
    
    # Scale using sigmoid transformation
    normalized = 1 / (1 + np.exp(-inverted * 2))
    
    return float(np.clip(normalized, 0.0, 1.0))


def get_transaction_anomaly_score(features: Dict) -> Dict:
    """
    Get anomaly score for a transaction using Isolation Forest.
    
    Args:
        features: Dictionary with transaction features:
            - transaction_amount: float
            - avg_transaction_amount: float
            - transactions_last_24h: int
            - amount_spike_ratio: float
            - is_new_receiver: 0 or 1
            - is_new_device: 0 or 1
            - time_since_last_txn_minutes: float
    
    Returns:
        Dictionary with:
            - anomaly_score: float (0.0 = normal, 1.0 = highly anomalous)
            - is_anomaly: bool (True if score > 0.6)
            - reason: str (explanation)
    """
    try:
        model = _load_isolation_forest()
        
        # Prepare feature vector
        X = prepare_feature_vector(features)
        
        # Get raw score (negative = anomaly)
        raw_score = model.decision_function(X)[0]
        prediction = model.predict(X)[0]
        
        # Normalize to 0-1
        anomaly_score = _normalize_isolation_forest_score(raw_score)
        
        # Determine if anomalous
        is_anomaly = anomaly_score > 0.6
        
        # Generate reason
        if anomaly_score > 0.8:
            reason = "Transaction pattern highly unusual - significantly deviates from normal behavior"
        elif anomaly_score > 0.6:
            reason = "Transaction shows unusual characteristics - warrants attention"
        elif anomaly_score > 0.4:
            reason = "Transaction slightly unusual but within acceptable range"
        else:
            reason = "Transaction follows normal behavioral patterns"
        
        return {
            "anomaly_score": round(anomaly_score, 4),
            "is_anomaly": is_anomaly,
            "reason": reason,
            "raw_score": round(raw_score, 4),
        }
        
    except FileNotFoundError as e:
        return {
            "anomaly_score": 0.0,
            "is_anomaly": False,
            "reason": f"Model not available: {str(e)}",
            "error": True,
        }
    except Exception as e:
        return {
            "anomaly_score": 0.0,
            "is_anomaly": False,
            "reason": f"Prediction error: {str(e)}",
            "error": True,
        }


def get_text_anomaly_score(text: str) -> Dict:
    """
    Get anomaly score for a text message using One-Class SVM.
    
    Args:
        text: The message text to analyze
    
    Returns:
        Dictionary with:
            - anomaly_score: float (0.0 = normal, 1.0 = highly anomalous)
            - is_anomaly: bool (True if score > 0.6)
            - reason: str (explanation)
    """
    try:
        model, vectorizer = _load_one_class_svm()
        
        # Preprocess text
        processed = preprocess_text(text)
        
        if not processed.strip():
            return {
                "anomaly_score": 0.5,
                "is_anomaly": False,
                "reason": "Empty or invalid text input",
            }
        
        # Transform to TF-IDF features
        X = vectorizer.transform([processed])
        
        # Get raw score
        raw_score = model.decision_function(X)[0]
        prediction = model.predict(X)[0]
        
        # Normalize to 0-1
        anomaly_score = _normalize_svm_score(raw_score)
        
        # Determine if anomalous
        is_anomaly = anomaly_score > 0.6
        
        # Generate reason
        if anomaly_score > 0.8:
            reason = "Message pattern highly unusual - does not match known legitimate formats"
        elif anomaly_score > 0.6:
            reason = "Message shows unusual patterns - may be novel scam format"
        elif anomaly_score > 0.4:
            reason = "Message slightly unusual but similar to known formats"
        else:
            reason = "Message follows normal legitimate message patterns"
        
        return {
            "anomaly_score": round(anomaly_score, 4),
            "is_anomaly": is_anomaly,
            "reason": reason,
            "raw_score": round(raw_score, 4),
        }
        
    except FileNotFoundError as e:
        return {
            "anomaly_score": 0.0,
            "is_anomaly": False,
            "reason": f"Model not available: {str(e)}",
            "error": True,
        }
    except Exception as e:
        return {
            "anomaly_score": 0.0,
            "is_anomaly": False,
            "reason": f"Prediction error: {str(e)}",
            "error": True,
        }


# Convenience function to check if models are trained
def models_available() -> Dict[str, bool]:
    """Check if anomaly detection models are available."""
    return {
        "isolation_forest": os.path.exists(ISOLATION_FOREST_PATH),
        "one_class_svm": os.path.exists(ONE_CLASS_SVM_PATH),
        "anomaly_vectorizer": os.path.exists(ANOMALY_VECTORIZER_PATH),
    }


if __name__ == "__main__":
    # Quick test
    print("Testing anomaly detection...")
    print("\nModels available:", models_available())
    
    # Test transaction anomaly
    print("\n--- Transaction Anomaly Test ---")
    result = get_transaction_anomaly_score({
        "transaction_amount": 500000,
        "avg_transaction_amount": 2000,
        "transactions_last_24h": 50,
        "amount_spike_ratio": 250,
        "is_new_receiver": 1,
        "is_new_device": 1,
        "time_since_last_txn_minutes": 2,
    })
    print(f"Result: {result}")
    
    # Test text anomaly
    print("\n--- Text Anomaly Test ---")
    result = get_text_anomaly_score(
        "URGENT: Pay Rs.1 to receive Rs.50000 lottery prize! Call +919876543210"
    )
    print(f"Result: {result}")
