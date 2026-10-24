# Technical validation

Every number below was produced by a command in this repository, and each
section says which one. Where a claim comes from the original review round and
cannot be re-run here, it is labelled **recorded**, not **verified**.

Last captured: 24 October 2026.

---

## 1. What was measured in this round

| Measurement | Result | Command |
|---|---|---|
| Test suite | **290 passed, 9 skipped, 0 failed** (16.27 s) | `pytest -q -rs` |
| Verdict accuracy, committed answers | **20/20** (F1 1.000) | `python -m backend.evaluation.validate_answers` |
| Pattern accuracy, committed answers | **20/20** | `python scripts/compare_baselines.py` |
| Evidence checkpoints | **600/600** | `python -m backend.evaluation.validate_answers` |
| 20-case benchmark run | **20/20 completed, 0 failed, 457 s** | `python -m backend.evaluation.run_benchmark` |
| Per-case latency | **12.02 – 35.28 s** (mean 22.84) | `cases/_benchmark_report.json` |
| Browser suite | **33/33 checks, 0 console errors** | `node e2e/smoke.mjs` |
| Container build + boot | **build exit 0 (983 MB), container healthy** | `docker compose build && docker compose up -d` |
| Container test suite (Python 3.12.15) | **290 passed, 9 skipped** (5.33 s) | `docker exec hhgoa-demo python -m pytest -q -rs` |
| Container browser suite | **32/32 checks, 0 console errors** | `BASE=http://127.0.0.1:8008 node e2e/smoke.mjs` |
| Python lint gate | **0 findings** | `ruff check backend scripts tests` |
| UI lint gate | **0 errors, 0 warnings** | `npx eslint . --max-warnings=0` |
| UI types | **clean** | `tsc --noEmit` |

Provenance matters more than the numbers, so:

- **The accuracy figures are the deterministic engine's**, scored against
  `cases/ground_truth.json` over the 20 committed answer files. They are not a
  model-accuracy claim.
- **The 457 s run** is the committed `_benchmark_report.json`, produced on a
  keyed Nebius Token Factory / Nemotron pass over the same 20 cases
  (15 fraud, 5 legitimate, 15 SAR filed). It is a recorded run, and the UI
  says so when it replays it.
- **The live Nemotron-on-LLM path** on the original (non-redistributed)
  dataset scored **60% verdict / 85% pattern**. That measurement is
  **recorded**, not reproducible from this repository — the dataset is not
  redistributable. `docs/BENCHMARK.md` prints both numbers side by side so the
  gap is visible rather than hidden.

---

## 2. The 20-case pack

| Metric | Result | Note |
|---|:---:|---|
| Cases completed | **20 / 20** | 0 crashes, 0 timeouts, 0 unhandled exceptions |
| Evidence checkpoints | **600 / 600** | Structural, data, provenance, and policy checks per case |
| Verdict vs ground truth | **20 / 20** | tp 15, fp 0, tn 5, fn 0 — precision 1.0, recall 1.0, F1 1.0 |
| Pattern vs ground truth | **20 / 20** | Primary pattern match |
| Verdict mix | 15 fraud / 5 legitimate | — |
| SAR filed | 15 | One per fraud verdict |
| Pattern mix | cnp_new_device 6, cnp_fraud 6, none 5, undocumented 2, account_takeover 1 | — |

Wall clock 457.0 s; 12.02 s fastest case, 35.28 s slowest, 22.84 s mean.

A perfect score on a 20-case pack is a small sample and is stated as such. The
purpose of this pack is to prove the pipeline runs end to end and that every
checkpoint is checkable; it is not a claim about production fraud rates. The
live-LLM number (60%/85%) is the honest estimate of what the model contributes.

---

## 3. Test suite

```text
$ pytest -q -rs
290 passed, 9 skipped, 277 warnings in 16.27s
```

Nine skips, each with a stated reason:

| Count | Reason |
|---:|---|
| 3 | `test_agentic_upgrades.py`: the replayed case produced no pending approvals, so the approval-path assertions have nothing to act on |
| 6 | `test_tigergraph_live_agent.py`: `TG_HOST` not configured — these exercise the cloud client against a live instance |

Coverage of what actually runs:

- **Unit** — Bayesian Noisy-OR mathematics, pattern detectors, evidence
  provenance invariants, policy rules R1–R11, Pydantic contracts, demo-mode
  protections (answer cache, per-IP limiter, daily cap).
- **Integration** — FastAPI endpoints, contract fixes (alias route, re-prove,
  reasoning proxy), SQLite idempotency, audit-event logging, approval state
  transitions, and all four Nemotron roles against mocked Token Factory
  responses (valid/invalid JSON, unknown evidence ids, timeout fallback,
  prompt-injection rejection, propose/decide override).
- `tests/conftest.py` clears `NEBIUS_API_KEY` so the suite never spends
  credits and always exercises the deterministic path.

---

## 4. TigerGraph

**Verified here:** `GRAPH_BACKEND=local` runs the traversal logic against the
SQLite store built from `data/synthetic/`, and the whole suite and benchmark
pass on it. That is the path the container ships.

**Recorded, not re-verified:** the original round ran against a TigerGraph
Savanna Cloud instance with:

- 8 vertices (`Customer`, `Card`, `Transaction`, `DeviceProfile`,
  `EmailDomain`, `BillingRegion`, `ClosedCase`, `InvestigationCase`) and the
  edge set that connects them;
