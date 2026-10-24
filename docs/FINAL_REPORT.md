# Final Report — Sentinel Graph (Nebius × NVIDIA Hackathon)

Run date: 2026-10-24. Every number below was produced by a command run in this
session against the tree at commit `e08181a` on branch `main`, plus the container
fixes in `82298ce` (the two commits that close out the round are these plus the
documentation update you are reading). Anything that could not be
verified is marked **NOT RUN** with the reason. Nothing here is copied from memory
or from an earlier document; where an old document disagreed with the measurement,
the disagreement and its disposition are recorded in Section 9.

---

## Executive summary

1. Repository: `shaikmohammedyasin-create/hhgoa-sentinel-console` (private), branch
   `main`, 94 commits, 220 tracked files, MIT licence. Measurements were taken on
   `e08181a`, plus the container fixes in `82298ce`. Only remote is `origin`; the
   retired upstream repo is not referenced.
2. Automated tests: **290 passed, 9 skipped** in 16.27 s. Skips are 6 live-TigerGraph
   tests (no host configured) and 3 approval tests conditional on a pending approval.
3. Gates that did not exist before now exist and pass: `ruff check` clean,
   `eslint . --max-warnings=0` exit 0, `tsc --noEmit` clean, `next build` 6 routes,
   browser suite **33/33** hosted and **32/32** against the container.
4. Evaluation (offline, deterministic engine): verdict **20/20**, pattern **20/20**
   against `cases/ground_truth.json`, tp 15 / fp 0 / tn 5 / fn 0, 600/600 evidence
   checkpoints. This is fidelity, not generalisation — the same rule set produced both
   sides.
5. Baseline weakness, measured: a single `risk_score` threshold reaches **F1 = 1.0 at
   0.70** on this synthetic pack. The graph-evidence layer has not been shown to beat
   that on this data.
6. Live Nemotron path: **NOT RUN** — no `NEBIUS_API_KEY` in this environment.
   `/api/llm/status` reports `available: false`, 0 calls. The 60% verdict / 85%
   pattern live figures remain prior committed evidence, not a measurement made here.
   The live code path also had a real defect (an unbound local that broke every
   successful call); it is fixed, and that fix is code-verified rather than
   key-verified.
7. Hosted demo: **works**, at `https://sentinel-ui-nu.vercel.app`. It is a *recorded
   replay*, not a live engine: the console reads a committed 20-case snapshot and says
   so in the masthead. The browser suite passes 33/33 against that URL, including the
   label assertion and "a case is open on arrival".
8. **The two blockers from the review round are closed.** The case file loads (the
   `/api` route is aliased to the same handler), and the public link is a functioning
   demo. Both are covered by tests, not by inspection.
9. Container path **works**: `docker compose build` exit 0 (983 MB), container
   healthy, `prepare_data` rebuilds the store in 3.2 s, `/` and `/cases/CASE-004`
   serve HTML on `:8008`, the alias returns the answer file, and the suite passes
   **290 passed / 9 skipped on Python 3.12.15 inside the image**.
10. **Verdict: READY to submit**, with the limits stated here rather than buried:
    nothing keyed was measured in this environment (Section 3), and the demo video
    and Devpost entry are still to be produced (Section 7, rows 8-9).

---

## 1. Repository and safety

| Check | Result |
|---|---|
| `pwd` | `C:\Users\ghi26\AppData\Local\Temp\opencode\hhgoa-scrubbed` |
| `git remote -v` | `origin https://github.com/shaikmohammedyasin-create/hhgoa-sentinel-console.git` (fetch+push) |
| Retired upstream remote | absent (single remote) |
| Branch / HEAD | `main` / `e08181a` + container fixes `82298ce` |
| Commits | 94 (last is this documentation update) |
| First / last commit | `a50e635` 2026-09-19 / 2026-10-24 |
| Tracked files | 220 |
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

