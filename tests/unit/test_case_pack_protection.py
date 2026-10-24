"""
The committed case pack must not be rewritten by a test run.

`cases/*.json` is the evaluation contract (DECISIONS D11) and the demo's data
source. A test that posts to `/investigations` starts a real investigation and
the exporter writes its result into `cases/` — that silently mutates a tracked
artifact. `tests/conftest.py` arms the guard for every session; these tests pin
its behaviour.
"""
from __future__ import annotations

from types import SimpleNamespace

import pytest

from backend.config import ROOT, settings
from backend.evaluation import exporter


def test_guard_refuses_a_write_into_the_committed_pack(monkeypatch):
    monkeypatch.setenv("SENTINEL_PROTECT_CASE_PACK", "1")
    monkeypatch.setattr(settings, "cases_dir", ROOT / "cases")
    target = ROOT / "cases" / "CASE-TEST-GUARD.json"

    with pytest.raises(RuntimeError, match="committed case pack"):
        exporter.write_answer_file(SimpleNamespace(case_id="CASE-TEST-GUARD"))

    assert not target.exists()


def test_guard_does_not_block_temporary_output_dirs(monkeypatch, tmp_path):
    monkeypatch.setenv("SENTINEL_PROTECT_CASE_PACK", "1")
    target = tmp_path / "CASE-TEST-GUARD.json"

    # The guard only refuses paths inside cases/; a temp path passes the check
    # and then fails later on the fake case, which is proof it was not refused.
    with pytest.raises(Exception) as excinfo:
        exporter.write_answer_file(
            SimpleNamespace(case_id="CASE-TEST-GUARD"), output_dir=tmp_path)

    assert "committed case pack" not in str(excinfo.value)
    assert not target.exists()
