# Shield ML - Multi-Layer Fraud Detection System

A comprehensive machine learning module for detecting scams and fraudulent transactions in Indian financial contexts.

## 🏗️ Architecture

```
backend/app/shield_ml/
├── __init__.py                    # Main module exports
├── text_features.py               # Text preprocessing & feature extraction
├── text_predict.py                # Text scam prediction
├── train_text_model.py            # Text model training script
├── numeric_features.py            # Transaction feature definitions
├── numeric_predict.py             # Transaction risk prediction
├── train_numeric_model.py         # Transaction model training script
├── models/                        # Trained model artifacts
│   ├── text_model.pkl             # TF-IDF + Logistic Regression
│   ├── text_vectorizer.pkl        # TF-IDF Vectorizer
│   └── numeric_model.pkl          # RandomForest Classifier
└── anomaly/                       # Unsupervised anomaly detection
    ├── __init__.py
    ├── train_isolation_forest.py  # Transaction anomaly training
    ├── train_one_class_svm.py     # Text anomaly training
    ├── anomaly_predict.py         # Anomaly prediction functions
    └── models/
        ├── isolation_forest.pkl   # Transaction anomaly model
        ├── one_class_svm.pkl      # Text anomaly model
        └── anomaly_vectorizer.pkl # TF-IDF for anomaly detection
```

## 📊 ML Models

### 1. Text Scam Detection (Supervised)
| Aspect | Details |
|--------|---------|
| **Algorithm** | TF-IDF + Logistic Regression |
| **Accuracy** | 91.0% |
| **Precision** | 78.4% |
| **Recall** | 61.5% |
| **F1-Score** | 68.9% |
| **Training Data** | 2000 synthetic Indian SMS (90% legit, 10% scam) |

**Why Logistic Regression?**
- Interpretable (explains which words triggered detection)
- Sub-millisecond inference
- Calibrated probabilities for confidence scores

### 2. Transaction Risk Detection (Supervised)
| Aspect | Details |
|--------|---------|
| **Algorithm** | RandomForest Classifier |
| **Accuracy** | 94.6% |
| **Precision** | 92.3% |
| **Recall** | 47.4% |
| **F1-Score** | 62.6% |
| **Training Data** | 4000 synthetic transactions (95% legit, 5% fraud) |

**Features Used:**
- `transaction_amount` - Current transaction amount
- `avg_transaction_amount` - User's 30-day average
- `transactions_last_24h` - Velocity count
- `amount_spike_ratio` - Current/Average ratio
- `is_new_receiver` - First-time recipient (0/1)
- `is_new_device` - Unknown device (0/1)
- `time_since_last_txn_minutes` - Time gap

**Why RandomForest?**
- Handles non-linear fraud patterns
- Built-in feature importance
- Robust to outliers (transaction amounts vary widely)

### 3. Transaction Anomaly Detection (Unsupervised)
| Aspect | Details |
|--------|---------|
| **Algorithm** | Isolation Forest |
| **Training Data** | 5000 legitimate-only transactions |
| **Role** | Supporting signal (not primary classifier) |

### 4. Text Anomaly Detection (Unsupervised)
| Aspect | Details |
|--------|---------|
| **Algorithm** | One-Class SVM (RBF kernel) |
| **Training Data** | 3000 legitimate-only messages |
| **Role** | Supporting signal (not primary classifier) |

## 🔧 Usage

### Quick Start

```python
# Text scam detection
from app.shield_ml import predict_text_scam

result = predict_text_scam("URGENT: Pay Rs.10 to receive Rs.50000 cashback!")
# {'is_scam': True, 'confidence': 0.85, 'top_keywords': ['pay', 'cashback', ...]}

# Transaction risk detection
from app.shield_ml import predict_transaction_risk

result = predict_transaction_risk({
    "transaction_amount": 50000,
    "avg_transaction_amount": 2000,
    "transactions_last_24h": 10,
    "is_new_receiver": 1,
    "is_new_device": 1,
    "time_since_last_txn_minutes": 5
})
# {'risk_score': 85, 'risk_level': 'high', 'reasons': [...]}

# Anomaly detection (supporting signals)
from app.shield_ml.anomaly import get_text_anomaly_score, get_transaction_anomaly_score

text_anomaly = get_text_anomaly_score("Suspicious message here")
# {'anomaly_score': 0.72, 'is_anomaly': True, 'reason': '...'}

txn_anomaly = get_transaction_anomaly_score({...})
# {'anomaly_score': 0.63, 'is_anomaly': True, 'reason': '...'}
```

### Unified Risk Assessment

```python
from app.shield_core.risk_assessor import assess_financial_risk

decision = assess_financial_risk(
    text="Some message",
    transaction={...},
    user_context={"is_verified_user": True}
)

print(decision.risk_score)      # 0-100
print(decision.risk_level)      # LOW | MEDIUM | HIGH
print(decision.action)          # ALLOW | VERIFY | WARN | BLOCK | MANUAL_REVIEW
print(decision.reasons)         # Human-readable explanations
```

## 🎯 Multi-Layer Detection Pipeline

```
Input (Text and/or Transaction)
           │
           ▼
┌──────────────────────────────────┐
│     SUPERVISED MODELS            │
│  • Text Scam (Logistic Reg.)     │
│  • Transaction Risk (RF)         │
└──────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────┐
│     ANOMALY MODELS               │
│  • Text Anomaly (One-Class SVM)  │  ◄── Supporting signals only
│  • Txn Anomaly (Isolation Forest)│
└──────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────┐
│     POLICY ENGINE                │
│  • Rule-based adjustments        │
│  • Escalation logic              │
│  • Trust signals                 │
└──────────────────────────────────┘
           │
           ▼
       Risk Decision
```

## 📋 Policy Rules

| Rule | Trigger | Adjustment |
|------|---------|------------|
| R001 | Both models flag risk | +15 |
| R002 | High confidence (≥90%) detection | +10 |
| R003 | Known scam keywords | +10 |
| R004 | New device + new receiver | +15 |
| R005 | Extreme amount spike (10x+) | +10 |
| R006 | Verified user | -10 |
| R007 | Regular recipient | -15 |
| R008 | All models show low risk | -5 |
| R009 | Anomaly escalation (corroborated) | +20 |
| R010 | Novel pattern warning | +5 to +10 |

**Key Principle:** Anomaly models never escalate to HIGH risk alone. They require corroboration from supervised models.

## 🚀 Training

```bash
cd backend

# Train supervised models
python -m app.shield_ml.train_text_model
python -m app.shield_ml.train_numeric_model

# Train anomaly models
python -m app.shield_ml.anomaly.train_isolation_forest
python -m app.shield_ml.anomaly.train_one_class_svm
```

## 📦 Dependencies

- scikit-learn
- pandas
- numpy
- joblib

**No dependencies on:** LangChain, LangGraph, Ollama, or any LLM/chat framework.

## 📄 License

Part of the ArthMitra project.
