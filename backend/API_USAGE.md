# ArthMitra API Usage Guide

This document provides extensive usage examples for EVERY endpoint in the ArthMitra backend.

---

## 🛡️ 1. Shield ML - Fraud Detection
*Root Path: `/api/shield`*

### A. UPI Validation
**Endpoint: `POST /api/shield/validate-upi`**
*Best for: Frontend apps needing detailed risk reasons.*
```json
// Request (Scam)
{
  "upi_id": "hdfc.kyc.verification@okaxis",
  "display_name": "HDFC Official Support"
}

// Response
{
  "upi_id": "hdfc.kyc.verification@okaxis",
  "risk_score": 88,
  "risk_level": "HIGH",
  "reasons": [
    "Handle contains scam keyword: 'verification'",
    "Handle impersonates authority: 'hdfc'",
    "Authority name 'HDFC Official Support' using personal handle suffix"
  ],
  "model_used": "Rule-based UPI Risk Scorer (11 rules)"
}
```

**Endpoint: `GET /api/shield/validate-upi-quick`**
*Best for: Lightweight UI checks.*
```
URL: /api/shield/validate-upi-quick?upi_id=ramesh@okicici

// Response
{
  "upi_id": "ramesh@okicici",
  "risk_score": 8,
  "risk_level": "LOW",
  "is_high_risk": false
}
```

### B. Text Scam Analysis
**Endpoint: `POST /api/shield/analyze-text`**
```json
// Request (Scam)
{
  "text": "URGENT: Your SBI account will be BLOCKED! Update KYC at http://bit.ly/sbi-update",
  "include_anomaly": true
}

// Response
{
  "is_scam": true,
  "confidence": 0.92,
  "models_used": ["TF-IDF + Logistic Regression (text_scam)", "One-Class SVM (text_anomaly)"],
  "anomaly": {
    "is_anomaly": true,
    "score": 0.75
  }
}
```

**Endpoint: `GET /api/shield/quick-check`**
```
URL: /api/shield/quick-check?text=You+won+lottery

// Response
{
  "is_scam": true,
  "confidence": 0.85,
  "risk_level": "high"
}
```

### C. Transaction Risk Analysis
**Endpoint: `POST /api/shield/analyze-transaction`**
```json
// Request (Smurfing Attack)
{
  "transaction_amount": 49500,
  "avg_transaction_amount": 2000,
  "transactions_last_24h": 8,
  "is_new_receiver": 1,
  "is_new_device": 1,
  "time_since_last_txn_minutes": 15,
  "include_anomaly": true
}

// Response
{
  "risk_level": "high",
  "risk_score": 92,
  "anomaly": {
    "is_anomaly": true,
    "reason": "Unusual high-frequency high-value transactions"
  }
}
```

### D. Unified Risk Assessment
**Endpoint: `POST /api/shield/assess-risk`**
*Combines all models for a final decision.*
```json
// Request (Collect Request Trap)
{
  "text": "Refund approved! Accept request to credit Rs. 15,000.",
  "transaction": {
    "transaction_amount": 1,
    "avg_transaction_amount": 5000,
    "transactions_last_24h": 1,
    "is_new_receiver": 1,
    "is_new_device": 0,
    "time_since_last_txn_minutes": 60
  }
}

// Response
{
  "risk_score": 100,
  "risk_level": "high",
  "action": "block",
  "triggered_rules": ["High Confidence Detection", "Novel Pattern Warning"],
  "summary": "High risk detected. Transaction anomaly confirmed."
}
```

### E. Module Info
**Endpoint: `GET /api/shield/`**
*Returns version and available models.*

---

## 💬 2. Chat System
*Root Path: `/api`*

### A. Intelligent Chat
**Endpoint: `POST /api/chat`**
*Routes to specific agents based on context or request.*

**Example 1: Tax Query (Routes to Auditor)**
```json
{
  "message": "Calculate GST on Rs. 50,000 at 18%",
  "user_id": "user123",
  # "agent": null (Auto-route)
}
```

**Example 2: Security Check (Routes to Shield)**
```json
{
  "message": "Is this link safe: http://bit.ly/free-money",
  "user_id": "user123"
}
```

**Example 3: Force Specific Agent**
```json
{
  "message": "Explain UPI",
  "user_id": "user123",
  "agent": "mitra"  # Forces "Mitra" agent
}
```

### B. List Agents
**Endpoint: `GET /api/agents`**
*Returns list of available agents and their capabilities.*
```json
{
  "agents": [
    {
      "name": "auditor",
      "model": "deepseek-r1:7b",
      "best_for": "Math, calculations, reasoning..."
    },
    { "name": "shield", ... },
    { "name": "mitra", ... },
    { "name": "groq", ... }
  ]
}
```

---

## 📈 3. Financial Planner
*Root Path: `/api/planner`*

### A. Calculate Goal (SIP)
**Endpoint: `POST /api/planner/calculate-goal`**
*Calculates how much needs to be saved monthly to reach a target.*
```json
// Request
{
  "goal_name": "Tesla Model 3",
  "current_cost": 4000000,
  "years": 3,
  "current_savings": 500000,
  "monthly_savings_capacity": 60000,
  "inflation_rate": 6.0,
  "expected_return": 12.0
}

// Response
{
  "future_cost": 4764064.0,  // Inflation adjusted
  "shortfall": 2304064.0,    // Amount still needed
  "required_monthly_savings": 54000.0,
  "status": "on_track",
  "advice": "You are on track! Your capacity (60k) > required (54k)."
}
```

### B. Check Budget (Safe-to-Spend)
**Endpoint: `POST /api/planner/check-budget`**
*Calculates daily spending limit.*
```json
// Request
{
  "monthly_income": 150000,
  "fixed_expenses": 50000,  // Rent, EMI, Bills
  "variable_commitments": 20000, // Planned groceries etc
  "days_remaining": 15
}

// Response
{
  "disposable_income": 80000,
  "safe_to_spend_daily": 5333.33,
  "status": "healthy"
}
```

### C. Full Analysis
**Endpoint: `POST /api/planner/analyze`**
*Combines multiple checks in one go.*
```json
// Request
{
  "goals": { ... },
  "budget": { ... }
}
```

---

## 🔧 4. Brain Administration
*Root Path: `/api/brain`*

### A. Rebuild Index
**Endpoint: `POST /api/brain/reindex`**
*Triggers a background task to re-read all PDFs in `backend/app/brain/data/`.*
```json
// Response
{
  "status": "Index rebuild started in background"
}
```

### B. Brain Health
**Endpoint: `GET /api/brain/status`**
*Checks connection to Ollama and ChromaDB.*
```json
{
  "embedding_model": "active",
  "vector_store": "active",
  "llm_response": "active",
  "overall_status": "healthy"
}
```

---

## ⚙️ 5. System Utilities
*Root Path: `/`*

### A. Health Check
**Endpoint: `GET /health`**
*Used by load balancers/uptime monitors.*
```json
{
  "status": "healthy",
  "service": "ArthMitra Backend"
}
```

### B. Root
**Endpoint: `GET /`**
*Redirects to Swagger UI documentation (`/docs`).*
