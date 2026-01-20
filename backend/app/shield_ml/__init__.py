"""
Shield ML - Classic Machine Learning Scam Detection Module

This module provides standalone scam detection capabilities using
classic ML models (no LLMs, no LangChain, no external APIs).

EXPORTED FUNCTIONS:
    predict_text_scam(text: str) -> dict
        Detect scam messages using TF-IDF + Logistic Regression
        Returns: {"is_scam": bool, "confidence": float, "top_keywords": list}
    
    predict_transaction_risk(features: dict) -> dict
        Detect risky transactions using RandomForest
        Returns: {"risk_score": int, "risk_level": str, "reasons": list}

USAGE:
    from app.shield_ml import predict_text_scam, predict_transaction_risk
    
    # Text scam detection
    result = predict_text_scam("Your KYC is expired. Update now!")
    
    # Transaction risk detection
    result = predict_transaction_risk({
        "transaction_amount": 50000,
        "avg_transaction_amount": 2000,
        "transactions_last_24h": 10,
        "is_new_receiver": 1,
        "is_new_device": 1,
        "time_since_last_txn_minutes": 5
    })

TRAINING:
    Before using prediction functions, train the models:
    
    cd backend/app/shield_ml
    python train_text_model.py
    python train_numeric_model.py

DEPENDENCIES:
    - scikit-learn
    - pandas
    - numpy
    - joblib

NO DEPENDENCIES ON:
    - LangChain
    - LangGraph
    - Ollama
    - Any LLM or chat framework
"""

# Version
__version__ = "1.0.0"

# Export prediction functions for easy import
from .text_predict import predict_text_scam, batch_predict as batch_predict_text
from .numeric_predict import predict_transaction_risk, batch_predict as batch_predict_transactions

# Export feature utilities (optional, for advanced users)
from .text_features import preprocess_text, extract_keyword_features
from .numeric_features import get_feature_explanations, validate_features, FEATURE_ORDER

__all__ = [
    # Main prediction functions
    "predict_text_scam",
    "predict_transaction_risk",
    
    # Batch prediction
    "batch_predict_text",
    "batch_predict_transactions",
    
    # Utilities
    "preprocess_text",
    "extract_keyword_features",
    "get_feature_explanations",
    "validate_features",
    "FEATURE_ORDER",
]
