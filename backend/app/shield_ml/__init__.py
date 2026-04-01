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

import os

# Version
__version__ = "1.0.0"

# Export prediction functions for easy import
from .text_predict import predict_text_scam, batch_predict as batch_predict_text
from .numeric_predict import predict_transaction_risk, batch_predict as batch_predict_transactions

# Export feature utilities (optional, for advanced users)
from .text_features import preprocess_text, extract_keyword_features
from .numeric_features import get_feature_explanations, validate_features, FEATURE_ORDER


def check_or_train():
    """
    Check if model files exist. If not, train models automatically.

    This function should be called at startup to ensure models are available.
    """
    import subprocess
    import sys

    models_dir = os.path.join(os.path.dirname(__file__), 'models')
    required_files = [
        ('text_model.pkl', 'train_text_model'),
        ('text_vectorizer.pkl', 'train_text_model'),
        ('numeric_model.pkl', 'train_numeric_model')
    ]

    missing_models = set()

    for filename, trainer in required_files:
        filepath = os.path.join(models_dir, filename)
        if not os.path.exists(filepath):
            missing_models.add(trainer)
        else:
            # Check if models are actually loadable and have necessary attributes
            try:
                import joblib
                obj = joblib.load(filepath)
                if filename == 'text_vectorizer.pkl':
                    # Verify if TF-IDF vectorizer is actually fitted
                    from sklearn.feature_extraction.text import TfidfVectorizer
                    if not hasattr(obj, 'idf_'):
                         print(f"[Shield ML] Vectorizer at {filename} is NOT fitted.")
                         missing_models.add(trainer)
            except Exception as e:
                print(f"[Shield ML] Failed to load {filename}: {e}")
                missing_models.add(trainer)

    if missing_models:
        print(f"[Shield ML] Missing or invalid model files. Training: {', '.join(missing_models)}")

        for trainer in missing_models:
            try:
                print(f"[Shield ML] Running {trainer}.py...")
                # Import and run the training module
                if trainer == 'train_text_model':
                    from . import train_text_model
                    train_text_model.train_model()
                elif trainer == 'train_numeric_model':
                    from . import train_numeric_model
                    train_numeric_model.train_model()
                print(f"[Shield ML] {trainer} completed.")
            except Exception as e:
                print(f"[Shield ML] ERROR training {trainer}: {e}")
                # Don't raise, just log it. We want the API to start anyway (non-fatal)
        
        print("[Shield ML] Model maintenance complete.")
    else:
        print("[Shield ML] All model files verified and found to be valid.")


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
    "check_or_train",
]
