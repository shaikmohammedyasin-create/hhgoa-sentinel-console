# Final Report — Sentinel Graph (Nebius × NVIDIA Hackathon)

Run date: 2026-10-24. Every number below was produced by a command run in this
session against commit `fd60457` on branch `nebius-submission`. Anything that
could not be verified is marked **NOT RUN** with the reason. Nothing here is
copied from memory or from an earlier document; where an old document disagrees
with today's measurement, the disagreement is recorded in Section 9.

---

## Executive summary

1. Repository: `shaikmohammedyasin-create/hhgoa-sentinel-console` (private), branch
   `nebius-submission`, HEAD `fd60457`, 83 commits, 193 tracked files, MIT licence.
   Only remote is `origin`; the retired upstream repo is not referenced.
2. Automated tests: **278 passed, 9 skipped** in 14.14 s. Skips are 6 live-TigerGraph
   tests (no host configured) and 3 approval tests conditional on a pending approval.
3. UI gates: `tsc --noEmit` clean; `next build` produced 6 routes. No linter is
   installed or configured, so lint is **NOT RUN** (Section 2).
4. Evaluation (offline, deterministic engine): verdict **20/20**, pattern **20/20**
   against `cases/ground_truth.json`, reproduced today after seeding the app DB.
   This is fidelity, not generalisation — the same rule set produced both sides.
5. Baseline weakness, measured today: a single `risk_score` threshold reaches
   **F1 = 1.0 at 0.70** on this synthetic pack. The graph-evidence layer has not
   been shown to beat that on this data.
6. Live Nemotron path: **NOT RUN** — no `NEBIUS_API_KEY` in this environment.
   `/api/llm/status` reports `available: false`, 0 calls. The 60% verdict / 85%
   pattern live figures remain prior committed evidence, not a today measurement.
7. Local single-URL demo works: UI 200, static assets 200, API 200, unknown 404.
   Demo-mode replay from an empty database was verified (200 for a committed case,
   404 in strict mode).
8. **Blocker 1:** the console requests `GET /api/investigations/{id}`, which does
   not exist on the backend. Every case opens with an empty **CASE FILE** tab
   ("No answer file for this case yet"), a 404 in the console, and ASK gated behind
   "Run the case first."
   One-line fix, Section 9.
9. **Blocker 2:** the public link `https://sentinel-ui-nu.vercel.app` serves the UI
   (200) but every backend call is 404. It is a UI-only deployment, not a working demo.
10. **Verdict: NOT READY** to submit as-is. Both blockers are small, but as of this
    report the thing a judge would click is broken. Docker build was **NOT RUN**
    (daemon down), so the container path is documented but unproven today.

---

## 1. Repository and safety

| Check | Result |
|---|---|
| `pwd` | `C:\Users\ghi26\AppData\Local\Temp\opencode\hhgoa-scrubbed` |
| `git remote -v` | `origin https://github.com/shaikmohammedyasin-create/hhgoa-sentinel-console.git` (fetch+push) |
| Retired upstream remote | absent (single remote) |
| Branch / HEAD | `nebius-submission` / `fd604572c09c55ef2bc21ad6ff7a1f27b615bf16` |
| Commits | 83 |
| First / last commit | `a50e635` 2026-09-19 / `fd60457` 2026-10-23 |
| Tracked files | 193 |
| Working tree | clean (verified again after every check below) |
| Licence | MIT, "Copyright (c) 2026 Mohammed Yasin Shaik" |

**Data-like files tracked** (only synthetic, no third-party data):

```
data/README.md
data/synthetic/case_pack.csv
data/synthetic/closed_cases_history.csv
data/synthetic/identity.csv
data/synthetic/transactions.csv
```

**Largest blobs in all history** — no stray dataset or archive:

```
3,578,705  data/synthetic/transactions.csv
1,681,525  docs/images/simplified_flow.png
1,627,933  docs/images/archi.png
1,391,959  docs/images/ballerina-logo.jpeg
  768,390  data/synthetic/identity.csv
  109,488  sentinel-ui/package-lock.json
   85,233  frontend/js/app.js
   84,226  frontend/js/app.js
```

**Secret scan:** `git grep -nIE` for `sk-…`, `nvapi-…`, `AKIA…`, `ghp_…`, and
private-key headers over all tracked files returned **0 hits**. An email-address
scan over tracked files returned **0 hits**. `.env` is not tracked; only
`.env.example` files are.

