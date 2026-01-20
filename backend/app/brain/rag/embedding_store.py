"""
Embedding Store

Managed vector store using FAISS and Ollama embeddings.
"""

import os
from typing import Optional
from langchain_ollama import OllamaEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_core.documents import Document

VECTOR_STORE_PATH = os.path.join(os.path.dirname(__file__), "faiss_index")

def get_embeddings_model():
    """Get the Nomic embedding model."""
    return OllamaEmbeddings(model="nomic-embed-text")

def create_vector_store(chunks: list[Document], save_path: str = VECTOR_STORE_PATH):
    """
    Create and save a FAISS vector store from document chunks.
    """
    if not chunks:
        print("No chunks to index.")
        return None
        
    print(f"Creating vector store for {len(chunks)} chunks...")
    embeddings = get_embeddings_model()
    vector_store = FAISS.from_documents(chunks, embeddings)
    vector_store.save_local(save_path)
    print(f"Vector store saved to {save_path}")
    return vector_store

def load_vector_store(load_path: str = VECTOR_STORE_PATH) -> Optional[FAISS]:
    """
    Load the existing FAISS vector store.
    """
    if not os.path.exists(load_path):
        print(f"No vector store found at {load_path}")
        return None
        
    embeddings = get_embeddings_model()
    try:
        return FAISS.load_local(load_path, embeddings, allow_dangerous_deserialization=True)
    except Exception as e:
        print(f"Error loading vector store: {e}")
        return None
