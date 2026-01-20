"""
Isolation Forest Training Script for Transaction Anomaly Detection

This script trains an Isolation Forest model on LEGITIMATE-ONLY transaction data.
The model learns what "normal" behavior looks like and flags outliers.

WHY ISOLATION FOREST?
- Designed specifically for anomaly detection
- Works well with high-dimensional data
- Fast training and prediction
- No need for labeled anomaly data (unsupervised)

HOW IT WORKS:
1. Build random trees by randomly selecting features and split values
2. Anomalies are isolated faster (shorter path length in trees)
3. Score based on average path length across all trees

INTEGRATION:
- Use anomaly_score as a SUPPORTING signal (not primary classifier)
- High anomaly score + medium risk from supervised model → escalate to high risk
- Never use anomaly score alone to block transactions
"""

import os
import sys
import random
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
import joblib

# Add parent to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from numeric_features import FEATURE_ORDER

# Ensure models directory exists
MODELS_DIR = os.path.join(os.path.dirname(__file__), 'models')
os.makedirs(MODELS_DIR, exist_ok=True)

# Set seed for reproducibility
np.random.seed(42)
random.seed(42)


def generate_legitimate_transactions(n_samples: int = 5000) -> pd.DataFrame:
    """
    Generate synthetic LEGITIMATE-ONLY transaction data.
    
    The model learns normal behavior patterns:
    - Standard personal transactions
    - Business transactions (higher value but consistent)
    - Merchant accounts (high velocity but small amounts)
    """
    
    data = []
    
    # Pattern 1: Standard personal transactions (60%)
    n_standard = int(n_samples * 0.6)
    for _ in range(n_standard):
        avg_amount = np.random.uniform(500, 15000)
        data.append({
            "transaction_amount": avg_amount * np.random.uniform(0.3, 1.5),
            "avg_transaction_amount": avg_amount,
            "transactions_last_24h": np.random.randint(0, 5),
            "amount_spike_ratio": np.random.uniform(0.3, 1.5),
            "is_new_receiver": np.random.choice([0, 1], p=[0.85, 0.15]),
            "is_new_device": np.random.choice([0, 1], p=[0.95, 0.05]),
            "time_since_last_txn_minutes": np.random.uniform(60, 20160),
        })
    
    # Pattern 2: Business/high-value legitimate (20%)
    n_business = int(n_samples * 0.2)
    for _ in range(n_business):
        avg_amount = np.random.uniform(30000, 200000)
        data.append({
            "transaction_amount": avg_amount * np.random.uniform(0.5, 2.0),
            "avg_transaction_amount": avg_amount,
            "transactions_last_24h": np.random.randint(0, 10),
            "amount_spike_ratio": np.random.uniform(0.5, 2.0),
            "is_new_receiver": np.random.choice([0, 1], p=[0.6, 0.4]),
            "is_new_device": 0,
            "time_since_last_txn_minutes": np.random.uniform(30, 1440),
        })
    
    # Pattern 3: Merchant/high-velocity legitimate (15%)
    n_merchant = int(n_samples * 0.15)
    for _ in range(n_merchant):
        avg_amount = np.random.uniform(100, 3000)
        data.append({
            "transaction_amount": avg_amount * np.random.uniform(0.2, 2.5),
            "avg_transaction_amount": avg_amount,
            "transactions_last_24h": np.random.randint(15, 100),
            "amount_spike_ratio": np.random.uniform(0.2, 2.5),
            "is_new_receiver": np.random.choice([0, 1], p=[0.3, 0.7]),
            "is_new_device": 0,
            "time_since_last_txn_minutes": np.random.uniform(1, 60),
        })
    
    # Pattern 4: Occasional large transfers (rent, fees, etc.) (5%)
    n_large = n_samples - n_standard - n_business - n_merchant
    for _ in range(n_large):
        avg_amount = np.random.uniform(5000, 50000)
        data.append({
            "transaction_amount": np.random.uniform(20000, 150000),
            "avg_transaction_amount": avg_amount,
            "transactions_last_24h": np.random.randint(0, 3),
            "amount_spike_ratio": np.random.uniform(1.5, 5.0),
            "is_new_receiver": np.random.choice([0, 1], p=[0.5, 0.5]),
            "is_new_device": 0,
            "time_since_last_txn_minutes": np.random.uniform(1440, 43200),
        })
    
    random.shuffle(data)
    return pd.DataFrame(data)


def train_model():
    """
    Train Isolation Forest on legitimate transaction patterns.
    """
    
    print("=" * 60)
    print("SHIELD ML - Isolation Forest Training (Anomaly Detection)")
    print("=" * 60)
    
    # Generate legitimate-only data
    print("\n[1/4] Generating legitimate transaction data...")
    df = generate_legitimate_transactions(5000)
    print(f"  Total samples: {len(df)}")
    print(f"  Features: {FEATURE_ORDER}")
    
    # Prepare features
    X = df[FEATURE_ORDER].values
    
    # Print data statistics
    print("\n[2/4] Data statistics:")
    for i, feat in enumerate(FEATURE_ORDER):
        print(f"  {feat}: mean={X[:, i].mean():.2f}, std={X[:, i].std():.2f}")
    
    # Train Isolation Forest
    print("\n[3/4] Training Isolation Forest...")
    model = IsolationForest(
        n_estimators=100,        # Number of trees
        max_samples='auto',      # Subsample size
        contamination=0.01,      # Expected anomaly ratio (1%)
        max_features=1.0,        # Use all features
        bootstrap=False,
        random_state=42,
        n_jobs=-1
    )
    model.fit(X)
    
    # Evaluate on training data (should mostly be "normal")
    print("\n[4/4] Evaluating model...")
    predictions = model.predict(X)
    scores = model.decision_function(X)
    
    n_normal = (predictions == 1).sum()
    n_anomaly = (predictions == -1).sum()
    
    print(f"  Normal predictions: {n_normal} ({n_normal/len(X)*100:.1f}%)")
    print(f"  Anomaly predictions: {n_anomaly} ({n_anomaly/len(X)*100:.1f}%)")
    print(f"  Score range: [{scores.min():.4f}, {scores.max():.4f}]")
    print(f"  Score mean: {scores.mean():.4f}")
    
    # Save model
    model_path = os.path.join(MODELS_DIR, 'isolation_forest.pkl')
    joblib.dump(model, model_path)
    print(f"\n[OK] Model saved: {model_path}")
    
    # Test with a clearly anomalous transaction
    print("\n" + "=" * 40)
    print("SANITY CHECK - Testing anomalous transaction")
    print("=" * 40)
    
    anomalous_txn = np.array([[
        500000,   # transaction_amount (very high)
        2000,     # avg_transaction_amount (low average)
        50,       # transactions_last_24h (high velocity)
        250,      # amount_spike_ratio (huge spike)
        1,        # is_new_receiver
        1,        # is_new_device
        2         # time_since_last_txn_minutes (very recent)
    ]])
    
    pred = model.predict(anomalous_txn)
    score = model.decision_function(anomalous_txn)
    print(f"  Prediction: {'ANOMALY' if pred[0] == -1 else 'NORMAL'}")
    print(f"  Raw score: {score[0]:.4f}")
    print(f"  (Negative score = more anomalous)")
    
    return model


if __name__ == "__main__":
    train_model()
