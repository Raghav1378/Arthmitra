"""
Numeric Transaction Risk Model Training Script

This script generates synthetic transaction data, trains a RandomForest
classifier, and saves the model for fraud/risk detection.

REALISTIC TRAINING APPROACH:
- Class imbalance (95% legitimate, 5% fraud)
- Label noise (5%) - simulates annotation errors
- Hard negatives - legitimate high-value and edge case transactions
- Cross-validation for robust evaluation

WHY RANDOM FOREST?
- Handles non-linear relationships (fraud patterns are complex)
- Feature importance built-in (explains which factors drive risk)
- Robust to outliers (transaction amounts vary widely)
- No feature scaling needed
"""

import os
import random
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split, cross_val_score, StratifiedKFold
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    classification_report, confusion_matrix
)
import joblib

from .numeric_features import FEATURE_ORDER, get_feature_explanations

# Ensure models directory exists
MODELS_DIR = os.path.join(os.path.dirname(__file__), 'models')
os.makedirs(MODELS_DIR, exist_ok=True)

# Set seed for reproducibility
np.random.seed(42)
random.seed(42)


def generate_synthetic_transactions(n_samples: int = 4000) -> pd.DataFrame:
    """
    Generate synthetic transaction data with realistic class imbalance.
    
    Class distribution:
    - 95% legitimate (including hard negatives)
    - 5% fraudulent
    
    This reflects real-world fraud rates which are typically 0.1-5%
    """
    
    data = []
    
    # Calculate sample sizes
    n_fraud = int(n_samples * 0.05)        # 5% fraud
    n_legit = n_samples - n_fraud          # 95% legitimate
    n_hard_negatives = int(n_legit * 0.25) # 25% of legitimate are hard negatives
    n_normal = n_legit - n_hard_negatives
    
    # === NORMAL LEGITIMATE TRANSACTIONS ===
    for _ in range(n_normal):
        avg_amount = np.random.uniform(500, 15000)
        record = {
            "transaction_amount": avg_amount * np.random.uniform(0.2, 1.3),
            "avg_transaction_amount": avg_amount,
            "transactions_last_24h": np.random.randint(0, 4),
            "amount_spike_ratio": np.random.uniform(0.2, 1.3),
            "is_new_receiver": np.random.choice([0, 1], p=[0.85, 0.15]),
            "is_new_device": np.random.choice([0, 1], p=[0.95, 0.05]),
            "time_since_last_txn_minutes": np.random.uniform(120, 20160),  # 2hrs to 2 weeks
            "is_fraud": 0
        }
        data.append(record)
    
    # === HARD NEGATIVES (legitimate but look suspicious) ===
    hard_negative_patterns = [
        # Pattern 1: High-value legitimate transactions (business, rent, etc.)
        lambda: {
            "transaction_amount": np.random.uniform(50000, 500000),
            "avg_transaction_amount": np.random.uniform(40000, 200000),  # High avg too
            "transactions_last_24h": np.random.randint(0, 3),
            "amount_spike_ratio": np.random.uniform(0.8, 2.5),  # Not huge spike
            "is_new_receiver": np.random.choice([0, 1], p=[0.6, 0.4]),
            "is_new_device": 0,  # Known device
            "time_since_last_txn_minutes": np.random.uniform(60, 1440),
            "is_fraud": 0
        },
        
        # Pattern 2: Frequent small transactions (merchant accounts)
        lambda: {
            "transaction_amount": np.random.uniform(100, 2000),
            "avg_transaction_amount": np.random.uniform(500, 2000),
            "transactions_last_24h": np.random.randint(10, 50),  # Very high velocity
            "amount_spike_ratio": np.random.uniform(0.3, 2.0),
            "is_new_receiver": np.random.choice([0, 1], p=[0.3, 0.7]),
            "is_new_device": 0,
            "time_since_last_txn_minutes": np.random.uniform(1, 30),  # Rapid
            "is_fraud": 0
        },
        
        # Pattern 3: New device but trusted receiver (device upgrade)
        lambda: {
            "transaction_amount": np.random.uniform(1000, 20000),
            "avg_transaction_amount": np.random.uniform(2000, 15000),
            "transactions_last_24h": np.random.randint(1, 5),
            "amount_spike_ratio": np.random.uniform(0.5, 2.0),
            "is_new_receiver": 0,  # Known receiver
            "is_new_device": 1,    # New device
            "time_since_last_txn_minutes": np.random.uniform(30, 480),
            "is_fraud": 0
        },
        
        # Pattern 4: First-time transfer to known payee type (rent, school fees)
        lambda: {
            "transaction_amount": np.random.uniform(10000, 100000),
            "avg_transaction_amount": np.random.uniform(5000, 30000),
            "transactions_last_24h": np.random.randint(0, 3),
            "amount_spike_ratio": np.random.uniform(1.5, 5.0),  # Higher than avg
            "is_new_receiver": 1,  # New but legitimate
            "is_new_device": 0,
            "time_since_last_txn_minutes": np.random.uniform(60, 10080),
            "is_fraud": 0
        },
    ]
    
    for _ in range(n_hard_negatives):
        pattern_fn = random.choice(hard_negative_patterns)
        data.append(pattern_fn())
    
    # === FRAUDULENT TRANSACTIONS ===
    fraud_patterns = [
        # Pattern 1: Classic account takeover
        lambda: {
            "transaction_amount": np.random.uniform(20000, 500000),
            "avg_transaction_amount": np.random.uniform(1000, 5000),
            "transactions_last_24h": np.random.randint(3, 15),
            "amount_spike_ratio": np.random.uniform(8, 100),
            "is_new_receiver": 1,
            "is_new_device": 1,
            "time_since_last_txn_minutes": np.random.uniform(0.5, 15),
            "is_fraud": 1
        },
        
        # Pattern 2: Velocity attack (many quick transactions)
        lambda: {
            "transaction_amount": np.random.uniform(500, 5000),
            "avg_transaction_amount": np.random.uniform(1000, 5000),
            "transactions_last_24h": np.random.randint(20, 100),
            "amount_spike_ratio": np.random.uniform(0.5, 3),
            "is_new_receiver": np.random.choice([0, 1]),
            "is_new_device": 1,
            "time_since_last_txn_minutes": np.random.uniform(0.1, 5),
            "is_fraud": 1
        },
        
        # Pattern 3: Massive spike (draining account)
        lambda: {
            "transaction_amount": np.random.uniform(100000, 1000000),
            "avg_transaction_amount": np.random.uniform(2000, 10000),
            "transactions_last_24h": np.random.randint(1, 5),
            "amount_spike_ratio": np.random.uniform(20, 200),
            "is_new_receiver": 1,
            "is_new_device": np.random.choice([0, 1]),
            "time_since_last_txn_minutes": np.random.uniform(1, 30),
            "is_fraud": 1
        },
        
        # Pattern 4: Subtle fraud (harder to detect)
        lambda: {
            "transaction_amount": np.random.uniform(5000, 30000),
            "avg_transaction_amount": np.random.uniform(3000, 10000),
            "transactions_last_24h": np.random.randint(2, 8),
            "amount_spike_ratio": np.random.uniform(2, 8),  # Moderate spike
            "is_new_receiver": 1,
            "is_new_device": np.random.choice([0, 1], p=[0.3, 0.7]),
            "time_since_last_txn_minutes": np.random.uniform(5, 60),
            "is_fraud": 1
        },
    ]
    
    for _ in range(n_fraud):
        pattern_fn = random.choice(fraud_patterns)
        data.append(pattern_fn())
    
    # Shuffle
    random.shuffle(data)
    
    return pd.DataFrame(data)