**Secret scan:** `gitleaks` **was run** — v8.30.1, full git history
(`gitleaks git . --redact`): **92 commits, 9.21 MB scanned, 0 findings**, exit 0.
A pattern pass over the 219 tracked files (`nvapi-…`, `sk-…`, `ghp_/gho_/ghs_…`,
`AKIA…`, `xox…`, private-key headers, JWT-shaped strings) also returned **0
hits**. `.env` is not tracked; only `.env.example` files are.
`sentinel-ui/.env.local` — which the Vercel CLI wrote with a short-lived OIDC
token — is gitignored, untracked (`git ls-files` confirms), never committed, and
listed in `sentinel-ui/.vercelignore` so a deployment cannot upload it. The
published demo snapshot (21 files, 966 KB) was scanned separately for absolute
paths and usernames: **0 hits**.

**Provenance risk accepted and recorded:** `sentinel-ui/NOTICE.md` states the UI
was derived from an unlicensed upstream project; the licence posture is
documented rather than hidden.

---

## 2. Tests and build

Commands run from the repo root unless noted; Python is the project venv.

| Gate | Command | Result |
|---|---|---|
| Python tests | `python -m pytest -q -rs` | **290 passed, 9 skipped**, 16.27 s |
| Skip census | `python -m pytest -q -rs` | 6 × "TigerGraph host not configured", 3 × "case produced no pending approvals" |
| Python lint | `ruff check backend scripts tests` | **clean** — `select = [E9, F, I]` in `pyproject.toml` |
| UI types | `cd sentinel-ui && npx tsc --noEmit` | clean, exit 0 |
| UI lint | `npx eslint . --max-warnings=0` | **0 errors, 0 warnings**, exit 0 |
| UI build | `node --max-old-space-size=4096 ./node_modules/next/dist/bin/next build` | success, 6 routes (`/`, `/_not-found`, `/approvals`, `/benchmark`, `/cases/[caseId]`, `/ring`), shared JS 103 kB |
| Browser suite | `BASE=… SNAPSHOT=1 node e2e/smoke.mjs` | **33/33 checks**, run twice locally and again against the deployed URL |
| Docker build | `docker compose build` | **success**, image 983 MB, exit 0 |
| Container tests | `docker exec hhgoa-demo python -m pytest -q -rs` | **290 passed, 9 skipped** in 5.33 s on **Python 3.12.15** (same nine skips) |
| Container browser suite | `BASE=http://127.0.0.1:8008 node e2e/smoke.mjs` | **32/32 checks**, zero console errors (the snapshot-only assertions are skipped in live mode) |

Toolchain used on the host: **Python 3.14.5**, **Node v24.15.0**, Windows 11.
The image pins Python 3.12 / Node 20, so the same suite was also run inside the
built image: 290 passed / 9 skipped on **3.12.15**, and `npm ci` + `next build`
under **node:20-slim** completed as part of the image build. The skew is now
covered rather than merely disclosed.

Warning: a full test run can rewrite `cases/*.json`. It did not this run
(`git status` stayed clean afterwards), but treat it as a hazard when re-running.
Inside the container the rewrite is harmless — it happens in a copy, not the tree.

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

**A defect in this path was found and fixed while adding the lint gate.** In
`backend/llm/nebius_client.py`, `latency_ms` was referenced inside the usage dict
before the line that assigned it, so every *successful* live call raised
`UnboundLocalError` and fell through to the deterministic fallback — the failure was
invisible without a key because the early return happens first. No test covered the
success path, which is why it survived. Fixed in `ef01602`; the live path is still
**NOT RUN** here, so the fix is code-verified, not key-verified.

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
| `GET /api/investigations/CASE-004` | 200, 6,758 B — identical body to the unprefixed route (issue 1) |
| `GET /benchmark/report` | 200, committed prior benchmark artifact (20 cases, 457 s) |
| `GET /benchmark/checkpoints` | **404 — no checkpoint artifact is committed**; the 600/600 figure comes from a generated report, and the endpoint says so rather than inventing one |
| `POST /api/reprove` | honest now (issue 3): unknown query → `ok:false`; a known query that returns nothing → `ok:true, reproduced:false` with the reason |

**Demo-mode replay verified from an empty database** (`APP_DB` pointed at a fresh
file, `DEMO_MODE=1`): `GET /investigations/CASE-004` → 200 served from the
committed answer file; `GET /investigations/CASE-999` → 404. With `DEMO_MODE=0`
and the same empty database: `GET /investigations/CASE-004` → **404**, so strict
mode is not silently permissive.

