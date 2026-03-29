from typing import Annotated, TypedDict, List, Literal
from typing_extensions import TypedDict
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage
from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode
from langchain_groq import ChatGroq
from langchain_ollama import ChatOllama
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, SystemMessage
import os

from app.tools.security import check_upi_risk, scan_url
from app.tools.finance import analyze_transactions, predict_loan_eligibility
from app.tools.rag import query_knowledge_base
from app.tools.web import web_search

# Specialist Tools
security_tools = [check_upi_risk, scan_url, web_search]
finance_tools = [analyze_transactions, predict_loan_eligibility, web_search]
rag_tools = [query_knowledge_base]
web_tools = [web_search]
all_tools = security_tools + finance_tools + rag_tools + web_tools

# Define the Agent State
class AgentState(TypedDict):
    messages: Annotated[List[BaseMessage], add_messages]
    is_local_only: bool
    user_id: str
    current_risk_score: float
    force_agent: str  # Optional: explicitly set "auditor", "shield", "mitra", or "groq"
    error_info: dict  # Optional: stores error information for fallback handling


async def _try_groq_fallback(state: AgentState, original_error: str) -> dict:
    """Try Groq as fallback when local agents fail."""
    try:
        llm = ChatGroq(
            api_key=os.getenv("GROQ_API_KEY"),
            model="llama-3.3-70b-versatile",
            temperature=0.3,
            max_tokens=512,
        )
        response = await llm.ainvoke(state['messages'])
        # Add a note about the fallback
        fallback_note = "\n\n_(Note: I'm using a fallback cloud service because the local agent encountered an issue.)_"
        if hasattr(response, 'content'):
            response.content += fallback_note
        return {"messages": [response], "error_info": {"fallback_used": True, "original_error": original_error}}
    except Exception as groq_error:
        # Groq also failed - return structured error
        error_message = {
            "error": f"Primary agent failed: {original_error}",
            "fallback_message": f"Cloud fallback also failed: {str(groq_error)}",
            "suggestion": "Please check your internet connection and ensure Ollama is running, or try again later."
        }
        return {
            "messages": [AIMessage(content=f"I apologize, but I'm experiencing technical difficulties. "
                                       f"Error: {original_error}. "
                                       f"Please try again later or contact support if the issue persists.")],
            "error_info": error_message
        }


# Nodes - Performance optimized configurations with fallback
async def auditor_node(state: AgentState) -> dict:
    """Auditor agent for math, tax, and financial calculations."""
    is_local_only = state.get('is_local_only', False)

    try:
        effective_tools = [finance_tools[0], finance_tools[1], rag_tools[0]]
        if not is_local_only:
            effective_tools.append(web_search)

        llm = ChatGroq(
            api_key=os.getenv("GROQ_API_KEY"),
            model="llama-3.3-70b-versatile",
            temperature=0.1,
            max_tokens=1024,
        ).bind_tools(effective_tools)
        
        system_msg = SystemMessage(content=f"""You are a professional Financial Auditor.
        RULES:
        1. Professional Tone: 2-3 paragraphs. No preambles.
        2. Web Search: {'Use web_search for real-time rates/news.' if not is_local_only else 'NO web search.'}
        3. SOURCE FORMATTING: Do NOT put links in the main text. If you used web_search, append a new line at the very end starting EXACTLY with 'SOURCES: ' followed by 2-3 clickable URLs from your search results.
        4. Math Experts: Always provide clear calculations.
        5. LANGUAGE: Default English. Hindi on request.""")
        response = await llm.ainvoke([system_msg] + state['messages'])
        return {"messages": [response]}
    except Exception as e:
        print(f"Auditor Node Error: {e}")
        if not is_local_only:
            return await _try_groq_fallback(state, str(e))
        return {
            "messages": [AIMessage(content=f"Sorry, I encountered an error in the Auditor node: {e}. "
                                   f"Local-only mode is enabled, so cloud fallback is not available.")],
            "error_info": {"error": str(e), "local_only": True}
        }
auditor_node.name = "auditor"  # type: ignore


async def shield_node(state: AgentState) -> dict:
    """Shield agent for security analysis and fraud detection."""
    is_local_only = state.get('is_local_only', False)

    try:
        effective_tools = [check_upi_risk, scan_url]
        if not is_local_only:
            effective_tools.append(web_search)

        llm = ChatGroq(
            api_key=os.getenv("GROQ_API_KEY"),
            model="llama-3.3-70b-versatile",
            temperature=0.1,
            max_tokens=768,
        ).bind_tools(effective_tools)
        
        system_msg = SystemMessage(content=f"""You are an expert Cyber-Security Specialist.
        RULES:
        1. Professional Tone: Moderate length. Authoritative.
        2. Web Search: {'Use web_search for latest threat intelligence.' if not is_local_only else 'Local scans only.'}
        3. SOURCE FORMATTING: Do NOT put links in the main text. At the end of your response, append 'SOURCES: ' followed by 2-3 relevant URLs from your search.
        4. LANGUAGE: Default English. Hindi on request.""")
        response = await llm.ainvoke([system_msg] + state['messages'])
        return {"messages": [response]}
    except Exception as e:
        print(f"Shield Node Error: {e}")
        if not is_local_only:
            return await _try_groq_fallback(state, str(e))
        return {
            "messages": [AIMessage(content=f"Sorry, I encountered an error in the Shield node: {e}. "
                                   f"Local-only mode is enabled, so cloud fallback is not available.")],
            "error_info": {"error": str(e), "local_only": True}
        }
