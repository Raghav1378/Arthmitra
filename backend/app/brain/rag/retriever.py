"""
Retriever Module
----------------
Retrieves relevant context from the FAISS index for a given query.
"""

import logging
import numpy as np
import faiss
from typing import List, Dict, Any
from .embedding_store import load_vector_store, get_embedding

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_relevant_context(query: str, k: int = 5) -> List[Dict[str, Any]]:
    index, chunks = load_vector_store()

    if not index or not chunks:
        logger.warning("Vector store not initialized or empty.")
        return []

    query_emb = get_embedding(query)
    if not query_emb:
        logger.warning("Failed to generate query embedding.")
        return []

    query_vector = np.array([query_emb]).astype("float32")
    faiss.normalize_L2(query_vector)

    distances, indices = index.search(query_vector, k)

    results = []

    for i, idx in enumerate(indices[0]):
        if idx == -1 or idx >= len(chunks):
            continue

        score = float(distances[0][i])

        # Dynamic threshold for legal / financial text
        MIN_SIM = 0.18 if len(query) > 40 else 0.22
        if score < MIN_SIM:
            logger.warning(
                f"Rejected chunk {idx} with low similarity score: {score:.4f}"
            )
            continue

        chunk = chunks[idx]
        chunk["score"] = score
        results.append(chunk)
        logger.info(f"Accepted chunk {idx} (Score: {score:.4f})")

    # Fallback to avoid false "no verified information"
    if not results and len(indices[0]) > 0:
        fallback_idx = indices[0][0]
        if fallback_idx != -1 and fallback_idx < len(chunks):
            fallback_chunk = chunks[fallback_idx]
            fallback_chunk["score"] = float(distances[0][0])
            results.append(fallback_chunk)
            logger.warning(
                "Using fallback chunk due to strict similarity filtering."
            )

    return results
