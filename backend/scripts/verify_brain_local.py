"""
Verification Script for The Brain (Local RAG)
---------------------------------------------
Tests the end-to-end flow:
1. Ingestion (Dummy Data)
2. Retrieval
3. Answer Generation (Gemma3)
4. Summarization
"""

import os
import sys

# Add backend to path to allow imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.brain.brain_api import initialize_brain, ask_financial_question, summarize_financial_document

DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../app/brain/data"))

def create_dummy_data():
    """Create a dummy RBI circular file for testing."""
    os.makedirs(DATA_DIR, exist_ok=True)
    
    dummy_text = """
RBI CIRCULAR 2024-25/01
Subject: Zero Liability for Unauthorized Transactions

1. If a customer reports an unauthorized electronic transaction within 3 days, their liability is ZERO.
2. If reported between 4-7 days, liability is limited to Rs. 25,000 for savings accounts.
3. Beyond 7 days, liability is determined by the bank's board policy.
4. Banks must resolve such complaints within 90 days.
"""
    with open(os.path.join(DATA_DIR, "RBI_Zero_Liability.txt"), "w") as f:
        f.write(dummy_text)
    print(f"Created dummy data in {DATA_DIR}")

def main():
    print("--- STARTING VERIFICATION ---")
    
    # 1. Setup Data
    create_dummy_data()
    
    # 2. Initialize Brain
    print("\n--- INITIALIZING KNOWLEDGE BASE ---")
    initialize_brain(force_rebuild=True)
    
    # 3. Test RAG (Positive Case)
    query = "What is my liability if I report a fraud within 3 days?"
    print(f"\n--- TESTING RAG QUERY: '{query}' ---")
    response = ask_financial_question(query)
    print("RESPONSE:")
    print(response)
    
    if "ZERO" in str(response.get("answer")).upper() or "0" in str(response.get("answer")):
        print("✅ PASS: RAG Answer is correct.")
    else:
        print("❌ FAIL: RAG Answer is incorrect.")

    # 4. Test RAG (Negative Case)
    query_neg = "What is the capital of Mars?"
    print(f"\n--- TESTING NEGATIVE QUERY: '{query_neg}' ---")
    response_neg = ask_financial_question(query_neg)
    print("RESPONSE:")
    print(response_neg)
    
    if "I don't have verified information" in response_neg.get("answer"):
        print("✅ PASS: Correctly refused to answer.")
    else:
        print("❌ FAIL: Hallucinated or failed to refuse.")

    # 5. Test Summarizer
    print("\n--- TESTING SUMMARIZER ---")
    contract_text = """
    LOAN AGREEMENT
    1. Interest Rate: 12% per annum floating.
    2. Processing Fee: Rs. 5000 non-refundable.
    3. Encryption Penalty: The user must dance for the bank manager.
    """
    summary = summarize_financial_document(contract_text)
    print("SUMMARY RESPONSE:")
    print(summary)
    
    if summary.get("hidden_charges"):
        print("✅ PASS: Summarizer found charges.")
    else:
        print("❌ FAIL: Summarizer missed charges.")

if __name__ == "__main__":
    main()
