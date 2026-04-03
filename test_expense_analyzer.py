import requests
import json

BASE_URL = "http://localhost:8000"

def test_analyze(text, amount=None, time=None):
    print(f"\nTesting: {text}")
    payload = {
        "expense_text": text,
        "amount": amount,
        "time_of_transaction": time
    }
    try:
        response = requests.post(f"{BASE_URL}/expense/analyze", json=payload)
        if response.status_code == 200:
            result = response.json()
            print(f"Risk: {result['risk']}")
            print(f"Confidence: {result['confidence']}")
            print(f"Reasoning: {result['reasoning']['summary']}")
            print(f"Advice: {result['advice']}")
        else:
            print(f"Error: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"Failed: {e}")

if __name__ == "__main__":
    # Case 1: High Risk (₹1 verification scam)
    test_analyze("UPI request for ₹1 to verify account", amount=1.0)
    
    # Case 2: Suspicious (Large night transfer)
    test_analyze("Transfer to unknown account", amount=5000.0, time="02:30 AM")
    
    # Case 3: Safe (Normal dinner)
    test_analyze("Dinner with friends at Olypub", amount=1200.0, time="08:00 PM")
