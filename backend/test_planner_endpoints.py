import requests
import json
import time

URL = "http://127.0.0.1:8000/api/planner/analyze"

def test_live_api():
    print(f"📡 Testing Live API at {URL}...")
    
    payload = {
        "goals": {
            "goal_name": "API Test Car",
            "current_cost": 500000,
            "years": 5,
            "inflation_rate": 6.0
        },
        "budget": {
            "monthly_income": 100000,
            "fixed_expenses": 30000,
            "days_remaining": 15
        }
    }
    
    try:
        response = requests.post(URL, json=payload)
        
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            print("✅ API Success! Response:")
            print(json.dumps(response.json(), indent=2))
        else:
            print(f"❌ API Error: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to server. Is 'python main.py' running?")

if __name__ == "__main__":
    test_live_api()
