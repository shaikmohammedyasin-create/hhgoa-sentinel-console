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
  measurement. `git checkout -- cases` restores the committed set.
- The legacy `LLM_PROVIDER` (anthropic/openai/groq) narrative path in
  `backend/llm/client.py` is dormant: default and `.env.example` pin it to
  `none`, and nothing in the Nemotron advisory flow calls it. It should be
  deleted rather than carried.
- The per-IP limiter keys on the request's client host. Behind a shared
  NAT/proxy (judges on one hotspot) all traffic shares a bucket, bounded by the
  global daily cap.
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
- `gitleaks` was **not** installed during this round, so the secret scan was a
  manual pass over tracked content. Re-run a real scanner before any public
  push, and check `git log --all --full-history -- data/prepared/* data/raw/*
  closed_cases_history.csv` on the *old* repository history if it is ever
  reused.
