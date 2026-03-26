from typing import Annotated, TypedDict, List, Literal
from typing_extensions import TypedDict
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage
from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode
from langchain_groq import ChatGroq
from langchain_ollama import ChatOllama

from app.tools.security import check_upi_risk, scan_url
from app.tools.finance import analyze_transactions, predict_loan_eligibility
from app.tools.rag import query_knowledge_base

# Specialist Tools
security_tools = [check_upi_risk, scan_url]
finance_tools = [analyze_transactions, predict_loan_eligibility]
rag_tools = [query_knowledge_base]

# Define the Agent State
class AgentState(TypedDict):
    messages: Annotated[List[BaseMessage], add_messages]
    is_local_only: bool
    user_id: str
    current_risk_score: float
    force_agent: str  # Optional: explicitly set "auditor", "shield", "mitra", or "groq"

# Nodes - Performance optimized configurations
def auditor_node(state: AgentState) -> dict:
    """Auditor agent for math, tax, and financial calculations."""
    try:
        # deepseek-r1:7b - High reasoning for math/tax
        llm = ChatOllama(
            model="deepseek-r1:7b",
            temperature=0.3,
            num_predict=1024,
            num_ctx=4096,
        )
        response = llm.invoke(state['messages'])
        return {"messages": [response]}
    except Exception as e:
        print(f"Auditor Node Error: {e}")
        return {"messages": [AIMessage(content=f"Sorry, I encountered an error in the Auditor node: {e}")]}
auditor_node.name = "auditor"  # type: ignore

def shield_node(state: AgentState) -> dict:
    """Shield agent for security analysis and fraud detection."""
    try:
        # qwen2.5-coder:7b - Best for security/logic/code
        llm = ChatOllama(
            model="qwen2.5-coder:7b",
            temperature=0.2,
            num_predict=512,
            num_ctx=2048,
        )
        response = llm.invoke(state['messages'])
        return {"messages": [response]}
    except Exception as e:
        print(f"Shield Node Error: {e}")
        return {"messages": [AIMessage(content=f"Sorry, I encountered an error in the Shield node: {e}")]}
shield_node.name = "shield"  # type: ignore

def mitra_node(state: AgentState) -> dict:
    """Mitra agent for general financial guidance and conversation."""
    try:
        # gemma3:latest - Conversational and friendly
        llm = ChatOllama(
            model="gemma3:latest",
            temperature=0.5,
            num_predict=768,
            num_ctx=4096,
        )
        response = llm.invoke(state['messages'])
        return {"messages": [response]}
    except Exception as e:
        print(f"Mitra Node Error: {e}")
        return {"messages": [AIMessage(content=f"Sorry, I encountered an error in the Mitra node: {e}")]}
mitra_node.name = "mitra"  # type: ignore

def groq_node(state: AgentState) -> dict:
    """Groq agent for fast responses using cloud API."""
    try:
        # Groq llama-3.1-8b-instant - FASTEST (cloud API)
        llm = ChatGroq(
            model="llama-3.1-8b-instant",
            temperature=0.3,
            max_tokens=512,       # Groq uses max_tokens
        )
        response = llm.invoke(state['messages'])
        return {"messages": [response]}
    except Exception as e:
        print(f"Groq Node Error: {e}")
        return {"messages": [AIMessage(content=f"Sorry, I encountered an error in the Groq node: {e}")]}
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

# Tool Node
tool_node = ToolNode(security_tools + finance_tools + rag_tools)

# Build Graph
builder = StateGraph(AgentState)

# Add all nodes
builder.add_node("auditor", auditor_node)
builder.add_node("shield", shield_node)
builder.add_node("mitra", mitra_node)
builder.add_node("groq", groq_node)
builder.add_node("tools", tool_node)

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

# Add supervisor as a node that returns the current state
def supervisor_node(state: AgentState) -> dict:
    """Pass-through node that enables routing."""
    return state

builder.add_node("supervisor", supervisor_node)

# Tool routing logic - check if agent wants to use tools
def should_continue_to_tools(state: AgentState) -> Literal["tools", "supervisor"]:
    """Decide whether to route to tools or back to supervisor."""
    messages = state['messages']
    last_message = messages[-1]
    if last_message.tool_calls:
        return "tools"
    return "supervisor"

# Add conditional edges from each agent to either tools or back to supervisor
builder.add_conditional_edges("auditor", should_continue_to_tools)
builder.add_conditional_edges("shield", should_continue_to_tools)
builder.add_conditional_edges("mitra", should_continue_to_tools)
builder.add_conditional_edges("groq", should_continue_to_tools)

# After tools are used, go back to supervisor
builder.add_edge("tools", "supervisor")

# Compile the graph
arthmitra_app = builder.compile()