**Re-prove honesty, probed directly** (`POST /api/reprove` on the running service):

```
query:definitely_not_a_query(x=1)
  ok=False  reproduced=False  "Unknown graph query … cannot be re-proved."
query:card_transaction_history(card_id=1)
  ok=True   reproduced=False  "Re-executed get_card_transaction_history: ran but
                               returned no rows, so the cited evidence was not
                               reproduced."
query:accounts_sharing_device(device=desktop)
  ok=True   reproduced=False  same shape, device alias mapped to device_label
```

`ok` means the request was understood; `reproduced` means the cited evidence came
back. Only the second is a claim about evidence, and it is no longer automatic.

**Single-URL co-hosting verified** (API on 8010 with the UI proxy engaged):
`/` 200 `text/html`, `/favicon.svg` 200, `/approvals` 200, `/benchmark` 200,
`/ring` 200, `/api/cases` 200, `/unknown-route-xyz` 404. Deep link
`/cases/CASE-004` is **content-negotiated** (issue 4): with
`Accept: text/html` it returns the page (15,522 B, `text/html`), so refresh and
bookmark work. With `Accept: application/json` it returns the *stored case memory* —
200 (17,280 B) on a store where that case has been run, and a 404 naming the reason
on a freshly built container where it has not. The answer file lives at
`/investigations/{id}`, and on a clean container both `/investigations/CASE-004` and
`/api/investigations/CASE-004` still return it (8,096 B) from the committed case
files via the demo fallback.

**Browser check** (`sentinel-ui/e2e/smoke.mjs`, real Chromium, against the standalone
build and again against the deployed URL): 33/33 checks, **zero console errors**.
The queue lists 20 cases and a case is **open on arrival** — the earlier build landed
on an empty pane, and that assertion is what caught it. The case file renders its
verdict grid and evidence ledger, the timeline shows 16 events, the subgraph draws 16
nodes with a focus ring, the pack lists all 20 cases with a "recorded run" banner,
and the ring screen states the missing capability. The masthead reads
`static snapshot · recorded run` on the hosted build and `demo mode · committed cases`
with `nemotron unavailable` locally, so the data source is never implied.

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
| `docker compose up --build` → `http://localhost:8008` | **verified today**: `docker compose build` exit 0 (983 MB image), container reports **healthy**, and the probes below all behave |
| Vercel `https://sentinel-ui-nu.vercel.app` | **verified today**: `/` 200 (6,622 B), `/demo/index.json` 200 (40,985 B), `/cases/CASE-004` 200 `text/html`, `/benchmark` 200, `/ring` 200; **33/33** browser checks pass against the live URL including "labels itself a static snapshot" and "a case is open" |
| Live Nemotron cost per case | **NOT RUN** — no calls made |
| Demo-mode cost | zero by construction; confirmed `calls_logged: 0` |

The container path was built and booted, not just read:

```
docker compose build        -> EXIT=0, image hhgoa-scrubbed-app 983 MB
docker compose up -d        -> hhgoa-demo healthy (start_period 40 s respected)
docker exec hhgoa-demo python --version -> Python 3.12.15
```

`prepare_data` ran on container paths and rebuilt the store from the synthetic CSVs
in 3.2 s (`12,235` transactions, `4,201` identity rows, `28` closed cases, `20`
case-pack rows). `scripts/docker_entrypoint.sh` then started Next standalone on
3000 and uvicorn on 8000; the FastAPI proxy serves the console on the same port.

Probed from the host against `http://127.0.0.1:8008`:

| Path | Result |
|---|---|
| `/health` | 200 JSON, 210 B |
| `/api/cases` | 200 JSON, 6,631 B (20 cases) |
| `/api/llm/status` | 200 JSON, `available: false`, `calls_logged: 0` — demo mode, no key, no paid calls |
| `/api/investigations/CASE-004` | 200 JSON, 8,096 B — the alias works in the container too |
| `/investigations/CASE-004` | 200 JSON, 8,096 B — byte-identical to the alias |
| `/` | 200 `text/html`, 6,622 B |
| `/cases/CASE-004` (`Accept: text/html`) | 200 `text/html`, 16,053 B — deep link works |
| `/favicon.svg`, `/benchmark`, `/ring` | 200 |
| `/unknown-route-xyz` | 404 JSON |

