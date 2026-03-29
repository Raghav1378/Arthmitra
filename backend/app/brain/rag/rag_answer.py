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

from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage

def generate_rag_answer(query: str, context_docs: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Generate a grounded answer using Groq with strict domain isolation.
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

    try:
        llm = ChatGroq(
            model="llama-3.1-8b-instant",
            temperature=0.1,
        )
        
        messages = [
            SystemMessage(content="You are a helpful and strict financial assistant that outputs JSON."),
            HumanMessage(content=prompt)
        ]
        
        response = llm.invoke(messages)
        content = response.content
        
        # Groq might return with extra characters if JSON mode isn't perfect
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].split("```")[0].strip()
            
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
