"""
Financial Summarizer

Summarizes long financial documents (loans, insurance, T&C) into actionable insights.
"""

from langchain_ollama import ChatOllama
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from typing import Dict, Any

def summarize_financial_document(text: str) -> Dict[str, Any]:
    """
    Summarize a financial document into structured insights.
    
    Args:
        text: The full text of the document (or a large chunk)
        
    Returns:
        JSON dictionary with keys: summary, hidden_charges, risk_flags, overall_risk_level
    """
    llm = ChatOllama(
        model="gemma3:latest",
        temperature=0.2, # Low temp for analytical precision
        format="json"
    )
    
    prompt = PromptTemplate(
        template="""
        You are a strict financial auditor. Analyze the following document text and provide a structured risk assessment.
        Focus on identifying risks, hidden charges, and non-standard clauses.
        Be financially conservative.

        DOCUMENT TEXT:
        {text}

        OUTPUT FORMAT (JSON):
        {{
            "summary": ["Key point 1", "Key point 2", "Key point 3"],
            "hidden_charges": ["List any fees, penalties, or charges mentioned"],
            "risk_flags": ["List any risky clauses, lock-in periods, or high interest rates"],
            "overall_risk_level": "LOW" or "MEDIUM" or "HIGH"
        }}
        """,
        input_variables=["text"]
    )
    
    chain = prompt | llm | JsonOutputParser()
    
    try:
        # If text is too long, we might need to truncate (simple approach for now)
        # Gemma3 can handle decent context, but let's be safe
        safe_text = text[:10000] 
        response = chain.invoke({"text": safe_text})
        return response
    except Exception as e:
        return {
            "summary": ["Error generating summary"],
            "hidden_charges": [],
            "risk_flags": [f"Processing error: {str(e)}"],
            "overall_risk_level": "UNKNOWN"
        }
