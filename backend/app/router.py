from typing import Annotated, TypedDict, List, Literal
from typing_extensions import TypedDict
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, SystemMessage, AIMessageChunk
from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode
from langchain_groq import ChatGroq
from langchain_ollama import ChatOllama
import os

from app.tools.security import check_upi_risk, scan_url
from app.tools.finance import analyze_transactions, predict_loan_eligibility
from rag.retriever import query_knowledge_base
from app.tools.web import web_search, extract_webpage, deep_research_task

# Tool Sets
security_tools = [check_upi_risk, scan_url, web_search, extract_webpage]
finance_tools = [analyze_transactions, predict_loan_eligibility, web_search, deep_research_task]
web_tools = [web_search, extract_webpage, deep_research_task]
all_tools = security_tools + finance_tools + web_tools

class AgentState(TypedDict):
    """The state of the agent swarm."""
    messages: Annotated[List[BaseMessage], add_messages]
    is_local_only: bool
    is_deep_research: bool
    user_id: str
    current_risk_score: float
    force_agent: str
    error_info: dict

# Specialist Nodes with TRUE STREAMING (uses .astream internally)
async def auditor_node(state: AgentState) -> dict:
    is_local_only = state.get('is_local_only', False)
    is_deep_research = state.get('is_deep_research', False)
    try:
        if is_local_only:
            llm = ChatOllama(model="qwen3:4b", temperature=0.1)
            effective_tools = [finance_tools[0], finance_tools[1]]
        else:
            llm = ChatGroq(api_key=os.getenv("GROQ_API_KEY"), model="llama-3.1-8b-instant", temperature=0.1, max_tokens=1024, streaming=True)
            effective_tools = [finance_tools[0], finance_tools[1], web_search]
            if is_deep_research: effective_tools.append(deep_research_task)

        llm_with_tools = llm.bind_tools(effective_tools)
        system_msg = SystemMessage(content=f"You are a professional Financial Auditor. Mode: {'OFFLINE' if is_local_only else 'ONLINE'}.")
        
        # Use astream to ensure tokens are emitted for main.py's astream_events
        full_response = ""
        async for chunk in llm_with_tools.astream([system_msg] + state['messages']):
            full_response += chunk.content if hasattr(chunk, 'content') else ""
        
        return {"messages": [AIMessage(content=full_response)]}
    except Exception as e:
        return {"messages": [AIMessage(content=f"Auditor offline or error: {str(e)}")]}

async def shield_node(state: AgentState) -> dict:
    is_local_only = state.get('is_local_only', False)
    is_deep_research = state.get('is_deep_research', False)
    try:
        if is_local_only:
            llm = ChatOllama(model="qwen3:4b", temperature=0.1)
            effective_tools = [check_upi_risk, scan_url]
        else:
            llm = ChatGroq(api_key=os.getenv("GROQ_API_KEY"), model="llama-3.1-8b-instant", temperature=0.1, max_tokens=768, streaming=True)
            effective_tools = [check_upi_risk, scan_url, web_search]
            if is_deep_research: effective_tools.append(extract_webpage)

        llm_with_tools = llm.bind_tools(effective_tools)
        system_msg = SystemMessage(content=f"You are an expert Cyber-Security Specialist. Mode: {'OFFLINE' if is_local_only else 'ONLINE'}.")
        
        full_response = ""
        async for chunk in llm_with_tools.astream([system_msg] + state['messages']):
            full_response += chunk.content if hasattr(chunk, 'content') else ""
        
        return {"messages": [AIMessage(content=full_response)]}
    except Exception as e:
        return {"messages": [AIMessage(content=f"Shield offline or error: {str(e)}")]}

async def mitra_node(state: AgentState) -> dict:
    is_local_only = state.get('is_local_only', False)
    is_deep_research = state.get('is_deep_research', False)
    try:
        if is_local_only:
            llm = ChatOllama(model="llama3.2:3b", temperature=0.4)
            effective_tools = []
        else:
            llm = ChatGroq(api_key=os.getenv("GROQ_API_KEY"), model="llama-3.1-8b-instant", temperature=0.4, max_tokens=1024, streaming=True)
            effective_tools = [web_search]
            if is_deep_research: effective_tools.append(deep_research_task)

        llm_with_tools = llm.bind_tools(effective_tools) if effective_tools else llm
        system_msg = SystemMessage(content=f"You are a professional Financial Consultant. Mode: {'OFFLINE' if is_local_only else 'ONLINE'}. Default English, Hinglish/Hindi on request.")
        
        full_response = ""
        async for chunk in llm_with_tools.astream([system_msg] + state['messages']):
            full_response += chunk.content if hasattr(chunk, 'content') else ""
        
        return {"messages": [AIMessage(content=full_response)]}
    except Exception as e:
        return {"messages": [AIMessage(content=f"Mitra offline or error: {str(e)}")]}

async def groq_node(state: AgentState) -> dict:
    try:
        llm = ChatGroq(api_key=os.getenv("GROQ_API_KEY"), model="llama-3.1-8b-instant", temperature=0.3, max_tokens=512, streaming=True).bind_tools(all_tools)
        full_response = ""
        async for chunk in llm.astream([SystemMessage(content="General Assistant")] + state['messages']):
            full_response += chunk.content if hasattr(chunk, 'content') else ""
        return {"messages": [AIMessage(content=full_response)]}
    except Exception as e:
        return {"messages": [AIMessage(content=f"Groq offline or error: {str(e)}")]}

# Supervisor Routing
def supervisor_route(state: AgentState) -> Literal["auditor", "shield", "mitra", "groq"]:
    force_agent = state.get('force_agent')
    if force_agent in ['auditor', 'shield', 'mitra', 'groq']: return force_agent
    text = state['messages'][-1].content.lower()
    if any(k in text for k in ["tax", "math", "calculate", "loan", "emi", "interest", "investment"]): return "auditor"
    if any(k in text for k in ["scam", "link", "upi", "safe", "phishing", "fraud"]): return "shield"
    if any(k in text for k in ["fast", "quick", "groq"]): return "groq"
    return "mitra"

def supervisor_node(state: AgentState) -> dict:
    return state

# Graph Setup
builder = StateGraph(AgentState)
builder.add_node("auditor", auditor_node)
builder.add_node("shield", shield_node)
builder.add_node("mitra", mitra_node)
builder.add_node("groq", groq_node)
builder.add_node("tools", ToolNode(all_tools))
builder.add_node("supervisor", supervisor_node)
builder.set_entry_point("supervisor")
builder.add_conditional_edges("supervisor", supervisor_route, {"auditor": "auditor", "shield": "shield", "mitra": "mitra", "groq": "groq"})
def should_continue(state: AgentState) -> Literal["tools", "__end__"]:
    return "tools" if state['messages'][-1].tool_calls else "__end__"
builder.add_conditional_edges("auditor", should_continue)
builder.add_conditional_edges("shield", should_continue)
builder.add_conditional_edges("mitra", should_continue)
builder.add_conditional_edges("groq", should_continue)
builder.add_edge("tools", "supervisor")
arthmitra_app = builder.compile()