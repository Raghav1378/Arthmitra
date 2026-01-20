"""
Shield ML - FastAPI Router

REST API endpoints for the Shield ML fraud detection system.

Usage:
    # In main.py, add:
    from app.shield_api import shield_router
    app.include_router(shield_router)
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List

# Import Shield ML functions
from app.shield_ml import predict_text_scam, predict_transaction_risk
from app.shield_ml.anomaly import get_text_anomaly_score, get_transaction_anomaly_score
from app.shield_ml.upi import predict_upi_risk
from app.shield_core.risk_assessor import assess_financial_risk

# Create router
shield_router = APIRouter(prefix="/api/shield", tags=["Shield ML - Fraud Detection"])


# ============================================================================
# Request/Response Models
# ============================================================================

class TextAnalysisRequest(BaseModel):
    """Request for text scam analysis"""
    text: str = Field(..., description="Text message to analyze for scam patterns")
    include_anomaly: bool = Field(True, description="Include anomaly detection score")
    
    class Config:
        json_schema_extra = {
            "example": {
                "text": "URGENT: Your KYC expired. Update now: http://bit.ly/12345",
                "include_anomaly": True
            }
        }


class TransactionAnalysisRequest(BaseModel):
    """Request for transaction risk analysis"""
    transaction_amount: float = Field(..., description="Amount of current transaction in INR")
    avg_transaction_amount: float = Field(..., description="User's average transaction amount")
    transactions_last_24h: int = Field(0, description="Number of transactions in last 24 hours")
    amount_spike_ratio: Optional[float] = Field(None, description="Current/Average ratio (auto-calculated if not provided)")
    is_new_receiver: int = Field(0, description="1 if first transaction to this receiver, 0 otherwise")
    is_new_device: int = Field(0, description="1 if transaction from unrecognized device, 0 otherwise")
    time_since_last_txn_minutes: float = Field(60, description="Minutes since last transaction")
    include_anomaly: bool = Field(True, description="Include anomaly detection score")
    
    class Config:
        json_schema_extra = {
            "example": {
                "transaction_amount": 50000,
                "avg_transaction_amount": 2000,
                "transactions_last_24h": 10,
                "is_new_receiver": 1,
                "is_new_device": 1,
                "time_since_last_txn_minutes": 5,
                "include_anomaly": True
            }
        }


class UnifiedAssessmentRequest(BaseModel):
    """Request for unified risk assessment (text + transaction)"""
    text: Optional[str] = Field(None, description="Text message to analyze")
    transaction: Optional[Dict[str, Any]] = Field(None, description="Transaction details")
    user_context: Optional[Dict[str, Any]] = Field(None, description="User context (is_verified_user, is_regular_recipient)")
    
    class Config:
        json_schema_extra = {
            "example": {
                "text": "Pay Rs.10 to receive Rs.50000 cashback!",
                "transaction": {
                    "transaction_amount": 10,
                    "avg_transaction_amount": 1000,
                    "transactions_last_24h": 1,
                    "is_new_receiver": 1,
                    "is_new_device": 0,
                    "time_since_last_txn_minutes": 60
                },
                "user_context": {
                    "is_verified_user": False,
                    "is_regular_recipient": False
                }
            }
        }


class UPIValidationRequest(BaseModel):
    """Request for UPI ID risk validation"""
    upi_id: str = Field(..., description="UPI ID to validate (e.g., example@okicici)")
    display_name: Optional[str] = Field(None, description="Optional display name associated with the UPI ID")
    
    class Config:
        json_schema_extra = {
            "example": {
                "upi_id": "refund123456@ybl",
                "display_name": "SBI Bank Refund"
            }
        }


# ============================================================================
# API Endpoints
# ============================================================================

@shield_router.get("/")
async def shield_info():
    """Get Shield ML module information"""
    return {
        "module": "Shield ML - Multi-Layer Fraud Detection",
        "version": "1.0.0",
        "models": {
            "supervised": {
                "text_scam": "TF-IDF + Logistic Regression",
                "transaction_risk": "RandomForest Classifier"
            },
            "unsupervised": {
                "text_anomaly": "One-Class SVM",
                "transaction_anomaly": "Isolation Forest"
            }
        },
        "endpoints": [
            {"path": "/api/shield/analyze-text", "method": "POST", "description": "Analyze text for scam patterns"},
            {"path": "/api/shield/analyze-transaction", "method": "POST", "description": "Analyze transaction for fraud risk"},
            {"path": "/api/shield/assess-risk", "method": "POST", "description": "Unified risk assessment (text + transaction)"},
        ]
    }


@shield_router.post("/analyze-text")
async def analyze_text(request: TextAnalysisRequest):
    """
    Analyze text message for scam patterns.
    
    Uses TF-IDF + Logistic Regression for supervised detection,
    optionally combined with One-Class SVM for anomaly detection.
    """
    try:
        # Supervised model
        scam_result = predict_text_scam(request.text)
        
        # Track which models are used
        models_used = ["TF-IDF + Logistic Regression (text_scam)"]
        
        response = {
            "input": request.text[:100] + "..." if len(request.text) > 100 else request.text,
            "is_scam": scam_result.get("is_scam", False),
            "confidence": scam_result.get("confidence", 0.0),
            "top_keywords": scam_result.get("top_keywords", []),
        }
        
        # Anomaly detection (optional)
        if request.include_anomaly:
            models_used.append("One-Class SVM (text_anomaly)")
            anomaly_result = get_text_anomaly_score(request.text)
            response["anomaly"] = {
                "model": "One-Class SVM",
                "score": anomaly_result.get("anomaly_score", 0.0),
                "is_anomaly": anomaly_result.get("is_anomaly", False),
                "reason": anomaly_result.get("reason", "")
            }
        
        response["models_used"] = models_used
        
        return response
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Text analysis failed: {str(e)}")


@shield_router.post("/analyze-transaction")
async def analyze_transaction(request: TransactionAnalysisRequest):
    """
    Analyze transaction for fraud risk.
    
    Uses RandomForest for supervised risk scoring,
    optionally combined with Isolation Forest for anomaly detection.
    """
    try:
        # Build transaction dict
        transaction = {
            "transaction_amount": request.transaction_amount,
            "avg_transaction_amount": request.avg_transaction_amount,
            "transactions_last_24h": request.transactions_last_24h,
            "is_new_receiver": request.is_new_receiver,
            "is_new_device": request.is_new_device,
            "time_since_last_txn_minutes": request.time_since_last_txn_minutes,
        }
        
        # Calculate spike ratio if not provided
        if request.amount_spike_ratio is not None:
            transaction["amount_spike_ratio"] = request.amount_spike_ratio
        elif request.avg_transaction_amount > 0:
            transaction["amount_spike_ratio"] = request.transaction_amount / request.avg_transaction_amount
        else:
            transaction["amount_spike_ratio"] = request.transaction_amount
        
        # Track which models are used
        models_used = ["RandomForest Classifier (transaction_risk)"]
        
        # Supervised model
        risk_result = predict_transaction_risk(transaction)
        
        response = {
            "transaction_amount": request.transaction_amount,
            "risk_score": risk_result.get("risk_score", 0),
            "risk_level": risk_result.get("risk_level", "low"),
            "reasons": risk_result.get("reasons", []),
        }
        
        # Anomaly detection (optional)
        if request.include_anomaly:
            models_used.append("Isolation Forest (transaction_anomaly)")
            anomaly_result = get_transaction_anomaly_score(transaction)
            response["anomaly"] = {
                "model": "Isolation Forest",
                "score": anomaly_result.get("anomaly_score", 0.0),
                "is_anomaly": anomaly_result.get("is_anomaly", False),
                "reason": anomaly_result.get("reason", "")
            }
        
        response["models_used"] = models_used
        
        return response
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transaction analysis failed: {str(e)}")


@shield_router.post("/assess-risk")
async def unified_risk_assessment(request: UnifiedAssessmentRequest):
    """
    Unified risk assessment combining all models.
    
    This is the main entry point for comprehensive fraud detection.
    It combines:
    - Text scam detection (if text provided)
    - Transaction risk detection (if transaction provided)
    - Text anomaly detection
    - Transaction anomaly detection
    - Policy rules for final decision
    
    Returns a structured risk decision with score, level, and recommended action.
    """
    try:
        if not request.text and not request.transaction:
            raise HTTPException(
                status_code=400, 
                detail="At least one of 'text' or 'transaction' must be provided"
            )
        
        # Call unified assessment
        decision = assess_financial_risk(
            text=request.text,
            transaction=request.transaction,
            user_context=request.user_context,
            include_trace=True
        )
        
        # Build response
        response = {
            "risk_score": decision.risk_score,
            "risk_level": decision.risk_level.value,
            "is_risky": decision.is_risky,
            "action": decision.action.value,
            "action_reason": decision.action_reason,
            "summary": decision.summary,
            "reasons": decision.reasons,
            "display": {
                "message": decision.display_message,
                "severity": decision.display_severity
            }
        }
        
        # Include model breakdown if available
        if decision.trace:
            response["models_used"] = decision.trace.models_used
            response["model_scores"] = [
                {
                    "model": ms.model_name,
                    "score": ms.normalized_score,
                    "flagged": ms.is_flagged
                }
                for ms in decision.trace.model_scores
            ]
            response["triggered_rules"] = [
                r.rule_name for r in decision.trace.triggered_rules if r.triggered
            ]
        
        return response
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Risk assessment failed: {str(e)}")


# ============================================================================
# Quick Check Endpoints (for simple integrations)
# ============================================================================

@shield_router.get("/quick-check")
async def quick_text_check(text: str):
    """
    Quick text scam check via GET request.
    
    Usage: /api/shield/quick-check?text=Your+message+here
    """
    try:
        result = predict_text_scam(text)
        return {
            "is_scam": result.get("is_scam", False),
            "confidence": round(result.get("confidence", 0.0), 2),
            "risk_level": "high" if result.get("is_scam") else "low"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@shield_router.post("/validate-upi")
async def validate_upi(request: UPIValidationRequest):
    """
    Validate UPI ID and assess risk level.
    
    This is a PREVENTIVE SAFETY CHECK that analyzes a UPI ID before payment.
    It uses rule-based heuristics to detect potential scam patterns.
    
    Risk Levels:
    - LOW (0-39): Safe for transaction
    - MEDIUM (40-69): Proceed with caution
    - HIGH (70-100): Warning - likely scam
    
    IMPORTANT: This is advisory only and should NOT automatically block transactions.
    """
    try:
        result = predict_upi_risk(
            upi_id=request.upi_id,
            display_name=request.display_name
        )
        
        return {
            "upi_id": result["upi_id"],
            "risk_score": result["risk_score"],
            "risk_level": result["risk_level"],
            "reasons": result["reasons"],
            "model_used": "Rule-based UPI Risk Scorer (11 rules)"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"UPI validation failed: {str(e)}")


@shield_router.get("/validate-upi-quick")
async def validate_upi_quick(upi_id: str, display_name: Optional[str] = None):
    """
    Quick UPI validation via GET request.
    
    Usage: /api/shield/validate-upi-quick?upi_id=example@okicici&display_name=John
    """
    try:
        result = predict_upi_risk(upi_id, display_name)
        return {
            "upi_id": result["upi_id"],
            "risk_score": result["risk_score"],
            "risk_level": result["risk_level"],
            "is_high_risk": result["risk_level"] == "HIGH"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
