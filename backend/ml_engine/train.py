"""
Hybrid Scam Engine ML model: TF-IDF + Logistic Regression — v2 training/eval.

Changes vs v1:
- Trains on scripts/data/synthetic_scams_v2.csv (19.4k rows; frame-level
  split assigned at generation time — test phrasings never appear in train).
- Binary "scam" view (label != safe) for precision/recall/FPR/FNR, ROC-AUC,
  PR-AUC, plus threshold search on validation.
- Subgroup breakdown (language, category, hard negatives, adversarial).
- Compares against the previous model artifact on the same test split.
- Fails (no artifact written) if validation binary F1 or scam recall
  miss the gates (see LABELS comment for why macro-F1 is not gated).

Architecture unchanged: TF-IDF + LogReg, 3-class labels, same joblib format.

Run: python -m ml_engine.train   (from backend/)
"""

import sys
import time
from pathlib import Path

import joblib
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    average_precision_score, balanced_accuracy_score, classification_report,
    confusion_matrix, f1_score, precision_recall_fscore_support, roc_auc_score,
)
from sklearn.pipeline import Pipeline

HERE = Path(__file__).parent
DATA = HERE.parent / "scripts" / "data" / "synthetic_scams_v2.csv"
MODELS_DIR = HERE / "models"
MODEL_PATH = MODELS_DIR / "hybrid_text_model.joblib"

LABELS = ["safe", "suspicious", "high_risk"]  # repo convention: scam = suspicious ∪ high_risk
# Gates (binary scam view). The 3-class macro-F1 is NOT gated: the
# suspicious-vs-high_risk boundary is a labeling convention ("pressure but no
# hard attack"), not a textual distinction — LR cannot separate it from these
# frames and no feature config fixes it (verified). Production only consumes
# the class via ML_SCORE_WEIGHTS {safe:5, suspicious:60, high_risk:90}, where
# confusing suspicious↔high_risk is a ±30-point score shift on the scam side
# (conservative direction), never a safe↔scam flip.
MIN_BINARY_F1 = 0.90
SCAM_RECALL_FLOOR = 0.85


def build_pipeline() -> Pipeline:
    return Pipeline([
        ("tfidf", TfidfVectorizer(
            ngram_range=(1, 2), max_features=20000, sublinear_tf=True,
            min_df=2, strip_accents="unicode",
        )),
        # ponytail: LR over RF — calibrated probabilities, 100x faster inference
        ("clf", LogisticRegression(max_iter=2000, class_weight="balanced", C=2.0)),
    ])


def binary_metrics(y_true, p_scam, threshold=0.5):
    """Binary scam view. y_true/p_scam are 1=scam, 0=safe; p_scam is proba."""
    pred = (p_scam >= threshold).astype(int)
    tp = int(((pred == 1) & (y_true == 1)).sum())
    fp = int(((pred == 1) & (y_true == 0)).sum())
    fn = int(((pred == 0) & (y_true == 1)).sum())
    tn = int(((pred == 0) & (y_true == 0)).sum())
    prec = tp / (tp + fp) if tp + fp else 0.0
    rec = tp / (tp + fn) if tp + fn else 0.0
    spec = tn / (tn + fp) if tn + fp else 0.0
    f1 = 2 * prec * rec / (prec + rec) if prec + rec else 0.0
    return {
        "accuracy": (tp + tn) / max(1, len(y_true)),
        "precision": prec, "recall": rec, "f1": f1, "specificity": spec,
        "fpr": fp / (fp + tn) if fp + tn else 0.0,
        "fnr": fn / (fn + tp) if fn + tp else 0.0,
        "balanced_acc": balanced_accuracy_score(y_true, pred),
        "cm": [[tn, fp], [fn, tp]],
    }


def print_metrics(name, m, roc=None, pr=None):
    print(f"\n--- {name} ---")
    print(f"accuracy={m['accuracy']:.3f} precision={m['precision']:.3f} recall={m['recall']:.3f} "
          f"f1={m['f1']:.3f} specificity={m['specificity']:.3f} balanced_acc={m['balanced_acc']:.3f}")
    print(f"FPR={m['fpr']:.3f} FNR={m['fnr']:.3f}  confusion [[TN FP],[FN TP]]={m['cm']}")
    if roc is not None:
        print(f"ROC-AUC={roc:.3f} PR-AUC={pr:.3f}")


