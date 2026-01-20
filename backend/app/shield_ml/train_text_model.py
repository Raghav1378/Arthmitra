"""
Text-Based Scam Detection Model Training Script

This script generates synthetic Indian-style scam and legitimate messages,
trains a TF-IDF + Logistic Regression classifier, and saves the model.

REALISTIC TRAINING APPROACH:
- Class imbalance (90% legitimate, 10% scam) - reflects real-world distribution
- Label noise (5-10%) - simulates annotation errors
- Hard negatives - ambiguous messages that are difficult to classify
- Cross-validation - robust evaluation

WHY Logistic Regression?
- Interpretable: We can explain which words contributed to the decision
- Fast: Sub-millisecond inference for real-time detection
- Calibrated probabilities: Output can be used as confidence scores
- Works well with TF-IDF features
"""

import os
import random
import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split, cross_val_score, StratifiedKFold
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score, 
    classification_report, confusion_matrix
)
import joblib

# Ensure models directory exists
MODELS_DIR = os.path.join(os.path.dirname(__file__), 'models')
os.makedirs(MODELS_DIR, exist_ok=True)

# Set seed for reproducibility
np.random.seed(42)
random.seed(42)


def generate_synthetic_scam_messages(n_samples: int = 200) -> list:
    """
    Generate synthetic Indian-style scam messages.
    
    Includes:
    - Clear scam patterns (easy positives)
    - Subtle scam patterns (hard positives - no obvious keywords)
    """
    
    # Clear scam templates (obvious patterns)
    clear_scam_templates = [
        # UPI Collect Fraud
        "Pay Rs.{amount} to receive Rs.{big_amount} cashback. Accept UPI collect now!",
        "URGENT: Accept collect request of Rs.{amount} to get refund of Rs.{big_amount}",
        "Your cashback of Rs.{big_amount} is pending. Pay Rs.{amount} processing fee via UPI",
        
        # OTP/KYC Phishing with links
        "ALERT: Your {bank} KYC is expiring today. Update now: {fake_url} or account blocked",
        "Dear Customer, Update PAN/Aadhaar immediately at {fake_url}. KYC mandatory-RBI",
        "{bank} ALERT: Your account will be BLOCKED due to incomplete KYC. Call {phone}",
        
        # Lottery/Prize with urgency
        "Congratulations! You won Rs.{big_amount} in {company} Lucky Draw! Claim: {phone}",
        "WINNER! You won iPhone 15 Pro from {company}. Pay Rs.{amount} shipping. Call {phone}",
    ]
    
    # Subtle scam templates (harder to detect - no obvious keywords)
    subtle_scam_templates = [
        # Social engineering without clear scam words
        "Hi, I transferred Rs.{big_amount} to your account by mistake. Please return it to {phone}",
        "This is {bank} customer care. We noticed unusual activity. Please verify your details",
        "Your order has been placed. If not authorized, contact us immediately at {phone}",
        "Important update regarding your {bank} account. Action required before {date}",
        "Dear customer, your recent transaction needs verification. Reply YES to confirm",
        
        # Fake job offers without obvious red flags
        "Based on your profile, you qualify for our work-from-home opportunity. Interested?",
        "Your resume matched our requirements. Interview scheduled. Confirm availability",
        
        # Emotional manipulation without scam keywords
        "I am stuck in hospital. Please send Rs.{amount} for emergency. Will return tomorrow",
        "Mom asked me to message you. She needs Rs.{big_amount} urgently for medical emergency",
    ]
    
    banks = ['SBI', 'HDFC', 'ICICI', 'Axis', 'PNB', 'Kotak', 'Yes Bank', 'BOB']
    companies = ['Jio', 'Airtel', 'Flipkart', 'Amazon', 'Paytm', 'PhonePe']
    
    messages = []
    
    # 70% clear scams, 30% subtle scams
    n_clear = int(n_samples * 0.7)
    n_subtle = n_samples - n_clear
    
    for _ in range(n_clear):
        template = random.choice(clear_scam_templates)
        message = template.format(
            amount=random.choice([1, 5, 10, 49, 99, 199, 499]),
            big_amount=random.choice([5000, 10000, 25000, 50000, 100000]),
            bank=random.choice(banks),
            company=random.choice(companies),
            fake_url=f"http://bit.ly/{random.randint(10000,99999)}",
            phone=f"+91{random.randint(7000000000, 9999999999)}",
            date=f"{random.randint(1,28)}/{random.randint(1,12)}/2024",
        )
        messages.append((message, 1))
    
    for _ in range(n_subtle):
        template = random.choice(subtle_scam_templates)
        message = template.format(
            amount=random.choice([500, 1000, 2000, 5000]),
            big_amount=random.choice([5000, 10000, 15000]),
            bank=random.choice(banks),
            company=random.choice(companies),
            phone=f"+91{random.randint(7000000000, 9999999999)}",
            date=f"{random.randint(1,28)}/{random.randint(1,12)}/2024",
        )
        messages.append((message, 1))
    
    return messages


