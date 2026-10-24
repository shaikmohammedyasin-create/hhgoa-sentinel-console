"""
Contract tests for the three API defects fixed after the verification report.

1. `GET /api/investigations/{case_id}` — the path `sentinel-ui/src/lib/api.ts`
   calls. It did not exist, so every case opened as "no answer file".
2. `POST /api/reprove` — reported `ok: true, rows: 0` for every ref, including
   invented query names. It now resolves the ref names the orchestrator emits
   and refuses to claim success for a query it could not run.
3. `GET /cases/{case_id}` — returned JSON even for browser navigations on the
   single-URL demo, so deep links and refreshes broke. It now proxies to the
   co-hosted UI when the request accepts HTML.

Nothing here calls Nebius: the session fixture forces `LLM_PROVIDER=none`.
"""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

import backend.main as main
from backend.agents.orchestrator import run_investigation
from backend.main import app


@pytest.fixture(scope="module")
def client():
    return TestClient(app)


@pytest.fixture(scope="module")
def card_id():
    """A card that really has history, taken from the prepared store."""
    import sqlite3

    from backend.config import settings
    from backend.graph import query_router as qrouter

    conn = sqlite3.connect(settings.prepared_db)
    row = conn.execute("SELECT card_id FROM transactions LIMIT 1").fetchone()
    conn.close()
    card = row[0]
    assert qrouter.get_card_transaction_history(card), "seed card must have history"
    return card


class TestAnswerAlias:
    """The UI reads `/api/investigations/{id}`; the backend served it at `/investigations/{id}`."""

    def test_alias_returns_the_answer_file(self, client):
        run_investigation("CASE-001", force=False)
        r = client.get("/api/investigations/CASE-001")
        assert r.status_code == 200
        body = r.json()
        assert body["case_id"] == "CASE-001"
        # AnswerFile nests the verdict under `case`; the console reads it there.
        assert "verdict" in body["case"] and "fraud_probability" in body["case"]

    def test_alias_matches_the_original_route(self, client):
        aliased = client.get("/api/investigations/CASE-001").json()
        original = client.get("/investigations/CASE-001").json()
        assert aliased == original

    def test_alias_404_for_unknown_case(self, client):
        r = client.get("/api/investigations/NOPE-999")
        assert r.status_code == 404

    def test_subroutes_are_not_shadowed(self, client):
        """A single-segment alias must not swallow the `/api/.../<sub>` routes."""
        for suffix in ("/full", "/graph", "/risk"):
            r = client.get(f"/api/investigations/CASE-001{suffix}")
            assert r.status_code == 200, f"{suffix} broke: {r.status_code}"


class TestReproveHonesty:
    """A trust feature that always says "verified" is worse than none."""

    def test_emitted_ref_name_resolves(self, client, card_id):
        """Refs cite `card_transaction_history`; the router exports `get_...`."""
        r = client.post("/api/reprove",
                        json={"ref": f"query:card_transaction_history(card_id={card_id})"})
        assert r.status_code == 200
        body = r.json()
        assert body["ok"] is True, body
        assert body["query"] == "get_card_transaction_history"
        assert body["rows"] > 0
        assert body["reproduced"] is True

    def test_unknown_query_is_not_success(self, client):
        r = client.post("/api/reprove", json={"ref": "query:definitely_not_a_query(x=1)"})
        assert r.status_code == 200
        body = r.json()
        assert body["ok"] is False
        assert body["rows"] == 0
        assert body["reproduced"] is False
        assert "unknown" in (body.get("error", "") + body.get("note", "")).lower()

    def test_missing_required_parameter_is_reported_not_faked(self, client, card_id):
        """`card_window` needs a center timestamp the ref does not carry."""
        r = client.post("/api/reprove", json={"ref": f"query:card_window(card_id={card_id})"})
        body = r.json()
        assert body["ok"] is False
        assert "center_ts" in (body.get("error", "") + body.get("note", ""))

    def test_parameter_aliases_are_mapped(self, client):
        """Refs say `device=`; the router signature says `device_label`."""
        r = client.post("/api/reprove", json={"ref": "query:accounts_sharing_device(device=desktop)"})
        body = r.json()
        assert body["ok"] is True, body
        assert "device_label" in body["params"]

    def test_empty_result_is_executed_but_not_reproduced(self, client):
        r = client.post("/api/reprove", json={"ref": "query:get_transaction(txn_id='3514030')"})
        body = r.json()
        assert body["ok"] is True
        assert body["rows"] == 0
        assert body["reproduced"] is False


class _FakeHTML:
    """Stand-in for the co-hosted Next server's response."""
    status = 200
    headers = {"content-type": "text/html; charset=utf-8"}

    def read(self) -> bytes:
        return b"<!doctype html><html><body>case shell</body></html>"

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False


class TestCaseDeepLink:
    def test_html_navigation_is_proxied_to_the_ui(self, client, monkeypatch):
        monkeypatch.setattr(main, "_UI_PORT", "3000")
        monkeypatch.setattr(main.urllib.request, "urlopen", lambda *a, **k: _FakeHTML())
        r = client.get("/cases/CASE-001", headers={"accept": "text/html,application/xhtml+xml"})
        assert r.status_code == 200
        assert r.headers["content-type"].startswith("text/html")

    def test_api_client_still_gets_json(self, client, monkeypatch):
        monkeypatch.setattr(main, "_UI_PORT", "3000")
        r = client.get("/cases/CASE-001", headers={"accept": "application/json"})
        # No stored investigation in a clean run -> the API's own 404, as JSON.
        assert r.headers["content-type"].startswith("application/json")

    def test_no_ui_cohost_stays_json(self, client, monkeypatch):
        monkeypatch.setattr(main, "_UI_PORT", None)
        r = client.get("/cases/CASE-001", headers={"accept": "text/html"})
        assert r.headers["content-type"].startswith("application/json")
