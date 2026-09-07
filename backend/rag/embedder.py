"""
Singleton embedding model for the Dual-Mode RAG system.
Uses all-MiniLM-L6-v2 via sentence-transformers (fast, local, no Ollama required).
"""
import logging
from functools import lru_cache
from langchain_huggingface import HuggingFaceEmbeddings

logger = logging.getLogger(__name__)

MODEL_NAME = "all-MiniLM-L6-v2"


@lru_cache(maxsize=1)
def get_embedder() -> HuggingFaceEmbeddings:
    """
    Returns a singleton SentenceTransformer embedding model.
    lru_cache ensures the model is loaded exactly once per process.
    """
    logger.info(f"[Embedder] Loading sentence-transformer: {MODEL_NAME}")
    embedder = HuggingFaceEmbeddings(model_name=MODEL_NAME)
    logger.info("[Embedder] Model ready.")
    return embedder
