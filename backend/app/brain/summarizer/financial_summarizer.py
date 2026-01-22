"""
Financial Summarizer Module
---------------------------
Summarizes raw financial documents into actionable, risk-focused insights.
"""

import logging
import json
import requests
from typing import Dict, Any

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

OLLAMA_CHAT_URL = "http://localhost:11434/api/chat"
MODEL_NAME = "gemma3:latest"

def summarize_financial_document(text: str) -> Dict[str, Any]:
    """
    Summarize a raw financial document into structured risk insights.
    """
    if not text:
        return {
            "summary": [],
            "hidden_charges": [],
            "risk_flags": [],
            "overall_risk_level": "UNKNOWN"
        }
        
    prompt = f"""
You are an expert financial auditor.
Analyze the following document and extract key risks and hidden details.

DOCUMENT TEXT:
{text[:8000]}  # Truncate to avoid context window overflow

STRICT OUTPUT REQUIREMENT:
Return a JSON object with the following structure:
{{
  "summary": ["Key point 1", "Key point 2"],
  "hidden_charges": ["List of fees, penalties, or charges found"],
  "risk_flags": ["List of risky clauses, lock-ins, or unfavorable terms"],
  "overall_risk_level": "LOW | MEDIUM | HIGH"
}}

GUIDELINES:
- Be conservative. Highlight risks over benefits.
- "hidden_charges" should include processing fees, late fees, early exit penalties.
- "risk_flags" should include variable interest rates, arbitration clauses, data sharing.
- If no risks found, say so explicitly.
- Output ONLY valid JSON.
"""

    payload = {
        "model": MODEL_NAME,
        "messages": [
            {"role": "system", "content": "You are a specific financial auditor that outputs JSON."},
            {"role": "user", "content": prompt}
        ],
        "format": "json",
        "stream": False,
        "options": {
            "temperature": 0.2
        }
    }
    
    try:
        response = requests.post(OLLAMA_CHAT_URL, json=payload)
        response.raise_for_status()
        result = response.json()
        content = result.get("message", {}).get("content", "")
        
        parsed = json.loads(content)
        return parsed
        
    except Exception as e:
        logger.error(f"Error summarising document: {e}")
        return {
            "summary": ["Error processing document"],
            "hidden_charges": [],
            "risk_flags": [],
            "overall_risk_level": "UNKNOWN"
        }
