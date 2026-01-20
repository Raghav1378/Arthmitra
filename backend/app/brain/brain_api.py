"""
Brain Public API

Exposes the capabilities of The Brain module (RAG + Summarization).
This is the main entry point for other backend modules (like the Agents).
"""

import os
from typing import Dict, Any, Optional

from .rag.document_loader import load_documents
from .rag.text_chunker import chunk_documents
from .rag.embedding_store import create_vector_store, load_vector_store
from .rag.retriever import get_relevant_context
from .rag.rag_answer import generate_rag_answer
from .summarizer.financial_summarizer import summarize_financial_document as summarize_doc

# Path Config
DATA_DIR = os.path.join(os.path.dirname(__file__), "data")

def initialize_brain(force_rebuild: bool = False):
    """
    Initialize the knowledge base (load docs -> chunk -> embed).
    Call this on startup or when documents change.
    """
    vector_store = load_vector_store()
    
    if not vector_store or force_rebuild:
        print("Initializing Brain Knowledge Base...")
        docs = load_documents(DATA_DIR)
        if not docs:
            print("No documents found in data directory.")
            return
            
        chunks = chunk_documents(docs)
        create_vector_store(chunks)
        print("Brain Knowledge Base Ready!")
    else:
        print("Brain Knowledge Base loaded from disk.")

def ask_financial_question(query: str) -> Dict[str, Any]:
    """
    Ask a question to the financial knowledge base.
    
    Returns:
        Dict with keys: answer, sources, confidence
    """
    # 1. Retrieve Context
    context_docs = get_relevant_context(query)
    
    if not context_docs:
        return {
            "answer": "I couldn't find any relevant documents in my knowledge base.",
            "sources": [],
            "confidence": "LOW"
        }
        
    # 2. Generate Answer
    response = generate_rag_answer(query, context_docs)
    return response

def summarize_financial_document(text: str) -> Dict[str, Any]:
    """
    Summarize a raw financial document.
    
    Returns:
        Dict with keys: summary, hidden_charges, risk_flags, overall_risk_level
    """
    return summarize_doc(text)
