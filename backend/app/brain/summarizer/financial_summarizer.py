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

from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage

def summarize_financial_document(text: str) -> Dict[str, Any]:
    """
    Summarize a raw financial document into structured risk insights using Groq.
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
{text[:12000]}  # Increased context window for Groq

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

    try:
        llm = ChatGroq(
            model="llama-3.1-8b-instant",
            temperature=0.1,
        )
        
        messages = [
            SystemMessage(content="You are a specific financial auditor that outputs JSON."),
            HumanMessage(content=prompt)
        ]
        
        response = llm.invoke(messages)
        content = response.content
        
        # Groq might return with extra characters if JSON mode isn't perfect
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].split("```")[0].strip()
            
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