**gitleaks: NOT RUN** — binary not installed in this environment
(`Get-Command gitleaks` → absent). The git-grep scan above is weaker than
gitleaks; it does not catch high-entropy strings outside those patterns.

**Provenance risk accepted and recorded:** `sentinel-ui/NOTICE.md` states the UI
was derived from an unlicensed upstream project; the licence posture is
documented rather than hidden.

---

## 2. Tests and build

Commands run from the repo root unless noted; Python is the project venv.

| Gate | Command | Result |
|---|---|---|
| Python tests | `python -m pytest -q` | **278 passed, 9 skipped**, 277 warnings, 14.14 s |
| Skip census | `python -m pytest -q -rs` | 6 × "TigerGraph host not configured", 3 × "case produced no pending approvals" |
| UI types | `cd sentinel-ui && npx tsc --noEmit` | clean, exit 0 |
| UI build | `node --max-old-space-size=4096 ./node_modules/next/dist/bin/next build` | success, 6 routes (`/`, `/_not-found`, `/approvals`, `/benchmark`, `/cases/[caseId]`, `/ring`), first-load JS 133 kB |
| Python lint | `python -m ruff --version` | **NOT RUN** — no ruff in the venv, no `[tool.ruff]` config |
| UI lint | `npm run lint` | **NOT RUN** — no `eslint` config file and no local eslint binary; `next build` does not lint |
| Docker build | `docker build .` | **NOT RUN** — daemon unreachable (`npipe:////./pipe/dockerDesktopLinuxEngine` missing) |

Toolchain actually used: **Python 3.14.5**, **Node v24.15.0**, Windows 11.
The Dockerfile pins Python 3.12 and Node 20, so the container stack is *not* the
tested stack.

Warning: the full test suite can rewrite `cases/*.json`. It did not this run
(`git status` stayed clean afterwards), but treat it as a hazard when re-running.

---

## 3. Nemotron / Nebius Token Factory

**No API key is present in this environment** (`$env:NEBIUS_API_KEY` empty).
Consequences, stated plainly:

| Item | Status |
|---|---|
| `scripts/smoke_nemotron.py` live 4-role call table | **NOT RUN** — no key |
| 4-role live latency / token table | **NOT RUN** — `/api/llm/status` shows `calls_logged: 0` |
| Nano→Super escalation check | **NOT RUN** — requires live calls |
| Plain-LLM no-graph baseline (eval part C) | **NOT RUN** — harness returns `NEBIUS_API_KEY not set` |
| Propose/decide agreement on live proposals (eval part D) | **NOT RUN** — no proposals produced |

What *is* verified from code and the running service:

- Base URL `https://api.tokenfactory.nebius.com/v1`; model ids
  `nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B`, `nvidia/nemotron-3-super-120b-a12b`,
  `nvidia/Nemotron-3-Ultra-550b-a55b` (returned by `/api/llm/status`).
- Four roles with per-role tiers (`backend/llm/roles.py:5-11`): pattern proposal
  (Nano), verification draft (Nano), narrative/SAR draft (Ultra), analyst Q&A (Ultra).
- Every role returns `None` on invalid output and the caller falls back to the
  deterministic answer — observed directly: `/api/cases/CASE-004/ask` answered
  `served_by: "deterministic-fallback"`, `llm_used: false` with an explicit
  "Not in evidence … re-run with the Nemotron key configured" message.
- Prompt-injection posture is in code: every data field is wrapped in an
  "untrusted content" block and the system prompt forbids treating data as
  instructions (`backend/llm/roles.py:14-20,46-57`).

The committed `cases/_benchmark_report.json` and `cases/*.json` carry token counts
from earlier keyed runs (e.g. CASE-004 classifier: 1,181 prompt / 927 completion
tokens). Those are **prior artifacts**, not measured today.

---

## 4. Product features — what actually responds

Probed against a live instance (`DEMO_MODE=1`, `GRAPH_BACKEND=local`,
prepared synthetic store: 12,235 transactions).