def add_label_noise(df: pd.DataFrame, noise_ratio: float = 0.05) -> pd.DataFrame:
    """
    Randomly flip labels to simulate annotation errors.
    
    Args:
        df: DataFrame with 'is_fraud' column
        noise_ratio: Fraction of labels to flip (default 5%)
        
    Returns:
        DataFrame with some labels flipped
    """
    df = df.copy()
    n_samples = len(df)
    n_flip = int(n_samples * noise_ratio)
    
    flip_indices = np.random.choice(n_samples, n_flip, replace=False)
    df.loc[flip_indices, 'is_fraud'] = 1 - df.loc[flip_indices, 'is_fraud']
    
    print(f"  Label noise applied: {n_flip} labels flipped ({noise_ratio*100:.1f}%)")
    return df


def train_model():
    """
    Train the transaction risk detection model with realistic settings.
    
    Improvements:
    1. Class imbalance (95% legit, 5% fraud)
    2. Hard negatives (25% of legitimate)
    3. Label noise (5%)
    4. Cross-validation
    """
    
    print("=" * 60)
    print("SHIELD ML - Transaction Risk Detection Training (Realistic)")
    print("=" * 60)
    
    # Generate data
    print("\n[1/6] Generating synthetic transaction data...")
    print("  Creating class-imbalanced dataset (95% legit, 5% fraud)...")
    df = generate_synthetic_transactions(4000)
    
    print(f"  Total samples: {len(df)}")
    print(f"  Fraudulent: {df['is_fraud'].sum()} ({df['is_fraud'].mean()*100:.1f}%)")
    print(f"  Legitimate: {len(df) - df['is_fraud'].sum()}")
    
    # Add label noise
    print("\n[2/6] Adding label noise (simulating annotation errors)...")
    df = add_label_noise(df, noise_ratio=0.05)
    
    print(f"\n  Final fraud count: {df['is_fraud'].sum()}")
    print(f"  Final legitimate count: {len(df) - df['is_fraud'].sum()}")
    
    # Prepare features and labels
    X = df[FEATURE_ORDER].values
    y = df['is_fraud'].values
    
    # Train/test split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    # Train RandomForest with balanced weights
    print("\n[3/6] Training RandomForest classifier (class_weight=balanced)...")
    model = RandomForestClassifier(
        n_estimators=100,
        max_depth=8,               # Limit depth to prevent overfitting
        min_samples_split=10,      # Require more samples to split
        min_samples_leaf=5,        # Larger leaves
        class_weight='balanced',   # Handle imbalance
        random_state=42,
        n_jobs=-1
    )
    model.fit(X_train, y_train)
    
    # Cross-validation
    print("\n[4/6] Cross-validation evaluation (5-fold)...")
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    
    cv_precision = cross_val_score(model, X, y, cv=cv, scoring='precision')
    cv_recall = cross_val_score(model, X, y, cv=cv, scoring='recall')
    cv_f1 = cross_val_score(model, X, y, cv=cv, scoring='f1')
    
    print("\n" + "=" * 40)
    print("CROSS-VALIDATION RESULTS (5-fold)")
    print("=" * 40)
    print(f"  Precision: {cv_precision.mean():.4f} (+/- {cv_precision.std()*2:.4f})")
    print(f"  Recall:    {cv_recall.mean():.4f} (+/- {cv_recall.std()*2:.4f})")
    print(f"  F1-Score:  {cv_f1.mean():.4f} (+/- {cv_f1.std()*2:.4f})")
    
    # Test set evaluation
    print("\n" + "=" * 40)
    print("TEST SET RESULTS")
    print("=" * 40)
    y_pred = model.predict(X_test)
    
    print(classification_report(y_test, y_pred, target_names=['Legitimate', 'Fraud']))
    
    # Confusion Matrix
    cm = confusion_matrix(y_test, y_pred)
    print("CONFUSION MATRIX:")
    print(f"  True Negatives (Legit->Legit):   {cm[0][0]:4d}")
    print(f"  False Positives (Legit->Fraud):  {cm[0][1]:4d}  <- Type I Error")
    print(f"  False Negatives (Fraud->Legit):  {cm[1][0]:4d}  <- Type II Error")
    print(f"  True Positives (Fraud->Fraud):   {cm[1][1]:4d}")
    
    print("\nKEY METRICS:")
    print(f"  Accuracy:  {accuracy_score(y_test, y_pred):.4f}")
    print(f"  Precision: {precision_score(y_test, y_pred):.4f}")
    print(f"  Recall:    {recall_score(y_test, y_pred):.4f}")
    print(f"  F1-Score:  {f1_score(y_test, y_pred):.4f}")
    
    # Feature importance
    print("\n[5/6] Analyzing feature importance...")
    print("\n" + "=" * 40)
    print("FEATURE IMPORTANCE RANKING")
    print("=" * 40)
    
    importance = model.feature_importances_
    feature_importance = list(zip(FEATURE_ORDER, importance))
    feature_importance.sort(key=lambda x: x[1], reverse=True)
    
    for i, (name, imp) in enumerate(feature_importance, 1):
        bar = "#" * int(imp * 50)
        print(f"  {i}. {name:30s} {imp:.4f} {bar}")
    
    # Save model
    print("\n[6/6] Saving model artifact...")
    model_path = os.path.join(MODELS_DIR, 'numeric_model.pkl')
    joblib.dump(model, model_path)
    print(f"  Model saved: {model_path}")
    
    print("\n[OK] Training complete!")
    print("\nNOTE: Lower accuracy is expected and realistic!")
    print("      Model now handles edge cases, hard negatives, and noisy labels.")
    
    return model


if __name__ == "__main__":
    train_model()
