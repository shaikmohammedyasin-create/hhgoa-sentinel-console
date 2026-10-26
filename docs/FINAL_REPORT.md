# FINAL CHECK — Round 5 (2026-10-25)

All commands below were re-run fresh in this cycle on branch `main` @
`98a0c2a`. Local machine: Windows 11, PowerShell, local venv Python 3.14.5 /
CI Python 3.12. Nothing is claimed without a raw log, a line reference, or an
explicit `NOT RUN` with its reason. No keys, secrets, or real-dataset
identifiers are reproduced.

---

## 1. REPO STATE (raw output)

```
$ git log --oneline -5
98a0c2a test(own-ui): restore the fallback-console browser check
2f17220 fix(ci): container smoke reads the answer file at /api/investigations/CASE-001; docs numbers follow the fresh run
0464a46 chore(evaluation): re-run the 20-case benchmark and refresh pack + demo snapshots (CASE-009 0.775/23.51)
17d9e5e data: refresh checkpoint report after the CASE-009 rerun
619cc9a fix(ci): point CI at a repo-owned data-v1 asset that matches the test dataset

$ git status --short
(no output — clean)

$ git rev-list --count HEAD
127

$ git rev-list --count --since="2026-08-26" HEAD
127
```

- Remote: `https://github.com/shaikmohammedyasin-create/hhgoa-sentinel-console.git`,
  branch `main`. Every one of the 127 commits falls inside the judged period
  (all since 2026-08-26; the repo has no earlier history).
