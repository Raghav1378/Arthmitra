from typing import Annotated, TypedDict, List, Union
from typing_extensions import TypedDict
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage
from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode
from langchain_groq import ChatGroq
from langchain_ollama import ChatOllama
import json

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
    force_agent: str  # Optional: explicitly set "auditor", "shield", or "mitra"

# Nodes - Performance optimized configurations
def auditor_node(state: AgentState):
    try:
        # deepseek-r1:7b - optimized for fast math reasoning
        llm = ChatOllama(
            model="deepseek-r1:7b",
            temperature=0.3,      # Lower = faster, more deterministic
            num_predict=512,      # Limit response length for speed
            num_ctx=2048,         # Context window
        )
        response = llm.invoke(state['messages'])
        return {"messages": [response]}
    except Exception as e:
        print(f"Auditor Node Error: {e}")
        return {"messages": [AIMessage(content=f"Sorry, I encountered an error in the Auditor node: {e}")]}

def shield_node(state: AgentState):
    try:
        # qwen2.5-coder:7b - optimized for fast security analysis
        llm = ChatOllama(
            model="qwen2.5-coder:7b",
            temperature=0.2,      # Very low for consistent security analysis
            num_predict=384,      # Security responses can be shorter
            num_ctx=2048,
        )
        response = llm.invoke(state['messages'])
        return {"messages": [response]}
    except Exception as e:
        print(f"Shield Node Error: {e}")
        return {"messages": [AIMessage(content=f"Sorry, I encountered an error in the Shield node: {e}")]}

def mitra_node(state: AgentState):
    try:
        # gemma3:latest - optimized for fast conversational responses
        llm = ChatOllama(
            model="gemma3:latest",
            temperature=0.5,      # Balanced for natural conversation
            num_predict=768,      # Allow longer explanations
            num_ctx=4096,         # Larger context for chat
        )
        response = llm.invoke(state['messages'])
        return {"messages": [response]}
    except Exception as e:
        print(f"Mitra Node Error: {e}")
        return {"messages": [AIMessage(content=f"Sorry, I encountered an error in the Mitra node: {e}")]}

def groq_node(state: AgentState):
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

# Supervisor Router
def supervisor_node(state: AgentState):
    try:
        # Check if agent is explicitly specified
        force_agent = state.get('force_agent')
        if force_agent and force_agent in ['auditor', 'shield', 'mitra', 'groq']:
            print(f"Using explicitly specified agent: {force_agent}")
            return force_agent
        
        # Otherwise, route based on keywords
        last_message = state['messages'][-1].content.lower()
        if any(word in last_message for word in ["tax", "audit", "math", "spend", "loan", "emi", "calculate"]):
            return "auditor"
        elif any(word in last_message for word in ["scam", "link", "verify", "upi", "safe", "url", "phishing"]):
            return "shield"
        elif any(word in last_message for word in ["fast", "quick", "groq", "instant"]):
            return "groq"
        else:
            return "mitra"
    except Exception as e:
        print(f"Supervisor Node Error: {e}")
        return "mitra"

# Tool Nodes
tool_node = ToolNode(security_tools + finance_tools + rag_tools)

# Build Graph
builder = StateGraph(AgentState)

builder.add_node("auditor", auditor_node)
builder.add_node("shield", shield_node)
builder.add_node("mitra", mitra_node)
builder.add_node("groq", groq_node)
builder.add_node("tools", tool_node)

builder.set_entry_point("supervisor_router")

def router(state):
    return supervisor_node(state)

builder.add_node("supervisor_router", lambda state: state)
builder.add_conditional_edges(
    "supervisor_router",
    router,
    {
        "auditor": "auditor",
        "shield": "shield",
        "mitra": "mitra",
        "groq": "groq"
    }
)

# Tool routing logic
def should_continue(state: AgentState):
    messages = state['messages']
    last_message = messages[-1]
    if last_message.tool_calls:
        return "tools"
    return END

builder.add_conditional_edges("auditor", should_continue)
builder.add_conditional_edges("shield", should_continue)
builder.add_conditional_edges("mitra", should_continue)
builder.add_conditional_edges("groq", should_continue)

builder.add_edge("tools", "supervisor_router") # Return to router after tool call

arthmitra_app = builder.compile()