The browser suite run against that container passes **32/32** with zero console
errors; the 33rd assertion is snapshot-only and is correctly skipped in live mode.
The full pytest suite passes inside the image on Python 3.12.15 (Section 2).

Two honest notes about the container:

- **`tests/` and `docs/` are excluded by `.dockerignore`**, so pytest is not
  installed-in-place: the suite was copied in with `docker cp tests`,
  `docker cp pyproject.toml` before running. The image is a runtime image, not a
  test image.
- **`sentinel-ui/.env.local` no longer enters the build context.** A bare
  `.env.*` pattern only matches the context root, so the Vercel CLI's
  short-lived OIDC token was being copied into the UI build stage and loaded by
  `next build` (`Environments: .env.local` in the log). `.dockerignore` now uses
  `**/.env*` with `!**/.env.example`; the rebuild log has no `Environments:` line
  and `find / -name '.env*'` inside the built image returns nothing.

`/cases/<id>` returns the *stored* case memory, which on a freshly-built container
is a 404 with the reason (`Case CASE-004 not found in app state or graph`) because
no case has been run yet in that instance. The HTML branch is unaffected — that is
the branch issue 4 was about — and `/investigations/<id>` is the endpoint that
serves the committed answer file in demo mode.

Budget/cost controls are code-verified, not load-tested: per-IP hourly limiter,
global daily cap, demo answer cache, JSONL call log (`docs/DEPLOY.md:49-56`).
No dollar figure is asserted in this report because none was measured today.

---

## 7. Submission checklist

| # | Item | Status | Evidence / gap |
|---|---|---|---|
| 1 | Public or judge-accessible repo with code | **DONE (private)** | `hhgoa-sentinel-console`, default branch `main`; must be made public or shared with judges |
| 2 | MIT licence in repo | **DONE** | `LICENSE`, MIT, 2026 |
| 3 | Runnable instructions | **DONE** | README + `docs/DEPLOY.md`; `docker compose build` exit 0, container healthy, 32/32 browser checks against it (Section 6) |
| 4 | Working hosted demo link | **DONE** | `https://sentinel-ui-nu.vercel.app` — recorded-snapshot console, 33/33 browser checks against production; labelled `static snapshot · recorded run` |
| 5 | Console opens a case and shows the case file | **DONE** | Case opens on arrival; verdict grid + evidence ledger asserted in the smoke suite, and the `/api` alias pinned by `test_contract_fixes.py` |
| 6 | Nemotron + Nebius used at runtime | **PARTIAL** | Code path complete; no key present, so 0 live calls this session |
| 7 | Benchmark numbers that survive a re-run | **PARTIAL** | 20/20 and F1 1.0 reproduce; live 60%/85% cannot be re-run without key + original data |
| 8 | Demo video | **NOT DONE** | No recording in repo; needs a browser pass after Blocker 1 |
| 9 | Devpost write-up | **NOT DONE** | Section 8 is the fact sheet to write from |
| 10 | Delete or correct stale claims | **DONE** | Section 9 issue 5: six documents rewritten from a fresh capture; unrerunnable claims labelled **recorded**, not verified |
| 11 | No secrets / no third-party data in tree | **DONE** | Section 1: gitleaks full history, 92 commits, 0 findings; only synthetic CSVs tracked |
| 12 | Free to run until 15 Dec 2026 | **DONE** | Demo mode needs no key and makes no paid calls |

---

## 8. Devpost facts table

