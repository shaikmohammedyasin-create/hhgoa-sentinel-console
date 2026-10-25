"""
Record real Nemotron outputs for the hosted demo, once, with a live key.

Writes `cases/_nemotron_cache.json` — a committed snapshot of the pattern
proposal, narrative and SAR draft for all 20 cases, each labelled with the date
it was recorded. The API serves this file in demo mode so the hosted deployment
can show genuine Nemotron text without a key and without spending credits.

Run (requires NEBIUS_API_KEY):
    python scripts/export_nemotron_cache.py
"""
from __future__ import annotations

import json
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from backend.llm import nebius_client, roles  # noqa: E402

CASES = ROOT / "cases"
OUT = CASES / "_nemotron_cache.json"


def _cards(answer: dict) -> list[dict]:
    evidence = (answer.get("case") or {}).get("evidence") or []
    return [
        {
            "evidence_id": str(ev.get("evidence_id") or f"EV-{i + 1:02d}"),
            "claim": str(ev.get("claim", ""))[:400],
            "source": str(ev.get("source", "")),
            "ref": str(ev.get("ref", "") or ""),
        }
        for i, ev in enumerate(evidence)
    ]


def _facts(answer: dict, case_id: str) -> dict:
    case = answer.get("case") or {}
    return {
        "case_id": case_id,
        "verdict": case.get("verdict"),
        "pattern": case.get("pattern"),
        "fraud_probability": case.get("fraud_probability"),
        "exposure_usd": case.get("exposure_usd"),
    }


def main() -> int:
    if not nebius_client.available():
        print("NEBIUS_API_KEY is not configured; refusing to write a cache of non-live output.")
        return 1

    recorded_at = date.today().isoformat()
    entries: dict[str, dict] = {}
    filled = 0

    for path in sorted(CASES.glob("CASE-*.json")):
        case_id = path.stem
        answer = json.loads(path.read_text(encoding="utf-8"))
        nemotron = answer.get("nemotron") or {}
        usage = dict(nemotron.get("model_usage") or {})

        proposal = nemotron.get("model_proposal")
        summary = str((answer.get("case") or {}).get("summary") or "")
        sar = answer.get("sar") or {}
        sar_narrative = str(sar.get("narrative") or "")
        sar_filed = bool(sar.get("file"))

        cards = _cards(answer)
        facts = _facts(answer, case_id)

        # The classifier occasionally returns prose instead of JSON; retry a few
        # times so the committed cache has a real proposal for every case.
        attempts = 0
        while not proposal and attempts < 6:
            attempts += 1
            # Long evidence lists occasionally push the model into prose instead
            # of the required JSON; narrowing the card set recovers it.
            subset = cards if attempts <= 3 else cards[: (6 if attempts == 4 else 4)]
            live = roles.classify_pattern(subset)
            if live:
                proposal = {
                    "pattern": live["pattern"],
                    "confidence": live["confidence"],
                    "evidence_ids": live["evidence_ids"],
                    "rationale": live["rationale"],
                }
                usage["pattern_classifier"] = live.get("usage") or usage.get("pattern_classifier")
                filled += 1
                print(f"{case_id}: pattern proposal recorded live (attempt {attempts})")
            else:
                print(f"{case_id}: classifier attempt {attempts} produced no valid proposal")

        needs_narrative = (not summary) or (sar_filed and not sar_narrative) or (
            "case_narrative_and_sar_draft" not in usage)
        nar_attempts = 0
        while needs_narrative and nar_attempts < 2:
            nar_attempts += 1
            live_nar = roles.narrative_and_sar(facts, cards)
            if live_nar:
                summary = live_nar.get("summary") or summary
                sar_narrative = live_nar.get("sar_narrative") or sar_narrative
                usage["case_narrative_and_sar_draft"] = live_nar.get("usage")
                filled += 1
                needs_narrative = False
                print(f"{case_id}: narrative + SAR recorded live (attempt {nar_attempts})")
        entries[case_id] = {
            "recorded_at": recorded_at,
            "pattern_proposal": proposal,
            "summary": summary,
            "sar_narrative": sar_narrative,
            "sar_filed": sar_filed,
            "usage": usage,
        }

    payload = {
        "recorded_at": recorded_at,
        "source": "recorded live run (Nebius Token Factory / NVIDIA Nemotron)",
        "models": {
            "nano": nebius_client.model_nano(),
            "super": nebius_client.model_super(),
            "ultra": nebius_client.model_ultra(),
        },
        "filled_from_live_call": filled,
        "cases": entries,
    }
    OUT.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"wrote {OUT} ({len(entries)} cases, {filled} filled live) recorded_at={recorded_at}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
