"""
Text Feature Extraction Utilities for Scam Detection

This module provides text preprocessing and TF-IDF feature extraction
for the scam detection classifier. It's designed to be standalone
and does not depend on any LLM/chat frameworks.

Features extracted:
- Word n-grams (1-2): Captures common scam phrases like "OTP", "KYC", "verify now"
- Character n-grams (3-5): Catches obfuscated words like "O.T.P" or "K Y C"
"""

import re
import string
from typing import List, Optional
import numpy as np


def preprocess_text(text: str) -> str:
    """
    Clean and normalize text for feature extraction.
    
    Steps:
    1. Convert to lowercase (scammers often use ALL CAPS)
    2. Remove URLs (scam links are handled separately)
    3. Normalize whitespace
    4. Keep numbers (amounts like "Rs.50000" are important indicators)
    
    Args:
        text: Raw input text
        
    Returns:
        Cleaned text string
    """
    if not text:
        return ""
    
    # Lowercase
    text = text.lower()
    
    # Remove URLs (but note: URL presence itself is a feature)
    text = re.sub(r'http[s]?://\S+', ' URL_TOKEN ', text)
    
    # Remove excessive punctuation but keep some (! is common in scams)
    text = re.sub(r'[^\w\s!?₹$]', ' ', text)
    
    # Normalize whitespace
    text = re.sub(r'\s+', ' ', text).strip()
    
    return text


def extract_keyword_features(text: str) -> dict:
    """
    Extract binary features for known scam indicators.
    
    These patterns are based on common Indian financial scams:
    - UPI collect fraud ("pay to receive money")
    - OTP/KYC phishing
    - Lottery/prize scams
    - Account suspension threats
    
    Args:
        text: Preprocessed text
        
    Returns:
        Dictionary of binary feature flags
    """
    text_lower = text.lower()
    
    # Urgency indicators (creates panic, reduces thinking time)
    urgency_words = ['urgent', 'immediately', 'expires', 'last chance', 
                     'hurry', 'quick', 'fast', 'now', 'today only']
    
    # Sensitive data requests (legitimate banks never ask via SMS)
    sensitive_requests = ['otp', 'pin', 'password', 'cvv', 'kyc', 
                         'verify', 'update details', 'confirm account']
    
    # Money/reward promises (too good to be true)
    reward_words = ['lottery', 'winner', 'prize', 'cashback', 'reward',
                   'free', 'bonus', 'credit', 'refund', 'claim']
    
    # Threat indicators (fear tactics)
    threat_words = ['blocked', 'suspended', 'deactivated', 'closed',
                   'legal action', 'fraud detected', 'unauthorized']
    
    # UPI-specific scam patterns
    upi_scam_patterns = ['pay to receive', 'collect request', 'accept to get',
                        'rs.', '₹', 'upi pin']
    
    features = {
        'has_urgency': any(w in text_lower for w in urgency_words),
        'has_sensitive_request': any(w in text_lower for w in sensitive_requests),
        'has_reward_promise': any(w in text_lower for w in reward_words),
        'has_threat': any(w in text_lower for w in threat_words),
        'has_upi_pattern': any(w in text_lower for w in upi_scam_patterns),
        'has_url': 'http' in text_lower or 'www.' in text_lower or '.com' in text_lower,
        'has_phone_number': bool(re.search(r'\d{10}', text)),
        'excessive_caps_ratio': sum(1 for c in text if c.isupper()) / max(len(text), 1) > 0.3,
    }
    
    return features


def get_top_tfidf_keywords(text: str, vectorizer, feature_names: List[str], top_n: int = 5) -> List[str]:
    """
    Extract top keywords from text based on TF-IDF scores.
    
    This helps explain WHY a message was flagged as scam.
    
    Args:
        text: Input text
        vectorizer: Fitted TF-IDF vectorizer
        feature_names: List of feature names from vectorizer
        top_n: Number of top keywords to return
        
    Returns:
        List of top keywords by TF-IDF score
    """
    if not text or vectorizer is None:
        return []
    
    try:
        # Transform single text
        tfidf_vector = vectorizer.transform([preprocess_text(text)])
        
        # Get non-zero indices and their scores
        indices = tfidf_vector.nonzero()[1]
        scores = [(feature_names[i], tfidf_vector[0, i]) for i in indices]
        
        # Sort by score and return top keywords
        scores.sort(key=lambda x: x[1], reverse=True)
        return [word for word, score in scores[:top_n]]
    
    except Exception as e:
        print(f"Error extracting keywords: {e}")
        return []