| Field | Value to use |
|---|---|
| Project name | Sentinel Graph — Agentic Fraud Investigation |
| One-liner | Graph-grounded fraud investigations where NVIDIA Nemotron proposes and a deterministic policy engine decides. |
| Repo | `https://github.com/shaikmohammedyasin-create/hhgoa-sentinel-console` (branch `main`) |
| Live demo | `https://sentinel-ui-nu.vercel.app` — console replaying a recorded 20-case run from a committed snapshot; every screen loads, and the two endpoints that need a live engine say so instead of faking a result |
| Built with | Python 3.11+/FastAPI, SQLite graph store (TigerGraph-compatible traversal), Next.js 15 console, Nebius Token Factory, NVIDIA Nemotron 3 Nano / Super / Ultra |
| Data | 100% synthetic, regenerable: 12,235 transactions, 4,201 identity records, 20 investigation cases, 28 closed cases (row counts verified today) |
| Tests | 290 passed, 9 skipped (6 TigerGraph-live, 3 approval-conditional) |
| Engine fidelity | verdict 20/20, pattern 20/20 (self-consistency on the synthetic pack) |
| Honest baseline | risk-threshold-only F1 1.0 @ 0.70 — the graph layer is not yet shown to add lift on this pack |
| Live Nemotron result | prior committed: 60% verdict / 85% pattern on the original dataset; not re-measured |
| Licence | MIT |
| Cost to run | $0 in demo mode (no key, no calls) |

---

## 9. Issues found in the review round — disposition

Ten issues were raised against the previous revision. Nine are fixed, with the fix
and its evidence named. One remains open because it needs something this
environment does not have — an API key — and it is listed as open rather than
downgraded.

**1 — FIXED (was BLOCKER): the case file never loaded.**
The console calls `GET /api/investigations/{id}`; the backend only had the
unprefixed route. Both paths now share one handler in `backend/main.py`, so they
cannot drift, and the demo-fallback logic is not duplicated.
*Evidence:* `tests/integration/test_contract_fixes.py` pins the alias (13 tests in
the file); every case in the browser suite opens with a populated case file.

**2 — FIXED (was BLOCKER): the public link was not a demo.**
`sentinel-ui` is same-origin and there is no FastAPI process next to the static
deployment. Rather than deploy Python (the Vercel root is `sentinel-ui/`) or drop
the link, the console now runs against a committed snapshot:
`scripts/export_ui_demo.py` writes the 21 real responses to
`sentinel-ui/public/demo/`, and `NEXT_PUBLIC_DEMO_DATA=1` makes the client replay
them. The two endpoints that need a live engine — running the benchmark and
analyst Q&A — refuse and say why instead of returning a fabricated result, and the
masthead reads `static snapshot · recorded run` rather than claiming a health
check that does not exist.
*Evidence:* Section 6; browser suite in `SNAPSHOT=1` mode asserts the labels.

**3 — FIXED (was HIGH): re-prove always claimed success.**
`reprove_query` resolved nothing and still returned `ok: true`, `rows: 0`, "evidence
verified reproducible" — a trust feature that always says "verified". It now
resolves `get_`-prefixed names, maps `device` to the stored `device_label`, coerces
parameter types, and returns `ok: false` with `reproduced: false` and a written
reason when a reference names an unknown query or omits required parameters.
*Evidence:* `test_contract_fixes.py` covers a real ref, an unknown query name and an
under-specified ref; the last two assert `ok is False`.

**4 — FIXED (was MEDIUM): case deep links returned JSON.**
`GET /cases/CASE-004` on the single-URL demo hit the API route because `/cases/` is
a reserved prefix. The handler now sniffs `Accept:` and hands an HTML request to the
UI proxy, through an extracted `_proxy_to_ui` helper shared with the catch-all, so
refresh and bookmark work.
*Evidence:* `test_contract_fixes.py` asserts HTML and JSON for the same path.

**5 — FIXED (was MEDIUM): documents disagreed with the measurements.**
`docs/TECHNICAL_VALIDATION.md`, `docs/DEMO.md`, `docs/DEPLOY.md`,
`docs/FEEDBACK_NOTES.md`, `docs/BENCHMARK.md` and the README were rewritten from a
fresh capture, with the command beside every number. Claims that cannot be re-run
here — the live-model 60%/85%, the TigerGraph cloud schema — are labelled
**recorded**, not verified, and appear in a "what is not verified" table. The
`257 / 257` and `278` test counts are gone; the static-frontend wording is gone;
the `llm_answer_cache.json` claim is corrected (it is a gitignored runtime artifact,
not something a fresh clone contains).
*Evidence:* `git grep -n "257\|278 passed"` returns nothing; commit `e08181a`.

