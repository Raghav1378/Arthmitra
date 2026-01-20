"""
Shield ML - Anomaly Detection Submodule

Unsupervised anomaly detection for detecting novel/unusual patterns
that supervised models may miss.

MODELS:
    - Isolation Forest: Detects unusual transaction behavior
    - One-Class SVM: Detects unusual text message patterns

USAGE:
    from app.shield_ml.anomaly import (
        get_transaction_anomaly_score,
        get_text_anomaly_score
    )
    
    # Transaction anomaly detection
    result = get_transaction_anomaly_score({
        "transaction_amount": 500000,
        "avg_transaction_amount": 2000,
        ...
    })
    # Returns: {"anomaly_score": 0.85, "is_anomaly": True, "reason": "..."}
    
    # Text anomaly detection
    result = get_text_anomaly_score("Suspicious message here")
    # Returns: {"anomaly_score": 0.72, "is_anomaly": True, "reason": "..."}

IMPORTANT:
    - Anomaly scores are SUPPORTING signals only
    - Do NOT use to directly label scam/not-scam
    - Use to increase risk scores or trigger escalation

TRAINING:
    cd backend/app/shield_ml/anomaly
    python train_isolation_forest.py
    python train_one_class_svm.py
"""

__version__ = "1.0.0"

# Export prediction functions
from .anomaly_predict import (
    get_transaction_anomaly_score,
    get_text_anomaly_score,
)

__all__ = [
    "get_transaction_anomaly_score",
    "get_text_anomaly_score",
]
