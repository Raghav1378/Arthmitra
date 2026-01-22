import sys
import os
import time

# Add backend to path
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

def print_header(name):
    print(f"\n{'='*50}")
    print(f" TESTING: {name}")
    print(f"{'='*50}")

def test_shield():
    print_header("🛡️ SHIELD ML (Fraud Detection)")
    try:
        from app.shield_core.risk_assessor import assess_financial_risk
        
        print("1. Testing Text Scam Detection...")
        text = "URGENT: Your KYC is expired. Click http://bit.ly/scam to update immediately."
        print(f"   Input: '{text}'")
        
        # Test just the text part implicitly via risk assessor
        decision = assess_financial_risk(
            text=text,
            transaction=None # Text only
        )
        print(f"   Result: {decision.action} (Score: {decision.risk_score})")
        print(f"   Reasons: {decision.reasons}")
        
        print("\n2. Testing Transaction Risk...")
        txn = {
            "transaction_amount": 80000,
            "avg_transaction_amount": 5000,
            "transactions_last_24h": 15,
            "amount_spike_ratio": 16.0,
            "is_new_receiver": 1,
            "is_new_device": 1,
            "time_since_last_txn_minutes": 2
        }
        print(f"   Input: Amount=80000 (Avg=5000), Velocity=15/day")
        decision = assess_financial_risk(
            text=None,
            transaction=txn
        )
        print(f"   Result: {decision.action} (Score: {decision.risk_score})")
        print(f"   Reasons: {decision.reasons}")
        
    except ImportError as e:
        print(f"❌ ImportError: {e}")
        print("   Did you install requirements? (pip install -r requirements.txt)")
    except Exception as e:
        print(f"❌ Error: {e}")

def test_planner():
    print_header("📅 FINANCIAL PLANNER")
    try:
        # Assuming planner_api exists based on file listing
        from app.planner.planner_api import calculate_goal_plan # Hypothetical function name based on intent
        # If specific function name is unknown, we might trap error. 
        # But let's try to import module first.
        import app.planner.planner_api as planner
        
        if hasattr(planner, 'calculate_goal_plan'):
            print("1. Testing Goal Calculation...")
            plan = planner.calculate_goal_plan(
                target_amount=100000,
                deadline_months=10,
                current_savings=0
            )
            print(f"   Target: 100k in 10 months. Result: {plan}")
        else:
            print(f"⚠️ 'calculate_goal_plan' not found in planner_api. Available: {dir(planner)}")

    except ImportError:
        print("⚠️ Planner module not found or dependencies missing.")
    except Exception as e:
        print(f"❌ Error: {e}")

def test_brain():
    print_header("🧠 THE BRAIN (RAG & Agents)")
    try:
        from app.brain.brain_api import ask_financial_question
        
        print("1. Testing Agent Routing (No RAG required for simple math/logic hopefully)...")
        # Trying a query that might trigger the Auditor agent
        query = "Calculate 18% GST on 5000 rupees"
        print(f"   Query: '{query}'")
        
        # Note: This might fail if Ollama is not running.
        start = time.time()
        print("   (Sending to local LLM... this might take time or fail if Ollama is off)")
        try:
            response = ask_financial_question(query)
            print(f"   Response: {response['answer']}")
            print(f"   Time: {time.time() - start:.2f}s")
        except Exception as e:
            print(f"   ⚠️ LLM Call Failed: {e}")
            print("   (Ensure Ollama is running with 'gemma3' and 'deepseek-r1' pulled)")
            
    except ImportError:
        print("❌ ImportError: Missing dependencies (langchain, pypdf, etc).")

if __name__ == "__main__":
    print("Beginning Backend Verification...")
    test_shield()
    test_planner()
    test_brain()
    print("\n✅ Verification Complete.")
