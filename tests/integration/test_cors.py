"""
CORS and request-size posture.

Before this: `allow_origins=["*"]` with `allow_credentials=True`, which browsers
reject for credentialed calls and which lets any site call the API. Origins are
now an explicit allow-list; credentials are only on when the list is literal.
"""
from __future__ import annotations

from fastapi.testclient import TestClient

import backend.main as main
from backend.config import settings
from backend.main import app

client = TestClient(app)


class TestCorsAllowList:
    def test_allowed_origin_is_echoed(self):
        resp = client.get("/health", headers={"Origin": "http://localhost:3000"})
        assert resp.headers.get("access-control-allow-origin") == "http://localhost:3000"

    def test_unknown_origin_gets_no_allow_origin(self):
        resp = client.get("/health", headers={"Origin": "https://evil.example"})
        assert "access-control-allow-origin" not in resp.headers

    def test_configured_origins_never_contain_a_wildcard(self):
        assert "*" not in main._CORS_ORIGINS

    def test_wildcard_config_disables_credentials(self):
        origins, credentials = main._cors_options("*")
        assert origins == ["*"]
        assert credentials is False

    def test_explicit_allow_list_keeps_credentials_usable(self):
        origins, credentials = main._cors_options("http://localhost:3000, https://console.example")
        assert origins == ["http://localhost:3000", "https://console.example"]
        assert credentials is True

    def test_preflight_from_allowed_origin_succeeds(self):
        resp = client.options(
            "/api/cases",
            headers={
                "Origin": "http://localhost:3000",
                "Access-Control-Request-Method": "GET",
            },
        )
        assert resp.status_code == 200
        assert resp.headers.get("access-control-allow-origin") == "http://localhost:3000"


class TestRequestSize:
    def test_oversized_body_is_rejected_before_parsing(self, monkeypatch):
        monkeypatch.setattr(settings, "max_request_bytes", 64)

        resp = client.post("/investigations", content=b"x" * 4096)

        assert resp.status_code == 413
        assert "exceeds" in resp.json()["detail"]

    def test_normal_body_is_not_rejected(self, monkeypatch):
        monkeypatch.setattr(settings, "max_request_bytes", 4096)

        # Deliberately invalid payload: it must reach validation (422) rather
        # than trip the size guard, and it must not start a real investigation
        # (that would rewrite the committed case pack).
        resp = client.post("/investigations", json={"case_id": ""})

        assert resp.status_code == 422
