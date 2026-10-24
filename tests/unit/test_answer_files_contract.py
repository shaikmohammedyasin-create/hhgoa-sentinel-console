"""
Executable guard for D11: every committed answer file must satisfy the contract.

`backend/evaluation/validate_answers.py` is the intended gate but is never
invoked by CI (it needs persisted DB context). These tests cover the parts of
that contract that can be decided from the JSON alone, so a writer change that
breaks the exported shape fails here instead of shipping a mangled demo.
"""
import copy
import json
from pathlib import Path

import pytest

from backend.evaluation.validate_answers import _schema_valid

CASES_DIR = Path(__file__).resolve().parents[2] / "cases"
ANSWER_FILES = sorted(CASES_DIR.glob("CASE-*.json"))
EVIDENCE_SOURCES = {"graph", "document", "customer", "external"}


def check_contract(answer: dict, name: str = "answer") -> None:
    """Assert everything decidable from the JSON alone."""
    assert _schema_valid(answer), f"{name} does not match the exporter schema"

    case = answer["case"]
    assert 0.0 <= case["fraud_probability"] <= 1.0
    assert case["exposure_usd"] >= 0
    for ev in case["evidence"]:
        assert ev["source"] in EVIDENCE_SOURCES, f"{name}: bad source {ev['source']}"
        assert str(ev["ref"]).strip(), f"{name}: evidence without provenance"

    sar = answer["sar"]
    if sar["file"]:
        assert sar["total_amount_usd"] == pytest.approx(case["exposure_usd"], abs=0.01)
        assert 1 <= len(sar["activity_dates"]) <= 2
        assert len(sar["narrative"]) > 100

    # Everything below only applies to files written after the writer fixes
    # (evidence ids exported, single trigger label, classifier tokens counted).
    # The committed pack predates them; see docs/FEEDBACK_NOTES.md.
    exported_ids = {ev["evidence_id"] for ev in case["evidence"] if ev.get("evidence_id")}
    if not exported_ids:
        return

    assert exported_ids == {ev["evidence_id"] for ev in case["evidence"]}
    proposal = (answer.get("nemotron") or {}).get("model_proposal") or {}
    for evidence_id in proposal.get("evidence_ids", []):
        assert evidence_id in exported_ids, f"{name}: dangling evidence id {evidence_id}"
    for ev in case["evidence"]:
        claim = str(ev["claim"])
        assert claim.count("Trigger (") <= 1, f"{name}: doubly labelled trigger claim"
    usage = (answer.get("nemotron") or {}).get("model_usage") or {}
    if usage:
        assert answer["tokens"] > 0, f"{name}: records token usage but publishes tokens: 0"


def test_committed_answer_pack_exists():
    assert ANSWER_FILES, "no committed answer files found under cases/"


@pytest.mark.parametrize("path", ANSWER_FILES, ids=[p.stem for p in ANSWER_FILES])
def test_answer_file_satisfies_contract(path):
    check_contract(json.loads(path.read_text(encoding="utf-8")), path.name)


def _post_fix_answer() -> dict:
    """A minimal answer file shaped like one written after the writer fixes."""
    return {
        "case_id": "CASE-999",
        "case": {
            "status": "closed_fraud", "verdict": "fraud", "fraud_probability": 0.8,
            "pattern": "undocumented", "pattern_description": "x" * 50,
            "affected_txn_ids": ["1"], "first_suspicious_txn_id": "1",
            "connected_card_ids": [], "connected_device_profiles": [],
            "exposure_usd": 100.0,
            "evidence": [{
                "evidence_id": "EV-aaaa0001",
                "claim": "Trigger (risk_score): scored 0.48.",
                "source": "external", "ref": "trigger:risk_score", "entity_ids": ["1"],
            }],
            "similar_prior_cases": [], "summary": "x" * 30,
            "written_to_graph": True, "graph_case_id": "CASE-2026-CASE-999",
        },
        "evidence_requests": [],
        "next_best_actions": {
            "initial": [{"action": "CREATE_CASE", "route": "auto", "reason": "R2"}],
            "final": [{"action": "CREATE_CASE", "route": "auto", "reason": "R2"}],
            "what_changed": "nothing",
        },
        "sar": {
            "file": True, "reason": "R2: confirmed fraud", "narrative": "x" * 120,
            "subjects": ["SC-1"], "total_amount_usd": 100.0,
            "activity_dates": ["2026-09-21", "2026-09-21"],
        },
        "nemotron": {
            "model_proposal": {"pattern": "card_testing", "confidence": 0.85,
                               "evidence_ids": ["EV-aaaa0001"], "rationale": "x"},
            "policy_decision": {}, "model_agreed": False,
            "model_override_reason": "x", "verification_draft": None,
            "model_usage": {"pattern_classifier": {"completion_tokens": 10}},
        },
        "stop_reason": "x", "tool_calls": 6, "tokens": 10, "latency_s": 1.0,
    }


class TestPostFixContract:
    def test_the_post_fix_shape_passes(self):
        check_contract(_post_fix_answer())

    def test_dangling_evidence_id_is_rejected(self):
        answer = _post_fix_answer()
        answer["nemotron"]["model_proposal"]["evidence_ids"] = ["EV-missing"]
        with pytest.raises(AssertionError, match="dangling evidence id"):
            check_contract(answer)

    def test_doubly_labelled_trigger_claim_is_rejected(self):
        answer = _post_fix_answer()
        answer["case"]["evidence"][0]["claim"] = (
            "Trigger (risk_score): Trigger (risk_score): scored 0.48.")
        with pytest.raises(AssertionError, match="doubly labelled"):
            check_contract(answer)

    def test_token_usage_with_zero_total_is_rejected(self):
        answer = _post_fix_answer()
        answer["tokens"] = 0
        with pytest.raises(AssertionError, match="tokens: 0"):
            check_contract(answer)

    def test_sar_total_must_match_exposure(self):
        answer = copy.deepcopy(_post_fix_answer())
        answer["sar"]["total_amount_usd"] = 999.0
        with pytest.raises(AssertionError):
            check_contract(answer)
