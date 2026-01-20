"""
Numeric Feature Engineering for Transaction Risk Detection

This module defines and validates features used for detecting
suspicious transactions in UPI/banking contexts.

WHY THESE FEATURES?
Each feature is chosen based on patterns observed in real fraud cases:

1. transaction_amount - Large unusual amounts are suspicious
2. avg_transaction_amount - Baseline for detecting anomalies
3. transactions_last_24h - High velocity = account takeover risk
4. amount_spike_ratio - Sudden large transaction vs average
5. is_new_receiver - First-time recipient is higher risk
6. is_new_device - New device login + transaction = suspicious
7. time_since_last_txn_minutes - Very quick succession = automated fraud
"""

from typing import Dict, List, Optional, Tuple
import numpy as np

# Feature definitions with validation ranges
FEATURE_DEFINITIONS = {
    "transaction_amount": {
        "description": "Amount of current transaction in INR",
        "type": "float",
        "min": 1.0,
        "max": 10000000.0,  # 1 crore
        "importance": "High amount transactions need more scrutiny",
    },
    "avg_transaction_amount": {
        "description": "User's average transaction amount (last 30 days)",
        "type": "float",
        "min": 0.0,
        "max": 1000000.0,
        "importance": "Baseline for detecting unusual behavior",
    },
    "transactions_last_24h": {
        "description": "Number of transactions in last 24 hours",
        "type": "int",
        "min": 0,
        "max": 500,
        "importance": "High velocity indicates account compromise",
    },
    "amount_spike_ratio": {
        "description": "Ratio of current amount to average (current/avg)",
        "type": "float",
        "min": 0.0,
        "max": 1000.0,
        "importance": "Sudden spike is red flag for fraud",
    },
    "is_new_receiver": {
        "description": "Is this the first transaction to this receiver?",
        "type": "binary",
        "values": [0, 1],
        "importance": "First-time recipients are higher risk targets",
    },
    "is_new_device": {
        "description": "Is transaction from a new/unrecognized device?",
        "type": "binary",
        "values": [0, 1],
        "importance": "New device + high amount = likely fraud",
    },
    "time_since_last_txn_minutes": {
        "description": "Minutes since user's last transaction",
        "type": "float",
        "min": 0.0,
        "max": 525600.0,  # 1 year in minutes
        "importance": "Rapid succession indicates automated attack",
    },
}

# Required features for prediction
REQUIRED_FEATURES = list(FEATURE_DEFINITIONS.keys())

# Feature order for model input (must match training order)
FEATURE_ORDER = [
    "transaction_amount",
    "avg_transaction_amount", 
    "transactions_last_24h",
    "amount_spike_ratio",
    "is_new_receiver",
    "is_new_device",
    "time_since_last_txn_minutes",
]


def validate_features(features: Dict) -> Tuple[bool, List[str]]:
    """
    Validate input features before prediction.
    
    Checks:
    - All required features present
    - Values within valid ranges
    - Correct data types
    
    Args:
        features: Dictionary of feature name -> value
        
    Returns:
        Tuple of (is_valid, list of error messages)
    """
    errors = []
    
    # Check required features
    missing = set(REQUIRED_FEATURES) - set(features.keys())
    if missing:
        errors.append(f"Missing required features: {missing}")
    
    # Validate each feature
    for name, value in features.items():
        if name not in FEATURE_DEFINITIONS:
            continue  # Skip unknown features
            
        defn = FEATURE_DEFINITIONS[name]
        
        # Type check
        if defn["type"] == "binary":
            if value not in [0, 1, True, False]:
                errors.append(f"{name}: must be 0 or 1, got {value}")
        elif defn["type"] in ["float", "int"]:
            try:
                val = float(value)
                if val < defn["min"] or val > defn["max"]:
                    errors.append(f"{name}: {val} outside range [{defn['min']}, {defn['max']}]")
            except (ValueError, TypeError):
                errors.append(f"{name}: invalid numeric value {value}")
    
    return len(errors) == 0, errors


def prepare_feature_vector(features: Dict) -> np.ndarray:
    """
    Convert feature dictionary to model input array.
    
    Ensures features are in correct order and properly typed.
    
    Args:
        features: Dictionary of feature name -> value
        
    Returns:
        NumPy array ready for model.predict()
    """
    vector = []
    
    for name in FEATURE_ORDER:
        value = features.get(name, 0)
        
        # Convert booleans to integers
        if isinstance(value, bool):
            value = 1 if value else 0
            
        vector.append(float(value))
    
    return np.array([vector])


def calculate_derived_features(features: Dict) -> Dict:
    """
    Calculate derived features from raw inputs.
    
    If amount_spike_ratio is not provided, calculate it
    from transaction_amount and avg_transaction_amount.
    
    Args:
        features: Raw feature dictionary
        
    Returns:
        Features with derived values added
    """
    features = features.copy()
    
    # Calculate spike ratio if not provided
    if "amount_spike_ratio" not in features:
        current = features.get("transaction_amount", 0)
        avg = features.get("avg_transaction_amount", 1)  # Avoid division by zero
        if avg > 0:
            features["amount_spike_ratio"] = current / avg
        else:
            features["amount_spike_ratio"] = current  # New user
    
    return features


def get_feature_explanations() -> Dict:
    """
    Return human-readable feature explanations.
    
    Useful for API documentation and debugging.
    """
    return {
        name: {
            "description": defn["description"],
            "importance": defn["importance"],
            "range": f"{defn.get('min', 'N/A')} - {defn.get('max', 'N/A')}"
            if "min" in defn else str(defn.get("values", "N/A"))
        }
        for name, defn in FEATURE_DEFINITIONS.items()
    }
