"""
Demo mode must read the committed answer pack, not the app database.

Regression context: a run from an older pipeline left a row in
`data/app/app.db` whose numbers and evidence text no longer matched
`cases/<id>.json`. The console rendered that row, so the demo showed a
superseded run, and its re-run button spent Nemotron calls and rewrote the
published pack. These tests pin both behaviours:

1. `GET /api/investigations/{id}` serves the answer file in demo mode.
2. `GET /api/investigations` summarises the pack in demo mode.
3. `POST /api/investigations/{id}/run` replays the file instead of running.
4. Live mode keeps the old database behaviour.
"""
from __future__ import annotations

import json

import pytest
from fastapi.testclient import TestClient

import backend.main as main
from backend.config import settings
from backend.main import app

client = TestClient(app)


def _answer(case_id: str, exposure: float = 887.73, probability: float = 0.823) -> dict:
    return {
        "case_id": case_id,
        "case": {
            "status": "closed_fraud",
            "verdict": "fraud",
            "fraud_probability": probability,
            "pattern": "undocumented",
            "exposure_usd": exposure,
            "summary": "pack summary",
        },
        "sar": {"file": True},
    }


@pytest.fixture()
def demo_pack(monkeypatch, tmp_path):
    monkeypatch.setattr(settings, "demo_mode", True)
    monkeypatch.setattr(settings, "cases_dir", tmp_path)
    return tmp_path


@pytest.fixture()
def stale_db(monkeypatch):
    """Make any database read fail loudly: demo mode should not reach it."""
    def _boom(*_args, **_kwargs):
        raise AssertionError("demo mode must not read the app database")
    monkeypatch.setattr(main.app_db, "load_investigation", _boom)
    monkeypatch.setattr(main.app_db, "list_investigations", _boom)


class TestDemoReadsThePack:
    def test_answer_file_wins_over_a_stale_db_row(self, demo_pack, stale_db):
        (demo_pack / "CASE-901.json").write_text(json.dumps(_answer("CASE-901")))

        resp = client.get("/api/investigations/CASE-901")

        assert resp.status_code == 200
        assert resp.json()["case"]["exposure_usd"] == 887.73

    def test_missing_case_is_404(self, demo_pack, monkeypatch):
        monkeypatch.setattr(main.app_db, "load_investigation", lambda *_a, **_k: None)

        resp = client.get("/api/investigations/CASE-902")

        assert resp.status_code == 404

    def test_queue_summaries_come_from_the_pack(self, demo_pack, stale_db):
        (demo_pack / "CASE-901.json").write_text(json.dumps(_answer("CASE-901", 887.73)))
        (demo_pack / "CASE-902.json").write_text(json.dumps(_answer("CASE-902", 42.0)))

        resp = client.get("/api/investigations")

        assert resp.status_code == 200
        rows = {row["case_id"]: row for row in resp.json()}
        assert rows["CASE-901"]["exposure_usd"] == 887.73
        assert rows["CASE-902"]["exposure_usd"] == 42.0
        assert rows["CASE-901"]["investigated"] is True
        assert rows["CASE-901"]["verdict"] == "fraud"
        # The console uses this to skip the risk decomposition that a replayed
        # case cannot provide (there is no stored signal snapshot).
        assert rows["CASE-901"]["source"] == "committed"


class TestDemoGraphView:
    def test_pack_only_case_still_renders_a_graph(self, demo_pack, monkeypatch):
        (demo_pack / "CASE-905.json").write_text(json.dumps(_answer("CASE-905")))
        monkeypatch.setattr(main.app_db, "load_investigation", lambda *_a, **_k: None)
        monkeypatch.setattr(main.graph, "get_case_trigger", lambda _cid: {
            "customer_id": "SC-1", "card_id": "SC-1-K1",
            "flagged_txn_id": "4012185", "risk_score": 0.48,
        })

        resp = client.get("/api/investigations/CASE-905/graph")

        assert resp.status_code == 200
        ids = {node["id"] for node in resp.json()["nodes"]}
        assert {"SC-1", "SC-1-K1", "4012185"} <= ids


