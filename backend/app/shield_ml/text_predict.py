"""
Text-Based Scam Detection Prediction Module

This module provides the predict_text_scam() function for real-time
scam detection on text messages.

Usage:
    from app.shield_ml.text_predict import predict_text_scam
    
    result = predict_text_scam("Your KYC is expired. Update now: http://fake.link")
    # Returns: {"is_scam": True, "confidence": 0.95, "top_keywords": ["kyc", "expired", "update"]}
"""

import os
import joblib
import numpy as np
from typing import Dict, List, Optional

# Import local feature extraction
from .text_features import preprocess_text, extract_keyword_features, get_top_tfidf_keywords

# Model paths
MODELS_DIR = os.path.join(os.path.dirname(__file__), 'models')
MODEL_PATH = os.path.join(MODELS_DIR, 'text_model.pkl')
VECTORIZER_PATH = os.path.join(MODELS_DIR, 'text_vectorizer.pkl')

# Global model cache (lazy loading)
_model = None
_vectorizer = None
_feature_names = None


def _load_models():
    """
    Lazy load models on first prediction call.
    
    This avoids loading models at import time, which is important for:
    - Faster module imports
    - Allowing training before prediction
    - Graceful handling when models don't exist
    """
    global _model, _vectorizer, _feature_names
    
    if _model is None:
        if not os.path.exists(MODEL_PATH):
            raise FileNotFoundError(
                f"Model not found at {MODEL_PATH}. "
                "Please run train_text_model.py first."
            )
        
        _model = joblib.load(MODEL_PATH)
        _vectorizer = joblib.load(VECTORIZER_PATH)
        _feature_names = _vectorizer.get_feature_names_out().tolist()
        
        print(f"[OK] Loaded text scam detection model from {MODELS_DIR}")


def predict_text_scam(text: str) -> Dict:
    """
    Predict if a text message is a scam.
    
    This function:
    1. Loads the trained model (cached after first call)
    2. Preprocesses the input text
    3. Extracts TF-IDF features
    4. Returns prediction with confidence and explanation
    
    Args:
        text: Input message text (SMS, WhatsApp, email, etc.)
        
    Returns:
        dict with keys:
            - is_scam (bool): True if classified as scam
            - confidence (float): Probability score 0.0 to 1.0
            - top_keywords (list): Words that triggered detection
            
    Example:
        >>> predict_text_scam("Pay ₹10 to receive ₹10000 cashback!")
        {
            "is_scam": True,
            "confidence": 0.97,
            "top_keywords": ["cashback", "receive", "pay"]
        }
    """
    # Handle empty input
    if not text or not text.strip():
        return {
            "is_scam": False,
            "confidence": 0.0,
            "top_keywords": []
        }
    
    # Load models
    _load_models()
    
    # Preprocess
    cleaned_text = preprocess_text(text)
    
    # Extract TF-IDF features
    text_features = _vectorizer.transform([cleaned_text])
    
    # Get prediction probabilities
    # Logistic Regression predict_proba returns [P(class=0), P(class=1)]
    probabilities = _model.predict_proba(text_features)[0]
    scam_probability = float(probabilities[1])
    
    # Determine if scam (threshold 0.5)
    is_scam = scam_probability >= 0.5
    
    # Get top keywords for explainability
    top_keywords = get_top_tfidf_keywords(
        cleaned_text, 
        _vectorizer, 
        _feature_names, 
        top_n=5
    )
    
    # Also check rule-based indicators for additional context
    keyword_features = extract_keyword_features(text)
    
    # Add detected patterns to keywords if not already present
    pattern_indicators = []
    if keyword_features['has_urgency']:
        pattern_indicators.append('URGENCY_DETECTED')
    if keyword_features['has_sensitive_request']:
        pattern_indicators.append('ASKS_FOR_OTP/PIN')
    if keyword_features['has_threat']:
        pattern_indicators.append('THREAT_DETECTED')
    if keyword_features['has_upi_pattern']:
        pattern_indicators.append('UPI_SCAM_PATTERN')
    
    # Combine TF-IDF keywords with pattern indicators
    all_keywords = top_keywords + pattern_indicators
    
    return {
        "is_scam": is_scam,
        "confidence": round(scam_probability, 4),
        "top_keywords": all_keywords[:7]  # Limit to 7 items
    }


def batch_predict(texts: List[str]) -> List[Dict]:
    """
    Predict scam probability for multiple texts.
    
    More efficient than calling predict_text_scam() in a loop
    because it processes all texts in one vectorization call.
    
    Args:
        texts: List of message texts
        
    Returns:
        List of prediction dictionaries
    """
    if not texts:
        return []
    
    _load_models()
    
    # Preprocess all texts
    cleaned_texts = [preprocess_text(t) for t in texts]
    
    # Batch vectorize
    text_features = _vectorizer.transform(cleaned_texts)
    
    # Batch predict
    probabilities = _model.predict_proba(text_features)
    
    results = []
    for i, text in enumerate(texts):
        scam_prob = float(probabilities[i][1])
        top_kw = get_top_tfidf_keywords(
            cleaned_texts[i], 
            _vectorizer, 
            _feature_names, 
            top_n=3
        )
        
        results.append({
            "is_scam": scam_prob >= 0.5,
            "confidence": round(scam_prob, 4),
            "top_keywords": top_kw
        })
    
    return results


# Quick test function
def _test():
    """Run quick tests on sample messages."""
    test_cases = [
        # Scam messages
        "URGENT: Your SBI account will be blocked. Update KYC now: http://bit.ly/12345",
        "Pay ₹10 to receive ₹50000 cashback! Accept UPI collect request now!",
        "Congratulations! You won ₹10 lakh in Jio Lucky Draw. Call +919876543210",
        
        # Legitimate messages
        "Your SBI A/c XX1234 debited by Rs.500 on 15/01. UPI Ref: 123456789",
        "OTP for HDFC NetBanking is 123456. Valid 5 mins. Never share with anyone",
        "Your Amazon order #123 delivered successfully.",
    ]
    
    print("\n" + "=" * 60)
    print("TEXT SCAM DETECTION - TEST RESULTS")
    print("=" * 60)
    
    for text in test_cases:
        result = predict_text_scam(text)
        status = "🚨 SCAM" if result['is_scam'] else "✅ SAFE"
        print(f"\n{status} (confidence: {result['confidence']:.2f})")
        print(f"  Text: {text[:60]}...")
        print(f"  Keywords: {result['top_keywords']}")


if __name__ == "__main__":
    _test()
