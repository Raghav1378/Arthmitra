import sys
sys.path.insert(0, '.')
from app.scam_engine import analyze_message
import json

tests = {
    "T03": "Your accunt KYC is expird. Verfy now to avoid suspention of your bank account.",
    "T13": "Papa ki zaroorat. 5000 rupees emergency bhai",
    "T17": "Bank asking to confirm username/password for security",
    "T23": "Personal loan approved ₹50000. No documents. Click here",
    "T06": "Your HDFC OTP is 123456. Don't share.",
}

for test_id, msg in tests.items():
    result = analyze_message(msg)
    print(f"\n{'='*80}")
    print(f"TEST {test_id}: {msg[:60]}...")
    print(f"{'='*80}")
    print(f"Risk: {result['final_decision']['risk']}")
    print(f"Score: {result['final_decision']['risk_score']}/100")
    print(f"Confidence: {result['final_decision']['confidence']}%")
    print(f"\nStrong signals: {result['signals_detected']['strong']}")
    print(f"Medium signals: {result['signals_detected']['medium']}")
    print(f"Weak signals: {result['signals_detected']['weak']}")
    print(f"\nScam type: {result['final_decision']['scam_type']}")
    
    if 'reasoning' in result:
        print(f"\nReasoning: {result['reasoning'].get('summary', 'N/A')[:200]}")
    
    print(f"\n[RAW JSON - First 1000 chars]")
    print(json.dumps(result, indent=2, default=str)[:1000])

