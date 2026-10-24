"""Snapshot the console's read API into static files for the hosted demo.

The Vercel deployment serves `sentinel-ui/` only — there is no Python process
behind it. Rather than fake the console, this script records the real API's
answers for every case and writes them next to the UI, and the console reads
those files when `NEXT_PUBLIC_DEMO_DATA=1`.

What is recorded is exactly what a local run produced: real engine output,
real evidence refs, real verdicts. What is *not* recorded: the analyst Q&A
model answer (the demo build has no Nemotron key), so the Q&A box replays a
deterministic, clearly-labelled snapshot answer instead.

Usage
-----
    # 1. start the API locally (demo mode serves committed case files)
    DEMO_MODE=1 GRAPH_BACKEND=local ... uvicorn backend.main:app --port 8000
    # 2. snapshot it
    python -m scripts.export_ui_demo --base http://127.0.0.1:8000
    # 3. build the UI with the snapshot enabled
    NEXT_PUBLIC_DEMO_DATA=1 npm --prefix sentinel-ui run build

The output is committed, so a clone can build the hosted demo with no
backend at all. Re-run this after any engine change that should show up
in the demo.
"""
from __future__ import annotations

import argparse
import json
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_OUT = ROOT / "sentinel-ui" / "public" / "demo"

# The question replayed in the console's Q&A box. Kept in one place so the
# snapshot and the honest label in the adapter cannot drift apart.
REFERENCE_QUESTION = "What evidence supports this verdict?"


def _get(base: str, path: str, timeout: float = 60.0) -> Any:
    """GET one endpoint; a 404 is data (the case has no such artifact), not an error."""
    req = urllib.request.Request(f"{base.rstrip('/')}{path}",
                                 headers={"Accept": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        if exc.code == 404:
            return None
        raise SystemExit(f"GET {path} -> HTTP {exc.code}: {exc.reason}") from exc
    except urllib.error.URLError as exc:
        raise SystemExit(
            f"Cannot reach {base} — is the API running? ({exc.reason})"
        ) from exc


def _post(base: str, path: str, body: dict[str, Any], timeout: float = 120.0) -> Any:
    req = urllib.request.Request(
        f"{base.rstrip('/')}{path}",
        data=json.dumps(body).encode("utf-8"),
        headers={"Content-Type": "application/json", "Accept": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        if exc.code == 404:
            return None
        raise SystemExit(f"POST {path} -> HTTP {exc.code}: {exc.reason}") from exc


def _load_case_file(cases_dir: Path, case_id: str) -> Any:
    """Read the committed answer file for a case, when one exists.

    The demo is meant to show the precomputed Nemotron-run answers the repo
    ships in `cases/`. A local app DB may hold a later template-only run of the
    same case (the test suite runs investigations), which would silently
    replace the richer answer in the snapshot — so the answer file wins by
    default and `--answers api` opts out.
    """
    path = cases_dir / f"{case_id}.json"
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


def export(base: str, out_dir: Path, answers: str = "files") -> dict[str, Any]:
    cases = _get(base, "/api/cases?limit=100") or []
    if not cases:
        raise SystemExit("/api/cases returned no rows — nothing to snapshot.")
    investigations = _get(base, "/api/investigations?limit=200") or []
    approvals = _get(base, "/api/approvals?limit=100") or []
    cases_dir = ROOT / "cases"

    index = {
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "source": "scripts/export_ui_demo.py",
        "notice": (
            "Static snapshot of a local API run. Read-only: the console renders "
            "recorded engine output; it does not run the engine in the browser."
        ),
        "health": _get(base, "/health"),
        "llm_status": _get(base, "/api/llm/status"),
        "cases": cases,
        "investigations": investigations,
        "approvals": approvals,
        # The committed report is the keyed Nemotron run, matching the answer
        # files above. A fresh local run without a key would replace it with
        # 0.1 s/case latencies and contradict every case file's `latency_s`.
        "benchmark": (_load_case_file(cases_dir, "_benchmark_report")
                      if answers == "files" else None)
                     or _get(base, "/benchmark/report"),
        "case_ids": [c["case_id"] for c in cases],
    }

    case_dir = out_dir / "case"
    case_dir.mkdir(parents=True, exist_ok=True)
    written: list[str] = []

    for case_id in index["case_ids"]:
        from_file = _load_case_file(cases_dir, case_id) if answers == "files" else None
        bundle = {
            "case_id": case_id,
            "answer": from_file or _get(base, f"/api/investigations/{case_id}"),
            "full": _get(base, f"/api/investigations/{case_id}/full"),
            "graph": _get(base, f"/api/investigations/{case_id}/graph"),
            "risk": _get(base, f"/api/investigations/{case_id}/risk"),
            "timeline": _get(base, f"/investigations/{case_id}/timeline"),
            # Recorded with no Nemotron key on purpose: the adapter labels it.
            "ask": _post(base, f"/api/cases/{case_id}/ask",
                         {"question": REFERENCE_QUESTION}),
        }
        target = case_dir / f"{case_id}.json"
        target.write_text(json.dumps(bundle, indent=1, default=str), encoding="utf-8")
        written.append(f"{case_id}.json")

    # Drop bundles for cases that no longer exist so the build cannot serve
    # a stale verdict for an ID the queue no longer lists.
    for stale in case_dir.glob("*.json"):
        if stale.name not in written:
            stale.unlink()

    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "index.json").write_text(
        json.dumps(index, indent=1, default=str), encoding="utf-8"
    )
    return index


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--base", default="http://127.0.0.1:8000", help="API root")
    ap.add_argument("--out", default=str(DEFAULT_OUT), help="output directory")
    ap.add_argument("--answers", choices=("files", "api"), default="files",
                    help="source of the answer file: committed cases/*.json (default) or the live API")
    args = ap.parse_args(argv)

    out_dir = Path(args.out)
    index = export(args.base, out_dir, answers=args.answers)

    total = sum(p.stat().st_size for p in out_dir.rglob("*.json"))
    print(f"snapshot: {len(index['case_ids'])} cases -> {out_dir}")
    print(f"size: {total / 1024:.0f} KiB across {len(list(out_dir.rglob('*.json')))} files")
    print(f"generated_at: {index['generated_at']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
