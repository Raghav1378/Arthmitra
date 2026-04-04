"""
Dual-Mode RAG Retriever.
Queries both the RBI system collection and user-session collection in parallel,
merges results with deduplication, and returns structured results.
"""
import asyncio
import logging
from pathlib import Path
from typing import Any

from langchain_chroma import Chroma

from rag.embedder import get_embedder

logger = logging.getLogger(__name__)

CHROMA_DIR = Path(__file__).parent.parent / "data" / "chroma_store"
RBI_COLLECTION = "rbi_circulars"
FALLBACK_MSG = (
    "I don't have an official document on this in the knowledge base. "
    "Please check rbi.org.in for official circulars, or upload your document below."
)


def _query_collection(collection_name: str, query: str, top_k: int) -> list[dict[str, Any]]:
    """Query a single ChromaDB collection. Returns list of result dicts."""
    try:
        db = Chroma(
            collection_name=collection_name,
            persist_directory=str(CHROMA_DIR),
            embedding_function=get_embedder(),
        )
        # Check if collection has any docs first
        count = db._collection.count()
        if count == 0:
            return []

        docs = db.similarity_search_with_relevance_scores(query, k=top_k)
        results = []
        for doc, score in docs:
            results.append({
                "content": doc.page_content,
                "source": doc.metadata.get("source", "unknown"),
                "page": doc.metadata.get("page", None),
                "rows": doc.metadata.get("rows", None),
                "type": doc.metadata.get("type", "unknown"),
                "collection": collection_name,
                "score": round(score, 4),
            })
        return results
    except Exception as e:
        logger.warning(f"[RAG] Collection '{collection_name}' query failed: {e}")
        return []


def _deduplicate(results: list[dict[str, Any]], threshold: float = 0.95) -> list[dict[str, Any]]:
    """Remove near-duplicate results based on content prefix similarity."""
    seen: set[str] = set()
    unique = []
    for r in results:
        key = r["content"][:120].strip().lower()
        if key not in seen:
            seen.add(key)
            unique.append(r)
    return unique


async def query_dual_rag(
    query: str,
    session_id: str | None = None,
    top_k: int = 5,
) -> dict[str, Any]:
    """
    Queries both RBI system collection and user session collection in parallel.
    Merges, deduplicates, and returns structured results with formatted source tags.

    Returns:
        {
            "results": [...],       # merged chunks
            "formatted": str,       # human-readable context for LLM
            "sources": [...],       # unique source labels for UI
            "has_results": bool,
            "fallback": str | None, # fallback message if empty
        }
    """
    if not CHROMA_DIR.exists():
        logger.warning("[RAG] Chroma store directory does not exist.")
        return {"results": [], "formatted": "", "sources": [], "has_results": False, "fallback": FALLBACK_MSG}

    # Run both queries concurrently
    loop = asyncio.get_event_loop()
    rbi_future = loop.run_in_executor(None, _query_collection, RBI_COLLECTION, query, top_k)

    user_results: list[dict[str, Any]] = []
    if session_id:
        user_collection = f"user_docs_{session_id}"
        user_future = loop.run_in_executor(None, _query_collection, user_collection, query, top_k)
        user_results = await user_future

    rbi_results = await rbi_future

    # Merge: user docs first (higher priority), then RBI
    merged = user_results + rbi_results
    merged = _deduplicate(merged)
    merged = merged[:top_k]

    if not merged:
        return {"results": [], "formatted": "", "sources": [], "has_results": False, "fallback": FALLBACK_MSG}

    # Build formatted context for LLM injection
    context_parts = []
    source_labels = []

    for r in merged:
        if r["collection"] == RBI_COLLECTION:
            page_info = f", page {r['page']}" if r.get("page") else ""
            label = f"[🏛️ RBI Circular: {r['source']}{page_info}]"
        else:
            page_info = f", page {r['page']}" if r.get("page") else (f", rows {r['rows']}" if r.get("rows") else "")
            label = f"[📄 Your Document: {r['source']}{page_info}]"

        context_parts.append(f"{label}\n{r['content']}")
        if label not in source_labels:
            source_labels.append(label)

    formatted = "\n\n---\n\n".join(context_parts)

    return {
        "results": merged,
        "formatted": formatted,
        "sources": source_labels,
        "has_results": True,
        "fallback": None,
    }