def scam_proba(pipe, texts):
    """P(scam) = 1 - P(safe). Works for any sklearn classifier with predict_proba."""
    import numpy as np
    proba = pipe.predict_proba(texts)
    classes = list(pipe.classes_)
    return 1.0 - proba[:, classes.index("safe")]


def evaluate_subgroups(df, pipe):
    print("\n=== SUBGROUP PERFORMANCE (binary scam, threshold 0.5) ===")
    def row(name, sub):
        if len(sub) < 20:
            return f"  {name:28s} n={len(sub):<5} (too small)"
        y = (sub["label"] != "safe").astype(int).values
        p = scam_proba(pipe, sub["text"])
        m = binary_metrics(y, p)
        return f"  {name:28s} n={len(sub):<5} recall={m['recall']:.3f} precision={m['precision']:.3f} fpr={m['fpr']:.3f}"
    for lang in ("english", "hinglish", "hindi"):
        print(row(f"lang={lang}", df[df["language"] == lang]))
    print(row("hard negatives (legit)", df[(df["is_hard_negative"] == 1)]))
    print(row("adversarial (scam)", df[(df["is_adversarial"] == 1) & (df["label"] != "safe")]))
    print(row("URL-containing", df[df["text"].str.contains(r"https?://|hxxps?://|www\.", case=False, regex=True)]))
    for cat, sub in df[df["label"] != "safe"].groupby("category"):
        if len(sub) >= 50:
            print(row(f"scam:{cat}", sub))


def threshold_search(y_val, p_val):
    print("\n=== THRESHOLD SEARCH (validation set, binary scam) ===")
    print(f"{'thr':>5} {'prec':>6} {'rec':>6} {'f1':>6} {'spec':>6} {'fpr':>6} {'fnr':>6}")
    results = {}
    for t in [0.10, 0.15, 0.20, 0.25, 0.30, 0.35, 0.40, 0.45, 0.50, 0.55, 0.60, 0.65, 0.70]:
        m = binary_metrics(y_val, p_val, t)
        results[t] = m
        print(f"{t:>5.2f} {m['precision']:>6.3f} {m['recall']:>6.3f} {m['f1']:>6.3f} "
              f"{m['specificity']:>6.3f} {m['fpr']:>6.3f} {m['fnr']:>6.3f}")
    best_f1 = max(results, key=lambda t: results[t]["f1"])
    # recall-oriented: lowest threshold with recall >= 0.98
    recall_or = [t for t in results if results[t]["recall"] >= 0.98]
    best_recall = min(recall_or) if recall_or else min(results)
    # balanced: max(recall + specificity) / 2 == balanced accuracy
    best_bal = max(results, key=lambda t: results[t]["balanced_acc"])
    print(f"\nbest F1 threshold:        {best_f1:.2f} (f1={results[best_f1]['f1']:.3f})")
    print(f"best recall threshold:    {best_recall:.2f} (recall={results[best_recall]['recall']:.3f}, fpr={results[best_recall]['fpr']:.3f})")
    print(f"best balanced threshold:  {best_bal:.2f} (balanced_acc={results[best_bal]['balanced_acc']:.3f})")
    return results, best_f1, best_recall, best_bal