shield_node.name = "shield"  # type: ignore


async def mitra_node(state: AgentState) -> dict:
    """Mitra agent for general financial guidance and conversation."""
    is_local_only = state.get('is_local_only', False)

    try:
        effective_tools = [query_knowledge_base]
        if not is_local_only:
            effective_tools.append(web_search)

        llm = ChatGroq(
            api_key=os.getenv("GROQ_API_KEY"),
            model="llama-3.1-8b-instant",
            temperature=0.4,
            max_tokens=1024,
        ).bind_tools(effective_tools)
        
        system_msg = SystemMessage(content=f"""You are a professional Financial Consultant.
        RULES:
        1. Balanced length. Expert and professional.
        2. Real-time Info: {'Use web_search for latest financial news.' if not is_local_only else 'Local context only.'}
        3. SOURCE FORMATTING: Do NOT put links in the main text. At the bottom of your answer, append 'SOURCES: ' followed by 2-3 clickable URLs from the web search.
        4. LANGUAGE: Default English. Hindi ONLY if needed.""")
        response = await llm.ainvoke([system_msg] + state['messages'])
        return {"messages": [response]}
    except Exception as e:
        print(f"Mitra Node Error: {e}")
        if not is_local_only:
            return await _try_groq_fallback(state, str(e))
        return {
            "messages": [AIMessage(content=f"Sorry, I encountered an error in the Mitra node: {e}. "
                                   f"Local-only mode is enabled, so cloud fallback is not available.")],
            "error_info": {"error": str(e), "local_only": True}
        }
mitra_node.name = "mitra"  # type: ignore


async def groq_node(state: AgentState) -> dict:
    """Groq agent for fast responses using cloud API."""
    try:
        llm = ChatGroq(
            api_key=os.getenv("GROQ_API_KEY"),
            model="llama-3.1-8b-instant",
            temperature=0.3,
            max_tokens=512,
        ).bind_tools(all_tools)
        
        system_msg = SystemMessage(content="""You are an expert, professional, and smart AI assistant.
        RULES:
        1. Professional depth but concise. Citations for sources must be provided.
        2. Use 'web_search' for any live information requested.
        3. Language: Default to English.""")
        response = await llm.ainvoke([system_msg] + state['messages'])
        return {"messages": [response]}
    except Exception as e:
        print(f"Groq Node Error: {e}")
        error_msg = f"Sorry, I encountered an error with the Groq cloud service: {e}"
        return {
            "messages": [AIMessage(content=error_msg)],
            "error_info": {"error": str(e), "fallback_message": "Cloud service unavailable. Try using local agents."}
        }
groq_node.name = "groq"  # type: ignore

# Supervisor Router
def supervisor_route(state: AgentState) -> Literal["auditor", "shield", "mitra", "groq"]:
    """Route the conversation to the appropriate agent."""
    try:
        # Check if agent is explicitly specified
        force_agent = state.get('force_agent')
        if force_agent and force_agent in ['auditor', 'shield', 'mitra', 'groq']:
            print(f"Using explicitly specified agent: {force_agent}")
            return force_agent

        # Otherwise, route based on keywords
        last_message = state['messages'][-1].content.lower()

        # Auditor keywords (math, calculations, tax, EMI, loan)
        if any(word in last_message for word in ["tax", "audit", "math", "calculate", "loan", "emi", "interest", "return", "investment", "spend"]):
            return "auditor"

        # Shield keywords (security, fraud, UPI, phishing)
        elif any(word in last_message for word in ["scam", "link", "verify", "upi", "safe", "url", "phishing", "fraud", "security", "malicious"]):
            return "shield"

        # Groq keywords (fast, quick responses)
        elif any(word in last_message for word in ["fast", "quick", "groq", "instant"]):
            return "groq"

        # Default to Mitra for general conversation
        else:
            return "mitra"
    except Exception as e:
        print(f"Supervisor Routing Error: {e}")
        return "mitra"

# Add supervisor as a node that enables routing
def supervisor_node(state: AgentState) -> dict:
    """Pass-through node that enables routing."""
    return state

# Define nodes
tool_node = ToolNode(all_tools)

# Build Graph
builder = StateGraph(AgentState)

# Add all nodes
builder.add_node("auditor", auditor_node)
builder.add_node("shield", shield_node)
builder.add_node("mitra", mitra_node)
builder.add_node("groq", groq_node)
builder.add_node("tools", tool_node)
builder.add_node("supervisor", supervisor_node)

# Set entry point to supervisor
builder.set_entry_point("supervisor")

# Add supervisor node that routes to agents
builder.add_conditional_edges(
    "supervisor",
    supervisor_route,
    {
        "auditor": "auditor",
        "shield": "shield",
        "mitra": "mitra",
        "groq": "groq"
    }
)

# Tool routing logic - check if agent wants to use tools
def should_continue_to_tools(state: AgentState) -> Literal["tools", "__end__"]:
    """Decide whether to route to tools or finish."""
    messages = state['messages']
    last_message = messages[-1]
    if last_message.tool_calls:
        return "tools"
    return "__end__"

# Add conditional edges from each agent to either tools or back to supervisor
builder.add_conditional_edges("auditor", should_continue_to_tools)
builder.add_conditional_edges("shield", should_continue_to_tools)
builder.add_conditional_edges("mitra", should_continue_to_tools)
builder.add_conditional_edges("groq", should_continue_to_tools)

# After tools are used, go back to supervisor
builder.add_edge("tools", "supervisor")

# Compile the graph
arthmitra_app = builder.compile()