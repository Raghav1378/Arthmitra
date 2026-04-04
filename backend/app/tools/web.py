import os
from langchain_core.tools import tool
from typing import List, Dict, Any, Optional
from tavily import TavilyClient

@tool
def web_search(query: str, search_depth: str = "basic", max_results: int = 4) -> List[Dict[str, Any]]:
    """
    Performs a live web search for real-time information or financial news.
    Args:
        query: The search query.
        search_depth: "basic" or "advanced" for deeper research.
        max_results: Number of results (default 4).
    """
    tavily_api_key = os.getenv('TAVILY_API_KEY')
    if not tavily_api_key:
        return [{"error": "TAVILY_API_KEY not configured."}]

    try:
        client = TavilyClient(api_key=tavily_api_key)
        # Use advanced depth if requested for "Deep Research" mode
        response = client.search(query=query, search_depth=search_depth, max_results=max_results)
        return response.get("results", [])
    except Exception as e:
        return [{"error": f"Search failed: {str(e)}"}]

@tool
def extract_webpage(url: str) -> Dict[str, Any]:
    """
    Scrapes and extracts the full content of a specific webpage URL for deep analysis.
    Useful for reading specific bank policies, news articles, or suspicious links.
    """
    tavily_api_key = os.getenv('TAVILY_API_KEY')
    try:
        client = TavilyClient(api_key=tavily_api_key)
        response = client.extract(urls=[url])
        # Returns raw content of the page
        return response.get("results", [{}])[0]
    except Exception as e:
        return {"error": f"Extraction failed: {str(e)}"}

@tool
def deep_research_task(query: str) -> str:
    """
    Executes a multi-step research task to answer complex financial questions with a detailed report.
    Use this ONLY when 'Deep Research' is enabled for high-level technical/policy analysis.
    """
    tavily_api_key = os.getenv('TAVILY_API_KEY')
    try:
        client = TavilyClient(api_key=tavily_api_key)
        # Use search with include_answer=True to get both the synthesized answer AND the raw source results
        response = client.search(
            query=query, 
            search_depth="advanced", 
            include_answer=True, 
            max_results=5
        )
        
        answer = response.get("answer", "No synthesized report available.")
        results = response.get("results", [])
        
        # Format the output to include URLs so the agent can see them and put them in the 'SOURCES' section
        sources_list = "\n".join([f"- {r.get('url')}" for r in results if r.get('url')])
        
        report = f"DEEP RESEARCH REPORT:\n{answer}\n\nRAW SOURCES FOUND:\n{sources_list}"
        return report
    except Exception as e:
        return f"Research task failed: {str(e)}"
