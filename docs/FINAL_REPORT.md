# Sentinel Graph — Final Verification Report

Generated: 2026-10-25 (Asia/Calcutta) from a fresh run of every command below on this machine.
Repo: `C:\Users\ghi26\Documents\GITHUB\hhgoa-sentinel-console`
No secrets, API keys or real-dataset identifiers appear in this document.

---

## 1. REPO STATE (raw output)

```
C:\Users\ghi26\Documents\GITHUB\hhgoa-sentinel-console
--- remotes ---
origin	https://github.com/shaikmohammedyasin-create/hhgoa-sentinel-console.git (fetch)
origin	https://github.com/shaikmohammedyasin-create/hhgoa-sentinel-console.git (push)
--- branch ---
main
--- head ---
4b78651ed71e28189b4fc5a731aeaa904ef33ff9
--- commit count ---
117
--- status ---
(clean at the start of this run; the benchmark re-run below then rewrote the answer pack)
--- log ---
4b78651 docs: test count follows the suite (355)
2b110c8 test(e2e): wait for timeline rows instead of counting on first paint
41fb912 fix(ui): a dead backend says so instead of loading forever
6abe5a1 fix(config): demo mode is the default the docs promise
654f966 feat(ui): the case subgraph fills its pane
bbb5755 docs: record the live Vercel + Render deployment
b4e7b46 docs: test count follows the suite (354)
e479626 test(e2e): wait for the queue instead of counting on first paint
eb39806 fix(api): replayed cases show a timeline instead of nothing
57fdc68 feat(ui): guided demo tours every console view
7bad8f4 docs: state what the system actually does
83f50e4 data(case-009): regenerate answer file with the fixed writer
74b7501 ci: test the project that ships
a28eb2e fix(ui): unique evidence keys, safe clipboard, honest loading and replay state
82620aa fix(writer): correct output, provenance and test isolation
```

---

## 2. DOCUMENT CONSISTENCY (raw output)

Command:
`git grep -nE "278|257|228|600/600|19/20|HHGoa26-Agentic-Fraud-Investigation|Team CollabUp|localhost:8000|frontend/" -- README.md docs`

Raw hits and verdicts:

| Hit | Verdict |
|---|---|
| `README.md:316` forked from "Sentinel v2" by Team CollabUp (`r-rishit27/hacker_house` commit `7bcea03`) | **correct** (attribution) |
| `README.md` �15 attribution | **replaced (2026-10-25)**: the TODO is gone; README now states the facts and points at `docs/ATTRIBUTION_DRAFT.md` (two variants, neither applied) |
| `docs/CHANGELOG.md:31` "README test badge updated (278 passed / 9 skipped)" | **correct as history** (describes an old commit; not a current claim) |
| `docs/DEMO.md:86` `600/600` evidence checkpoints | **correct** (re-verified: 20 cases × 30 checkpoints) |
| `docs/DEPLOY.md:132` references `HHGoa26-Agentic-Fraud-Investigation` | **correct in context** (old Render service belongs to a different repo and was left untouched) |
| `docs/FALLBACK_PLAN.md:8-108` `frontend/…` | **correct in context** (plan describing the deleted vanilla frontend) |
| `docs/FEEDBACK_NOTES.md:27`, `docs/UI_PROVENANCE.md:9,17,50` Team CollabUp | **correct** (attribution) |
| `docs/TECHNICAL_VALIDATION.md:18-24` `600/600`, 22.84 s, 33/33, 457 s | **historical capture** ("Last captured: 24 October 2026") — dated record, superseded by this report |
| `docs/FINAL_REPORT.md` (previous version) | replaced by this document; it carried a stale NBA 100% (measured 95%) |

Raw heads:

