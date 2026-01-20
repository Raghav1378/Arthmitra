"""
Brain Module - FastAPI Routes

Exposes the Financial Knowledge Base and Summarizer via REST API.
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import time

from app.brain.brain_api import (
    ask_financial_question, 
    summarize_financial_document, 
    initialize_brain
)

# Create Router
brain_router = APIRouter(prefix="/api/brain", tags=["Brain - Knowledge & Insights"])

# --- Pydantic Models ---

class QuestionRequest(BaseModel):
    query: str = Field(..., description="Financial question to ask (e.g., 'What are the KYC norms?')")

class SummaryRequest(BaseModel):
    text: str = Field(..., description="Financial document text to summarize")

class BrainResponse(BaseModel):
    answer: str
    sources: List[str]
    confidence: str

class SummaryResponse(BaseModel):
    summary: List[str]
    hidden_charges: List[str]
    risk_flags: List[str]
    overall_risk_level: str

# --- Endpoints ---

@brain_router.on_event("startup")
async def startup_event():
    """Initialize the Brain on startup (load index)."""
    # We do this asynchronously or lazily to not block startup too long
    # For now, just a print, logic handles lazy loading
    print("Brain Router loaded. Knowledge base will initialize on first use.")

@brain_router.post("/ask", response_model=BrainResponse)
async def ask_brain(request: QuestionRequest):
    """
    Ask a question to the RAG Financial Knowledge Base.
    Uses verified documents (RBI, Tax norms) to provide grounded answers.
    """
    try:
        response = ask_financial_question(request.query)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Brain query failed: {str(e)}")

@brain_router.post("/summarize", response_model=SummaryResponse)
async def summarize_doc(request: SummaryRequest):
    """
    Summarize a financial document (Agreement, T&C, Policy).
    Extracts hidden charges, risks, and key clauses.
    """
    try:
        response = summarize_financial_document(request.text)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Summarization failed: {str(e)}")

@brain_router.post("/reindex")
async def rebuild_index(background_tasks: BackgroundTasks):
    """
    Trigger a rebuild of the vector index (e.g., after adding new files).
    Runs in the background.
    """
    background_tasks.add_task(initialize_brain, force_rebuild=True)
    return {"status": "Index rebuild started in background"}

@brain_router.get("/status")
async def brain_health_check():
    """
    Internal Self-Diagnostic for Brain Module.
    Checks: Embedding Model, Vector Store, and LLM connectivity.
    """
    status_report = {
        "embedding_model": "unknown",
        "vector_store": "unknown",
        "llm_response": "unknown",
        "overall_status": "healthy"
    }
    
    try:
        # 1. Check Vector Store & Embeddings (Implicit via retrieval)
        try:
             # Just retrieve relevant docs for a dummy query, don't generate answer
             # We hack this by calling ask_financial_question and catching the result
             # Or better, we just trust that if ask_financial_question returns valid JSON, we are good.
             _ = ask_financial_question("check connection")
             status_report["vector_store"] = "active"
             status_report["embedding_model"] = "active"
        except Exception:
             status_report["vector_store"] = "failed"
             status_report["embedding_model"] = "failed"
             raise

        # 2. Check LLM
        # If we got here, LLM was used in ask_financial_question (since it generates the answer)
        status_report["llm_response"] = "active"
        
    except Exception as e:
        status_report["overall_status"] = "degraded"
        status_report["error"] = str(e)
        
    return status_report
