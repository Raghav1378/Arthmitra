"""
Comprehensive test of all Shield ML models
"""

from app.shield_core.risk_assessor import assess_financial_risk

print('='*70)
print('SHIELD CORE - COMPREHENSIVE MODEL RESULTS')
print('='*70)

# Test 1: SCAM TEXT
print('\n[TEST 1] SCAM TEXT MESSAGE')
print('-'*50)
result = assess_financial_risk(text='URGENT: Pay Rs.10 to receive Rs.50000 cashback! Click http://bit.ly/xyz')
print(f'  Final Risk Score: {result.risk_score}')
print(f'  Risk Level: {result.risk_level.value}')
print(f'  Action: {result.action.value}')
print(f'  Models Used: {result.trace.models_used}')
for ms in result.trace.model_scores:
    print(f'    - {ms.model_name}: score={ms.normalized_score}, flagged={ms.is_flagged}')

# Test 2: LEGITIMATE TEXT
print('\n[TEST 2] LEGITIMATE MESSAGE')
print('-'*50)
result = assess_financial_risk(text='Your SBI A/c XX1234 debited Rs.500 on 15/01. Avl Bal: Rs.25000')
print(f'  Final Risk Score: {result.risk_score}')
print(f'  Risk Level: {result.risk_level.value}')
print(f'  Action: {result.action.value}')
for ms in result.trace.model_scores:
    print(f'    - {ms.model_name}: score={ms.normalized_score}, flagged={ms.is_flagged}')

# Test 3: HIGH RISK TRANSACTION
print('\n[TEST 3] HIGH RISK TRANSACTION')
print('-'*50)
result = assess_financial_risk(transaction={
    'transaction_amount': 500000,
    'avg_transaction_amount': 2000,
    'transactions_last_24h': 50,
    'amount_spike_ratio': 250,
    'is_new_receiver': 1,
    'is_new_device': 1,
    'time_since_last_txn_minutes': 2
})
print(f'  Final Risk Score: {result.risk_score}')
print(f'  Risk Level: {result.risk_level.value}')
print(f'  Action: {result.action.value}')
for ms in result.trace.model_scores:
    print(f'    - {ms.model_name}: score={ms.normalized_score}, flagged={ms.is_flagged}')
print(f'  Policy Rules Triggered:')
for r in result.trace.triggered_rules:
    if r.triggered:
        print(f'    - {r.rule_name}: {r.score_adjustment:+d}')

# Test 4: NORMAL TRANSACTION
print('\n[TEST 4] NORMAL TRANSACTION')
print('-'*50)
result = assess_financial_risk(transaction={
    'transaction_amount': 1500,
    'avg_transaction_amount': 2000,
    'transactions_last_24h': 2,
    'amount_spike_ratio': 0.75,
    'is_new_receiver': 0,
    'is_new_device': 0,
    'time_since_last_txn_minutes': 300
})
print(f'  Final Risk Score: {result.risk_score}')
print(f'  Risk Level: {result.risk_level.value}')
print(f'  Action: {result.action.value}')
for ms in result.trace.model_scores:
    print(f'    - {ms.model_name}: score={ms.normalized_score}, flagged={ms.is_flagged}')

# Test 5: COMBINED (SCAM TEXT + SUSPICIOUS TRANSACTION)
print('\n[TEST 5] COMBINED: SCAM TEXT + SUSPICIOUS TRANSACTION')
print('-'*50)
result = assess_financial_risk(
    text='Accept collect request of Rs.1 to get Rs.25000 refund immediately!',
    transaction={
        'transaction_amount': 25000,
        'avg_transaction_amount': 3000,
        'transactions_last_24h': 8,
        'amount_spike_ratio': 8.3,
        'is_new_receiver': 1,
        'is_new_device': 1,
        'time_since_last_txn_minutes': 5
    }
)
print(f'  Final Risk Score: {result.risk_score}')
print(f'  Risk Level: {result.risk_level.value}')
print(f'  Action: {result.action.value}')
print(f'  Models Used: {result.trace.models_used}')
for ms in result.trace.model_scores:
    print(f'    - {ms.model_name}: score={ms.normalized_score}, flagged={ms.is_flagged}')
print(f'  Triggered Rules:')
for r in result.trace.triggered_rules:
    if r.triggered:
        print(f'    - {r.rule_name}: {r.score_adjustment:+d}')

print('\n' + '='*70)
print('ALL TESTS COMPLETED!')
print('='*70)