| Endpoint | Result |
|---|---|
| `GET /health` | 200 — graph healthy, app_db healthy, `demo_mode: true` |
| `GET /api/cases` | 200, 6,631 B (20-case pack) |
| `GET /api/investigations` | 200, 5,098 B (queue summaries) |
| `GET /api/investigations/CASE-004/full` | 200, 17,280 B |
| `GET /api/investigations/CASE-004/graph` | 200, 5,141 B (12 nodes / 18 links in UI) |
| `GET /api/investigations/CASE-004/risk` | 200, 3,186 B |
| `GET /api/approvals` | 200, 32,778 B |
| `GET /investigations/CASE-004/timeline` | 200, 4,616 B |
| `POST /api/cases/CASE-004/ask` | 200, deterministic fallback (no key) |
| `POST /investigations/CASE-004/run?force=true` | 200 for all 20 cases; final `legitimate`/`fraud` reproduced per case |
| `POST /investigations/CASE-004/approvals/{id}` | approved; `decided_at` + `approver` persisted; item leaves the pending list |
| `GET /api/investigations/CASE-004` | **404 — route does not exist** (Blocker 1) |
| `GET /benchmark/report` | 200, committed prior benchmark artifact (20 cases, 457 s) |
| `GET /benchmark/checkpoints` | **404 — no checkpoint report artifact committed** |
| `POST /api/reprove` | 200 but always `rows: 0`, `ok: true` (issue 3) |

**Demo-mode replay verified from an empty database** (`APP_DB` pointed at a fresh
file, `DEMO_MODE=1`): `GET /investigations/CASE-004` → 200 served from the
committed answer file; `GET /investigations/CASE-999` → 404. With `DEMO_MODE=0`
and the same empty database: `GET /investigations/CASE-004` → **404**, so strict
mode is not silently permissive.

**Single-URL co-hosting verified** (API on 8012 with `UI_PORT=3001`, Next
standalone on 3001): `/` 200 `text/html`, `/favicon.svg` 200, `/approvals` 200,
`/benchmark` 200, `/ring` 200, `/api/cases` 200, `/unknown-route-xyz` 404.
Deep link `/cases/CASE-004` returns **`application/json`** instead of the page —
see issue 4.

**Browser check** (headless Chromium, 1440×900): queue 22 buttons, 20 cases,
masthead renders "SENTINEL · demo mode · committed cases · nemotron unavailable",
palette `--bg: #f7f4ef` holds under a dark OS preference, the graph pane renders
(its footer reports 12 nodes / 18 links; 59 SVG node elements counted), a fraud
case shows verdict/exposure/ring strip. Console noise on case open is exactly one
404: `/api/investigations/CASE-011` — Blocker 1, not an isolated glitch. The CASE
FILE tab itself renders "No answer file for this case yet." and ASK is gated with
"Run the case first." for a case the queue already scores as FRAUD.

---

## 5. Evaluation

All offline evaluation was re-run today; no keyed evaluation was possible.

| Measure | Today | Source |
|---|---|---|
| Committed answers vs ground truth | verdict **20/20**, pattern **20/20** | `python scripts/compare_baselines.py` |
| Deterministic engine vs ground truth | verdict **20/20**, pattern **20/20** | `python scripts/eval_heldout.py --skip-llm` after seeding the DB |
| Risk-threshold-only baseline | best **F1 = 1.0 at threshold 0.70** (n=20, TP 15, FP 0, FN 0) | same run |
| Plain-LLM no-graph baseline (part C) | **NOT RUN** — needs key | harness reports key absent |
| Propose/decide agreement (part D) | **NOT RUN** — 0 model proposals | same |
| Cost / latency from call log (part E) | **NOT RUN** — 0 logged calls | same |
| Live Nemotron on original (non-redistributed) dataset | **not re-measured**; prior committed claim 60% verdict / 85% pattern | `docs/BENCHMARK.md` |

Three disclosures that matter more than the headline:

1. **20/20 is self-consistency, not generalisation.** The synthetic case pack and
   the deterministic rules were authored together; the engine agreeing with its own
   labels proves the pipeline reproduces, not that it transfers.
2. **The risk-score baseline ties the full pipeline on this pack** (F1 1.0 with a
   single threshold). On this data the graph-evidence layer is not measurably
   additive. Do not claim otherwise in the pitch.
3. **Part A reads the app database, not the case files.** A first run against an
   unseeded DB reported 25% because it was reading empty rows. The 20/20 above was
   produced after running all 20 cases; without that step the number is meaningless.
   This is a harness sharp edge, recorded so nobody re-reports 25% or 100% blindly.

The committed `cases/_benchmark_report.json` (prior keyed run) shows 20/20 with
12–35 s per case. Those latencies are LLM-path numbers; a demo-mode engine run is
0.1–0.8 s (measured across 20 cases today). A judge comparing the two will see a
mismatch unless the difference is explained.

---

