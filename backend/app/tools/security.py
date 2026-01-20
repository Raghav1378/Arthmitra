import json
import os
from langchain_community.tools.tavily_search import TavilySearchResults
from langchain_core.tools import tool

def get_scams():
    try:
        with open('backend/data/scam_repository.json', 'r') as f:
            return json.load(f)
    except:
        return []

@tool
def check_upi_risk(upi_id: str):
    """Checks if a UPI ID is associated with known scams or fraud reports."""
    scams = get_scams()
    local_match = next((s for s in scams if s['type'] == 'UPI_ID' and s['content'] == upi_id), None)
    
    if local_match:
        return {"risk": "High", "reason": "Blacklisted in local scam repository", "details": local_match}
    
    # Live Search via Tavily
    tavily = TavilySearchResults(max_results=3)
    search_results = tavily.invoke(f"UPI ID fraud report {upi_id}")
    
    return {
        "risk": "Medium/Low" if not search_results else "Potential Risk",
        "search_findings": search_results,
        "upi_id": upi_id
    }

@tool
def scan_url(url: str):
    """Scans a URL for phishing or malicious patterns using live intelligence."""
    scams = get_scams()
    local_match = next((s for s in scams if s['type'] == 'URL' and s['content'] == url), None)
    
    if local_match:
        return {"risk": "Critical", "reason": "Known malicious URL in database"}
    
    tavily = TavilySearchResults(max_results=3)
    # Using search as a proxy for 'Extract API' logic in this skeleton
    search_results = tavily.invoke(f"safety report for url {url}")
    
    return {
        "url": url,
        "live_intelligence": search_results,
        "recommendation": "Do not click if source is unknown"
    }
