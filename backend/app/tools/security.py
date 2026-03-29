import json
import os
from pathlib import Path
from langchain_core.tools import tool
from typing import Optional, Dict, Any

# Get the backend directory path
BACKEND_DIR = Path(__file__).parent.parent.parent

def get_scams() -> list:
    """Load scam repository from data directory."""
    try:
        scam_path = BACKEND_DIR / 'data' / 'scam_repository.json'
        with open(scam_path, 'r') as f:
            return json.load(f)
    except Exception as e:
        print(f"Warning: Could not load scam repository: {e}")
        return []

def try_tavily_search(query: str, max_results: int = 3) -> Optional[list]:
    """Try to use Tavily search if API key is available."""
    try:
        # Check if Tavily API key is configured
        tavily_api_key = os.getenv('TAVILY_API_KEY')
        if not tavily_api_key:
            return None

        try:
            from langchain_tavily import TavilySearchResults
            tavily = TavilySearchResults(max_results=max_results, api_key=tavily_api_key)
        except ImportError:
            from langchain_community.tools.tavily_search import TavilySearchResults
            tavily = TavilySearchResults(max_results=max_results, tavily_api_key=tavily_api_key)
        return tavily.invoke(query)
    except ImportError:
        print("Warning: Tavily not installed. Install with: pip install tavily-python")
        return None
    except Exception as e:
        print(f"Warning: Tavily search failed: {e}")
        return None

@tool
def check_upi_risk(upi_id: str) -> Dict[str, Any]:
    """Checks if a UPI ID is associated with known scams or fraud reports."""
    scams = get_scams()
    local_match = next((s for s in scams if s.get('type') == 'UPI_ID' and s.get('content') == upi_id), None)

    if local_match:
        return {
            "risk": "High",
            "reason": "Blacklisted in local scam repository",
            "details": local_match,
            "upi_id": upi_id
        }

    # Live Search via Tavily if available
    search_results = try_tavily_search(f"UPI ID fraud report {upi_id}")

    response = {
        "risk": "Low",
        "upi_id": upi_id,
        "local_database_checked": True,
        "live_search_performed": search_results is not None
    }

    if search_results:
        # If we got search results, analyze them
        risk_indicators = sum(1 for r in search_results if any(
            word in str(r).lower() for word in ['fraud', 'scam', 'fake', 'malicious']
        ))
        if risk_indicators > 0:
            response["risk"] = "Medium"
            response["reason"] = f"Found {risk_indicators} potentially concerning search results"
        response["search_findings"] = search_results

    return response

@tool
def scan_url(url: str) -> Dict[str, Any]:
    """Scans a URL for phishing or malicious patterns using live intelligence."""
    scams = get_scams()
    local_match = next((s for s in scams if s.get('type') == 'URL' and s.get('content') == url), None)

    if local_match:
        return {
            "risk": "Critical",
            "reason": "Known malicious URL in database",
            "url": url
        }

    # Basic URL pattern analysis
    risk_indicators = []
    url_lower = url.lower()

    # Check for suspicious patterns
    suspicious_patterns = [
        ('bit.ly', 'Shortened URL - cannot verify destination'),
        ('tinyurl.com', 'Shortened URL - cannot verify destination'),
        ('0x0', 'Hex encoding - potential obfuscation'),
        ('@', 'URL contains @ symbol - potential credential theft'),
        ('%40', 'URL contains encoded @ symbol - potential credential theft'),
    ]

    for pattern, reason in suspicious_patterns:
        if pattern in url_lower:
            risk_indicators.append(reason)

    # Live Search via Tavily if available
    search_results = try_tavily_search(f"safety report for url {url}")

    response = {
        "url": url,
        "risk": "Low",
        "recommendation": "URL appears safe, but always verify the source before clicking",
        "local_database_checked": True,
        "live_search_performed": search_results is not None
    }

    if risk_indicators:
        response["risk"] = "Medium"
        response["reasons"] = risk_indicators
        response["recommendation"] = "URL contains suspicious patterns - proceed with caution"

    if search_results:
        # Analyze search results for risk indicators
        malicious_indicators = sum(1 for r in search_results if any(
            word in str(r).lower() for word in ['malware', 'phishing', 'scam', 'malicious', 'blocked']
        ))

        if malicious_indicators > 0:
            response["risk"] = "High" if response["risk"] != "Critical" else "Critical"
            response["live_intelligence"] = search_results
            response["recommendation"] = "WARNING: URL flagged as potentially malicious"

    return response