```
===== README.md (first 25) =====
# Sentinel Graph: Agentic Fraud Investigation Platform

> An autonomous, evidence-grounded, policy-controlled fraud investigation platform powered by TigerGraph GraphRAG, calibrated Bayesian risk scoring, **NVIDIA Nemotron LLMs on Nebius Token Factory**, and human-in-the-loop governance.

<p align="center">
  <a href="https://www.python.org/"><img src="https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white" alt="Python"></a>
  <a href="https://fastapi.tiangolo.com/"><img src="https://img.shields.io/badge/FastAPI-REST%20API-009688?logo=fastapi&logoColor=white" alt="FastAPI"></a>
  <a href="https://nextjs.org/"><img src="https://img.shields.io/badge/Next.js-15%20App%20Router-black?logo=next.js&logoColor=white" alt="Next.js"></a>
  <a href="https://build.nvidia.com/nvidia"><img src="https://img.shields.io/badge/NVIDIA-Nemotron_3_%7C_Token_Factory-76B900" alt="NVIDIA Nemotron"></a>
  <a href="./docs/TECHNICAL_VALIDATION.md"><img src="https://img.shields.io/badge/Tests-355%20Passed%20%7C%209%20Skipped-2E7D32" alt="Tests"></a>
  <a href="./docs/BENCHMARK.md"><img src="https://img.shields.io/badge/Benchmark-20%2F20%20Verdict%20%7C%203--Arm%20Ablations-2E7D32" alt="Benchmark"></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License"></a>
</p>

---

## 0. Quickstart (5 Minutes, Zero Credentials)

```bash
git clone https://github.com/shaikmohammedyasin-create/hhgoa-sentinel-console.git
cd hhgoa-sentinel-console
docker compose up --build
# Open http://localhost:8008
```

===== docs/BENCHMARK.md (first 25) =====
# Sentinel Graph Benchmark & Baseline Evaluation

## Controlled Synthetic Benchmark (Pipeline Correctness, Not Real-World Accuracy)

This document records the empirical results of our three-arm benchmark evaluating graph-agentic fraud investigation against traditional score thresholds and bare LLM baselines.

> **Mandatory Real-Data Disclosure:**
> On the original hackathon round's real dataset (not redistributed), verdict accuracy was 60% (12/20) and pattern accuracy 85% (17/20). The synthetic benchmark checks pipeline correctness, not real-world accuracy.

---

## 1. Three-Arm Evaluation Methodology
...
===== docs/DEMO.md (first 25) =====
# Sentinel Graph: Demonstration Walkthrough

A structured 3-minute walkthrough of the Sentinel Graph analyst console demonstrating hybrid graph-agentic fraud investigation with NVIDIA Nemotron and deterministic policy governance.

---

## 1. Quickstart (Under 2 Minutes)
...
```

### Stale items found and fixed in this pass

- `git clone PUBLIC_REPO_URL` → real clone URL in `README.md` (2×) and `docs/DEPLOY.md` (1×).
- `docs/BENCHMARK.md` table refreshed to this run: NBA 100% → **95%** (19/20); Arm 2 precision/recall 0.8824/1.0000 → **0.9333/0.9333**; tokens per case → **1,809.5**; latency → **9.67 s**.
- `docs/FEEDBACK_NOTES.md` "Average 22.84s per case" → **9.67 s (re-measured 2026-10-25)**.
- `docs/UI_PROVENANCE.md` "33-check Playwright suite" → **32-check**.
- `README.md` §16 "Gitleaks scanned 93 commits" → "Gitleaks scanned the full history: 0 secrets found".
- `scripts/compare_baselines.py` cost line labelled an **assumption (2026-10-24), not an invoice**.

---

## 3. HISTORY AND SECRETS (raw output)

```
=== history path scan ===
no matches
=== tracked data/secret files ===
.env.example
data/synthetic/case_pack.csv
data/synthetic/closed_cases_history.csv
data/synthetic/identity.csv
data/synthetic/transactions.csv
sentinel-ui/.env.example
```

(These CSVs are the synthetic dataset produced by `scripts/make_synthetic_data.py`; intentional fixtures, not third-party data. Only `.env.example` templates are tracked — no real `.env`.)

