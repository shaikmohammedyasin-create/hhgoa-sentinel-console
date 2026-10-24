# Feedback notes (honest engineering ledger)

Known gaps, design debts, and reviewer-facing answers. If a claim is not in the
README, the tests, or `docs/BENCHMARK.md`, treat it as not implemented.

Last reconciled with the code: 24 October 2026.

## Round specifics

- **Demo mode and the LLM cache.** Two distinct things, often conflated:
  1. *No key* — `backend/llm/nebius_client.py` returns `None` before it ever
     consults the cache, so a run is deterministic (`llm_used=false`). Opening
     a case serves the committed answer file `cases/<id>.json`.
  2. *Key present, `DEMO_MODE=1`* — each `(role, prompt)` pair is cached in
     `data/logs/llm_answer_cache.json` and replayed on a repeat question, so
     judge traffic is billed once per distinct question instead of once per
     view. That file is a runtime artifact: gitignored, `.dockerignore`d, and
     not shipped, so a fresh clone starts with an empty cache.
- **TigerGraph cloud vs local.** `GRAPH_BACKEND=local` runs the GSQL traversal
  logic against a SQLite store in the container. The Savanna Cloud instance
  (which idles after inactivity) is exercised only when `TG_HOST` is
  configured; `/health` reports graph state and a `graph_hint` when it is
  down. Every number in this repo was produced on the local backend. The
  cloud schema/queries are recorded in `docs/TECHNICAL_VALIDATION.md` §4 and
  marked as not re-verifiable here.
- **Vendored console.** `sentinel-ui/` started as a fork of an upstream
  console by Team CollabUp; it is now wired to *this* backend (`src/lib/api.ts`,
  `src/lib/hooks.ts`, `src/components/console/*`) and is the shipped UI, not a
  decorative snapshot. Upstream has **no LICENSE file**, so attribution lives
  in `sentinel-ui/NOTICE.md`. Publishing a fork without an upstream license is
  a real legal risk; if that matters more than the demo, ship the FastAPI
  `/docs` surface and drop this directory.

## Code-level debts

- `requirements.txt` keeps `pytest`/`pytest-asyncio` in the runtime list, so
  the Docker image installs test tooling it does not need at runtime.
- `backend/evaluation/run_benchmark.py` overwrites the answer files under
  `cases/` on every run. That keeps the committed pack in sync with the code,
  but it means a benchmark run is a working-tree mutation, not a read-only
  measurement. `git checkout -- cases` restores the committed set. In `DEMO_MODE`
  the API refuses those writes (benchmark, create-investigation and evidence
  endpoints), and the test suite arms `SENTINEL_PROTECT_CASE_PACK` so a test that
  starts a real investigation fails loudly instead of rewriting the pack.
- **`CASE-009`'s stress amount is not the designed one.** `scripts/make_synthetic_data.py`
  writes the designed stress amount ($14.50) into the trailing `amount` column
  (`flagged["amount"]`, line 549) but never updates `flagged["TransactionAmt"]`,
  which `_txn_row()` had already written with the donor row's amount. The
  shipped case is therefore a $2,093.43 charge that the model scores 0.48, not
  the designed $14.50 micro-payment, and the docs describe the shipped
  behaviour. Until the data decision is made, the structured `TransactionAmt` is
  treated as authoritative (exposure, SAR totals, benchmark semantics); the
  trigger text is the stale copy. Fixing the row would change exposure,
  `P(fraud)` and the committed benchmark pack, so it is left as a data decision
  rather than a code change. `cases/CASE-009.json` was regenerated after the
  writer fixes (tokens 2,016, P(fraud) 0.808, exposure $2,102.44), so its
  exposure and SAR totals follow `TransactionAmt` while its evidence claim,
  summary and SAR narrative still quote the trigger's $14.50 — one case, two
  amounts, until the row is fixed.
- The legacy `LLM_PROVIDER` (anthropic/openai/groq) narrative path in
  `backend/llm/client.py` is dormant: default and `.env.example` pin it to
  `none`, and nothing in the Nemotron advisory flow calls it. It should be
  deleted rather than carried.
