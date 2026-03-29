import os
import logging
from pathlib import Path
from typing import List, Dict, Any
from langchain_chroma import Chroma
from langchain_ollama import OllamaEmbeddings
from langchain_core.tools import tool

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Constants
BACKEND_DIR = Path(__file__).parent.parent
CHROMA_DIR = BACKEND_DIR / "data" / "chroma_store"
MODEL_NAME = "nomic-embed-text-v2-moe:latest"

# Global embeddings singleton to avoid reloading on every query
_embeddings = None

def get_embeddings():
    global _embeddings
    if _embeddings is None:
        logger.info(f"✨ Loading Ollama embeddings: {MODEL_NAME}")
        _embeddings = OllamaEmbeddings(model=MODEL_NAME)
    return _embeddings

@tool
def query_knowledge_base(query: str) -> Dict[str, Any]:
    """
    Queries the official RBI guidelines and financial knowledge base.
    Used for accurate compliance, KYC norms, and regulatory answers.
    """
    if not CHROMA_DIR.exists():
        logger.warning(f"❌ Chroma store not found at {CHROMA_DIR}")
        return {
            "error": "Knowledge base not yet initialized. Please run ingest_rbi.py first.",
            "query": query,
            "answer_context": []
        }

    try:
        embeddings = get_embeddings()
        vectordb = Chroma(
            persist_directory=str(CHROMA_DIR),
            embedding_function=embeddings
        )
        
        # Search for top 4 most relevant chunks
        docs = vectordb.similarity_search(query, k=4)
        
        # Return structured results
        return {
            "answer_context": [doc.page_content for doc in docs],
            "sources": [Path(doc.metadata.get('source', '')).name for doc in docs],
            "documents_found": len(docs),
            "query": query
        }
    except Exception as e:
        logger.error(f"❌ Error querying knowledge base: {str(e)}")
        return {
            "error": f"Search failed: {str(e)}",
            "query": query,
            "answer_context": []
        }
