# Deployment

## Quickstart (judges, no credentials needed)

```bash
git clone <repo-url>
cd <repo>
docker compose up --build
# open http://localhost:8008
```

What you get in under 5 minutes:

- One container, one URL. The FastAPI backend listens on 8000 and proxies
  every non-API path to the **Next.js console** running on 3000 inside the
  same image. The console is a real Node server (Next standalone), not a
  static export; compose publishes the pair as `http://localhost:8008`.
- Approximately 3 s after start, `prepare_data` rebuilds the SQLite graph
  store from the publishable synthetic CSVs (`data/synthetic/`) — 12,235
  transactions, 4,201 identity records, 28 closed cases, 20 investigation
  cases. No third-party data is used anywhere.
- `GRAPH_BACKEND=local`: TigerGraph's traversal logic runs against the
  local SQLite store. The cloud TigerGraph instance is an option, not a
  dependency for the demo.
- **Demo mode is the default (`DEMO_MODE=1`)**: no `NEBIUS_API_KEY` is
  required, and no Token Factory credit is spent. Opening a case that has
  not been investigated in this session serves the committed answer file
  `cases/<id>.json` — the output of a real recorded run, Nemotron advisory
  block included. Fresh runs are deterministic-only when no key is
  configured (`llm_used=false`, the policy engine still decides), and the
  console labels which source answered.

> Note on the LLM cache: `data/logs/llm_answer_cache.json` is **not** in the
> repository (it is a runtime artifact under `data/logs/`, ignored by git and
> `.dockerignore`). The cache is consulted only when a key is present, i.e. it
> makes a keyed demo replay answers instead of re-billing them. Without a key
> there are no model calls to replay — the committed `cases/*.json` files are
> what you are looking at.

## live mode (optional — real Nemotron calls)

```yaml
# docker-compose.yml
environment:
  DEMO_MODE: "0"                      # or 1 to keep the cache active
  NEBIUS_API_KEY: "your-nebius-api-key"
```

Live mode still has protections on by default (see below). Model tiers used:

| Role | Tier | Model id |
|---|---|---|
| Pattern proposal (role 1) | Nano | `nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B` |
| Verification draft (role 2) | Nano | same |
| Narrative / SAR draft (role 3) | Ultra | `nvidia/Nemotron-3-Ultra-550b-a55b` |
| Analyst Q&A | Ultra | same |

(The model ids are as verified against the Nebius Token Factory endpoint in
October 2026. The base URL and models are set in `.env.example`.)

## Built-in cost protections (live mode)

| Mechanism | Default | Config |
|---|---|---|
| Per-IP hourly limiter | 20 calls / IP / hour | `LLM_CALLS_PER_IP_PER_HOUR` |
| Global daily cap | 200 calls / day, then deterministic-only | `LLM_DAILY_CALL_CAP` |
| Demo answer cache | unlimited replay, zero credits | `DEMO_MODE=1` |
| Call log | JSONL, one row per call | `/api/llm/status` |

## Hosted console (static snapshot, no backend)

The Vercel deployment publishes **only the console**, built with
`NEXT_PUBLIC_DEMO_DATA=1`. In that build every request is served from the
committed snapshot under `sentinel-ui/public/demo/` (20 cases plus the
benchmark report), exported from a real local run by
`scripts/export_ui_demo.py`. Nothing is invented: the read endpoints replay
recorded responses, the masthead says `static snapshot · recorded run`, and
the two endpoints that need a live engine (the benchmark runner and analyst
Q&A) answer with `served_by: "demo-snapshot"` instead of fabricating a result.

To rebuild and publish:

```bash
python scripts/export_ui_demo.py                 # refresh public/demo/*.json
cd sentinel-ui
NEXT_PUBLIC_DEMO_DATA=1 npm run build
vercel --prod
```

The full backend-connected experience is the Docker image above; the Vercel
URL is a read-only replay of it.

**Operational hazard, documented rather than hidden:** the Vercel project
(`prj_lFoevNwIqkBZEd99A4MvKDEamJho`, team `team_uAtXXJKvXhHJMjkrVZroN8lZ`) is
still Git-linked to the **retired** repository
`HHGoa26-Agentic-Fraud-Investigation` with `productionBranch: main`, because
re-pointing it at `hhgoa-sentinel-console` through the API returns HTTP 400 —
the Vercel GitHub app has not been granted access to the private submission repo.
Consequence: production is deployed by CLI only, and a push to that old repo's
`main` would auto-deploy pre-fix code over the live demo. The submission repo is
never pushed to that remote. To remove the footgun entirely, unlink it in the
Vercel dashboard (Project → Settings → Git) or grant the GitHub app access to
`hhgoa-sentinel-console` and relink with `rootDirectory: sentinel-ui`.
`sentinel-ui/.vercelignore` keeps `.env.local` (a short-lived Vercel OIDC token)
out of every upload.

## Local (no Docker) quickstart

```bash
python -m venv .venv
.venv/bin/python -m pip install -r requirements.txt   # Windows: .venv\Scripts\...
python -m backend.scripts.prepare_data                # build the SQLite store
uvicorn backend.main:app --port 8000                  # API only
```

That serves the API (`/health`, `/docs`, `/api/*`). To get the console,
start it separately and point it at the API:

```bash
cd sentinel-ui
npm ci
NEXT_PUBLIC_API_BASE=http://127.0.0.1:8000 npm run dev   # http://localhost:3000
```

The single-URL proxy only engages inside the container, where the entrypoint
sets `UI_PORT=3000` and the FastAPI app forwards non-API paths to the Next
server.

Environment variables are documented in `.env`.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `/health` reports `graph` unhealthy in cloud mode | The defense has a `graph_hint` on `/health` and `scripts/wake_graph.py` polls until the TS suspend-wake completes. Demo/local graph (default in the container) is always healthy. |
| Nemotron answers show `cache-replay` | Demo mode **with** a key: the (role, prompt) pair was already answered and is being replayed instead of re-billed. Expected. |
| `llm_used=false` / `nemotron unavailable` everywhere | No `NEBIUS_API_KEY` in the environment. Demo runs stay deterministic; add the key and set `DEMO_MODE=0` for live calls. |
| `daily credit cap reached` responses | Capped at `LLM_DAILY_CALL_CAP` calls; the app keeps running deterministically. |
| Port busy | `ports: "9000:8000"` in compose, then open `:9000`. |
| `:8008` answers but `/` returns `500 Internal Server Error` and `/api/llm/status` reports calls you did not make | An **older** process is still bound to 8008 and Windows is routing to it, not to the container. This happened during verification: a stale `uvicorn ... --port 8008` from a previous round shadowed the new container. Check with `Get-NetTCPConnection -LocalPort 8008` (Windows) or `lsof -i :8008`, stop the stray process, and confirm with `docker ps` that `hhgoa-demo` owns the port. |
| Docker build fails with `pip` `ReadTimeoutError` on a slow link | Already mitigated: the Dockerfile uses `--default-timeout=120 --retries 5`. If your network still drops, re-run `docker compose build` — completed layers are cached. |