- installed GSQL queries `device_neighbors` and `cases_by_device`;
- `STRICT_GRAPH_BACKEND=1`, where an unreachable cluster raises HTTP 503
  instead of silently fabricating results.

Those cloud figures are **not reproducible in this repository** — no cluster
is attached and no credentials are included. `GET /health` reports which
backend actually answered, so a run never has to be trusted on the label
alone.

---

## 5. Browser verification

The old suite drove a tabbed UI that no longer exists (causal ribbon, D3
canvas, Drizzle-style posting ledger). It was replaced with
`sentinel-ui/e2e/smoke.mjs`, which drives a real Chromium against the shipped
production build.

```bash
cd sentinel-ui
BASE=http://127.0.0.1:3000 SNAPSHOT=1 node e2e/smoke.mjs
# 33/33 checks passed
```

What it asserts, and why each one earns its place:

- the masthead renders and **labels its data source** (`static snapshot ·
  recorded run` in snapshot mode, `demo mode` / `live backend` otherwise);
- the palette is light even when the OS says dark, and the typeface is the one
  the design specifies;
- the queue lists ≥ 20 rows and a case opens **on arrival** — an earlier build
  landed on an empty pane, which this check caught;
- all five tabs exist and their bodies render (verdict grid, evidence ledger,
  audit timeline with rows, raw `answer.json`);
- the case subgraph draws ≥ 3 nodes and a focus ring;
- the pack table lists every case and shows measured latencies;
- in snapshot mode, the pack carries the **"Recorded run, replayed from the
  snapshot"** disclaimer — a static page must not pass recorded engine latency
  off as its own response time;
- the ring screen states the missing capability instead of drawing a fake
  network;
- the approvals overlay opens and closes;
- the guided demo starts and stops;
- no sideways scroll at 1100 px;
- **zero console errors or page exceptions** for the entire run.

The suite fails the run on any console error. `CHROME_PATH` overrides the
browser; otherwise it uses the newest cached Playwright Chromium, because
pinning the bundled revision made this suite unrunnable on a machine that had
a different build cached.

---

## 6. Security and credential isolation

- **Secret scan:** `gitleaks` v8.30.1 over the full git history
  (`gitleaks git . --redact`) - **92 commits, 9.21 MB, 0 findings**, exit 0.
  A pattern pass over the 219 tracked files (`nvapi-`, `sk-`, GitHub tokens,
  `AKIA`, Slack tokens, private-key headers, JWT-shaped strings) also returned
  zero.
- **Environment isolation:** secrets load only through `pydantic-settings`
  from `.env`; `.env`, `.env.*` are gitignored. `sentinel-ui/.env.local`, which
  the Vercel CLI wrote with a short-lived OIDC token, is gitignored, absent from
  `git ls-files`, and never appears in `git log --all`; it is also listed in
  `sentinel-ui/.vercelignore`, so a deployment cannot upload it.
- **Data isolation:** only synthetic CSVs (`data/synthetic/`) are tracked. No
  third-party dataset, customer record, or real identifier is in the tree, and
  `.dockerignore` keeps local/round data out of the image. The published demo
  snapshot (21 files, 966 KB) was scanned for absolute paths and usernames: none.
- **Fail-closed:** in strict graph mode an unreachable backend returns 503
  rather than falling back to fabricated data.
- **Rate limits:** 20 model calls per IP per hour and 200 per day by default,
  after which the deterministic path answers.

---

## 7. What is not verified

Listed so no reader has to guess:

| Claim | Status | Why |
|---|---|---|
| Live Nemotron accuracy on the original dataset (60%/85%) | **recorded** | dataset not redistributable |
| TigerGraph Savanna Cloud schema, queries, latency | **recorded** | no cluster or credentials attached |
| `gitleaks` clean | **verified** | v8.30.1, full history, 0 findings |
| Docker image build/boot | **verified** | `docker compose build` exit 0 (983 MB), container healthy on `:8008`, 32/32 browser checks, 290 passed / 9 skipped on Python 3.12.15 inside the image |
| Vercel snapshot deployment reachable | **verified** | `/`, `/demo/index.json`, `/cases/CASE-004`, `/benchmark`, `/ring` all 200; 33/33 browser checks against the live URL |

---

## Release re-verification (24 October 2026, release review)

The capture above records its original round and is left untouched. This table
records only what was re-run for the release review, on the same machine.

| Gate | Result | Command |
|---|---|---|
| Backend test suite | **353 passed, 9 skipped** | `pytest tests/ -q` |
| Python lint | **0 findings** | `ruff check backend scripts tests` |
| UI typecheck | **clean** | `npx tsc --noEmit` |
| UI lint | **0 warnings** | `npx eslint . --max-warnings=0` |
| UI production build | **exit 0** | `npm run build` |
| Browser suite (system Edge) | **32/32 checks, 0 console errors** | `BASE=http://127.0.0.1:3000 CHROME_PATH=<msedge> node e2e/smoke.mjs` |
| Request-size guard | **413 above 1 MB, 200 for normal requests** | live `POST /investigations` |
| Demo-mode write guards | create replays, benchmark 409, evidence 409, case pack mtime unchanged | live API |
| Test-run pack isolation | **pack untouched** by a full suite | mtime comparison before/after |
| Container build/boot | **BLOCKED — ENVIRONMENT**: Docker daemon unavailable, not re-verified | `docker compose build` |
| Container test suite / container browser suite | **NOT RE-RUN** for this release | — |
