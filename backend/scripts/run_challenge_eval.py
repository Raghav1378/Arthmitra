import json
from pathlib import Path
import sys
import pandas as pd
import numpy as np
from sklearn.metrics import precision_recall_fscore_support

HERE = Path(__file__).parent.parent
sys.path.insert(0, str(HERE))

from app.scam_engine import analyze_message

DATA = HERE / "scripts" / "data" / "challenge_set.csv"

def run_evaluation():
    if not DATA.exists():
        print(f"Dataset not found at {DATA}")
        return
    df = pd.read_csv(DATA)
    y_true = (df["label"] != "safe").astype(int).values

    results = []
    for _, row in df.iterrows():
        res = analyze_message(row["text"])
        is_scam = res["final_decision"]["risk"] in ("SUSPICIOUS", "HIGH_RISK")
        results.append({
            "category": row["category"],
            "y_true": (row["label"] != "safe"),
            "y_pred": is_scam,
            "risk": res["final_decision"]["risk"],
            "score": res["final_decision"]["risk_score"]
        })

    res_df = pd.DataFrame(results)

    print("| Category | Samples | Precision | Recall | F1 |")
    print("| -------- | ------: | --------: | -----: | -: |")

    for cat in df["category"].unique():
        cat_df = res_df[res_df["category"] == cat]
        p, r, f, _ = precision_recall_fscore_support(cat_df["y_true"], cat_df["y_pred"], average="binary", zero_division=0)
        print(f"| {cat.replace('_', ' ').title()} | {len(cat_df)} | {p:.2f} | {r:.2f} | {f:.2f} |")

if __name__ == "__main__":
    run_evaluation()
