from app.brain.brain_api import initialize_brain, ask_financial_question, summarize_financial_document
import sys

def test_brain():
    print("=== TEST 1: Initialize Brain (Indexing) ===")
    try:
        initialize_brain(force_rebuild=True)
    except Exception as e:
        print(f"Failed to initialize: {e}")
        return

    print("\n=== TEST 2: RAG Question (Known) ===")
    q1 = "How often should KYC be updated for high risk customers?"
    print(f"Q: {q1}")
    a1 = ask_financial_question(q1)
    print(f"A: {a1}")

    print("\n=== TEST 3: RAG Question (Unknown) ===")
    q2 = "What is the capital of Mars?"
    print(f"Q: {q2}")
    a2 = ask_financial_question(q2)
    print(f"A: {a2}")

    print("\n=== TEST 4: Summarizer ===")
    doc_text = """
    LOAN AGREEMENT
    1. Interest Rate: 12% per annum, fixed for first 12 months.
    2. Variable Rate: After 12 months, rate becomes floating (Repo + 5%).
    3. Prepayment Penalty: 2% of outstanding principal if closed within 3 years.
    4. Processing Fee: Rs. 5000 (Non-refundable).
    5. Late Payment: 24% per annum additional interest on overdue amount.
    """
    print("Summarizing Loan Agreement...")
    summary = summarize_financial_document(doc_text)
    print(f"Result: {summary}")

if __name__ == "__main__":
    test_brain()
