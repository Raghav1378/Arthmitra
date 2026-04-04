"""
The Brain Module

Integrated Knowledge Base (RAG) and Document Summarizer.
Uses local LLMs (Ollama) for privacy-preserving financial intelligence.
"""

# Expose main API functions
from .brain_api import ask_financial_question, summarize_financial_document

__all__ = ["ask_financial_question", "summarize_financial_document"]
