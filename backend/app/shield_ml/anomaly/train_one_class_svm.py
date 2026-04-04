"""
One-Class SVM Training Script for Text Message Anomaly Detection

This script trains a One-Class SVM on LEGITIMATE-ONLY text messages.
The model learns what "normal" message patterns look like and flags outliers.

WHY ONE-CLASS SVM?
- Classic approach for novelty detection
- Works well with TF-IDF features
- Creates a tight boundary around normal data
- Flags points outside boundary as anomalies

HOW IT WORKS:
1. Map TF-IDF features to high-dimensional space using RBF kernel
2. Find a hyperplane that separates normal data from origin
3. New points far from origin (outside boundary) are anomalies

INTEGRATION:
- Use anomaly_score as a SUPPORTING signal (not primary classifier)
- High anomaly score may indicate novel scam patterns
- Combine with supervised predictions for final decision
"""

import os
import sys
import random
import numpy as np
from sklearn.svm import OneClassSVM
from sklearn.feature_extraction.text import TfidfVectorizer
import joblib

# Add parent to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from text_features import preprocess_text

# Ensure models directory exists
MODELS_DIR = os.path.join(os.path.dirname(__file__), 'models')
os.makedirs(MODELS_DIR, exist_ok=True)

# Set seed for reproducibility
np.random.seed(42)
random.seed(42)


def generate_legitimate_messages(n_samples: int = 3000) -> list:
    """
    Generate synthetic LEGITIMATE-ONLY text messages.
    
    The model learns normal message patterns:
    - Bank transaction alerts
    - OTP messages
    - Bill reminders
    - Order confirmations
    """
    
    templates = [
        # Transaction alerts
        "Your {bank} A/c XX{last4} debited by Rs.{amount} on {date}. UPI Ref: {ref}",
        "Rs.{amount} credited to {bank} A/c XX{last4}. Avl Bal: Rs.{balance}",
        "Transaction of Rs.{amount} successful at {merchant}. {bank} Card XX{last4}",
        "{bank} UPI: Rs.{amount} sent to {name}. Ref {ref}",
        "Payment received: Rs.{amount} from {name} via {bank} UPI",
        
        # OTP messages (legitimate)
        "{otp} is OTP for {bank} login. Valid 5 mins. Never share with anyone",
        "OTP for {bank} transaction Rs.{amount} is {otp}. Do not share",
        "{otp} is your {merchant} verification code. Expires in 10 mins",
        "Your {bank} OTP is {otp}. Please do not share this with anyone",
        
        # Bill reminders
        "Your {service} bill of Rs.{amount} is due on {date}. Pay via {bank} App",
        "Reminder: {service} recharge of Rs.{amount} expiring on {date}",
        "EMI of Rs.{amount} for {bank} Loan debited from A/c XX{last4}",
        "{service} bill generated: Rs.{amount}. Due date: {date}",
        
        # Account updates
        "Your {bank} Credit Card statement for {month} is ready. View in app",
        "Fixed Deposit of Rs.{amount} maturing on {date}. Visit {bank} branch",
        "Welcome to {bank}! Your account XX{last4} is now active",
        "{bank} Credit Card payment of Rs.{amount} received. Thank you",
        
        # Order confirmations
        "Your {merchant} order #{ref} has been shipped. Track on app",
        "Order confirmed! {merchant} order #{ref} will arrive by {date}",
        "Delivery successful: {merchant} order #{ref} delivered",
        "{merchant}: Your order #{ref} is out for delivery today",
        
        # Promotional (legitimate)
        "Get {percent}% cashback on {merchant}. Shop via {bank} app. T&C apply",
        "{bank} Credit Card: Earn {points}x reward points on {merchant}",
        "Exclusive: {bank} customers get {percent}% off on {merchant}",
    ]
    
    banks = ['SBI', 'HDFC', 'ICICI', 'Axis', 'PNB', 'Kotak', 'BOB', 'Yes Bank']
    services = ['Electricity', 'Mobile', 'Broadband', 'Gas', 'DTH', 'Insurance']
    merchants = ['Amazon', 'Flipkart', 'Swiggy', 'Zomato', 'BigBasket', 'Myntra']
    names = ['Rahul', 'Priya', 'Amit', 'Sneha', 'Vijay', 'Neha', 'Ravi', 'Anjali']
    months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    
    messages = []
    
    for _ in range(n_samples):
        template = random.choice(templates)
        message = template.format(
            bank=random.choice(banks),
            amount=random.randint(100, 50000),
            balance=random.randint(1000, 500000),
            last4=random.randint(1000, 9999),
            date=f"{random.randint(1,28)}/{random.randint(1,12)}/2024",
            ref=random.randint(100000, 999999),
            service=random.choice(services),
            merchant=random.choice(merchants),
            otp=random.randint(100000, 999999),
            name=random.choice(names),
            month=random.choice(months),
            percent=random.choice([5, 10, 15, 20, 25]),
            points=random.choice([2, 3, 5, 10]),
        )
        messages.append(message)
    
    return messages


