"""
Embedding Store Module
----------------------
Generates embeddings using local Ollama (nomic-embed-text) and stores them in FAISS.
"""

import os
import json
import logging
import pickle
import requests
import numpy as np
import faiss
from typing import List, Dict, Any, Optional, Tuple

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Constants
OLLAMA_API_URL = "http://localhost:11434/api/embeddings"
MODEL_NAME = "nomic-embed-text:latest"
INDEX_DIR = os.path.join(os.path.dirname(__file__), "faiss_index")
INDEX_FILE = os.path.join(INDEX_DIR, "index.faiss")
METADATA_FILE = os.path.join(INDEX_DIR, "metadata.pkl")

def get_embedding(text: str) -> List[float]:
    """
    Generate embedding for a single string using Ollama.
    """
    if not text:
        return []
    
    try:
        payload = {
            "model": MODEL_NAME,
            "prompt": text
        }
        response = requests.post(OLLAMA_API_URL, json=payload)
        response.raise_for_status()
        data = response.json()
        return data.get("embedding", [])
    except Exception as e:
        logger.error(f"Error getting embedding: {e}")
        return []

def create_vector_store(chunks: List[Dict[str, Any]]):
    """
    Generate embeddings for all chunks and build a FAISS index.
    Saves index and metadata to disk.
    """
    if not chunks:
        logger.warning("No chunks to index.")
        return

    embeddings = []
    valid_chunks = []

    logger.info(f"Generating embeddings for {len(chunks)} chunks...")
    
    for i, chunk in enumerate(chunks):
        text = chunk.get("text", "")
        if not text:
            continue
            
        emb = get_embedding(text)
        if emb:
            embeddings.append(emb)
            valid_chunks.append(chunk)
            
        if (i + 1) % 10 == 0:
            logger.info(f"Processed {i + 1}/{len(chunks)} chunks")

    if not embeddings:
        logger.error("Failed to generate any embeddings.")
        return

    # Convert to numpy array
    dim = len(embeddings[0])
    np_embeddings = np.array(embeddings).astype('float32')

    # Normalize for cosine similarity (Inner Product)
    faiss.normalize_L2(np_embeddings)

    # Create Index
    index = faiss.IndexFlatIP(dim)
    index.add(np_embeddings)

    # Ensure directory exists
    os.makedirs(INDEX_DIR, exist_ok=True)

    # Save Index
    faiss.write_index(index, INDEX_FILE)

    # Save Metadata (Chunks)
    with open(METADATA_FILE, "wb") as f:
        pickle.dump(valid_chunks, f)

    logger.info(f"Vector store created with {index.ntotal} documents.")

def load_vector_store() -> Tuple[Optional[faiss.Index], List[Dict[str, Any]]]:
    """
    Load the FAISS index and metadata from disk.
    
    Returns:
        (index, chunks)
    """
    if not os.path.exists(INDEX_FILE) or not os.path.exists(METADATA_FILE):
        return None, []

    try:
        index = faiss.read_index(INDEX_FILE)
        with open(METADATA_FILE, "rb") as f:
            chunks = pickle.load(f)
        return index, chunks
    except Exception as e:
        logger.error(f"Error loading vector store: {e}")
        return None, []
