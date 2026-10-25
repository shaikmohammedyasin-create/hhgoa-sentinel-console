"""
Committed cache of real Nemotron outputs for the hosted demo.

The Render free instance runs without a Nebius key, so the demo cannot call
Nemotron live. `cases/_nemotron_cache.json` is generated **once** from a live key
by `scripts/export_nemotron_cache.py` and committed; this module reads it and
labels each served answer honestly:

    served_by = "cached live run (2026-10-25)"   # recorded with a real key
    served_by = "live"                            # this process just ran it
    served_by = "deterministic fallback"          # no model text exists

The cache is read-only at serving time. It is never written by the API, so a
demo request can neither spend credits nor grow the committed file.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from backend.config import ROOT
from backend.logging import get_logger

log = get_logger(__name__)

CACHE_PATH: Path = ROOT / "cases" / "_nemotron_cache.json"

_cache: dict[str, Any] | None = None


def load_cache() -> dict[str, Any]:
    """Load the committed cache once; an absent/corrupt file is not an error."""
    global _cache
    if _cache is None:
        if not CACHE_PATH.exists():
            _cache = {"cases": {}}
            return _cache
        try:
            _cache = json.loads(CACHE_PATH.read_text(encoding="utf-8"))
        except ValueError as exc:
            log.warning("nemotron_cache.unreadable", path=str(CACHE_PATH), error=str(exc))
            _cache = {"cases": {}}
    return _cache


def recorded_for(case_id: str) -> dict[str, Any] | None:
    return (load_cache().get("cases") or {}).get(case_id)


def served_by_label(answer: dict[str, Any], case_id: str) -> str:
    """The honest provenance label for the Nemotron block of one answer file."""
    nemotron = answer.get("nemotron") or {}
    usage = nemotron.get("model_usage") or {}
    recorded = recorded_for(case_id)
    if recorded and recorded.get("recorded_at"):
        return f"cached live run ({recorded['recorded_at']})"
    if usage:
        return "live"
    return "deterministic fallback"


def annotate(answer: dict[str, Any], case_id: str) -> dict[str, Any]:
    """Return a copy of an answer file with the recorded advisory attached.

    The graded fields are never mutated. The recorded Nemotron outputs are
    exposed in the advisory `nemotron` block only: a missing schema-valid
    proposal is filled from the recording, and the recorded narrative/SAR are
    attached for display next to the honest provenance label.
    """
    out = dict(answer)
    nemotron = dict(out.get("nemotron") or {})
    nemotron["served_by"] = served_by_label(answer, case_id)
    recorded = recorded_for(case_id)
    if recorded:
        if nemotron.get("model_proposal") is None and recorded.get("pattern_proposal"):
            nemotron["model_proposal"] = recorded["pattern_proposal"]
            nemotron["model_proposal_cached"] = True
        nemotron["recorded_narrative"] = recorded.get("summary")
        nemotron["recorded_sar_narrative"] = recorded.get("sar_narrative")
        if recorded.get("recorded_at"):
            nemotron["recorded_at"] = recorded["recorded_at"]
            nemotron["recorded_from"] = recorded.get("source", "recorded live run")
    out["nemotron"] = nemotron
    return out