## 6. Deployment and cost

| Path | Status |
|---|---|
| Local native run (API + standalone UI + proxy) | **verified today** (Section 4) |
| `docker compose up --build` → `http://localhost:8008` | **NOT RUN** — Docker daemon down |
| Vercel `https://sentinel-ui-nu.vercel.app` | UI 200; `/api/cases` 404; `/health` 404; `/cases/CASE-004` 200; `/approvals` 200 → **UI-only, not a working demo** |
| Live Nemotron cost per case | **NOT RUN** — no calls made |
| Demo-mode cost | zero by construction; confirmed `calls_logged: 0` |

Container wiring was reviewed but not executed: `Dockerfile:59-61` copies
`.next/standalone`, `.next/static` and `public` into the runtime image — the exact
step whose absence caused the earlier white screen. `scripts/docker_entrypoint.sh`
then starts Node on 3000, exports `UI_PORT=3000`, and execs uvicorn on 8000;
`docker-compose.yml` maps 8008→8000 and sets `DEMO_MODE=1`, `GRAPH_BACKEND=local`.

Because the build was not run in Docker, these remain **unproven**:
`npm ci` + `next build` inside `node:20-slim`, `pip install -r requirements.txt`
under Python 3.12, `prepare_data` on container paths, and the 40 s healthcheck
`start_period`.

Budget/cost controls are code-verified, not load-tested: per-IP hourly limiter,
global daily cap, demo answer cache, JSONL call log (`docs/DEPLOY.md:49-56`).
No dollar figure is asserted in this report because none was measured today.

---

## 7. Submission checklist

| # | Item | Status | Evidence / gap |
|---|---|---|---|
| 1 | Public or judge-accessible repo with code | **DONE (private)** | `hhgoa-sentinel-console`, branch `nebius-submission`; must be made public or shared with judges |
| 2 | MIT licence in repo | **DONE** | `LICENSE`, MIT, 2026 |
| 3 | Runnable instructions | **DONE (unproven)** | README + `docs/DEPLOY.md`; Docker path **NOT RUN** today |
| 4 | Working hosted demo link | **NOT DONE** | Vercel serves UI only; every API call 404s |
| 5 | Console opens a case and shows the case file | **NOT DONE** | Blocker 1 — CASE FILE tab empty on every case |
| 6 | Nemotron + Nebius used at runtime | **PARTIAL** | Code path complete; no key present, so 0 live calls this session |
| 7 | Benchmark numbers that survive a re-run | **PARTIAL** | 20/20 and F1 1.0 reproduce; live 60%/85% cannot be re-run without key + original data |
| 8 | Demo video | **NOT DONE** | No recording in repo; needs a browser pass after Blocker 1 |
| 9 | Devpost write-up | **NOT DONE** | Section 8 is the fact sheet to write from |
| 10 | Delete or correct stale claims | **NOT DONE** | Section 9 issue 5 (test counts, 600/600 checkpoints, static-frontend wording) |
| 11 | No secrets / no third-party data in tree | **DONE** | Section 1; gitleaks itself **NOT RUN** |
| 12 | Free to run until 15 Dec 2026 | **DONE** | Demo mode needs no key and makes no paid calls |

---

## 8. Devpost facts table

| Field | Value to use |
|---|---|
| Project name | Sentinel Graph — Agentic Fraud Investigation |
| One-liner | Graph-grounded fraud investigations where NVIDIA Nemotron proposes and a deterministic policy engine decides. |
| Repo | `https://github.com/shaikmohammedyasin-create/hhgoa-sentinel-console` (branch `nebius-submission`) |
| Live demo | Not yet valid — UI-only Vercel deploy; local `docker compose up --build` → `:8008` |
| Built with | Python 3.11+/FastAPI, SQLite graph store (TigerGraph-compatible traversal), Next.js 15 console, Nebius Token Factory, NVIDIA Nemotron 3 Nano / Super / Ultra |
| Data | 100% synthetic, regenerable: 12,235 transactions, 4,201 identity records, 20 investigation cases, 28 closed cases (row counts verified today) |
| Tests | 278 passed, 9 skipped (6 TigerGraph-live, 3 approval-conditional) |
| Engine fidelity | verdict 20/20, pattern 20/20 (self-consistency on the synthetic pack) |
| Honest baseline | risk-threshold-only F1 1.0 @ 0.70 — the graph layer is not yet shown to add lift on this pack |
| Live Nemotron result | prior committed: 60% verdict / 85% pattern on the original dataset; not re-measured |
| Licence | MIT |
| Cost to run | $0 in demo mode (no key, no calls) |

