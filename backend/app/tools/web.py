import os
from langchain_core.tools import tool
from typing import List, Dict, Any, Optional

@tool
def web_search(query: str, max_results: int = 4) -> List[Dict[str, Any]]:
    """Performs a live web search for real-time information, financial news, or latest guidelines."""
    tavily_api_key = os.getenv('TAVILY_API_KEY')
    if not tavily_api_key:
        return [{"error": "TAVILY_API_KEY not configured. Live search unavailable."}]

    try:
        from langchain_tavily import TavilySearchResults
        tavily = TavilySearchResults(max_results=max_results, api_key=tavily_api_key)
    except ImportError:
        try:
            from langchain_community.tools.tavily_search import TavilySearchResults
            tavily = TavilySearchResults(max_results=max_results, tavily_api_key=tavily_api_key)
        except ImportError:
            return [{"error": "Tavily package not installed. Live search unavailable."}]

    try:
        results = tavily.invoke(query)
        # Results are usually a list of dicts with 'url' and 'content'
        return results
    except Exception as e:
        return [{"error": f"Web search failed: {str(e)}"}]
