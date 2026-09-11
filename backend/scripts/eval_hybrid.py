"""
Hybrid pipeline evaluation: ML-only (Stage 1 + policy) vs ML+LLM+Policy.

Modes:
  --mode ml       : analyze_message (Groq-free fallback path)
  --mode hybrid   : analyze_message_hybrid (live Groq calls)
  --sample N      : stratified sample for hybrid mode (default 300; ml mode runs full split)
  --out FILE      : write metrics JSON (appends to results dict keyed by mode)

Dataset: scripts/data/synthetic_scams_v2.csv, test split (frame-level split,
phrasings unseen in training). Ground truth: label != 'safe' -> scam.

Run from backend/: python scripts/eval_hybrid.py --mode ml
"""

import argparse
import asyncio
import json
import sys
import time
from pathlib import Path

import numpy as np
import pandas as pd

HERE = Path(__file__).parent.parent
sys.path.insert(0, str(HERE))

from app.scam_engine import analyze_message, analyze_message_hybrid  # noqa: E402

DATA = HERE / "scripts" / "data" / "synthetic_scams_v2.csv"
# Held-out semantic families (test-only in the generator) — the LLM's target
# class. Hybrid evaluation always includes every one of these test rows.
TEST_ONLY_FAMILIES = ["family_emergency", "wrong_number"]


def stratified_sample(df: pd.DataFrame, n: int, seed: int = 42) -> pd.DataFrame:
    """Stratify jointly by label x language x adversarial so subgroups stay
    measurable. ALL test-only-family rows are force-included (the semantic
    class under study), the rest fill the remaining budget stratified."""
    df = df.copy()
    semantic = df[df["family"].isin(TEST_ONLY_FAMILIES)]
    rest = df[~df["family"].isin(TEST_ONLY_FAMILIES)].copy()
    budget = max(0, n - len(semantic))
    rest["stratum"] = rest["label"] + "|" + rest["language"] + "|" + rest["is_adversarial"].astype(str)
    sampled = rest.groupby("stratum", group_keys=False).apply(
        lambda g: g.sample(max(1, int(round(budget * len(g) / len(rest)))), random_state=seed)
    )
    out = pd.concat([semantic, sampled]).sample(frac=1, random_state=seed)
    return out


def to_y_true(labels) -> np.ndarray:
    return (labels != "safe").astype(int).values


def run_ml(texts):
    out, lat = [], []
    for t in texts:
        t0 = time.perf_counter()
        r = analyze_message(t)
        lat.append(time.perf_counter() - t0)
        out.append((r["final_decision"]["risk_score"], r["final_decision"]["risk"]))
    return out, {"ml_s": float(np.mean(lat)), "llm_s": 0.0, "total_s": float(np.mean(lat))}


def run_hybrid(texts):
    out, tot_lat, llm_used, llm_lat = [], [], [], []
    loop = asyncio.new_event_loop()
    try:
        for t in texts:
            t0 = time.perf_counter()
            r = loop.run_until_complete(analyze_message_hybrid(t))
            if r["llm_stage"] == "skipped":
                # rate-limit backoff: wait and retry this row once so quota
                # windows don't silently degrade the measurement
                time.sleep(20)
                r = loop.run_until_complete(analyze_message_hybrid(t))
            tot = time.perf_counter() - t0
            used = r["llm_stage"] == "used"
            out.append((r["final_decision"]["risk_score"], r["final_decision"]["risk"], used))
            llm_used.append(used)
            if used:
                llm_lat.append(tot)
            tot_lat.append(tot)
            time.sleep(1.2)  # stay under Groq free-tier RPM
    finally:
        loop.close()
    lat = {"total_s": float(np.mean(tot_lat)),
           "llm_used_frac": float(np.mean(llm_used))}
    if llm_lat:
        lat["llm_call_s"] = float(np.mean(llm_lat))
    return out, lat


