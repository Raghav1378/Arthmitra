
import sys
import os

print("RAW SCORE DEBUG STARTING...")
# Ensure we can import app
sys.path.append(os.getcwd())

print("Importing embedding_store...")
from app.brain.rag.embedding_store import load_vector_store
print("Imports done.")

query = "What is the waiting period for pre-existing diseases?"

print(f"\n--- DEBUG RAW SCORES: {query} ---")

vector_store = load_vector_store()
if not vector_store:
    print("Error: Could not load vector store.")
    sys.exit(1)

# Retrieve with score, k=10 to see deeper
results = vector_store.similarity_search_with_relevance_scores(query, k=10)

print(f"Found {len(results)} raw results (before filtering):")
for i, (doc, score) in enumerate(results):
    source = doc.metadata.get("source", "Unknown")
    print(f"[{i}] Score: {score:.4f} | Source: {os.path.basename(source)}")
    print(f"    Preview: {doc.page_content[:60]}...")
