
import sys
import os

print("DEBUG: KYC SCRIPT STARTING...")
# Ensure we can import app
sys.path.append(os.getcwd())

print("DEBUG: Importing modules...")
from app.brain.rag.retriever import get_relevant_context
from app.brain.rag.rag_answer import generate_rag_answer

query = "What are the KYC norms for low risk customers?"

print(f"\n--- DEBUG TOPIC: {query} ---")

# 1. Retrieve
print("1. CALLING RETRIEVER...")
docs = get_relevant_context(query)
print(f"   -> Retrieved {len(docs)} chunks.")
for i, d in enumerate(docs):
    print(f"      [{i}] Source: {d.metadata.get('source')} | Score: {d.metadata.get('relevance_score')}")

# 2. Generate
print("\n2. CALLING GENERATOR...")
response = generate_rag_answer(query, docs)
print("\n--- RESPONSE ---")
print(response)
