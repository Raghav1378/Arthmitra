import json
import random
from datetime import datetime, timedelta
from faker import Faker
import os

fake = Faker('en_IN')

# Ensure directories exist
os.makedirs('backend/data', exist_ok=True)

def generate_transactions(count=1000):
    categories = ["Food", "Transport", "Rent", "Groceries", "Entertainment", "Shopping", "Bills"]
    merchants = ["Swiggy", "Zomato", "Uber", "Amazon", "Airtel", "Zivame", "BigBasket", "Netflix"]
    
    transactions = []
    
    # Generate regular transactions
    for _ in range(count - 50):
        category = random.choice(categories)
        merchant = random.choice(merchants)
        amount = round(random.uniform(50, 5000), 2)
        
        # Regular transactions usually happen during day/evening
        hour = random.randint(7, 23)
        date = fake.date_time_between(start_date='-30d', end_date='now').replace(hour=hour)
        
        transactions.append({
            "id": fake.uuid4(),
            "timestamp": date.isoformat(),
            "amount": amount,
            "merchant": merchant,
            "category": category,
            "type": "UPI" if random.random() > 0.3 else "Card",
            "is_anomaly": False,
            "description": f"Payment to {merchant}"
        })
        
    # Generate Anomaly records
    # 1. 3 AM High-value UPI transfers
    for _ in range(25):
        date = fake.date_time_between(start_date='-30d', end_date='now').replace(hour=random.randint(2, 4))
        transactions.append({
            "id": fake.uuid4(),
            "timestamp": date.isoformat(),
            "amount": round(random.uniform(50000, 200000), 2),
            "merchant": "Unknown_UPI_User",
            "category": "Transfer",
            "type": "UPI",
            "is_anomaly": True,
            "description": "High-value night transfer"
        })
        
    # 2. Ghost Subscriptions (Small recurring amounts to obscure names)
    for _ in range(25):
        merchant = fake.company() + " Tech"
        for i in range(3): # Repeated for 3 months (simulated)
            date = (datetime.now() - timedelta(days=30*i)).replace(hour=10)
            transactions.append({
                "id": fake.uuid4(),
                "timestamp": date.isoformat(),
                "amount": round(random.uniform(10, 50), 2),
                "merchant": merchant,
                "category": "Subscription",
                "type": "Auto-Debit",
                "is_anomaly": True,
                "description": "Low-value recurring ghost subscription"
            })
            
    return transactions

def generate_scam_repo(count=200):
    scams = []
    scam_templates = [
        "Your bank account will be blocked! Update KYC now: {url}",
        "Congratulations! You won a lottery of ₹1 Cr. Click to claim: {url}",
        "Urgent: Your electricity bill is pending. Pay now to avoid disconnection: {url}",
        "Your Amazon parcel is stuck at customs. Pay ₹500 to release: {url}",
        "Get instant loan without documents at 0% interest: {url}"
    ]
    
    for _ in range(count):
        scam_type = random.choice(["SMS", "Phishing URL", "UPI ID"])
        
        if scam_type == "SMS":
            url = fake.url()
            content = random.choice(scam_templates).format(url=url)
            scams.append({
                "type": "SMS",
                "content": content,
                "sender": fake.phone_number(),
                "risk_level": "High"
            })
        elif scam_type == "Phishing URL":
            scams.append({
                "type": "URL",
                "content": fake.url(),
                "risk_level": "Critical",
                "malware_detected": random.choice([True, False])
            })
        else: # UPI ID
            scams.append({
                "type": "UPI_ID",
                "content": fake.user_name() + "@vpa" + str(random.randint(10, 99)),
                "risk_level": "High",
                "reports": random.randint(5, 100)
            })
            
    return scams

def generate_user_profiles(count=50):
    profiles = []
    for _ in range(count):
        salary = random.randint(30000, 300000)
        emi_count = random.randint(0, 5)
        emi_total = sum([random.randint(2000, 20000) for _ in range(emi_count)])
        
        profiles.append({
            "user_id": fake.uuid4(),
            "name": fake.name(),
            "age": random.randint(22, 60),
            "monthly_income": salary,
            "credit_score": random.randint(300, 900),
            "existing_emis": emi_count,
            "total_emi_load": emi_total,
            "risk_appetite": random.choice(["Low", "Medium", "High"]),
            "city_tier": random.choice([1, 2, 3])
        })
    return profiles

if __name__ == "__main__":
    data = {
        "transactions": generate_transactions(),
        "scams": generate_scam_repo(),
        "profiles": generate_user_profiles()
    }
    
    with open('backend/data/synthetic_data.json', 'w') as f:
        json.dump(data, f, indent=4)
        
    print(f"Generated {len(data['transactions'])} transactions")
    print(f"Generated {len(data['scams'])} scam records")
    print(f"Generated {len(data['profiles'])} user profiles")
    print("Data saved to backend/data/synthetic_data.json")