def metrics(y_true, scores, risks, df_sub):
    pred = (np.array(scores) >= 30).astype(int)  # SUSPICIOUS or worse = scam call
    y = np.asarray(y_true)
    tp = int(((pred == 1) & (y == 1)).sum()); fp = int(((pred == 1) & (y == 0)).sum())
    fn = int(((pred == 0) & (y == 1)).sum()); tn = int(((pred == 0) & (y == 0)).sum())
    prec = tp / (tp + fp) if tp + fp else 0.0
    rec = tp / (tp + fn) if tp + fn else 0.0
    m = {
        "n": int(len(y)),
        "accuracy": (tp + tn) / max(1, len(y)),
        "precision": prec, "recall": rec,
        "f1": 2 * prec * rec / (prec + rec) if prec + rec else 0.0,
        "specificity": tn / (tn + fp) if tn + fp else 0.0,
        "fpr": fp / (fp + tn) if fp + tn else 0.0,
        "fnr": fn / (fn + tp) if fn + tp else 0.0,
        "balanced_accuracy": rec / 2 + (tn / (tn + fp) if tn + fp else 0.0) / 2,
        "confusion": {"tn": tn, "fp": fp, "fn": fn, "tp": tp},
    }
    try:
        from sklearn.metrics import average_precision_score, roc_auc_score
        m["pr_auc"] = float(average_precision_score(y, scores))
        m["roc_auc"] = float(roc_auc_score(y, scores))
    except Exception:
        m["pr_auc"] = m["roc_auc"] = None
    # Subgroups
    adv = (df_sub["is_adversarial"] == 1).values & (y == 1)
    hn = (df_sub["is_hard_negative"] == 1).values & (y == 0)
    ood = df_sub["language"].isin(["hinglish", "hindi"]).values
    m["adversarial_recall"] = float(pred[adv].mean()) if adv.any() else None
    m["hard_negative_fpr"] = float(pred[hn].mean()) if hn.any() else None
    m["ood_scam_recall"] = float(pred[ood & (y == 1)].mean()) if (ood & (y == 1)).any() else None
    m["ood_legit_fpr"] = float(pred[ood & (y == 0)].mean()) if (ood & (y == 0)).any() else None
    return m


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--mode", choices=["ml", "hybrid"], required=True)
    ap.add_argument("--sample", type=int, default=300)
    ap.add_argument("--out", default="scripts/data/hybrid_eval_results.json")
    args = ap.parse_args()

    from dotenv import load_dotenv
    load_dotenv(HERE / ".env", override=True)  # .env wins over stale shell env

    df = pd.read_csv(DATA)
    test = df[df["split"] == "test"].reset_index(drop=True)
    # --sample applies to both modes so ML and hybrid run the IDENTICAL rows
    # (paired comparison). ml without --sample runs the full split.
    if args.sample > 0:
        test = stratified_sample(test, args.sample).reset_index(drop=True)
    key = args.mode if (args.mode == "ml" and args.sample == 0) else f"{args.mode}_s{args.sample}"

    texts = test["text"].tolist()
    y_true = to_y_true(test["label"])
    print(f"[{args.mode}] evaluating n={len(texts)} ...")

    if args.mode == "ml":
        results, lat = run_ml(texts)
    else:
        results, lat = run_hybrid(texts)
    scores = [r[0] for r in results]
    risks = [r[1] for r in results]

    m = metrics(y_true, scores, risks, test)
    m["latency"] = lat
    # Per-row dump for paired analysis (which rows the LLM changed and how)
    rows_path = HERE / f"scripts/data/hybrid_eval_rows_{key}.csv"
    pd.DataFrame({
        "text": texts, "label": test["label"].values, "language": test["language"].values,
        "family": test["family"].values,
        "is_adversarial": test["is_adversarial"].values, "is_hard_negative": test["is_hard_negative"].values,
        "pred_score": scores, "pred_risk": risks,
        "llm_used": [r[2] for r in results] if args.mode == "hybrid" else [False] * len(results),
    }).to_csv(rows_path, index=False)
    print(f"rows -> {rows_path}")
    print(json.dumps(m, indent=2, default=str))

    out_path = HERE / args.out
    all_results = json.loads(out_path.read_text()) if out_path.exists() else {}
    all_results[key] = m
    out_path.write_text(json.dumps(all_results, indent=2, default=str))
    print(f"saved -> {out_path}")


if __name__ == "__main__":
    main()