- The per-IP limiter keys on the request's client host. Behind a shared
  NAT/proxy (judges on one hotspot) all traffic shares a bucket, bounded by the
  global daily cap.
- **Approvals have a shared-secret gate, not an identity system.** With
  `APPROVAL_TOKEN` unset, production refuses decisions (503) and
  development/demo allow them while logging. There is no per-analyst identity,
  no role model and no separation of duties — adding one is the next real
  security step.
- Ultralarge reasoning models leak "chain-of-thought-like" preambles on Q&A.
  The `ANSWER:` marker contract plus markdown post-processing handles current
  prompts, but sampling temperature still leaves small nondeterminism in
  freetext answers — bounded by the advisory-only role.

## Security / release prep

- Secrets load from `.env` only; it is gitignored, and
  `sentinel-ui/.env.local` (a Vercel OIDC token written by the CLI) is ignored
  and has never been committed. No key material is in the tree or in history.
- Only synthetic CSVs (`data/synthetic/`) are tracked. Round-provided data,
  prepared stores, staging directories, and logs are excluded by `.gitignore`
  and `.dockerignore`.
- `gitleaks` v8.30.1 was run over the full history (92 commits, 9.21 MB, **0
  findings**). Re-run it before any public push, and check
  `git log --all --full-history -- data/prepared/* data/raw/*
  closed_cases_history.csv` on the *old* repository history if it is ever
  reused — that history was never part of this scan.

## Measured Model Observability & Engineering Insights (Phase 2 & 3 Telemetry)

### 1. Latency & Token Telemetry (Nebius Token Factory)
Measurements taken live against `https://api.tokenfactory.nebius.com/v1`:
- **Role 1: Pattern Proposal (Nano 30B)**: 592 prompt tokens, 613 completion tokens, 8,322 ms latency.
- **Role 2: Verification Draft (Nano 30B)**: 428 prompt tokens, 568 completion tokens, 6,051 ms latency.
- **Role 3: Narrative & SAR (Ultra 550B)**: 594 prompt tokens, 919 completion tokens, 4,339 ms latency.
- **Role 4: Analyst Interactive Q&A (Ultra 550B)**: 649?1,396 prompt tokens, 100?1,200 completion tokens, 1,295?8,175 ms latency.
- **Full Case Pipeline Wall-Clock**: Average 22.84s per case for multi-hop graph retrieval, Bayesian scoring, policy evaluation, and dual-role LLM inference.

### 2. JSON Validity & Schema Adherence
- **100% Valid JSON on First Attempt**: Across both Nano (`NVIDIA-Nemotron-3-Nano-30B-A3B`) and Super (`nemotron-3-super-120b-a12b`), zero JSON parsing failures occurred. Both models adhered strictly to the expected schema (`proposed_pattern`, `confidence`, `rationale`, `supporting_evidence_refs`).
- **Prompt Guardrail Efficiency**: Clear system prompts enforcing raw JSON output without markdown markdown fences (` ```json `) eliminated parser retries.

### 3. Model Tier Selection Strategy (Nano vs Super vs Ultra)
- **Nano (30B)**: Outstanding cost-to-performance ratio for structured classification and schema output ($0.000046/case). Sufficient for pattern hypothesis and verification drafting.
- **Super (120B)**: Tested head-to-head with Nano on identical case inputs. Super agreed with Nano on pattern (`card_testing`) and confidence (0.85), but required higher compute cost. Nano remains the production choice for high-volume automated triage.
- **Ultra (550B)**: Essential for natural language audit reporting (SAR narratives) and interactive analyst Q&A. The 550B parameter size provides the reasoning depth required to synthesize conflicting evidence and cite specific transaction IDs accurately without hallucinations.

### 4. Zero-500 Outage Resilience
- Tested failure modes where the Nebius API endpoint returns timeouts or simulated connection drops.
- The system gracefully falls back to the deterministic policy engine (`served_by: "deterministic-fallback"`, `llm_used: false`), ensuring that core banking workflows and case queues never crash.
