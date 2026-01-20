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

#### Supervised Models (Trained on labeled data)
| Model | Algorithm | Accuracy | Purpose |
|-------|-----------|----------|---------|
| Text Scam | TF-IDF + Logistic Regression | 91% | Detect scam SMS |
| Transaction Risk | RandomForest Classifier | 95% | Detect risky transactions |

#### Unsupervised Models (Trained on legitimate data only)
| Model | Algorithm | Purpose |
|-------|-----------|---------|
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
