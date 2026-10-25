"""
Deterministic text fallbacks for the two free-text fields.

The submission's only LLM vendor is Nebius Token Factory with NVIDIA Nemotron
(`backend/llm/nebius_client.py` + `backend/llm/roles.py`). This module keeps the
template writers used when neither the Nemotron roles nor a cached answer are
available, so the case summary and SAR narrative are always populated without
inventing model reasoning.

The legacy anthropic / openai / groq provider path was deleted: no configuration
in this submission could reach it, and it carried dead credential fields.
"""
from __future__ import annotations

from backend.logging import get_logger

log = get_logger(__name__)


def _template_summary(prompt_hint: str) -> str:
    return (
        "Investigation complete. Evidence gathered from transaction history, "
        "device records, and historical case memory. "
        "Risk and pattern assessment performed using deterministic heuristics. "
        "Next-best-action and policy route determined by the Fraud Policy engine."
    )


def _template_sar(prompt_hint: str) -> str:
    return (
        "Suspicious activity was identified based on analysis of transaction records, "
        "device profiles, billing regions, and historical case data. "
        "The activity involves transactions inconsistent with the cardholder's established history. "
        "Supporting evidence and entity identifiers are recorded in the attached case file. "
        "This report is filed in accordance with applicable regulatory requirements."
    )


def generate_summary(prompt: str) -> tuple[str, int, bool]:
    """Returns (text, tokens_used, llm_used).

    Always the deterministic template with `llm_used=False`: template text must
    never be presented as model output. The Nemotron path lives in `roles.py`.
    """
    return _template_summary(prompt), 0, False


def generate_sar_narrative(prompt: str) -> tuple[str, int, bool]:
    """Returns (narrative_text, tokens_used, llm_used); same contract as above."""
    return _template_sar(prompt), 0, False
