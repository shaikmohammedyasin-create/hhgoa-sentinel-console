"""
The committed Nemotron recording must be labelled honestly and never invented.

`cases/_nemotron_cache.json` is a live-run snapshot served by the demo. These
tests pin the three provenance labels and the fact that a missing proposal is
filled from the recording without mutating the graded answer fields.
"""
from __future__ import annotations

import json

import pytest

from backend.config import ROOT
from backend.llm import recorded


@pytest.fixture()
def cache(monkeypatch, tmp_path):
    payload = {
        "recorded_at": "2026-10-25",
        "source": "recorded live run",
        "cases": {
            "CASE-901": {
                "recorded_at": "2026-10-25",
                "pattern_proposal": {"pattern": "card_testing", "confidence": 0.85,
                                     "evidence_ids": ["EV-01"], "rationale": "recorded"},
                "summary": "recorded summary",
                "sar_narrative": "recorded sar",
            }
        },
    }
    path = tmp_path / "_nemotron_cache.json"
    path.write_text(json.dumps(payload), encoding="utf-8")
    monkeypatch.setattr(recorded, "CACHE_PATH", path)
    monkeypatch.setattr(recorded, "_cache", None)
    return payload


def _answer(usage: dict) -> dict:
    return {
        "case_id": "CASE-901",
        "case": {"verdict": "fraud", "pattern": "undocumented", "fraud_probability": 0.8,
                 "exposure_usd": 20.0, "summary": "pack summary", "evidence": []},
        "sar": {"file": True, "narrative": "pack sar"},
        "nemotron": {"model_proposal": None, "policy_decision": {}, "model_agreed": False,
                     "model_override_reason": "", "verification_draft": None,
                     "model_usage": usage},
    }


def test_recorded_cache_is_labelled_cached_live_run(cache):
    out = recorded.annotate(_answer({}), "CASE-901")

    assert out["nemotron"]["served_by"] == "cached live run (2026-10-25)"
    assert out["nemotron"]["recorded_at"] == "2026-10-25"
    # The missing proposal is filled from the recording, the graded fields are not.
    assert out["nemotron"]["model_proposal"]["pattern"] == "card_testing"
    assert out["nemotron"]["model_proposal_cached"] is True
    assert out["case"]["summary"] == "pack summary"
    assert out["sar"]["narrative"] == "pack sar"


def test_usage_without_recording_is_labelled_live(monkeypatch):
    monkeypatch.setattr(recorded, "_cache", {"cases": {}})
    out = recorded.annotate(_answer({"pattern_classifier": {"completion_tokens": 10}}), "CASE-902")
    assert out["nemotron"]["served_by"] == "live"


def test_no_model_text_is_labelled_deterministic_fallback(monkeypatch):
    monkeypatch.setattr(recorded, "_cache", {"cases": {}})
    out = recorded.annotate(_answer({}), "CASE-903")
    assert out["nemotron"]["served_by"] == "deterministic fallback"


def test_committed_cache_covers_all_twenty_cases():
    payload = json.loads((ROOT / "cases" / "_nemotron_cache.json").read_text(encoding="utf-8"))
    assert payload["recorded_at"]
    assert len(payload["cases"]) == 20
    for case_id, entry in payload["cases"].items():
        assert entry["recorded_at"], case_id
        assert entry["pattern_proposal"], f"{case_id} has no recorded proposal"
        assert entry["summary"], f"{case_id} has no recorded narrative"
        if entry.get("sar_filed"):
            assert entry["sar_narrative"], f"{case_id} filed a SAR without a narrative"