**6 — FIXED (was MEDIUM): no lint gate.**
Python: a deliberately narrow ruff gate (`select = [E9, F, I]`, line-length 100) —
real defects, not a style war. It found 14 dead stores and one unbound local in the
live LLM path (Section 3). UI: eslint 9 with `next/core-web-vitals` and
`next/typescript`, gated at `--max-warnings=0`, replacing the `next lint` script
that Next 15 had removed.
*Evidence:* `ruff check backend scripts tests` → `All checks passed`;
`npx eslint . --max-warnings=0` → exit 0; `tsc --noEmit` → exit 0.

**7 — FIXED (was LOW): the browser suite could not run.**
`e2e/smoke.mjs` was rewritten against the DOM that actually ships and now resolves a
browser by `CHROME_PATH`, then the newest cached `chromium-*`, then the bundled
revision — the pin is what made it unrunnable. Missing controls now name the
selector instead of throwing a bare TypeError, which is how the empty-pane defect
below was found.
*Evidence:* 33/33 checks, twice, against the standalone build.

**8 — FIXED (was LOW): the benchmark artifact implied a latency the demo will not
show.**
The pack view now carries a banner stating that these figures were measured on a
keyed run and are being replayed, so the page's own response times are not the
engine's. It also names the command that reproduces them — which was itself wrong in
the first draft of the fix (`python -m scripts.run_benchmark` does not exist;
corrected to `python -m backend.evaluation.run_benchmark`, and the built chunks were
grepped to confirm the stale string is gone).
*Evidence:* `PACK SNAPSHOT ROW` assertion in the smoke suite.

**9 — FIXED (was LOW): environment skew.**
The suite was verified on Python 3.14.5 / Node 24.15.0 while the image pins 3.12 /
Node 20. Both sides are now measured: `npm ci` + `next build` complete inside
`node:20-slim` as part of the image build, and the full suite runs **290 passed,
9 skipped in 5.33 s on Python 3.12.15** inside the built container
(`docker exec hhgoa-demo python -m pytest -q -rs`). A container-side test run is not
the same as a container-side *deployment* test, so Section 6 also probes the running
container and drives it with the browser suite.

**10 — HALF CLOSED: unverified third-party claims.**
`gitleaks` is no longer a gap: v8.30.1 was downloaded and run over the full history
(92 commits, 9.21 MB, **0 findings**), so the secret-scan claim is now a tool result
rather than a pattern pass. What remains genuinely unrun is every keyed Nemotron
measurement — there is no `NEBIUS_API_KEY` in this environment — and that is stated
wherever those numbers appear, including Section 3 and `docs/BENCHMARK.md`.

### Defects found while fixing the above

These were not on the original list and were found by driving the build:

- **Unbound local in the live LLM path** (`backend/llm/nebius_client.py`):
  `latency_ms` was read in the usage dict before it was assigned, so every
  *successful* live Nemotron call would have raised and silently fallen back. No test
  covered that path without a key. Fixed and committed (`ef01602`).
- **A policy gate with no enforcement** (`backend/policies/engine.py`): R10 only
  admits `BLOCK_ALL_CARDS` when two or more connected cards show confirmed fraud, but
  the rule held only because nothing emitted the action. It is now filtered out when
  the precondition fails, so a future emitter cannot bypass it (`57e712b`).
- **The console opened with an empty right pane**: nothing selected the first queue
  row on arrival, so a visitor had to click before seeing anything. Fixed
  (`ea562e0`), and the smoke suite now asserts a case is open on load.
- **A secret entering the image build context** (`.dockerignore`): a bare
  `.env.*` pattern only matches the context root, so `sentinel-ui/.env.local` — the
  file the Vercel CLI writes with a short-lived OIDC token — was copied into the UI
  build stage and loaded by `next build` (`Environments: .env.local` in the log).
  Fixed with `**/.env*` / `!**/.env.example`; the rebuilt image contains no
  `.env*` file at all.
- **A build that fails on a slow connection** (`Dockerfile`): `pip install` with the
  default 15 s read timeout aborted the build against PyPI on this machine
  (`ReadTimeoutError` at ~350 s). Now `--default-timeout=120 --retries 5`, because a
  judge on a worse connection than mine should not hit it.
- **A wrong command in the UI** (`python -m scripts.run_benchmark`), described under
  issue 8.
