"""
Compare the 20 committed precomputed answer files against the ground truth
and against the risk-threshold baseline, and write a one-paragraph disclosure
for docs/BENCHMARK.md.

This is the honest "what the precomputed demo shows" number. The real
Nemotron-on-LLM run on the original (non-distributed) dataset scored lower
— see the disclosure block in docs/BENCHMARK.md for those numbers.

Usage:
    python scripts/compare_baselines.py
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GT_PATH = ROOT / "cases" / "ground_truth.json"
SYNTH = ROOT / "data" / "synthetic"
OUT = ROOT / "artifacts" / "compare_baselines.json"

THRESHOLDS = [0.30, 0.35, 0.40, 0.45, 0.50, 0.55, 0.60, 0.65, 0.70, 0.75]


def _read_csv(path: Path) -> list[dict]:
    import csv
    with path.open(newline="", encoding="utf-8") as fh:
        return list(csv.DictReader(fh))


def precomputed_accuracy(gt: dict) -> dict:
    """Verdict and pattern accuracy of the 20 committed answer files."""
    per_case: list[dict] = []
    verdict_hits = 0
    pattern_hits = 0
    for case_id, label in gt.items():
        ans_path = ROOT / "cases" / f"{case_id}.json"
        if not ans_path.exists():
            per_case.append({"case_id": case_id, "available": False})
            continue
        ans = json.loads(ans_path.read_text(encoding="utf-8"))
        case = ans.get("case", {})
        v = case.get("verdict")
        p = case.get("pattern")
        v_ok = v == label.get("verdict")
        p_ok = p == label.get("pattern")
        verdict_hits += v_ok
        pattern_hits += p_ok
        per_case.append({
            "case_id": case_id,
            "available": True,
            "verdict": v,
            "label_verdict": label.get("verdict"),
            "verdict_ok": v_ok,
            "pattern": p,
            "label_pattern": label.get("pattern"),
            "pattern_ok": p_ok,
        })
    n = len(per_case)
    return {
        "n_cases": n,
        "verdict_hits": verdict_hits,
        "pattern_hits": pattern_hits,
        "verdict_accuracy": round(verdict_hits / n, 4) if n else 0.0,
        "pattern_accuracy": round(pattern_hits / n, 4) if n else 0.0,
        "per_case": per_case,
    }


def risk_baseline(case_pack: list[dict], gt: dict) -> dict:
    """Best F1 across the threshold sweep, risk score only."""
    rows = []
    for row in case_pack:
        cid = row["case_id"]
        if cid not in gt or gt[cid].get("verdict") not in {"fraud", "legitimate"}:
            continue
        rows.append((cid, float(row["risk_score"]),
                     1 if gt[cid]["verdict"] == "fraud" else 0))

    def f1(th: float) -> dict:
        tp = sum(1 for _, s, y in rows if s >= th and y == 1)
        fp = sum(1 for _, s, y in rows if s >= th and y == 0)
        fn = sum(1 for _, s, y in rows if s < th and y == 1)
        p = tp / (tp + fp) if (tp + fp) else 0.0
        r = tp / (tp + fn) if (tp + fn) else 0.0
        f = 2 * p * r / (p + r) if (p + r) else 0.0
        return {"threshold": th, "tp": tp, "fp": fp, "fn": fn, "f1": round(f, 4)}

    sweep = [f1(t) for t in THRESHOLDS]
    best = max(sweep, key=lambda s: s["f1"]) if sweep else {"f1": 0.0}
    return {"n": len(rows), "sweep": sweep, "best": best}


def main() -> int:
    gt = json.loads(GT_PATH.read_text(encoding="utf-8"))
    case_pack = _read_csv(SYNTH / "case_pack.csv")

    pre = precomputed_accuracy(gt)
    baseline = risk_baseline(case_pack, gt)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(
        {
            "precomputed_answers": pre,
            "risk_threshold_baseline": baseline,
        },
        indent=2, ensure_ascii=False,
    ), encoding="utf-8")

    print()
    print(f"precomputed answers  verdict {pre['verdict_hits']}/{pre['n_cases']} "
          f"({pre['verdict_accuracy']*100:.0f}%)   pattern "
          f"{pre['pattern_hits']}/{pre['n_cases']} ({pre['pattern_accuracy']*100:.0f}%)")
    b = baseline["best"]
    print(f"risk-only baseline   best F1 {b.get('f1')} at threshold {b.get('threshold')} "
          f"(n={baseline['n']})")
    print(f"\nWrote {OUT}")

    # Emit the exact disclosure paragraph for BENCHMARK.md.
    print(
        "\nBENCHMARK.md disclosure paragraph:\n"
        + f"""
> Precomputed demo answers: verdict accuracy {pre['verdict_hits']}/{pre['n_cases']}
> ({pre['verdict_accuracy']*100:.0f}%) and pattern accuracy
> {pre['pattern_hits']}/{pre['n_cases']} ({pre['pattern_accuracy']*100:.0f}%)
> against the committed `cases/ground_truth.json`.
>
> Live Nemotron-on-LLM run on the original dataset (not redistributed):
> verdict accuracy 60% (12/20) and pattern accuracy 85% (17/20) — the precomputed
> demo answers overstate accuracy because the committed answer files are
> curated to show the full Nemotron advisory block; the live LLM path is
> deliberately shown in `docs/BENCHMARK.md` as the source of the real
> measurement.
"""
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
