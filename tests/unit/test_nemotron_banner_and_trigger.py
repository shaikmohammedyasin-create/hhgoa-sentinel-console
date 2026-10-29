"""Unit tests for Nemotron tab banner logic and trigger amount extraction contract."""
from __future__ import annotations

import json
import re
from pathlib import Path
import pytest

ROOT = Path(__file__).resolve().parent.parent.parent
CASES_DIR = ROOT / "cases"

TRIGGER_AMOUNT_PATTERN = re.compile(r"\$([\d,]+(?:\.\d+)?)")


def extract_trigger_amount(text: str | None) -> str | None:
    if not text:
        return None
    m = TRIGGER_AMOUNT_PATTERN.search(text)
    return m.group(0) if m else None


def get_nemotron_banner_state(nemotron: dict | None) -> str:
    if not nemotron:
        return "No valid model proposal"
    proposal = nemotron.get("model_proposal")
    policy = nemotron.get("policy_decision")
    if not proposal or not proposal.get("pattern"):
        return "No valid model proposal"
    proposal_pattern = str(proposal.get("pattern", "")).strip().lower()
    policy_pattern = str(policy.get("pattern", "")).strip().lower() if policy else ""
    if policy_pattern and proposal_pattern == policy_pattern:
        return "Policy agreed"
    return "Overruled"


def test_trigger_amount_extracted_for_all_benchmark_cases():
    """Verify that every single benchmark case (CASE-001 through CASE-020) has an extractable trigger amount."""
    case_files = sorted(CASES_DIR.glob("CASE-*.json"))
    assert len(case_files) == 20, f"Expected 20 cases, found {len(case_files)}"

    for case_file in case_files:
        data = json.loads(case_file.read_text(encoding="utf-8"))
        case_id = data["case_id"]

        # 1. Trigger evidence in case.evidence
        evidence_items = data.get("case", {}).get("evidence", [])
        trig_ev = next(
            (e for e in evidence_items if "trigger" in e.get("ref", "") or e.get("claim", "").lower().startswith("trigger")),
            None,
        )
        assert trig_ev is not None, f"{case_id} is missing trigger evidence"
        claim = trig_ev.get("claim", "")
        amount = extract_trigger_amount(claim)
        assert amount is not None, f"{case_id} trigger claim '{claim}' yielded no dollar amount"
        assert amount.startswith("$"), f"{case_id} amount '{amount}' does not start with $"


def test_nemotron_banner_states_across_all_benchmark_cases():
    """Verify the 3 distinct states of the Nemotron tab banner across all 20 benchmark cases:
    1. 'Policy agreed' when valid proposal exists and proposal.pattern == policy.pattern
    2. 'Overruled' only when proposal exists and proposal.pattern != policy.pattern
    3. 'No valid model proposal' only when proposal is missing/null
    """
    case_files = sorted(CASES_DIR.glob("CASE-*.json"))

    expected_agreed = {"CASE-006", "CASE-008", "CASE-010", "CASE-017"}
    expected_overruled = {"CASE-001", "CASE-002", "CASE-003", "CASE-014"}
    expected_no_proposal = {
        "CASE-004", "CASE-005", "CASE-007", "CASE-009", "CASE-011", "CASE-012",
        "CASE-013", "CASE-015", "CASE-016", "CASE-018", "CASE-019", "CASE-020",
    }

    actual_agreed = set()
    actual_overruled = set()
    actual_no_proposal = set()

    for case_file in case_files:
        data = json.loads(case_file.read_text(encoding="utf-8"))
        case_id = data["case_id"]
        nemotron = data.get("nemotron")
        state = get_nemotron_banner_state(nemotron)

        if state == "Policy agreed":
            actual_agreed.add(case_id)
        elif state == "Overruled":
            actual_overruled.add(case_id)
        elif state == "No valid model proposal":
            actual_no_proposal.add(case_id)
        else:
            pytest.fail(f"Unexpected banner state: {state}")

    assert actual_agreed == expected_agreed, f"Policy agreed mismatch: {actual_agreed} != {expected_agreed}"
    assert actual_overruled == expected_overruled, f"Overruled mismatch: {actual_overruled} != {expected_overruled}"
    assert actual_no_proposal == expected_no_proposal, f"No proposal mismatch: {actual_no_proposal} != {expected_no_proposal}"


def test_nemotron_banner_synthetic_edge_cases():
    """Test banner logic under various edge-case payloads."""
    # 1. Missing nemotron block
    assert get_nemotron_banner_state(None) == "No valid model proposal"
    assert get_nemotron_banner_state({}) == "No valid model proposal"

    # 2. Proposal with None or empty pattern
    assert get_nemotron_banner_state({"model_proposal": None, "policy_decision": {"pattern": "fraud"}}) == "No valid model proposal"
    assert get_nemotron_banner_state({"model_proposal": {"pattern": None}, "policy_decision": {"pattern": "fraud"}}) == "No valid model proposal"
    assert get_nemotron_banner_state({"model_proposal": {"pattern": ""}, "policy_decision": {"pattern": "fraud"}}) == "No valid model proposal"

    # 3. Agreement (case-insensitive and whitespace-insensitive)
    assert get_nemotron_banner_state({
        "model_proposal": {"pattern": "card_testing"},
        "policy_decision": {"pattern": "card_testing"},
    }) == "Policy agreed"

    assert get_nemotron_banner_state({
        "model_proposal": {"pattern": "Card_Testing "},
        "policy_decision": {"pattern": " card_testing"},
    }) == "Policy agreed"

    # 4. Disagreement (overruled)
    assert get_nemotron_banner_state({
        "model_proposal": {"pattern": "card_testing"},
        "policy_decision": {"pattern": "none"},
    }) == "Overruled"

    assert get_nemotron_banner_state({
        "model_proposal": {"pattern": "card_testing"},
        "policy_decision": {"pattern": "undocumented"},
    }) == "Overruled"
