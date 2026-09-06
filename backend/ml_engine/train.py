"""
Hybrid Scam Engine ML model: TF-IDF + Logistic Regression on the synthetic dataset.

Trains on scripts/data/synthetic_scams.csv, exports joblib artifacts to
backend/ml_engine/models/. Sub-millisecond inference after load.

Run: python -m ml_engine.train   (from backend/)
"""

import os
import sys
import time
from pathlib import Path

import joblib
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, f1_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline

HERE = Path(__file__).parent
DATA = HERE.parent / "scripts" / "data" / "synthetic_scams.csv"
MODELS_DIR = HERE / "models"
MODEL_PATH = MODELS_DIR / "hybrid_text_model.joblib"

# label -> ordinal risk (used only for reporting; classifier is multiclass)
LABELS = ["safe", "suspicious", "high_risk"]


def build_pipeline() -> Pipeline:
    return Pipeline([
        ("tfidf", TfidfVectorizer(
            ngram_range=(1, 2), max_features=20000, sublinear_tf=True,
            min_df=2, strip_accents="unicode",
        )),
        # ponytail: LR over RF — calibrated probabilities, 100x faster inference
        ("clf", LogisticRegression(max_iter=2000, class_weight="balanced", C=2.0)),
    ])


def main():
    if not DATA.exists():
        sys.exit(f"dataset missing: {DATA}\nrun: python scripts/generate_synthetic_scams.py")

    df = pd.read_csv(DATA)
    X_train, X_test, y_train, y_test = train_test_split(
        df["text"], df["label"], test_size=0.2, stratify=df["label"], random_state=42,
    )

    pipe = build_pipeline()
    t0 = time.perf_counter()
    pipe.fit(X_train, y_train)
    train_s = time.perf_counter() - t0

    preds = pipe.predict(X_test)
    print(classification_report(y_test, preds, digits=3))
    print(f"macro-F1: {f1_score(y_test, preds, average='macro'):.3f} | train: {train_s:.1f}s")

    # inference latency check
    t0 = time.perf_counter()
    for _ in range(100):
        pipe.predict(["Your KYC has expired, update immediately at http://sbi-kyc.top"])
    print(f"inference: {(time.perf_counter() - t0) * 10:.2f}ms/call avg")

    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump({"pipeline": pipe, "labels": LABELS}, MODEL_PATH)
    print(f"[OK] model -> {MODEL_PATH}")


if __name__ == "__main__":
    main()