def main():
    if not DATA.exists():
        sys.exit(f"dataset missing: {DATA}\nrun: python scripts/generate_dataset_v2.py")
    df = pd.read_csv(DATA)
    for split in ("train", "val", "test"):
        if split not in set(df["split"]):
            sys.exit(f"split '{split}' missing from dataset")

    tr = df[df["split"] == "train"].reset_index(drop=True)
    va = df[df["split"] == "val"].reset_index(drop=True)
    te = df[df["split"] == "test"].reset_index(drop=True)
    print(f"train={len(tr)} val={len(va)} test={len(te)} (frame-level split: test uses phrasings never seen in train)")

    pipe = build_pipeline()
    t0 = time.perf_counter()
    pipe.fit(tr["text"], tr["label"])
    train_s = time.perf_counter() - t0

    # 3-class report on val (production path uses argmax predict())
    print("\n=== 3-CLASS (validation) ===")
    print(classification_report(va["label"], pipe.predict(va["text"]), digits=3))

    # binary scam view
    y_val = (va["label"] != "safe").astype(int).values
    y_test = (te["label"] != "safe").astype(int).values
    p_val = scam_proba(pipe, va["text"])
    p_test = scam_proba(pipe, te["text"])

    m_val = binary_metrics(y_val, p_val)
    roc_val = roc_auc_score(y_val, p_val)
    pr_val = average_precision_score(y_val, p_val)
    print_metrics("VALIDATION (binary scam)", m_val, roc_val, pr_val)

    m_test = binary_metrics(y_test, p_test)
    roc_test = roc_auc_score(y_test, p_test)
    pr_test = average_precision_score(y_test, p_test)
    print_metrics("TEST — untouched (binary scam)", m_test, roc_test, pr_test)

    adv = te[(te["is_adversarial"] == 1) & (te["label"] != "safe")]
    m_adv = binary_metrics((adv["label"] != "safe").astype(int).values, scam_proba(pipe, adv["text"]))
    print_metrics("TEST adversarial subset (scam only, recall)", m_adv)

    hard = te[te["is_hard_negative"] == 1]
    m_hard = binary_metrics((hard["label"] != "safe").astype(int).values, scam_proba(pipe, hard["text"]))
    print_metrics("TEST hard negatives (legit only, FPR)", m_hard)

    evaluate_subgroups(te, pipe)
    threshold_search(y_val, p_val)

    # ── compare with the CURRENT model (the committed/old artifact) ──
    old_path = MODELS_DIR / "hybrid_text_model_old.joblib"
    old = None
    for path in (MODEL_PATH, old_path):
        if path.exists():
            try:
                cand = joblib.load(path)
                if "v2" not in cand.get("trained_on", ""):  # self-comparison guard
                    old = cand
                    break
            except Exception:
                pass
    print("\n=== CURRENT MODEL vs NEW MODEL (same v2 test set, binary scam) ===")
    print(f"{'metric':<14}{'current':>10}{'new':>10}{'change':>10}")
    rows = {}
    if old is not None:
        po = scam_proba(old["pipeline"], te["text"])
        mo = binary_metrics(y_test, po)
        for k in ("accuracy", "precision", "recall", "f1", "specificity", "fpr", "fnr", "balanced_acc"):
            rows[k] = (mo[k], m_test[k])
            print(f"{k:<14}{mo[k]:>10.3f}{m_test[k]:>10.3f}{m_test[k] - mo[k]:>+10.3f}")
        try:
            roc_o = roc_auc_score(y_test, po)
            pr_o = average_precision_score(y_test, po)
            print(f"{'roc_auc':<14}{roc_o:>10.3f}{roc_test:>10.3f}{roc_test - roc_o:>+10.3f}")
            print(f"{'pr_auc':<14}{pr_o:>10.3f}{pr_test:>10.3f}{pr_test - pr_o:>+10.3f}")
        except Exception:
            pass
    else:
        print("  (no prior artifact found — first v2 train)")

    # ── quality gates (binary scam view — see LABELS comment) ──
    macro_f1 = f1_score(va["label"], pipe.predict(va["text"]), average="macro")
    if m_val["f1"] < MIN_BINARY_F1:
        sys.exit(f"ABORT: validation binary scam F1 {m_val['f1']:.3f} < {MIN_BINARY_F1} — model NOT written")
    if m_val["recall"] < SCAM_RECALL_FLOOR:
        sys.exit(f"ABORT: validation scam recall {m_val['recall']:.3f} < {SCAM_RECALL_FLOOR} — model NOT written")

    # inference latency check
    t0 = time.perf_counter()
    for _ in range(100):
        pipe.predict(["Your KYC has expired, update immediately at http://sbi-kyc.top"])
    print(f"\nmacro-F1(val)={macro_f1:.3f} | scam recall(val)={m_val['recall']:.3f} | train: {train_s:.1f}s "
          f"| inference: {(time.perf_counter() - t0) * 10:.2f}ms/call")

    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump({"pipeline": pipe, "labels": LABELS, "trained_on": str(DATA)}, MODEL_PATH)
    print(f"[OK] model -> {MODEL_PATH}")
    print("[NOTE] production threshold (argmax) unchanged; see threshold search above before changing it.")


if __name__ == "__main__":
    main()