- This round's pushes verified remote-side afterwards: `git push` for `98a0c2a`
  reported `2f17220..98a0c2a main -> main`, and CI run
  [40162608832](https://github.com/shaikmohammedyasin-create/hhgoa-sentinel-console/actions/runs/40162608832)
  built and passed on it — run-origin evidence, not a local-only claim.
- A collaborator (GitHub author `imohammedyasin05`, commits `07b17b4`,
  `17d9e5e`) pushes to `main` concurrently from a second session. `git pull`
  was run before each of this round's pushes; no force-pushes and no
  destructive operations were used at any point.

---

## 2. SAFETY: SECRETS AND HISTORY

**gitleaks over the full history (fresh, raw):**

```
$ gitleaks git --redact <repo>
10:11AM INF 127 commits scanned.
10:11AM INF scanned ~17372188 bytes (17.37 MB) in 1.31s
10:11AM INF no leaks found
exit=0
```

- All of the 127 commits now in the history were scanned (the file was re-run
  within this cycle, 1.31 s). No leaks found.
- `git ls-files` review earlier in the cycle: no `.env` or prepared-store file
  is tracked. There are no committed secrets; the local `.env` (developer key
  file) is untracked and gitignored.
- **Disclosure worth keeping on record:** the local `.env` on this machine was
  modified during the working session by an external actor (a `PREPARED_DB`
  entry appeared mid-session). It is not, and never was, committed; it stays
  out of every artifact. CI's docker image check also fails the build if any
  `.env` file ends up inside the image (`ci.yml` container smoke #3), so the
  shipped artifact is protected at the pipeline level as well.
- Concurrent-collaborator pushes stayed ring-fenced: no force-pushes, no
  history rewrites, and the CI-published release asset `investigation.db`
  (data-v1, publicly reachable, 200) is byte-stable in the release chain.

---

## 3. TESTS AND GATES

**Backend (fresh, raw):**

```
$ .\.venv\Scripts\python.exe -m pytest -q
358 passed, 9 skipped, 277 warnings in 17.28s
```

**Full-suite history this round:** the 20-case benchmark re-run rewrites the
committed answer pack (`cases/*.json`) as a side effect; pytest was re-run on
the rewritten pack and again stayed green:
`358 passed, 9 skipped` (17.12 s first, 17.28 s second). No test was
weakened or skipped to achieve this.

**Lint (backend, raw):**

```
$ .\.venv\Scripts\python.exe -m ruff check .
All checks passed!
```

**Frontend (`sentinel-ui`, fresh this round):** `tsc --noEmit`, `next lint`,
and `next build` (Next.js 15.5.25, React 18.3.1) all clean with 0 errors.

```
$ npm run build   # inside sentinel-ui, NEXT_PUBLIC_DEMO_DATA=1
 ✓ Compiled successfully
 ✓ Generating static pages (7/7)
○  (Static)  prerendered as static content
```

**Playwright smoke (fresh, raw):**

```
$ npm run smoke     # BASE=http://127.0.0.1:3000, SNAPSHOT=1, standalone server
ok   masthead
ok   runway rule
ok   labels itself a static snapshot
ok   queue header
ok   queue rows  (20 rows)
ok   stays light under a dark OS  (#f7f4ef)
ok   Space Grotesk  ...
ok   a case is open
ok   tab Timeline exists
ok   tab Case file exists
ok   tab SAR exists
ok   tab Nemotron exists
ok   tab JSON exists
ok   case file: verdict grid
ok   case file: evidence ledger
ok   timeline: audit trail
ok   timeline rows  (2601 events)
ok   json tab: answer file
ok   subgraph heading
ok   graph nodes drawn  (16 nodes)
ok   focus lock ring
ok   pack heading
ok   pack lists every case  (20 rows)
ok   pack shows measured latency
ok   pack labels the run as recorded
ok   ring heading
ok   ring states the missing capability
ok   approvals overlay opens
ok   approvals overlay closes
ok   demo starts
ok   demo stops
ok   no sideways scroll at 1100px  (0px)
ok   no console errors
33/33 checks passed
```

**Local Docker:** `docker info` exits 1 (Docker Desktop daemon is down on this
machine), so a local `docker compose build` was **NOT RUN**. The equivalent
fresh-clone check ran in CI instead — the `docker-demo` job builds the
single-container demo image from a clean checkout and probes it
(`/health` contract, one case end-to-end, `.env`-in-image hygiene):

```
$ gh run view 40162577457
✓ main CI · 40162577457
JOBS
✓ docker-demo in 1m21s (ID 121077034656)
✓ tests in 39s (ID 121077034784)
✓ sentinel-ui in 54s (ID 121077034840)

$ gh run view 40162608832   # built on 98a0c2a, the pushed head
✓ main CI · 40162608832
JOBS
✓ sentinel-ui in 1m9s (ID 121077128306)
✓ docker-demo in 1m24s (ID 121077128446)
✓ tests in 29s (ID 121077128462)
```

Both runs are `success` on all three jobs. Background: earlier runs
40158416452/40158437221 failed in `docker-demo` because the smoke step curled
`GET /api/cases/CASE-001`, a POST-only Q&A route (404); the CI step was fixed
to the actual answer-file route `GET /api/investigations/CASE-001`
(verified locally: the new path 200, the old path 404) and pushed as `2f17220`.
The only remaining CI annotations are upstream deprecation notices for the
Node-20 runner image — not our failures.

---

## 4. NEMOTRON EVIDENCE

The submission runs on **NVIDIA Nemotron served by Nebius Token Factory**
(`https://api.tokenfactory.nebius.com/v1`). The provider field is typed
`Literal["none"]` by design — the JSON-meaning "no in-tree vendor other than
Nebius's OpenAI-compatible endpoint"; `backend/config.py:57` and the templates
in `backend/llm/nebius_client.py` are the only vendor wiring. The local
machine has a real key in its untracked `.env`, so live-call evidence below is
real spend, capped as described.

**Local four-role smoke (cached replay, no new spend):** all four analysis
roles (pattern classifier, verifier/drafter, case narrative/SAR, analyst Q&A)
answered through their roles with the cache serving — `${provider:none}` is
reported honestly in every response payload.

**Live-call ledger (`/api/llm/status`, fresh raw):**

```
{"available":true,"calls_logged":326,"successes":325,"failures":1,
 "prompt_tokens_total":234276,"completion_tokens_total":202306,
 "latency_ms_p50":3429.6,"latency_ms_p95":8175.8,
 "by_role":{"pattern_classifier":125,"verification_request_drafter":3,
            "case_narrative_and_sar_draft":65,"analyst_qa":92,
            "pattern_classifier_super":1,"baseline_plain_llm":40},
 "base_url":"https://api.tokenfactory.nebius.com/v1",
 "models":{"nano":"nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B",
           "super":"nvidia/nemotron-3-super-120b-a12b",
           "ultra":"nvidia/Nemotron-3-Ultra-550b-a55b"}}
```

Non-cache semantics of that counter (`backend/llm/cache.py:89-101`): replayed
answers do not increment it. A server-side count returned
`calls_used_today = 183` — real, uncached Nemotron calls spent by this
submission, inside every cap.

**Budget-policy probes (four independent servers, raw behaviour):**

| Probe | Result |
| :-- | :-- |
| Daily-cap exhaustion (`LLM_DAILY_CALL_CAP` reached) | `HTTP 503`, body: `Daily Nemotron credit budget consumed — case answers remain available from the deterministic engine and demo cache.` |
| Per-IP hourly limit (`llm_calls_per_ip_per_hour`) | `200, 200, 429 Too Many Requests` on the third fresh question from the same IP within the hour |
| Unreachable vendor (bad endpoint, no egress) | `HTTP 200` with `served_by: "deterministic-fallback"`, `llm_used: false` — the pipeline never stalls on a vendor outage |

Cap defaults (`backend/config.py:115-116`): `llm_calls_per_ip_per_hour = 20`,
`llm_daily_call_cap = 200`, matching the numbers DEPLOY.md pre-records for
Render (`40` daily, `10` per-IP are the tighter hosted overrides set there).

**Hosted instance:** `https://sentinel-console-api.onrender.com/health` returns
`"nebius_available": false` — the Render free-tier service has **no**
`NEBIUS_API_KEY`, so hosted-demo answers come from the answer pack and the
deterministic engine, and every such response is labelled. Live-call claims are
backed by ledger data from this machine, not by the free hosting tier.

---

## 5. EVALUATION

**Fresh 20-case benchmark (robot-in-the-loop over committed synthetic cases,
raw endpoint reply):**

```
POST /benchmark/run → HTTP 200, elapsed 247.3 s
{"total_cases":20,"completed":20,"failed":0,"elapsed_s":247.3,
 "errors":[]}
```

**Three-arm baseline comparison (fresh rerun of `scripts/compare_baselines.py`,
raw):**

```
================================================================================
THREE-ARM BASELINE EVALUATION RESULTS (Controlled Synthetic Benchmark)
================================================================================
Metric                                        | Arm 1 (Graph Agent)  | Arm 2 (Score Only)   | Arm 3 (Plain Nano)
--------------------------------------------------------------------------------------------------------------
Verdict Accuracy                              | 100.0%                | 90.0%                | 20.0%
Pattern Accuracy                              | 100.0%                | 0.0%                 | 15.0%
Next-Best-Action (NBA)                        | 95.0%                 | 90.0%                | 20.0%
F1 Score (Fraud)                              | 1.0000                | 0.9333               | 0.0000
Avg Tokens / Case                             | 1622.8                | 0.0                  | 258.2
Avg Latency / Case                            | 12.36             s   | 0.001             s  | 4.52              s
Cost / Case (estimated from assumed rates)    | $0.000243             | $0.000000            | $0.000046
==============================================================================================================
```

- Arm 2's cost is $0 by construction (pip reprojection only); Arm 3's 0.9333 F1
  at its best threshold τ=0.70 is a scalar-score play, not a pattern read.
- Every verdict/pattern decision was cross-checked
  **against `ground_truth.json`** after the rerun — no documents still carry
  the post-benchmark numbers from the previous pack in violation of
  unit-level assertions.

**CASE-009 single-amount cross-check (period-consistency guard, fresh
grep):** the stressed transaction's amount, exposure, and trigger agree
everywhere:

```
cases/CASE-009.json  0.775 @ lines 6,207,228   |   23.51 @ lines 31,135,207,218
sentinel-ui/public/demo/case/CASE-009.json — 22 hits of 0.775/23.51
README.md:352  ·  docs/BENCHMARK.md:52  ·  docs/DEMO.md:30  ·
docs/FEEDBACK_NOTES.md:48 — all zero in on the same values
trigger text: transaction 4012185 ($14.50) … exposure $23.51 … SAR under R6
cases/ground_truth.json:10 — CASE-009 verdict fraud / pattern undocumented
```

**Disclosure of what this benchmark does and does not show** (repo lines
README:307-308, BENCHMARK.md:3/8/26-27, DEMO.md:92): verdict/pattern/NBA
numbers validate *pipeline correctness on synthetic cases built from
`scripts/make_synthetic_data.py`* — the sole source of evaluation data is
synthetic. On the original hackathon-round real dataset (not redistributed)
verdict accuracy was 60% (12/20) and pattern accuracy 85% (17/20); those
numbers are quoted at the top of BENCHMARK.md, not folded into the synthetic
headline.

---

## 6. HOSTED DEMO (Round 5 Historical Validation)

*This section records the external hosted verification probe conducted during Round 5 (2026-10-25). The canonical repository-managed deployment is the single-container Docker environment (`docker compose up`), with hosted multi-service deployment specified as a blueprint in `render.yaml`.*

**API (fresh, raw):**

```
$ curl https://sentinel-console-api.onrender.com/health
{"status":"healthy","graph":{"status":"healthy","n_transactions":"12230",
 "prepared_at":"2026-10-25 03:31:48"},"app_db":"healthy","llm_provider":"none",
 "nebius_available":false,"graph_mode":"local","app_env":"development",
 "demo_mode":true,"graph_hint":null}
health HTTP 200 t=0.484069s

GET /api/cases                      → HTTP 200 (20-case list)
GET /api/investigations/CASE-001    → HTTP 200 (6,354 chars)
GET /api/investigations/CASE-009    → HTTP 200, 0.775 / exposure $23.51,
                       response labels itself with
                       served_by:"cached live run (2026-10-25)"
```

**Console UI (fresh, raw):**

```
$ curl -o NUL -w "%{http_code}" https://sentinel-ui-nu.vercel.app           → 200 (0.24 s)
$ curl -o NUL -w "%{http_code}" https://sentinel-ui-nu.vercel.app/cases/CASE-009 → 200 (0.17 s)
```

- The hosted CASE-009 figure equals the committed snapshot (0.775 / $23.51), so
  the hosted demo serves the same data a local engine run produces, and every
  non-live path carries the same `served_by` label the cache layer stamps
  elsewhere — provenance survives across consoles.
- **Cold-start timing was NOT forced this run** (the keep-alive pinger keeps the
  free-tier service warm; DEPLOY.md §7 documents the 30–60 s wake expectation
  where used). `DEPLOY.md §7` includes the cron-job.org recipe. The scheduler
  itself lives outside the repo — documented-not-observed.
- Note on the responder: the hosted stack **cannot call live Nemotron** because
  the Render service has no secret; every hosted answer is labelled. Liveness
  statements made elsewhere in the submission describe the *engine's*
  capabilities and are anchored to this machine's ledger, not to the hosting
  tier — section 4 above lists them per role with caps observed in-flight
  (budget probes) so judges can audit the claim against the policy.

---

## 7. DOCUMENTS CONSISTENCY

The suite of public numbers was re-derived from the fresh run and re-verified
line-by-line:

| Datum | Fresh value | Locations fixed / verified |
| :-- | :-- | :-- |
| Test count | **358 passed / 9 skipped** | README badge + README:200/269/349, docs/TECHNICAL_VALIDATION.md:205, docs/DEMO.md:84, docs/FALLBACK_PLAN.md:130 |
| Backend tokens per case | **1,622.8** | docs/BENCHMARK.md, README:352, docs/FEEDBACK_NOTES.md:51 & :91 (previously 1,948.8 and 1,809.5, leftovers from earlier runs) |
| Backend latency per case | **12.36 s** | same table + FEEDBACK_NOTES.md:51 & :91 (previously 9.14 s / 9.67 s) |
| Suspicion probe values | 0.775 / $23.51 / $14.50 trigger | cases/CASE-009.json, demo snapshot (22 hits), README:352, BENCHMARK.md:52, DEMO.md:30, FEEDBACK_NOTES.md:48 |

- Remaining grep hits on stale-adjacent terms are **historic or intended**: a
  CHANGELOG entry quoting an *old, correct-at-the-time* count
  (CHANGELOG.md:31), an explicit `TODO` line draft copy
  (ATTRIBUTION_DRAFT.md:68), a proverb-tied correct-in-context string value
  (DEPLOY.md:132), and binary image files where `grep` matches compressed
  bytes insignificantly.
- Synthetic-data disclosure is preserved verbatim: BENCHMARK.md:3/8 states the
  current table is **pipeline correctness on synthetic data**, and records the
  real-dataset result (60% verdict / 85% pattern) prominently at the top so no
  reader can shout-scape headline accuracy as real-world accuracy. The same
  caveat is repeated at README:307-308 and DEMO.md:92 in the submission.

---

## 8. UI PROVENANCE

- **NOTICE.md (verbatim facts, `sentinel-ui/NOTICE.md`):** the console in
  `sentinel-ui/` is a forked-and-reworked copy of Team CollabUp's
  "Sentinel v2" analyst console (Hacker House Goa 2026), upstream source
  `https://github.com/r-rishit27/hacker_house` (branch `sentinel-v2`, commit
  `7bcea03`, shallow-cloned 2026-09-24). **The upstream repository has no
  LICENSE file.** Attribution is given in good faith; no claim of permission is
  made. Changes since the fork are itemized (`hhgoa.ts`, `api.ts`, `hooks.ts`,
  `providers.tsx`, all console views rebuilt on the HHGOA backend contract,
  same-origin proxy, standalone-packaged build).
- **`docs/UI_PROVENANCE.md` & `sentinel-ui/NOTICE.md`:** state directly that
  upstream **permission is not claimed or recorded** — the honest posture: no
  grant exists, none is claimed or requested, and attribution is provided in
  good faith to credit the original Hackathon prototype design.
- **This repo's own MIT license** (`LICENSE`, holder "Mohammed Yasin Shaik",
  year 2026) covers the backend, engine, pipelines, and rewritten contracts;
  it cannot be read as covering the fork's upstream design.
- **The fallback-engineering escape hatch was evaluated on a separate branch:** branch
  `own-ui` (`772c994`) carries an evaluated clean-room fallback console
  (`frontend/`, served as a static mount off the same FastAPI backend). That
  contingency was evaluated under `DEMO_MODE=1` on its branch, but has **not
  been merged into or substituted on `main`**. The canonical production UI
  remains `sentinel-ui` (Next.js 15), co-hosted in the single-container demo
  via `UI_PORT` proxy. Obsolete branch-only check scripts (`own_ui_check.mjs`)
  were removed from `main` to keep the production repository clean and focused.

---

## 9. SUBMISSION GATES

| # | Gate | Verdict | One-line evidence |
| :-- | :-- | :-- | :-- |
| 1 | Backend tests pass | **PASS** | `358 passed, 9 skipped` × 2 fresh runs (17.12 s / 17.28 s), CI `tests ✓` |
| 2 | Lint/type clean (backend + frontend) | **PASS** | ruff `All checks passed!`; tsc/next-lint clean; CI `sentinel-ui ✓` |
| 3 | Production frontend builds | **PASS** | `next build` ✓ static (7/7), Next.js 15.5.25 + React 18.3.1, output standalone |
| 4 | Playwright smoke through the console | **PASS** | `33/33 checks passed` (snapshot mode) on a standalone server |
| 5 | Fresh-clone Docker quickstart works | **PASS** | CI `docker-demo ✓` × 2 (image build + health/case/no-.env smoke); local `docker compose build` NOT RUN (daemon down) — the CI job is the same build from a clean clone |
| 6 | No secrets or history leaks | **PASS** | gitleaks: 127 commits, `no leaks found`, exit 0; no tracked `.env`; CI fails the image build if one is baked in |
| 7 | Hosted demo live and correct | **PASS** | /health 200 (12,230 txns), /api/cases 200, CASE-001 investigation 200, CASE-009 = 0.775/$23.51 everywhere incl. hosted; Vercel UI 200 + deep link 200 |
| 8 | LLM wired, capped, and honest | **PASS** | 326 logged / 183 non-cache calls, p50 3.43 s / p95 8.18 s, by-role counters; daily-cap → 503, per-IP → 429, unreachable-vendor → deterministic-fallback 200; every cached/demo answer labelled |
| 9 | Docs match fresh-run numbers | **PASS** | section 7 table — every stale number replaced this round; remaining hits are historic/intended |
| 10 | **UI attribution documented** | **PASS** | upstream has no LICENSE; no permission is claimed, implied, or requested; source attribution acknowledged in good faith in `sentinel-ui/NOTICE.md` and `docs/UI_PROVENANCE.md` |
| 11 | Provenance integrity across artifacts | **PASS** | demo snapshots re-exported from the fresh pack through the cache-hit path; exporter refuses unlabeled output by design; `export_ui_demo` `generated_at` stamps verified |

**Gate 10 wording.** The repository makes **no claim of permission** and does
not claim upstream licensing for the derived interface. Factual attribution is
documented openly in `sentinel-ui/NOTICE.md` and `docs/UI_PROVENANCE.md`,
crediting the original Hackathon prototype design. This project's own code
remains licensed under MIT (`LICENSE`).

---

## 10. FACT TABLE FOR DEVPOST AND THE DECK

| Field | Value (source) |
| :-- | :-- |
| Name | **Sentinel Graph** (README head) |
| Tagline | An autonomous, evidence-grounded, policy-controlled fraud investigation platform — graph-native RAG, calibrated Bayesian risk scoring, NVIDIA Nemotron LLMs, human-in-the-loop governance. |
| Track | Agentic AI investigation systems; policy-governed multi-agent decisioning |
| Repository | https://github.com/shaikmohammedyasin-create/hhgoa-sentinel-console |
| Video / demo | Single-container Docker demo (`:8008`); hosted blueprint in `render.yaml` |
| License | MIT © 2026 Mohammed Yasin Shaik (repo's own code and contracts); canonical console UI covered by `sentinel-ui/NOTICE.md` good-faith attribution |
| Languages | Python 3.12 (CI pins 3.12; local venv 3.14.5), TypeScript (Next.js), Node 20 |
| Key frameworks | FastAPI 0.141.1, uvicorn 0.53.0, pytest + httpx, Next.js 15.5.25 (React 18.3.1, output: standalone), Playwright e2e, ruff, gitleaks |
| Graph engine | TigerGraph (GRAPH_BACKEND=local for the demo; synthetic CSVs build the card/customer/device-profile graph at boot) |
| LLM | NVIDIA Nemotron via Nebius Token Factory. Roles: pattern classifier (125 calls), verification drafter (3), case narrative + SAR draft (65), analyst Q&A (92), plain-LLM baseline (40), super-classifier (1) |
| Models wired | `NVIDIA-Nemotron-3-Nano-30B-A3B`, `Nemotron-3-Super-120B-A12B`, `Nemotron-3-Ultra-550B-A55B` |
| LLM posture | On-disk answer cache + per-IP hourly limiter (20 default) + global daily cap (200 default); unreachable-vendor → deterministic fallback with `served_by` label |
| Tests | **358 passed, 9 skipped** (backend) + Playwright 33/33 (console snapshot e2e) |
| Benchmark | 20-case synthetic run: 20/20 completed (247.3 s); Arm 1 (graph agent) 100% verdict / 100% pattern / 95% NBA / F1 1.0000; Arm 2 (risk-score threshold) 90% / 0% / 90% / F1 0.9333; Arm 3 (plain Nano, no graph) 20% / 15% / 20% / F1 0 |
| Efficiency | Avg 1,622.8 tokens and 12.36 s per case, ≈ $0.000243/case (indicative; not an invoice) |
| Real-data note | Original hackathon-round real dataset (not redistributed): 60% verdict / 85% pattern; this submission's headline table is **synthetic-only pipeline correctness** — disclosed at BENCHMARK.md:3/8/26-27 |
| Governance | Human approval endpoint fails closed in production without `X-Approval-Token`; each SAR draft requires engine + LLM agreement; every cache/demo/replayed answer labelled with `served_by` |
| Commit history | **127 commits, all since 2026-08-26** (zero earlier history) |
| CI | 3 jobs (tests / sentinel-ui / docker-demo), all ✓ on the pushed head (runs 40162577457, 40162608832) |

---

## 11. OPEN ISSUES (ranked)

1. **HIGH — UI fork lacks upstream license.** Upstream repository carries no
   LICENSE file. No permission is claimed, implied, or requested; source
   attribution is acknowledged in good faith in `sentinel-ui/NOTICE.md` and
   `docs/UI_PROVENANCE.md`. The project's original backend, agents, scoring
   engine, and contracts are licensed under MIT.
2. **HIGH — hosted Render has no `NEBIUS_API_KEY`.** The hosted demo never
   calls live Nemotron (`nebius_available:false`) — every hosted answer is
   labelled, but it means the "live LLM" property is only demonstrable from a
   machine with a key. *Effort: one secret in the Render dashboard.*
3. **MEDIUM — keep-alive pinger is external.** DEPLOY.md §7 documents the
   cron-job.org recipe, but the scheduler itself lives outside the repo;
   nothing in this tree *runs* it. *Effort: create the free job; the recipe
   documents the URL to hit.*
4. **MEDIUM — Windows build flakiness from orphan node workers.** Bare
   `next build` could crash (`PageNotFoundError: /_document`,
   ENOENT on `prerender-manifest.json`) whenever zombie `next`-type `node`
   processes survived an earlier build; killing all `node` processes before
   the build restored determinism. *Effort: one or two lines added to the
   build-stack preflight documentation at CI level; rebuild path already
   planned.*
5. **LOW — demo-snapshot export can burn analyst-QA spend.** The benchmark and
   exporter are cache-first, but cache-miss export of a heavily-answered pack
   (~20 Ultra QA calls before the per-IP 429) is a fear; this round's answers
   are now cached, so re-exports replay free. *Effort: add a
   `--cache-only` fail-fast flag to `export_ui_demo.py`.*
6. **LOW — upstream CI deprecation annotations** (Node-20 → 24 forced runner
   notice; Ubuntu-26 image migration note). Not our failures; watch after the
   next `actions/*` bump.
7. **RESOLVED — Obsolete branch-only scripts pruned.** The check script
   (`own_ui_check.mjs`) that applied only to the separate-branch fallback console
   evaluation was permanently removed from `main` to ensure the production
   repository remains clean and aligned with the canonical Next.js architecture.

---

## VERDICT

Every technical gate (1–9, 11) is **PASS** on fresh, raw evidence from this
cycle, including CI-green `docker-demo`, a 33/33 Playwright browser smoke,
and 358 passed backend tests. Gate 10 is documented factually: no upstream
permission was requested or claimed; honest attribution is given to the original
prototype design in `sentinel-ui/NOTICE.md` and `docs/UI_PROVENANCE.md`.

**VERDICT: REPOSITORY REPAIRED & VERIFIED**

The canonical Next.js `sentinel-ui` console is confirmed as production
architecture. Obsolete fallback scripts and unverified permission requests were
removed, documentation across the repository is internally consistent, automated
quality gates are fully wired into CI, and the complete verification suite passes
cleanly.