def generate_synthetic_legit_messages(n_samples: int = 1800) -> list:
    """
    Generate synthetic legitimate bank/merchant messages.
    
    Includes:
    - Standard legitimate messages (easy negatives)
    - Hard negatives - legitimate messages with scam-like language
      (urgency, links, requests)
    """
    
    # Standard legitimate templates
    standard_templates = [
        # Transaction Confirmations
        "Your {bank} A/c XX{last4} debited by Rs.{amount} on {date}. UPI Ref: {ref}",
        "Rs.{amount} credited to {bank} A/c XX{last4}. Avl Bal: Rs.{balance}. Ref {ref}",
        "Transaction of Rs.{amount} successful at {merchant}. {bank} Card XX{last4}",
        
        # Bill Reminders
        "Your {service} bill of Rs.{amount} is due on {date}. Pay via {bank} App",
        "Reminder: {service} recharge of Rs.{amount} expiring on {date}",
        "EMI of Rs.{amount} for {bank} Loan debited from A/c XX{last4}",
        
        # Account Updates
        "Your {bank} Credit Card statement for {date} is ready. View in app",
        "Fixed Deposit of Rs.{amount} maturing on {date}. Visit {bank} branch",
        
        # OTP Messages (legitimate)
        "{otp} is OTP for {bank} login. Valid 5 mins. Never share with anyone",
        "OTP for {bank} transaction Rs.{amount} is {otp}. Do not share",
        
        # Simple confirmations
        "Welcome to {bank}! Your account XX{last4} is now active",
        "Your {merchant} order has been shipped. Track on app",
        "Payment of Rs.{amount} received from {name}. {bank} UPI",
    ]
    
    # Hard negatives - legitimate messages that look scammy
    hard_negative_templates = [
        # Legitimate urgency
        "URGENT: Your {bank} Card expires {date}. Visit branch to renew",
        "IMPORTANT: Update mobile number in {bank} account. Visit branch",
        "ALERT: Large transaction of Rs.{big_amount} on your {bank} Card. If not you, call 1800-XXX-XXXX",
        
        # Legitimate links
        "Track your {merchant} order here: https://amzn.to/{ref}",
        "Your {bank} statement is available at https://{bank_lower}.com/statement",
        "Click to download your {service} bill: https://bill.{service_lower}.com/{ref}",
        
        # Legitimate requests with action needed
        "Your {bank} KYC documents are due for renewal. Visit nearest branch with Aadhaar",
        "Action needed: Complete your {bank} account verification. Login to app",
        "Please update your PAN in {bank} account to avoid TDS issues. Visit branch",
        
        # Legitimate rewards/offers
        "Congratulations! You earned {points} reward points on {bank} Credit Card",
        "Special offer: Get Rs.{amount} cashback on {merchant}. Shop via {bank} app",
        "You are pre-approved for {bank} Personal Loan at {rate}% p.a.",
        
        # Legitimate money requests (between known parties)
        "Request from {name}: Please pay Rs.{amount} for dinner. UPI: {upi}",
        "{name} has requested Rs.{amount} on {bank} UPI. Accept/Decline in app",
    ]
    
    banks = ['SBI', 'HDFC', 'ICICI', 'Axis', 'PNB', 'Kotak', 'Yes Bank', 'BOB']
    services = ['Electricity', 'Mobile', 'Broadband', 'Gas', 'DTH', 'Insurance']
    merchants = ['Amazon', 'Flipkart', 'Swiggy', 'Zomato', 'BigBasket', 'DMart']
    names = ['Rahul', 'Priya', 'Amit', 'Sneha', 'Vijay', 'Neha', 'Ravi', 'Anjali']
    
    messages = []
    
    # 75% standard, 25% hard negatives
    n_standard = int(n_samples * 0.75)
    n_hard = n_samples - n_standard
    
    for _ in range(n_standard):
        template = random.choice(standard_templates)
        bank = random.choice(banks)
        service = random.choice(services)
        message = template.format(
            bank=bank,
            bank_lower=bank.lower(),
            amount=random.randint(100, 50000),
            balance=random.randint(1000, 500000),
            last4=random.randint(1000, 9999),
            date=f"{random.randint(1,28)}/{random.randint(1,12)}/2024",
            ref=random.randint(100000, 999999),
            service=service,
            service_lower=service.lower(),
            merchant=random.choice(merchants),
            otp=random.randint(100000, 999999),
            name=random.choice(names),
            upi=f"{random.choice(names).lower()}@{random.choice(['upi', 'ybl', 'paytm'])}",
        )
        messages.append((message, 0))
    
    for _ in range(n_hard):
        template = random.choice(hard_negative_templates)
        bank = random.choice(banks)
        service = random.choice(services)
        message = template.format(
            bank=bank,
            bank_lower=bank.lower(),
            amount=random.randint(100, 5000),
            big_amount=random.randint(10000, 100000),
            last4=random.randint(1000, 9999),
            date=f"{random.randint(1,28)}/{random.randint(1,12)}/2024",
            ref=random.randint(100000, 999999),
            service=service,
            service_lower=service.lower(),
            merchant=random.choice(merchants),
            points=random.randint(100, 5000),
            rate=random.choice([10.5, 11.0, 12.5]),
            name=random.choice(names),
            upi=f"{random.choice(names).lower()}@{random.choice(['upi', 'ybl', 'paytm'])}",
        )
        messages.append((message, 0))
    
    return messages


