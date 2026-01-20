"""
Retriever Module

Retrieves relevant context from the vector store.
"""

from typing import List
from langchain_core.documents import Document
from .embedding_store import load_vector_store

def get_relevant_context(query: str, k: int = 8) -> List[Document]:
    """
    Retrieve top-k relevant document chunks for a query.
    """
    vector_store = load_vector_store()
    if not vector_store:
        return []
        
    # Use relevance scores to filter low-quality matches
    # This ensures we don't return irrelevant noise to the LLM.
    results = vector_store.similarity_search_with_relevance_scores(query, k=k)
    
    # Filter by threshold (0.30 - Relaxed to ensure recall of specific policies like Insurance)
    high_quality_docs = []
    for doc, score in results:
        if score >= 0.30:
            # Add score to metadata for debugging transparency
            doc.metadata["relevance_score"] = score
            high_quality_docs.append(doc)
    
    return high_quality_docs
