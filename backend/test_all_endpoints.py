import requests
import json
import time

BASE_URL = "http://127.0.0.1:8001"

def print_result(name, passed, response=None, expected=None):
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"{status} | {name}")
    if not passed:
        print(f"   Expected: {expected}")
        print(f"   Got: {response}")

def test_health():
    """Test /health endpoint"""
    try:
        r = requests.get(f"{BASE_URL}/health")
        if r.status_code == 200 and r.json().get("status") == "healthy":
            print_result("Health Check", True)
        else:
            print_result("Health Check", False, r.text, '{"status": "healthy"}')
    except Exception as e:
        print_result("Health Check", False, str(e), "Connection Successful")

def test_shield_upi():
    """Test UPI Validation"""
    payload = {"upi_id": "hdfc.kyc.verification@okaxis", "display_name": "HDFC Support"}
    try:
        r = requests.post(f"{BASE_URL}/api/shield/validate-upi", json=payload)
        data = r.json()
        if r.status_code == 200 and data.get("risk_level") == "HIGH":
            print_result("Shield: UPI Validation (Scam)", True)
        else:
            print_result("Shield: UPI Validation (Scam)", False, data, "Risk Level: HIGH")
    except Exception as e:
        print_result("Shield: UPI Validation", False, str(e), "HIGH RISK")

def test_shield_text():
    """Test Text Scam Detection"""
    payload = {"text": "URGENT: Verify your account now at http://bit.ly/scam123 to avoid blocking.", "include_anomaly": True}
    try:
        r = requests.post(f"{BASE_URL}/api/shield/analyze-text", json=payload)
        data = r.json()
        if r.status_code == 200 and data.get("is_scam") == True:
            print_result("Shield: Text Analysis (Scam)", True)
        else:
            print_result("Shield: Text Analysis (Scam)", False, data, "is_scam: True")
    except Exception as e:
        print_result("Shield: Text Analysis", False, str(e), "Scam Detected")

def test_shield_transaction():
    """Test Transaction Risk"""
    payload = {
        "transaction_amount": 50000,
        "avg_transaction_amount": 500,
        "transactions_last_24h": 10,
        "is_new_receiver": 1,
        "is_new_device": 1,
        "time_since_last_txn_minutes": 5,
        "include_anomaly": True
    }
    try:
        r = requests.post(f"{BASE_URL}/api/shield/analyze-transaction", json=payload)
        data = r.json()
        if r.status_code == 200 and data.get("risk_level").upper() in ["HIGH", "MEDIUM"]:  # Depending on model
            print_result("Shield: Transaction Risk", True)
        else:
            print_result("Shield: Transaction Risk", False, data, "HIGH/MEDIUM Risk")
    except Exception as e:
        print_result("Shield: Transaction Risk", False, str(e), "High Risk")

def test_brain_reindex():
    """Test Brain Re-indexing (Trigger only)"""
    try:
        r = requests.post(f"{BASE_URL}/api/brain/reindex")
        if r.status_code == 200:
            print_result("Brain: Re-index Trigger", True)
            print("   (Waiting 5s for indexing to complete...)")
            time.sleep(5)
        else:
            print_result("Brain: Re-index Trigger", False, r.text, "200 OK")
    except Exception as e:
        print_result("Brain: Re-index", False, str(e), "200 OK")

def test_brain_ask():
    """Test RAG Question Answering"""
    payload = {"query": "What are the KYC norms for high risk customers?"}
    try:
        r = requests.post(f"{BASE_URL}/api/brain/ask", json=payload)
        data = r.json()
        # Should find answer in rbi_kyc_2023.txt
        has_answer = data.get("confidence") in ["HIGH", "MEDIUM"]
        if r.status_code == 200 and has_answer:
            print_result("Brain: Ask Question (RAG)", True)
        else:
            print_result("Brain: Ask Question (RAG)", False, data, "Confidence: HIGH/MEDIUM")
    except Exception as e:
        print_result("Brain: Ask Question", False, str(e), "Answer returned")

def test_brain_summarize():
    """Test Document Summarization"""
    text = "Loan Agreement. Interest Rate 24% per annum. Setup fee Rs 500. Prepayment penalty 5%."
    payload = {"text": text}
    try:
        r = requests.post(f"{BASE_URL}/api/brain/summarize", json=payload)
        data = r.json()
        has_flags = len(data.get("risk_flags", [])) > 0 or len(data.get("hidden_charges", [])) > 0
        if r.status_code == 200 and has_flags:
            print_result("Brain: Summarize Document", True)
        else:
            print_result("Brain: Summarize Document", False, data, "Risk flags detected")
    except Exception as e:
        print_result("Brain: Summarize", False, str(e), "Summary returned")

def test_agents_list():
    """Test /api/agents"""
    try:
        r = requests.get(f"{BASE_URL}/api/agents")
        if r.status_code == 200 and "agents" in r.json():
             print_result("System: List Agents", True)
        else:
             print_result("System: List Agents", False, r.text, "List of agents")
    except Exception as e:
        print_result("System: Agents", False, str(e), "200 OK")

def test_brain_status():
    """Test Brain Module Internal Status"""
    try:
        r = requests.get(f"{BASE_URL}/api/brain/status")
        data = r.json()
        if r.status_code == 200 and data.get("overall_status") == "healthy":
            print_result("Brain: System Status (Self-Check)", True)
        else:
            print_result("Brain: System Status (Self-Check)", False, data, "Status: healthy")
    except Exception as e:
        print_result("Brain: System Status", False, str(e), "200 OK")

if __name__ == "__main__":
    print("🚀 Starting Full Backend API Test...")
    print(f"Target: {BASE_URL}\n")
    
    test_health()
    test_agents_list()
    print("-" * 30)
    test_shield_upi()
    test_shield_text()
    test_shield_transaction()
    print("-" * 30)
    test_brain_reindex()
    test_brain_ask()
    test_brain_summarize()
    test_brain_status()
    
    print("\n✅ Test Suite Completed.")