---

## 9. Open issues, by severity

**1 — BLOCKER: the case file never loads.**
`sentinel-ui/src/lib/api.ts:106` calls `GET /api/investigations/${id}`. The backend
has no such route (only `/api/investigations/{id}/full`, `/graph`, `/risk`, plus
`/investigations/{id}` at `backend/main.py:161`). Result: 404 on every case, CASE
FILE tab renders "No answer file for this case yet", ASK disabled. The shape already
matches — `/investigations/{id}` returns exactly the `AnswerFile` interface.
Fix (either): add an alias route mirroring the demo-fallback handler at
`backend/main.py:161-182`, or change the client to `/investigations/${id}`.
Not fixed here: this run was scoped to verification only.

**2 — BLOCKER: the public link is not a demo.**
`sentinel-ui` is same-origin; on Vercel there is no backend, so `/api/cases` 404s
and the queue is empty. Fix: deploy FastAPI somewhere reachable and point
`NEXT_PUBLIC_API_BASE` at it (the client honours it), or drop the live-link claim
and ship the container as the demo surface.

**3 — HIGH: re-prove always claims success.**
`backend/main.py:305` guards with `hasattr(qrouter, query_name)`. Evidence refs are
emitted as `query:card_transaction_history(...)` but the router exposes
`get_card_transaction_history` (`backend/graph/query_router.py`), so the branch never
runs — and because the miss is not an exception, the response is `ok: true`,
`rows: 0`, note "evidence verified reproducible". Verified with three refs, including
a deliberately fake query name: all three returned `ok: true`. A trust feature that
always says "verified" is worse than no feature. Fix: return `ok: false` when the
query name is unknown, and map the ref names to the real functions.

**4 — MEDIUM: case deep links return JSON on the single-URL demo.**
`_API_PREFIXES` reserves `/cases/` (`backend/main.py:1009-1012`), and the API route
`/cases/{case_id}` is registered first, so `GET /cases/CASE-004` on `:8012` returns
`application/json`. Client-side navigation works; refresh or bookmark breaks. Fix:
move the UI route to `/case/[caseId]`, or proxy `/cases/<id>` to the UI when the
request accepts HTML.

**5 — MEDIUM: documents disagree with today's measurements.**
`docs/TECHNICAL_VALIDATION.md:5-6` claims "257 / 257 Passed" and "600 / 600
checkpoints"; today is 278 passed / 9 skipped, and no checkpoint artifact is
committed (`/benchmark/checkpoints` → 404). The same file reports 19/20 verdict and
15/20 NBA, while README and `docs/BENCHMARK.md` claim 20/20. `docs/DEMO.md:76`
instructs the presenter to say "20/20 cases, 600/600 checkpoints, verified by a
257-test suite" — two of those three numbers do not reproduce. `docs/DEPLOY.md:14-25`
still describes a static frontend and a `llm_answer_cache.json` replay, but the
frontend is a Next standalone server and demo mode serves the committed case files.
Regenerate or delete these pages before submission.

**6 — MEDIUM: no lint gate.**
No ruff, no eslint config, no local eslint binary. Tests and types pass; style is
unenforced. Either add configs or stop implying a lint gate exists.

**7 — LOW: browser smoke suite cannot run as written.**
`npm run smoke` fails before any assertion: Playwright expects
`chromium_headless_shell-1148`, only `chromium-1248` is cached, and
`e2e/smoke.mjs:25` has no `executablePath` override. Its masthead assertion
(`getByText("SENTINEL", {exact: true})`) also no longer matches the header markup.
The ad-hoc Chromium pass in Section 4 used the cached binary directly.

**8 — LOW: benchmark artifact implies a latency the demo will not show.**
`cases/_benchmark_report.json` is a committed LLM-path run (12–35 s/case). Demo mode
answers in ~0.4 s. Label the file as a live-run artifact in the UI, or state the
distinction on the benchmark screen.

**9 — LOW: environment skew.**
Verified on Python 3.14.5 / Node 24; Docker pins 3.12 / Node 20. Consider running
the suite once inside the container to close the gap (blocked today: daemon down).

**10 — UNVERIFIED, not a defect:** gitleaks, Docker build, and every keyed Nemotron
measurement. Install the tool / start the daemon / supply a key before claiming them
in the submission.