class TestDemoReRunIsAReplay:
    def test_run_replays_the_pack_without_running_or_writing(self, demo_pack, monkeypatch):
        (demo_pack / "CASE-901.json").write_text(json.dumps(_answer("CASE-901")))

        def _boom(*_args, **_kwargs):
            raise AssertionError("demo mode must not run or rewrite the pack")
        monkeypatch.setattr(main, "run_investigation", _boom)
        monkeypatch.setattr(main, "write_answer_file", _boom)

        resp = client.post("/investigations/CASE-901/run", params={"force": "true"})

        assert resp.status_code == 200
        assert resp.json()["case"]["exposure_usd"] == 887.73

    def test_run_without_an_answer_file_is_a_clear_409(self, demo_pack, monkeypatch):
        monkeypatch.setattr(main, "run_investigation", lambda *_a, **_k: pytest.fail("ran"))

        resp = client.post("/investigations/CASE-903/run")

        assert resp.status_code == 409
        assert "precomputed" in resp.json()["detail"]


class TestDemoBlocksEverythingThatWouldSpendOrRewrite:
    """Demo mode is a replay mode: no run, no LLM, no pack write."""

    def test_create_investigation_replays_the_pack(self, demo_pack, monkeypatch):
        (demo_pack / "CASE-906.json").write_text(json.dumps(_answer("CASE-906")))
        monkeypatch.setattr(main, "run_investigation", lambda *_a, **_k: pytest.fail("ran"))
        monkeypatch.setattr(main, "write_answer_file", lambda *_a, **_k: pytest.fail("wrote"))

        resp = client.post("/investigations", json={"case_id": "CASE-906"})

        assert resp.status_code == 200
        assert resp.json()["case"]["exposure_usd"] == 887.73

    def test_create_investigation_without_a_file_is_409(self, demo_pack, monkeypatch):
        monkeypatch.setattr(main, "run_investigation", lambda *_a, **_k: pytest.fail("ran"))

        resp = client.post("/investigations", json={"case_id": "CASE-907"})

        assert resp.status_code == 409

    def test_timeline_replays_what_the_committed_file_records(self, demo_pack, monkeypatch):
        answer = _answer("CASE-908")
        answer["case"].update({
            "evidence": [
                {"evidence_id": "EV-1", "claim": "Trigger scored 0.48", "source": "external",
                 "ref": "trigger:risk_score", "entity_ids": []},
                {"evidence_id": "EV-2", "claim": "Device shared", "source": "graph",
                 "ref": "query:accounts_sharing_device", "entity_ids": []},
            ],
            "pattern": "undocumented",
            "written_to_graph": True,
            "graph_case_id": "CASE-2026-CASE-908",
        })
        answer["next_best_actions"] = {"initial": [], "final": [
            {"action": "BLOCK_CARD", "route": "L1", "reason": "R2"}], "what_changed": "x"}
        answer["sar"] = {"file": True, "reason": "R2: confirmed fraud"}
        (demo_pack / "CASE-908.json").write_text(json.dumps(answer))
        monkeypatch.setattr(main.app_db, "get_audit_trail", lambda *_a, **_k: [])

        resp = client.get("/investigations/CASE-908/timeline")

        assert resp.status_code == 200
        rows = resp.json()
        types = [r["event_type"] for r in rows]
        assert types[0] == "committed_answer"
        assert "policy_decided" in types
        assert "sar_recorded" in types
        assert all(r["actor"] == "replay" for r in rows)
        # No fabricated execution timestamps.
        assert all(r["timestamp"] is None for r in rows)

    def test_submitting_evidence_is_refused(self, demo_pack, monkeypatch):
        import backend.agents.orchestrator as orchestrator
        monkeypatch.setattr(orchestrator, "submit_evidence",
                            lambda *_a, **_k: pytest.fail("resumed"))

        resp = client.post("/investigations/CASE-901/evidence",
                           json={"response": "customer called back"})

        assert resp.status_code == 409
        assert "DEMO_MODE" in resp.json()["detail"]

    def test_benchmark_run_is_refused(self, demo_pack, monkeypatch):
        import backend.evaluation.run_benchmark as runner
        monkeypatch.setattr(runner, "run_all", lambda: pytest.fail("benchmark ran"))

        resp = client.post("/benchmark/run")

        assert resp.status_code == 409
        assert "DEMO_MODE" in resp.json()["detail"]


class TestLiveModeKeepsTheDatabase:
    def test_pack_file_does_not_leak_into_live_mode(self, monkeypatch, tmp_path):
        monkeypatch.setattr(settings, "demo_mode", False)
        monkeypatch.setattr(settings, "cases_dir", tmp_path)
        (tmp_path / "CASE-904.json").write_text(json.dumps(_answer("CASE-904")))
        monkeypatch.setattr(main.app_db, "load_investigation", lambda *_a, **_k: None)

        resp = client.get("/api/investigations/CASE-904")

        assert resp.status_code == 404