Ten largest blobs in history:

```
1669261	docs/images/simplified_flow.png
1466231	docs/images/archi.png
1379168	docs/images/ballerina-logo.jpeg
1136687	data/synthetic/transactions.csv
116577	data/synthetic/identity.csv
55151	sentinel-ui/package-lock.json
19622	frontend/js/app.js
17734	backend/agents/orchestrator.py
17311	sentinel-ui/src/lib/generated/contract.ts
16046	README.md
```

`ballerina-logo.jpeg` exists **only in history** (early commit); the current tree tracks only `archi.png` and `simplified_flow.png` under `docs/images/`.

Gitleaks:

```
gitleaks version
8.30.1

gitleaks git . --redact --verbose
7:22AM INF 116 commits scanned.
7:22AM INF scanned ~13037362 bytes (13.04 MB) in 2.05s
7:22AM INF no leaks found
exit 0

gitleaks dir . --redact --verbose
7:23AM WRN leaks found: 22      (exit 1)
```

The 22 working-tree hits are **not committed and not project secrets**: 2 × local `.env` (developer's untracked key file), 18 × `.venv/Lib/site-packages/**` (third-party test fixtures), 4 × `sentinel-ui/.next/**` build-cache files (Next.js generates an encryption key per build). `gitleaks git` over the full history reports **0 findings**, which is the gate that matters.

---

## 4. TESTS AND GATES (raw summary lines)

```
pytest tests/ -q
355 passed, 9 skipped, 277 warnings in 18.54s

ruff check backend scripts tests
All checks passed!

npx tsc --noEmit
exit: 0

npx eslint . --max-warnings=0
exit: 0

npm run build
exit: 0  (7 routes prerendered)

node e2e/smoke.mjs   (BASE=http://127.0.0.1:3000, CHROME_PATH=<system Edge>)
32/32 checks passed
ok   no console errors
```

Docker: **NOT RUN — Docker Desktop daemon unavailable on this machine.**
`docker version` → `failed to connect to the docker API at npipe:////./pipe/dockerDesktopLinuxEngine … The system cannot find the file specified.`
Not produced: build exit code, image size, container health, in-image `find / -name ".env*"` proof.

Environment: local verification venv reports **Python 3.14.5**, Node **v24.15.0**, Next **15.5.25** (`^15.0.0`), React **18.3.1**, FastAPI **0.141.1**, pandas **3.0.6**, pydantic **2.13.5**, pytest **9.1.1**. The shipped container pins Python 3.12 (`Dockerfile`, `PYTHON_VERSION=3.12` on Render).

---

## 5. UI PROVENANCE

`sentinel-ui/NOTICE.md` (verbatim; the file's em-dashes render as `?` in this console):

```markdown
# Sentinel Console ? upstream attribution

The Sentinel console in this directory (`sentinel-ui/`) is a forked and
reworked copy of the "Sentinel v2" analyst console by Team CollabUp
(Hacker House Goa 2026), originally at:

- Source: `https://github.com/r-rishit27/hacker_house` (branch `sentinel-v2`,
  commit `7bcea03`, shallow clone, 2026-09-24)
- **No LICENSE file exists in the upstream repository.** The upstream authors
  retain all rights by default. Attribution is provided here in good faith.

## What has changed since the fork

This copy is no longer an unmodified vendored snapshot. The following have
been added or rewritten to wire the console to the **HHGOA FastAPI backend**
in this repo (not the upstream Sentinel v2 API):

- `src/lib/hhgoa.ts` ? hand-typed contract mirroring the real backend
- `src/lib/api.ts` ? same-origin fetch client, no role headers
- `src/lib/hooks.ts` ? TanStack Query hooks over the HHGOA endpoints
- `src/lib/providers.tsx` ? QueryClient without RoleProvider
- `src/components/console/*` ? all console views rebuilt on `hhgoa.ts` types
- `next.config.ts` ? optional `NEXT_PUBLIC_API_PROXY_TARGET` rewrite;
  same-origin default so the single-URL demo co-hosts UI and backend

Dead upstream surface removed: `generated/contract.ts`, `lib/role.tsx`,
`lib/replay.ts`, `lib/format.ts`, `components/ui/*`, `shell/RoleSwitcher.tsx`.

## Run

```bash
cd sentinel-ui
npm install
# Default: same-origin (the single-URL demo container)
npm run dev

# Local dev with backend on port 8000:
NEXT_PUBLIC_API_BASE=http://127.0.0.1:8000 npm run dev
```

This app talks to the HHGOA backend in this repo. It does not call the
upstream team's deployed API.
```

First commit touching `sentinel-ui/`, with author:

```
fe56ea9 2026-10-21 imohammedyasin05 feat: vendor Sentinel v2 analyst console as sentinel-ui (upstream r-rishit27/hacker_house@7bcea03, no LICENSE)
```

Authors who have touched `sentinel-ui/`: `imohammedyasin05 <nottouchmymail@gmail.com>` only (21 commits).

Classification (from `docs/UI_PROVENANCE.md`, still accurate):

- **Unchanged upstream files (9):** `src/app/globals.css`, `src/app/tokens.css`, `src/components/console/icons.tsx`, `src/components/console/parts.tsx`, `src/components/shell/AppShell.tsx`, `src/lib/cn.ts`, `tailwind.config.ts`, `tsconfig.json`, `next-env.d.ts`.
- **Locally written (6 + snapshots):** `src/lib/hhgoa.ts`, `src/lib/demo.ts`, `e2e/smoke.mjs`, `eslint.config.mjs`, `public/favicon.svg`, `public/demo/*.json`.
- **Heavily rewritten from upstream (6):** `src/lib/api.ts`, `src/lib/hooks.ts`, `CasePanel.tsx`, `GraphCanvasView.tsx`, `ApprovalsDrawer.tsx`, `QueueRail.tsx`.
- **Deleted upstream dead code (19 files).**

**Permission/licence grant: MISSING.** The repo documents the missing upstream `LICENSE` (NOTICE.md, docs/UI_PROVENANCE.md, README §15/§329) but contains **no written permission or licence grant from the upstream authors**. This is a real submission risk.

---

## 6. NEMOTRON EVIDENCE

`python scripts/smoke_nemotron.py` (real calls, key present in the untracked local `.env`; exit 0):

```
Nebius Token Factory smoke
base_url: https://api.tokenfactory.nebius.com/v1
models  : nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B | nvidia/nemotron-3-super-120b-a12b | nvidia/Nemotron-3-Ultra-550b-a55b
role 1 pattern_classifier   OK card_testing 0.9   (in=592 out=415)   latency_ms=5401.8
role 2 verification_draft   OK 120 chars          (in=428 out=950)   latency_ms=4075.7
role 3 narrative_and_sar    OK 455 + 1054 chars   (in=594 out=835)   latency_ms=10034.8
role 4 analyst_qa           OK 53 chars           (in=649 out=148)   latency_ms=1439.1
All four roles OK.
```

`GET /api/llm/status` after the benchmark run (raw JSON, secrets absent):

```json
{"available":true,"calls_logged":99,"successes":99,"failures":0,
 "prompt_tokens_total":66299,"completion_tokens_total":73448,
 "latency_ms_p50":4006.3,"latency_ms_p95":10481.5,
 "by_role":{"pattern_classifier":25,"verification_request_drafter":2,
            "case_narrative_and_sar_draft":24,"analyst_qa":7,
            "pattern_classifier_super":1,"baseline_plain_llm":40},
 "base_url":"https://api.tokenfactory.nebius.com/v1",
 "models":{"nano":"nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B",
           "super":"nvidia/nemotron-3-super-120b-a12b",
           "ultra":"nvidia/Nemotron-3-Ultra-550b-a55b"}}
```

Daily cap lowered (in-process, `llm_daily_call_cap = 1` with 99 calls already logged today):

```
DAILY CAP status: 503
DAILY CAP body: {"detail":"Daily Nemotron credit budget consumed - case answers remain available from the deterministic engine and demo cache."}
```

Per-IP hourly limiter (in-process, limit 1/hour):

```
HOURLY first: 200 second: 429
HOURLY second body: {"detail":"Hourly question limit reached. Try again in one hour."}
```

LLM unreachable (empty key):

```
UNREACHABLE status: 200
UNREACHABLE body: {"case_id":"CASE-001",...,"answer":"Not in evidence. This case's deterministic evidence trail covers: trigger:risk_score, ...","served_by":"deterministic-fallback",...}
UNREACHABLE llm_used: False served_by: deterministic-fallback
```

No 500 on any of the three degraded paths.

Provider configuration: `LLM_PROVIDER` defaults to `none` (`backend/config.py:54`; `.env.example:91` sets `none` and states the groq/anthropic/openai path was removed). The only reachable vendor in the running configuration is Nebius Token Factory — `llm_status.base_url` has exactly one endpoint and the call log contains only `nebius.call_ok` / `nebius.skipped_no_key`. Residual dead config fields for anthropic/openai/groq still exist in `backend/config.py`, but no client path uses them (documented debt in FEEDBACK_NOTES).

Hosted note: the Render service has **no** `NEBIUS_API_KEY` (`/health` → `"nebius_available":false`), so the hosted demo runs the deterministic + cached paths only. Live-call evidence is from this machine.

---

## 7. EVALUATION

Fresh 20-case run (`python -m backend.evaluation.run_benchmark`), exit 0:

```
total_cases: 20  completed: 20  failed: 0  elapsed_s: 193.5
latency mean=9.67 min=7.24 max=15.97
verdicts: legitimate=5 fraud=15
patterns: none=5 account_takeover=1 undocumented=2 card_not_present_fraud=6 card_not_present_new_device=6
sar filed: 15   total completion tokens: 36,190
```

Fresh checkpoint/ground-truth validation (`python -m backend.evaluation.validate_answers`), tail:

```json
"ground_truth_metrics": {"verdict_accuracy":1.0,"precision":1.0,"recall":1.0,"f1_score":1.0,"tp":15,"fp":0,"tn":5,"fn":0}
```

Every case reports `checkpoints_passed: 30, checkpoints_total: 30, failed_checkpoints: []` → **600/600**.

Fresh three-arm comparison (`python scripts/compare_baselines.py`), raw table:

```
THREE-ARM BASELINE EVALUATION RESULTS (Controlled Synthetic Benchmark)
Metric                    | Arm 1 (Graph Agent)  | Arm 2 (Score Only)   | Arm 3 (Plain Nano)
Verdict Accuracy          | 100.0%                | 90.0%                | 20.0%
Pattern Accuracy          | 100.0%                | 0.0%                 | 15.0%
Next-Best-Action (NBA)    | 95.0%                 | 90.0%                | 20.0%
F1 Score (Fraud)          | 1.0000                | 0.9333               | 0.0000
Avg Tokens / Case         | 1809.5                | 0.0                  | 258.2
Avg Latency / Case        | 9.67              s   | 0.001             s  | 4.52              s
Cost / Case (USD)         | $0.000271             | $0.000000            | $0.000046
Results recorded to artifacts/compare_baselines.json
```

Arm 2's pattern accuracy is **n/a** — a scalar risk score has no pattern typology to compare (the script prints 0.0 for the column; the doc states n/a).

`CASE-007` and `CASE-009` are **constructed stress scenarios**, explicitly labelled in `docs/BENCHMARK.md:47`:

```
47: The synthetic benchmark incorporates two specific **constructed stress scenarios** designed to test edge cases where scalar risk scores fundamentally fail:
49: ### Stress Scenario 1: `CASE-009` ? Card-Testing Ring With a Low-Score Cash-Out (False Negative under ML Score)
55: ### Stress Scenario 2: `CASE-007` ? Legitimate Emergency Medical Purchase (False Positive under ML Score)
```

Real-data disclosure, word for word, with file and line:

```
README.md:307:- **Real-Dataset Caveat & Benchmark Scope**: On the original hackathon round's real dataset (not redistributed), verdict accuracy was 60% (12/20) and pattern accuracy 85% (17/20). The synthetic benchmark checks pipeline correctness, not real-world accuracy.
docs/BENCHMARK.md:7:> **Mandatory Real-Data Disclosure:**
docs/BENCHMARK.md:8:> On the original hackathon round's real dataset (not redistributed), verdict accuracy was 60% (12/20) and pattern accuracy 85% (17/20). The synthetic benchmark checks pipeline correctness, not real-world accuracy.
```

Dollar figures: no authoritative source or invoice exists. `scripts/compare_baselines.py` computes them from **assumed** rates ($0.10/M prompt, $0.20/M completion; comment dated 2026-10-24) and the code now states they are an estimate, not an invoice. No dollar figure is used as a claim in this report; token counts are the recorded telemetry.

---

## 8. DEPLOYMENT

Hosted URLs:

- Console: `https://sentinel-ui-nu.vercel.app` (Vercel project `sentinel-ui`, production)
- API: `https://sentinel-console-api.onrender.com` (Render web service `sentinel-console-api`, free tier, Oregon)

Raw measurements (live, this run):

```
GET / status=200 time_ms=447
GET /health time_ms=412
{"status":"healthy","graph":{"status":"healthy","n_transactions":"12230","prepared_at":"2026-10-25 01:50:07"},"app_db":"healthy","llm_provider":"none","nebius_available":false,"graph_mode":"local","app_env":"development","demo_mode":true,"graph_hint":null}
case CASE-009: verdict=fraud p=0.808 exposure=2102.44 evidence=8
deep-link refresh: status=200 content-type=text/html; charset=utf-8 bytes=16061
```

Cap / per-IP limiter against the hosted API (direct origin, 11 sequential questions):

```
1=200 2=200 3=200 4=200 5=200 6=200 7=200 8=200 9=200 10=200 11=429
```

(Render env sets `LLM_CALLS_PER_IP_PER_HOUR=10`; no key is configured on the host, so these answers came from the deterministic fallback and cost nothing.)

Restart behaviour (`render restart srv-dbefmsvavr4c73aph5c0`, then re-probe):

```
srv-dbefmsvavr4c73aph5c0 restarted successfully
after restart: status=healthy demo=True time_ms=580
```

Host environment variable **names only**:

- Render: `PYTHON_VERSION`, `APP_ENV`, `DEMO_MODE`, `GRAPH_BACKEND`, `EVIDENCE_REQUEST_MODE`, `LLM_DAILY_CALL_CAP`, `LLM_CALLS_PER_IP_PER_HOUR`, `CORS_ORIGINS`
- Vercel: `NEXT_PUBLIC_API_PROXY_TARGET`

The console proxies `/api/*`, `/investigations/*`, `/benchmark/*` and `/health` to Render, so the browser sees one origin.

---

## 9. SUBMISSION GATES

| Gate | Verdict | Evidence |
|---|---|---|
| (a) MIT licence at repo root, holder "Mohammed Yasin Shaik" | **PASS** | `LICENSE` line 1 `MIT License`, line 3 `Copyright (c) 2026 Mohammed Yasin Shaik` |
| (b) No third-party data, PDFs, secrets or `.env` in history | **PASS** | history path scan `no matches`; `gitleaks git` full history: `0 findings` (116 commits scanned) |
| (c) UI ownership and licence permission documented | **FAIL** | NOTICE.md + UI_PROVENANCE.md document the missing upstream LICENSE and give attribution, but **no written permission or licence grant from Team CollabUp exists in the repo** (README:329, UI_PROVENANCE:17 carry a `TODO`) |
| (d) README quickstart works from a fresh clone of THIS repo | **FAIL / NOT RUN** | clone URL: `https://github.com/shaikmohammedyasin-create/hhgoa-sentinel-console.git` — `git clone --depth 1` succeeded (236 files, commit 4b78651, 6.1 s), but the quickstart is `docker compose up --build` and Docker cannot run here (daemon unavailable) |
| (e) README/BENCHMARK/DEMO numbers match sections 4–7 | **PASS** | BENCHMARK updated from this run (95% NBA, 0.9333 precision/recall, 1,809.5 tokens, 9.67 s); README badge 355 tests; DEMO 600/600; leftover-number sweep clean (one commit-hash false positive) |
| (f) Live Nemotron calls recorded | **PASS** | smoke: 4/4 roles OK; `/api/llm/status`: 99 calls, 99 successes, 0 failures |
| (g) Hosted demo URL working | **PASS** | 200 in 447 ms; `/health` healthy; CASE-009 loaded end to end; deep link 200 `text/html`; restart recovery 580 ms |
| (h) Screenshots exist and show no keys/billing/personal data | **PASS** | 7 files, all 1536×1024; inspected content is the console with synthetic case ids only |
| (i) FEEDBACK_NOTES and submission-period section exist with dated bullets | **PASS** | `docs/FEEDBACK_NOTES.md`; `README.md` §16 with bullets dated 2026-08-26, 2026-10-23, 2026-10-24 |

---

## 10. FACT TABLE FOR DEVPOST AND THE DECK

| Field | Value |
|---|---|
| Project name | Sentinel Graph |
| One-line pitch | An evidence-grounded, policy-governed agentic fraud investigation platform: graph retrieval + NVIDIA Nemotron propose, a deterministic policy engine decides, a human approves high-impact actions. |
| Repo | https://github.com/shaikmohammedyasin-create/hhgoa-sentinel-console |
| Demo | https://sentinel-ui-nu.vercel.app (console) · https://sentinel-console-api.onrender.com (API) |
| Licence | MIT (Copyright 2026 Mohammed Yasin Shaik) |
| Commits | 117 total; 117 since 2026-08-26; first commit 2026-09-19 |
| Backend | Python (container 3.12), FastAPI 0.141.1, SQLite graph store (local mode) or TigerGraph (optional), pandas 3.0.6, pydantic 2.13.5 |
| Frontend | Next.js 15.5.25 (App Router), React 18.3.1, TypeScript, TanStack Query, Tailwind |
| Models | `nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B` (pattern proposal, verification draft), `nvidia/nemotron-3-super-120b-a12b` (configured fallback tier), `nvidia/Nemotron-3-Ultra-550b-a55b` (narrative + SAR draft, analyst Q&A) via Nebius Token Factory |
| Roles | 1 pattern classifier, 2 verification-request drafter, 3 narrative + SAR draft, 4 analyst Q&A; deterministic fallback for every role |
| Tests | 355 passed, 9 skipped (pytest); ruff clean; tsc clean; eslint clean; production build exit 0; E2E 32/32, 0 console errors |
| Benchmark (fresh) | Arm 1: verdict 20/20, pattern 20/20, NBA 19/20, F1 1.0000, 1,809.5 tokens/case, 9.67 s/case. Arm 2: 90.0%, pattern n/a, F1 0.9333. Arm 3: 20.0%, pattern 15.0%, F1 0.0000. |
| Dataset | 100% synthetic: 12,230 transactions, 4,196 identity rows, 28 closed cases, 20 investigation cases; generated by `scripts/make_synthetic_data.py` |
| Latency / tokens per case (fresh) | mean 9.67 s (min 7.24 s, max 15.97 s); 36,190 completion tokens over 20 cases (mean 1,809.5); prompt tokens 33,177 total (mean 1,658.8) |
| Real-data disclosure | On the original hackathon round's real dataset (not redistributed), verdict accuracy 60% (12/20), pattern accuracy 85% (17/20). The synthetic benchmark checks pipeline correctness, not real-world accuracy. |
| Built with (true tags) | FastAPI, Python, Next.js, React, TypeScript, Tailwind CSS, TanStack Query, SQLite, TigerGraph (optional live mode), NVIDIA Nemotron, Nebius Token Factory, Playwright, pytest, Ruff, Docker, Render, Vercel, GitHub Actions |

---

## 11. OPEN ISSUES

| # | Severity | Issue | Fix | Effort |
|---|---|---|---|---|
| 1 | **Disqualification risk** | No written licence/permission for the upstream `sentinel-ui` fork (upstream repo has no LICENSE; all rights reserved by default) | Obtain a written grant (issue/PR/email) from the upstream authors and record it in `sentinel-ui/NOTICE.md`; otherwise replace the reworked UI with a clean-room implementation | S–M (depends on upstream) |
| 2 | **Submission blocker** | Docker quickstart and image hygiene unverified here (daemon unavailable) | Run `docker compose build && docker compose up` plus the in-image `find / -name ".env*"` proof on a machine with Docker; capture exit code, image size, `/health` | S |
| 3 | High | Hosted demo has `nebius_available:false` (no key on Render), so live Nemotron is not demonstrated on the hosted URL | Add `NEBIUS_API_KEY` as a Render secret with tight caps, or keep hosted as deterministic replay and point judges at recorded local evidence | S |
| 4 | High | CASE-009 stress row carries two amounts (`TransactionAmt` 2,093.43 vs trigger text "$14.50") | Fix `scripts/make_synthetic_data.py` to write the stress amount into `TransactionAmt`, regenerate data + pack + benchmark numbers | M |
| 5 | Medium | No per-user identity; approvals protected by a shared `APPROVAL_TOKEN` | Add identity provider → analyst principal → role/permission → approval policy (documented future architecture) | L |
| 6 | Medium | Dead legacy LLM config (`anthropic`/`openai`/`groq` fields, dormant `backend/llm/client.py`) contradicts the "removed" wording in `.env.example` | Delete the dormant path/fields, or reword the doc | S |
| 7 | Medium | Render free tier sleeps; first request after idle takes ~30–60 s | Note it in the demo script; or move to a paid instance before judging | S |
| 8 | Medium | `docs/TECHNICAL_VALIDATION.md` is a historical capture (22.84 s, 457 s, 33/33) that can contradict current docs | Add a "superseded by FINAL_REPORT.md" banner, or regenerate the capture | S |
| 9 | Low | Gitleaks full-tree scan flags `.env`, `.venv` and `.next` artifacts (false positives) | Add a `.gitleaksignore`/allowlist for `.venv` and `.next`; keep `gitleaks git` as the history gate | S |
| 10 | Low | Per-IP limiter keys on the request IP; behind the Vercel proxy all visitors would share Render egress IPs | Trust `X-Forwarded-For` with explicit proxy rules, or disable per-IP limiting behind the proxy | S |
| 11 | Low | `docs/images/ballerina-logo.jpeg` remains in git history (third-party mark from an early commit) | Leave history; confirm it is not in the current tree (it is not) | – |
| 12 | Low | Local venv runs Python 3.14.5 while the shipped container is 3.12 | Pin the local venv to 3.12 to match the shipped runtime | S |

---

VERDICT: **NOT READY** — blocking items: (c) no written upstream licence/permission for the forked UI, and (d) the Docker-based README quickstart and image hygiene could not be verified on this machine (Docker daemon unavailable). Every other gate in section 9 passes, and all runnable gates in sections 4–8 pass as recorded above.
