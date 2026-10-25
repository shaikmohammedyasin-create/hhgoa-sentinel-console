# own-ui branch (fallback console)

Status: **prepared, not merged.** This branch is the one-hour switch-out if the
`sentinel-ui/` fork has to be dropped for licensing reasons.

What is here:

- `frontend/` restored from commit `a928aaf~1` (the vanilla Analyst Command Center).
- `frontend/js/api.js`: `getAnswer(caseId)` reads the committed answer file
  (`GET /api/investigations/{id}`), so the console works in `DEMO_MODE=1` where
  `/full` has no stored run.
- `frontend/js/app.js`: `answerToDossier()` maps an answer file to the dossier
  shape the existing renderers expect, and `selectCase()` falls back to it when
  no stored investigation exists. The Nemotron panel, agree/overruled badge,
  SAR document and Ask box were already present in the restored code and now
  also show the `served_by` provenance label added to the API.
- `backend/main.py`: mounts `frontend/` at `/` when the directory exists (a no-op
  on `main`, where the directory is absent).

Switch procedure: `git switch own-ui`, run
`DEMO_MODE=1 uvicorn backend.main:app --host 0.0.0.0 --port 8008`, open
`http://localhost:8008`. To ship it instead of the Next console, also update
`Dockerfile` (copy `frontend/` instead of the standalone UI stage) — not done on
this branch, deliberately, so `main` and the deployment path stay untouched.

Verification on this branch: `/` returns HTTP 200 (56 KB), `/js/app.js` 200,
`/api/investigations/CASE-009` returns `served_by: "cached live run (2026-10-25)"`.
A full interactive click-through was **not completed** (the browser check was
interrupted), so treat the UI wiring as unverified beyond HTTP/asset checks.
