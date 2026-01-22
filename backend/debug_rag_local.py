import sys
import os

# Add backend to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), ".")))

from app.brain.rag.embedding_store import load_vector_store
from app.brain.rag.retriever import get_relevant_context
from app.brain.rag.rag_answer import generate_rag_answer

def debug_rag():
    print("--- DEBUGGING RAG RETRIEVAL ---")
    
    # 1. Check Index
    index, chunks = load_vector_store()
    if not index or not chunks:
        print("❌ CRITICAL: Vector Store is EMPTY or MISSING.")
        print("   Did you run 'initialize_brain(force_rebuild=True)'?")
        return
        
    print(f"✅ Vector Store Loaded. Total Chunks: {len(chunks)}")
    
    # 2. Check Retrieval
    query = "How often do I need to update KYC for high risk customers?"
    print(f"\nQuery: '{query}'")
    
    docs = get_relevant_context(query, k=3)
    print(f"\nRetrieved {len(docs)} chunks:")
    
    for i, doc in enumerate(docs):
        print(f"\n--- Chunk {i+1} (Source: {doc['metadata']['source']}) ---")
        print(doc['text'][:200] + "...") # Print first 200 chars
        
    if not docs:
        print("❌ CRITICAL: No documents retrieved for query.")
        return

    # 3. Check Answer
    print("\n--- GENERATING ANSWER ---")
    response = generate_rag_answer(query, docs)
    print("Raw Response:", response)

if __name__ == "__main__":
    debug_rag()
