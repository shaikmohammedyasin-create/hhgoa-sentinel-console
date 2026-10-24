"""
Deterministic text helpers used by the orchestrator fallbacks.

These guard three answer-file regressions found in review of CASE-009:
a doubly-labelled trigger claim, a device label clipped mid-token, and a
one-day SAR window rendered as "Between X and X".
"""
from datetime import datetime
from types import SimpleNamespace

from backend.agents.orchestrator import _clip_label, _grounded_sar_narrative, _trigger_claim
from backend.models import TriggerType


class TestTriggerClaim:
    def test_labelled_source_is_not_labelled_twice(self):
        text = ("Trigger (risk_score): Real-time model scored transaction "
                "4012185 ($14.50) at 0.48.")
        assert _trigger_claim(TriggerType.risk_score, text) == text

    def test_unlabelled_source_gets_the_label(self):
        assert (_trigger_claim(TriggerType.customer_report, "Cardholder called in.")
                == "Trigger (customer_report): Cardholder called in.")

    def test_label_detection_ignores_leading_whitespace_and_case(self):
        text = "  trigger (risk_score): already labelled"
        assert _trigger_claim(TriggerType.risk_score, text) == text


class TestClipLabel:
    def test_short_label_is_untouched(self):
        assert _clip_label("short label") == "short label"

    def test_long_label_keeps_whole_pipe_segments(self):
        label = ("Browser A | os | agent | screen")
        assert _clip_label(label) == label
        clipped = _clip_label(label, limit=12)
        assert clipped == "Browser A"  # never cuts inside a segment

    def test_single_oversized_segment_falls_back_to_whole_words(self):
        clipped = _clip_label("alpha beta gamma delta", limit=12)
        assert clipped == "alpha beta"
        assert len(clipped) <= 12

    def test_result_never_exceeds_the_limit_when_words_fit(self):
        label = " | ".join(f"segment{i}" for i in range(20))
        assert len(_clip_label(label)) <= 80


def _txn(day: int, amount: float = 10.0) -> SimpleNamespace:
    return SimpleNamespace(
        txn_id=f"4012{day}", amount=amount,
        ts=datetime(2026, 9, day, 11, 0),
        channel=SimpleNamespace(value="online"), product_cd="W",
    )


def _case(**overrides) -> SimpleNamespace:
    fields = dict(
        customer_id="SC-03009", card_id="SC-03009-K955",
        connected_card_ids=[], exposure_usd=100.0,
        verdict=SimpleNamespace(value="fraud"),
        pattern=SimpleNamespace(value="undocumented"),
        evidence=[object(), object()], fraud_probability=0.808,
        nba_final=[SimpleNamespace(action=SimpleNamespace(value="BLOCK_CARD"))],
        sar=SimpleNamespace(reason="R2: exposure > $1,000"),
        trigger=SimpleNamespace(opened_at=datetime(2026, 9, 21)),
    )
    fields.update(overrides)
    return SimpleNamespace(**fields)


class TestSarNarrativeWindow:
    def test_single_day_activity_reads_as_on_the_date(self):
        text = _grounded_sar_narrative(_case(), _txn(21), [_txn(21)], None)
        assert text.startswith("On 2026-09-21, ")
        assert "Between" not in text

    def test_multi_day_activity_keeps_the_range(self):
        text = _grounded_sar_narrative(_case(), _txn(21), [_txn(20), _txn(22)], None)
        assert text.startswith("Between 2026-09-20 and 2026-09-22, ")
