"""
Approval decisions must be authorized server-side.

Before this: the only thing standing between an arbitrary caller and a real
action (block a card, file a report) was the request body. `approver` is a
display name, not an identity, so anyone who could reach the API could approve
anything. With `APPROVAL_TOKEN` configured the caller must present it; an
unconfigured production deployment refuses decisions instead of trusting them.
"""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

import backend.agents.orchestrator as orchestrator
from backend.config import settings
from backend.main import app

client = TestClient(app)
DECISION = {"decision": "approved", "approver": "Analyst-L1"}


@pytest.fixture()
def decision_recorder(monkeypatch):
    """Capture what the handler forwards, without touching approvals in SQLite."""
    calls: list[tuple] = []

    def _fake_decide(case_id, approval_id, decision, approver):
        calls.append((case_id, approval_id, decision, approver))
        return {"case_id": case_id, "approval_id": approval_id, "status": "approved",
                "approver": approver}

    monkeypatch.setattr(orchestrator, "decide_approval", _fake_decide)
    return calls


class TestTokenConfigured:
    def test_missing_token_is_401(self, monkeypatch, decision_recorder):
        monkeypatch.setattr(settings, "approval_token", "s3cret-token")
        resp = client.post("/investigations/CASE-001/approvals/APR-1", json=DECISION)
        assert resp.status_code == 401
        assert decision_recorder == []

    def test_wrong_token_is_401(self, monkeypatch, decision_recorder):
        monkeypatch.setattr(settings, "approval_token", "s3cret-token")
        resp = client.post("/investigations/CASE-001/approvals/APR-1", json=DECISION,
                           headers={"X-Approval-Token": "not-the-token"})
        assert resp.status_code == 401
        assert decision_recorder == []

    def test_correct_token_records_the_decision(self, monkeypatch, decision_recorder):
        monkeypatch.setattr(settings, "approval_token", "s3cret-token")
        resp = client.post("/investigations/CASE-001/approvals/APR-1", json=DECISION,
                           headers={"X-Approval-Token": "s3cret-token"})
        assert resp.status_code == 200
        assert decision_recorder == [("CASE-001", "APR-1", "approved", "Analyst-L1")]


class TestUnconfigured:
    def test_production_fails_closed(self, monkeypatch, decision_recorder):
        monkeypatch.setattr(settings, "approval_token", "")
        monkeypatch.setattr(settings, "app_env", "production")
        resp = client.post("/investigations/CASE-001/approvals/APR-1", json=DECISION)
        assert resp.status_code == 503
        assert decision_recorder == []

    def test_development_allows_and_forwards(self, monkeypatch, decision_recorder):
        monkeypatch.setattr(settings, "approval_token", "")
        monkeypatch.setattr(settings, "app_env", "development")
        resp = client.post("/investigations/CASE-001/approvals/APR-1", json=DECISION)
        assert resp.status_code == 200
        assert decision_recorder == [("CASE-001", "APR-1", "approved", "Analyst-L1")]
