# ArthMitra Backend - Complete Feature Documentation

## 📋 Project Status: ✅ COMPLETE

All planned features are implemented and working.

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         ArthMitra Backend                           │
│                      FastAPI (Uvicorn Server)                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────┐    ┌─────────────────────────────────┐│
│  │     LLM Chat System     │    │    Shield ML (Fraud Detection)  ││
│  │      /api/chat          │    │         /api/shield/*           ││
│  ├─────────────────────────┤    ├─────────────────────────────────┤│
│  │  • Auditor (deepseek)   │    │  SUPERVISED MODELS:             ││
│  │  • Shield (qwen2.5)     │    │  • Text Scam (Logistic Reg.)    ││
│  │  • Mitra (gemma3)       │    │  • Transaction Risk (RF)        ││
│  │  • Groq (llama-3.1)     │    │                                 ││
│  │                         │    │  UNSUPERVISED MODELS:           ││
│  │  Auto-routing based on  │    │  • Text Anomaly (One-Class SVM) ││
│  │  keywords in message    │    │  • Txn Anomaly (Isolation Forest)│
│  └─────────────────────────┘    │                                 ││
│                                 │  POLICY ENGINE:                 ││
│                                 │  • 10 Rules (R001-R010)         ││
│                                 │  • Score combination            ││
│                                 │  • Risk level classification    ││
│                                 └─────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
```

---

## ✨ Features

### 1. 🤖 Multi-Agent Chat System
| Agent | Model | Best For |
|-------|-------|----------|
| `auditor` | deepseek-r1:7b | Math, EMI, Tax calculations |
| `shield` | qwen2.5-coder:7b | Security analysis, fraud detection |
| `mitra` | gemma3:latest | General finance chat |
| `groq` | llama-3.1-8b-instant | Fast cloud responses |

**Auto-routing:** Messages are automatically routed based on keywords.

### 2. 🛡️ Shield ML - Multi-Layer Fraud Detection

#### A. Text Scam Detector
| Metric | Score | Explanation |
|--------|-------|-------------|
| **Accuracy** | 91.0% | Overall correctness on test set (90% legit / 10% scam) |
| **Precision** | 78.4% | Reliability of "Scam" alerts (High = few false alarms) |
| **Recall** | 61.5% | Ability to catch actual scams (Lower due to subtle patterns) |
| **F1-Score** | 68.9% | Balanced view of performance |
| **ROC-AUC** | **0.93** | Excellent discrimination between classes (independent of threshold) |

#### B. Transaction Risk Detector
| Metric | Score | Explanation |
|--------|-------|-------------|
| **Accuracy** | 94.6% | Overall correctness on test set (95% legit / 5% fraud) |
| **Precision** | 92.3% | Very high reliability when flagging risk |
| **Recall** | 47.4% | Catches ~50% of sophisticated fraud; optimized to avoid blocking legit users |
| **F1-Score** | 62.6% | Balanced view of performance |
| **ROC-AUC** | **0.88** | Good discrimination ability, even with class imbalance |

#### C. Unsupervised Models (Anomaly Detection)
*Metrics not applicable as these train only on "Normal" data.*
| Model | Algorithm | Role |
|-------|-----------|------|
| Text Anomaly | One-Class SVM | Detect novel scam patterns |
| Transaction Anomaly | Isolation Forest | Detect unusual behavior |

#### Policy Engine (10 Rules)
| Rule | Trigger | Impact |
|------|---------|--------|
| R001 | Both models flag risk | +15 |
| R002 | High confidence (≥90%) | +10 |
| R003 | Known scam keywords | +10 |
| R004 | New device + new receiver | +15 |
| R005 | Extreme amount spike | +10 |
| R006 | Verified user | -10 |
| R007 | Regular recipient | -15 |
| R008 | All models low risk | -5 |
| R009 | Anomaly escalation (corroborated) | +20 |
| R010 | Novel pattern warning | +5 to +10 |

---

## 📊 Model Metrics & Validation
*How to verify the performance of the Shield ML models.*

### 1. View Metrics via API
The simplest way to check which models are running and their specialized metrics (Accuracy, Precision, Recall) is to query the system directly:
```bash
GET /api/shield/
```
**Response:**
```json
{
  "module": "Shield ML - Multi-Layer Fraud Detection",
  "registry": {
    "supervised": {
        "text_scam_detector": {
            "metrics": {
                "accuracy": "91.0%",
                "precision": "78.4%",
                "f1_score": "68.9%"
            }
        },
        "transaction_risk_detector": {
            "metrics": {
                "accuracy": "94.6%",
                "precision": "92.3%",
                "f1_score": "62.6%"
            }
        }
    }
  }
}
```

### 2. Run Training Scripts (To reproduce metrics)
You can run the training scripts manually to see the full classification reports and confusion matrices in your terminal.

**Text Scam Model:**
```bash
python -m app.shield_ml.train_text_model
```
*Output: Precision/Recall for both "Legit" and "Scam" classes, Top 10 scam keywords.*

**Transaction Risk Model:**
```bash
python -m app.shield_ml.train_numeric_model
```
*Output: Feature importance ranking (e.g., `amount_spike_ratio`), Confusion Matrix.*

---

## 🔌 API Endpoints

### Shield ML Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/shield/` | Get module info and model details |
| POST | `/api/shield/analyze-text` | Analyze text for scam patterns |
| POST | `/api/shield/analyze-transaction` | Analyze transaction for fraud risk |
| POST | `/api/shield/assess-risk` | **Full unified 4-model assessment** |
| GET | `/api/shield/quick-check?text=...` | Quick text scam check |

### Chat Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chat` | Chat with AI agents |
| GET | `/api/agents` | List available agents |
| GET | `/health` | Health check |

---

## 🚀 How to Run

```bash
# Navigate to backend
cd backend

# Activate virtual environment
arthmitra\Scripts\activate

# Start server
python main.py
```

**Access Swagger UI:** http://127.0.0.1:8000/docs

---

## 📝 Usage Examples

### 1. Chat with Specific Agent
```json
POST /api/chat
{
  "message": "Calculate EMI for Rs.10 lakh loan at 8.5% for 20 years",
  "user_id": "test_user",
  "agent": "auditor"
}
```

### 2. Text Scam Analysis
```json
POST /api/shield/analyze-text
{
  "text": "URGENT: Your SBI account will be BLOCKED! Update KYC now!",
  "include_anomaly": true
}
```

**Response:**
```json
{
  "is_scam": true,
  "confidence": 0.85,
  "models_used": [
    "TF-IDF + Logistic Regression (text_scam)",
    "One-Class SVM (text_anomaly)"
  ],
  "anomaly": {
    "model": "One-Class SVM",
    "score": 0.72,
    "is_anomaly": true
  }
}
```

### 3. Transaction Risk Analysis
```json
POST /api/shield/analyze-transaction
{
  "transaction_amount": 500000,
  "avg_transaction_amount": 2000,
  "transactions_last_24h": 30,
  "is_new_receiver": 1,
  "is_new_device": 1,
  "time_since_last_txn_minutes": 2,
  "include_anomaly": true
}
```

**Response:**
```json
{
  "risk_score": 98,
  "risk_level": "high",
  "models_used": [
    "RandomForest Classifier (transaction_risk)",
    "Isolation Forest (transaction_anomaly)"
  ],
  "anomaly": {
    "model": "Isolation Forest",
    "score": 0.63,
    "is_anomaly": true
  }
}
```

### 4. Full Risk Assessment (All 4 Models)
```json
POST /api/shield/assess-risk
{
  "text": "Accept UPI collect of Rs.1 to get Rs.50000 refund!",
  "transaction": {
    "transaction_amount": 1,
    "avg_transaction_amount": 2000,
    "transactions_last_24h": 5,
    "is_new_receiver": 1,
    "is_new_device": 1,
    "time_since_last_txn_minutes": 10
  },
  "user_context": {
    "is_verified_user": false
  }
}
```

**Response:**
```json
{
  "risk_score": 100,
  "risk_level": "high",
  "action": "block",
  "models_used": ["text_scam", "transaction_risk", "text_anomaly", "transaction_anomaly"],
  "triggered_rules": ["Double Confirmation", "High Confidence Detection", "Novel Pattern Warning"]
}
```

### 5. Quick Check (Browser URL)
```
http://127.0.0.1:8000/api/shield/quick-check?text=You%20won%20lottery%20pay%20Rs.500
```

---

## 📁 Project Structure

```
backend/
├── main.py                      # FastAPI app entry point
├── app/
│   ├── router.py                # LangGraph chat router
│   ├── shield_api.py            # Shield ML FastAPI endpoints
│   ├── shield_ml/               # ML Models
│   │   ├── __init__.py
│   │   ├── text_features.py     # Text preprocessing
│   │   ├── text_predict.py      # Text scam prediction
│   │   ├── numeric_features.py  # Transaction features
│   │   ├── numeric_predict.py   # Transaction risk prediction
│   │   ├── train_text_model.py  # Train text model
│   │   ├── train_numeric_model.py
│   │   ├── models/              # Saved model files (.pkl)
│   │   └── anomaly/             # Anomaly detection module
│   │       ├── __init__.py
│   │       ├── train_isolation_forest.py
│   │       ├── train_one_class_svm.py
│   │       ├── anomaly_predict.py
│   │       └── models/          # Anomaly model files
│   ├── shield_core/             # Risk assessment layer
│   │   ├── risk_assessor.py     # Unified assessment
│   │   ├── risk_policy.py       # Policy engine (10 rules)
│   │   ├── schemas.py           # Data models
│   │   └── decision_trace.py    # Audit trail
│   └── tools/                   # LangGraph tools
│       ├── security.py
│       ├── finance.py
│       └── rag.py
└── arthmitra/                   # Virtual environment
```

---

## 🔧 Dependencies

- **FastAPI** - Web framework
- **scikit-learn** - ML models
- **LangChain/LangGraph** - Chat agents
- **Ollama** - Local LLM inference
- **Groq** - Cloud LLM (optional)

---

## ✅ What's Complete

- [x] Text scam detection model
- [x] Transaction risk detection model
- [x] Isolation Forest anomaly detection
- [x] One-Class SVM anomaly detection
- [x] Policy engine with 10 rules
- [x] FastAPI REST endpoints
- [x] Multi-agent chat system
- [x] Auto-routing by keywords
- [x] Clean response formatting
- [x] Model names in API responses
- [x] Swagger UI documentation

---

## 🔮 Future Enhancements

- [ ] Real-time model monitoring
- [ ] SHAP explainability
- [ ] Model retraining pipeline
- [ ] Dashboard UI
- [ ] Webhook notifications
## Detection Improvements (v4.1)

### Test Baseline (T01-T23)
- 23 diagnostic tests covering scam patterns + edge cases
- Before fixes: 19/23 passed (82.6%)
- After fixes: 23/23 passed (100%)

### Specific Gaps Closed
1. Typo robustness (accunt/expird) — now HIGH_RISK
2. Family emergency scams (Papa/Mummy) — now HIGH_RISK
3. Credential harvesting (password requests) — now HIGH_RISK
4. Unsolicited loan offers — now SUSPICIOUS
5. Legitimate OTP false signals — removed

### Performance Metrics (Full 3034-row eval)
- Recall: 91.1% (catches 9 in 10 scams)
- False Positive Rate: 17.1% (1 in 6 legitimate messages flagged)
- OOD Scam Recall: 99.6% (catches unseen scam families)
- Adversarial Recall: 90.4% (catches typos/obfuscation)

These are measured on a controlled diagnostic suite, not real-world production.