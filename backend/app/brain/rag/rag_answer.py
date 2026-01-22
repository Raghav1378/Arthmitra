"""
RAG Answer Generator
--------------------
Generates grounded answers using Gemma3 and retrieved context.
Enforces Strict Source Discipline, Query-Domain Alignment,
and Conservative Confidence Scoring.
"""

import logging
import json
import requests
from typing import List, Dict, Any

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

OLLAMA_CHAT_URL = "http://localhost:11434/api/chat"
MODEL_NAME = "gemma3:latest"

def generate_rag_answer(query: str, context_docs: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Generate a grounded answer using Gemma3 with strict domain isolation.
    """
    if not context_docs:
        return {
            "answer": "I don't have verified information for this.",
            "sources": [],
            "confidence": "LOW"
        }

    # Prepare context string
    context_text = ""
    sources = set()
    for doc in context_docs:
        text = doc.get("text", "")
        source = doc.get("metadata", {}).get("source", "Unknown")
        context_text += f"Source: {source}\nContent: {text}\n\n"
        sources.add(source)

    # Prompt Engineering
    prompt = f"""
You are a financial assistant. Answer the question ONLY using the provided Context.

CONTEXT:
{context_text}

QUESTION:
{query}

RULES:
1. If the answer is not in the Context, return "I don't have verified information for this."
2. Pay strict attention to actors and directionality (e.g., who pays whom). If the user asks if X pays Y, but the Context says Y pays X, correct the user and do NOT answer "Yes".
3. Do NOT guess or use outside knowledge.
4. Be concise and factual. No preamble.
5. Output STRICT JSON.

OUTPUT FORMAT:
{{
  "answer": "Concise answer string",
  "sources": ["List of source filenames"],
  "confidence": "HIGH | MEDIUM | LOW"
}}
"""

    payload = {
        "model": MODEL_NAME,
        "messages": [
            {"role": "system", "content": "You are a helpful and strict financial assistant that outputs JSON."},
            {"role": "user", "content": prompt}
        ],
        "format": "json",
        "stream": False,
        "options": {
            "temperature": 0.1 # Low temperature for factual consistency
        }
    }

    try:
        response = requests.post(OLLAMA_CHAT_URL, json=payload)
        response.raise_for_status()
        result = response.json()
        content = result.get("message", {}).get("content", "")
        
        # Parse JSON
        parsed = json.loads(content)
        
        # Fallback validation
        if not parsed.get("answer") or parsed["answer"] == "I don't have verified information for this.":
            return {
                "answer": "I don't have verified information for this.",
                "sources": [],
                "confidence": "LOW"
            }
            
        return parsed

    except Exception as e:
        logger.error(f"Error generating answer: {e}")
        return {
            "answer": "I encountered an error trying to answer your question.",
            "sources": [],
            "confidence": "LOW"
        }
