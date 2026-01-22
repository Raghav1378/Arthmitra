"""
Shield ML Models Registry & Metrics

This file serves as the Single Source of Truth for all active ML models,
their locations, and their performance metrics.
"""

SHIELD_MODELS_REGISTRY = {
    "supervised": {
        "text_scam_detector": {
            "name": "Text Scam Detector",
            "id": "model_text_scam_v1",
            "type": "Supervised Classification",
            "algorithm": "TF-IDF + Logistic Regression",
            "path": "app/shield_ml/models/text_model.pkl",
            "description": "Classifies SMS/Text modules as 'Scam' or 'Legit' based on keyword patterns.",
            "metrics": {
                "accuracy": "91.0%",
                "precision": "78.4%",
                "recall": "61.5%",
                "f1_score": "68.9%",
                "comment": "High precision preferred to avoid false flagging legitimate bank messages."
            },
            "features": ["text_content", "tf_idf_vectors"]
        },
        "transaction_risk_detector": {
            "name": "Transaction Risk Detector",
            "id": "model_txn_risk_v1",
            "type": "Supervised Classification",
            "algorithm": "Random Forest Classifier",
            "path": "app/shield_ml/models/numeric_model.pkl",
            "description": "Analyzes numeric transaction metadata for fraud patterns like velocity or unusual amounts.",
            "metrics": {
                "accuracy": "94.6%",
                "precision": "92.3%",
                "recall": "47.4%",
                "f1_score": "62.6%",
                "comment": "Optimized for high precision to prevent transaction blocking friction."
            },
            "features": [
                "transaction_amount", 
                "avg_transaction_amount", 
                "transactions_last_24h",
                "amount_spike_ratio",
                "is_new_receiver",
                "is_new_device",
                "time_since_last_txn_minutes"
            ]
        }
    },
    "unsupervised": {
        "text_anomaly_detector": {
            "name": "Text Anomaly Detector",
            "id": "model_text_anomaly_v1",
            "type": "Unsupervised Outlier Detection",
            "algorithm": "One-Class SVM",
            "path": "app/shield_ml/models/one_class_svm.pkl",
            "description": "Identifies novel text patterns that deviate from standard banking language.",
            "metrics": {
                "role": "Supporting Signal",
                "evaluation": "Qualitative - detects non-English and gibberish patterns effectively."
            }
        },
        "transaction_anomaly_detector": {
            "name": "Transaction Anomaly Detector",
            "id": "model_txn_anomaly_v1",
            "type": "Unsupervised Outlier Detection",
            "algorithm": "Isolation Forest",
            "path": "app/shield_ml/models/isolation_forest.pkl",
            "description": "Identifies statistical outliers in transaction behavior (e.g., unusual time/amount).",
            "metrics": {
                "role": "Supporting Signal",
                "evaluation": "Qualitative - successfully flags 3-sigma outliers."
            }
        }
    },
    "heuristic": {
        "upi_risk_scorer": {
            "name": "UPI Risk Scorer",
            "id": "rule_upi_v1",
            "type": "Rule-Based Engine",
            "algorithm": "Heuristic (11 Rules)",
            "path": "app/shield_ml/upi/upi_risk_score.py",
            "description": "Analyzes UPI handles for impersonation, scam keywords, and structural anomalies.",
            "metrics": {
                "accuracy": "N/A (Deterministic)",
                "rules_active": 11
            }
        }
    }
}

def get_model_registry():
    """Returns the full model registry dictionary."""
    return SHIELD_MODELS_REGISTRY