def train_model():
    """
    Train One-Class SVM on legitimate text message patterns.
    """
    
    print("=" * 60)
    print("SHIELD ML - One-Class SVM Training (Text Anomaly Detection)")
    print("=" * 60)
    
    # Generate legitimate-only messages
    print("\n[1/5] Generating legitimate message data...")
    messages = generate_legitimate_messages(3000)
    print(f"  Total samples: {len(messages)}")
    print(f"  Sample message: '{messages[0][:60]}...'")
    
    # Preprocess messages
    print("\n[2/5] Preprocessing text...")
    processed = [preprocess_text(msg) for msg in messages]
    
    # Create TF-IDF features (train new vectorizer for anomaly detection)
    print("\n[3/5] Creating TF-IDF features...")
    vectorizer = TfidfVectorizer(
        lowercase=True,
        max_features=2000,
        ngram_range=(1, 2),
        min_df=3,
        max_df=0.95,
        sublinear_tf=True,
    )
    X = vectorizer.fit_transform(processed)
    print(f"  Vocabulary size: {len(vectorizer.vocabulary_)}")
    print(f"  Feature matrix shape: {X.shape}")
    
    # Train One-Class SVM
    print("\n[4/5] Training One-Class SVM (this may take a minute)...")
    model = OneClassSVM(
        kernel='rbf',           # RBF kernel for non-linear boundary
        nu=0.05,                # Expected fraction of outliers (5%)
        gamma='scale',          # Auto-scale gamma
    )
    model.fit(X)
    
    # Evaluate on training data
    print("\n[5/5] Evaluating model...")
    predictions = model.predict(X)
    scores = model.decision_function(X)
    
    n_normal = (predictions == 1).sum()
    n_anomaly = (predictions == -1).sum()
    
    print(f"  Normal predictions: {n_normal} ({n_normal/len(messages)*100:.1f}%)")
    print(f"  Anomaly predictions: {n_anomaly} ({n_anomaly/len(messages)*100:.1f}%)")
    print(f"  Score range: [{scores.min():.4f}, {scores.max():.4f}]")
    print(f"  Score mean: {scores.mean():.4f}")
    
    # Save model and vectorizer
    model_path = os.path.join(MODELS_DIR, 'one_class_svm.pkl')
    vectorizer_path = os.path.join(MODELS_DIR, 'anomaly_vectorizer.pkl')
    
    joblib.dump(model, model_path)
    joblib.dump(vectorizer, vectorizer_path)
    
    print(f"\n[OK] Model saved: {model_path}")
    print(f"[OK] Vectorizer saved: {vectorizer_path}")
    
    # Test with scam-like messages (should be flagged as anomaly)
    print("\n" + "=" * 40)
    print("SANITY CHECK - Testing scam-like messages")
    print("=" * 40)
    
    test_messages = [
        "URGENT: Accept collect request of Rs.1 to get refund of Rs.50000",
        "Congratulations! You won Rs.500000 lottery! Call +919876543210",
        "Your account will be BLOCKED! Update KYC at http://bit.ly/fake",
    ]
    
    for msg in test_messages:
        processed_msg = preprocess_text(msg)
        X_test = vectorizer.transform([processed_msg])
        pred = model.predict(X_test)
        score = model.decision_function(X_test)
        
        status = "ANOMALY" if pred[0] == -1 else "NORMAL"
        print(f"\n  Message: '{msg[:50]}...'")
        print(f"  Prediction: {status}, Raw score: {score[0]:.4f}")
    
    return model, vectorizer


if __name__ == "__main__":
    train_model()