def add_label_noise(messages: list, noise_ratio: float = 0.07) -> list:
    """
    Randomly flip labels to simulate real-world annotation errors.
    
    In real datasets, ~5-10% of labels are often incorrect due to:
    - Human annotator errors
    - Ambiguous messages
    - Evolving scam patterns
    
    Args:
        messages: List of (text, label) tuples
        noise_ratio: Fraction of labels to flip (default 7%)
        
    Returns:
        Messages with some labels flipped
    """
    noisy_messages = []
    n_flipped = 0
    
    for text, label in messages:
        if random.random() < noise_ratio:
            # Flip the label
            noisy_messages.append((text, 1 - label))
            n_flipped += 1
        else:
            noisy_messages.append((text, label))
    
    print(f"  Label noise applied: {n_flipped} labels flipped ({noise_ratio*100:.1f}%)")
    return noisy_messages


def train_model():
    """
    Train the text-based scam detection model with realistic settings.
    
    Improvements over basic training:
    1. Class imbalance (90% legit, 10% scam)
    2. Label noise (7%)
    3. Hard negatives 
    4. Cross-validation
    """
    
    print("=" * 60)
    print("SHIELD ML - Text Scam Detection Training (Realistic)")
    print("=" * 60)
    
    # Generate synthetic data with CLASS IMBALANCE
    # Real-world: Most messages are legitimate (90%+)
    print("\n[1/6] Generating synthetic training data...")
    print("  Creating class-imbalanced dataset (90% legit, 10% scam)...")
    
    scam_messages = generate_synthetic_scam_messages(200)    # 10%
    legit_messages = generate_synthetic_legit_messages(1800)  # 90%
    
    print(f"  Scam messages: {len(scam_messages)} (including {int(len(scam_messages)*0.3)} subtle)")
    print(f"  Legitimate messages: {len(legit_messages)} (including {int(len(legit_messages)*0.25)} hard negatives)")
    
    # Combine and add label noise
    all_messages = scam_messages + legit_messages
    print("\n[2/6] Adding label noise (simulating annotation errors)...")
    all_messages = add_label_noise(all_messages, noise_ratio=0.07)
    
    random.shuffle(all_messages)
    
    texts = [msg for msg, label in all_messages]
    labels = [label for msg, label in all_messages]
    
    print(f"\n  Total samples: {len(texts)}")
    print(f"  Final scam count: {sum(labels)}")
    print(f"  Final legitimate count: {len(labels) - sum(labels)}")
    print(f"  Class ratio: {sum(labels)/len(labels)*100:.1f}% scam")
    
    # Train/test split
    X_train, X_test, y_train, y_test = train_test_split(
        texts, labels, test_size=0.2, random_state=42, stratify=labels
    )
    
    # TF-IDF Vectorization
    print("\n[3/6] Creating TF-IDF features...")
    vectorizer = TfidfVectorizer(
        lowercase=True,
        max_features=3000,         # Limit vocabulary
        ngram_range=(1, 2),        # Unigrams and bigrams
        min_df=3,                  # Ignore rare terms
        max_df=0.90,               # Ignore very common terms
        sublinear_tf=True,
    )
    
    X_train_tfidf = vectorizer.fit_transform(X_train)
    X_test_tfidf = vectorizer.transform(X_test)
    
    print(f"  Vocabulary size: {len(vectorizer.vocabulary_)}")
    print(f"  Feature matrix shape: {X_train_tfidf.shape}")
    
    # Train Logistic Regression with balanced class weights
    print("\n[4/6] Training Logistic Regression (class_weight=balanced)...")
    model = LogisticRegression(
        C=0.5,                     # Stronger regularization
        class_weight='balanced',   # Handle imbalanced data
        max_iter=1000,
        random_state=42,
        solver='liblinear'
    )
    model.fit(X_train_tfidf, y_train)
    
    # Cross-validation
    print("\n[5/6] Cross-validation evaluation (5-fold)...")
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    
    # Need to vectorize all data for CV
    X_all_tfidf = vectorizer.transform(texts)
    
    cv_precision = cross_val_score(model, X_all_tfidf, labels, cv=cv, scoring='precision')
    cv_recall = cross_val_score(model, X_all_tfidf, labels, cv=cv, scoring='recall')
    cv_f1 = cross_val_score(model, X_all_tfidf, labels, cv=cv, scoring='f1')
    
    print("\n" + "=" * 40)
    print("CROSS-VALIDATION RESULTS (5-fold)")
    print("=" * 40)
    print(f"  Precision: {cv_precision.mean():.4f} (+/- {cv_precision.std()*2:.4f})")
    print(f"  Recall:    {cv_recall.mean():.4f} (+/- {cv_recall.std()*2:.4f})")
    print(f"  F1-Score:  {cv_f1.mean():.4f} (+/- {cv_f1.std()*2:.4f})")
    
    # Test set evaluation
    print("\n" + "=" * 40)
    print("TEST SET RESULTS")
    print("=" * 40)
    y_pred = model.predict(X_test_tfidf)
    
    print(classification_report(y_test, y_pred, target_names=['Legitimate', 'Scam']))
    
    # Confusion Matrix
    cm = confusion_matrix(y_test, y_pred)
    print("CONFUSION MATRIX:")
    print(f"  True Negatives (Legit->Legit):   {cm[0][0]:4d}")
    print(f"  False Positives (Legit->Scam):   {cm[0][1]:4d}  <- Type I Error")
    print(f"  False Negatives (Scam->Legit):   {cm[1][0]:4d}  <- Type II Error")
    print(f"  True Positives (Scam->Scam):     {cm[1][1]:4d}")
    
    print("\nKEY METRICS:")
    print(f"  Accuracy:  {accuracy_score(y_test, y_pred):.4f}")
    print(f"  Precision: {precision_score(y_test, y_pred):.4f}")
    print(f"  Recall:    {recall_score(y_test, y_pred):.4f}")
    print(f"  F1-Score:  {f1_score(y_test, y_pred):.4f}")
    
    # Save model and vectorizer
    print("\n[6/6] Saving model artifacts...")
    model_path = os.path.join(MODELS_DIR, 'text_model.pkl')
    vectorizer_path = os.path.join(MODELS_DIR, 'text_vectorizer.pkl')
    
    joblib.dump(model, model_path)
    joblib.dump(vectorizer, vectorizer_path)
    
    print(f"  Model saved: {model_path}")
    print(f"  Vectorizer saved: {vectorizer_path}")
    
    # Show top scam indicator words
    print("\n" + "=" * 40)
    print("TOP SCAM INDICATOR WORDS")
    print("=" * 40)
    feature_names = vectorizer.get_feature_names_out()
    coefs = model.coef_[0]
    top_positive = np.argsort(coefs)[-12:][::-1]
    for idx in top_positive:
        print(f"  {feature_names[idx]}: {coefs[idx]:.4f}")
    
    print("\n[OK] Training complete!")
    print("\nNOTE: Lower accuracy is expected and realistic!")
    print("      Model now handles edge cases and noisy labels.")
    
    return model, vectorizer


if __name__ == "__main__":
    train_model()
