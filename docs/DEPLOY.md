# Deployment & Operations Guide

Sentinel Graph can be deployed in two supported modes:
1. **Single-Container Docker (Recommended for judges & local evaluation)**: Both the Next.js analyst console and FastAPI backend co-hosted on a single URL (`http://localhost:8008`).
2. **Hosted Cloud Deployment (Render Blueprint)**: Deployment of the backend API via `render.yaml`.

---

## 1. Quickstart: Single-Container Docker

Judges and evaluators require **no API keys or credentials** to run the complete system:

```bash
git clone https://github.com/shaikmohammedyasin-create/hhgoa-sentinel-console.git
cd hhgoa-sentinel-console
docker compose up --build
# Open http://localhost:8008 in your browser
```

### What happens automatically:
- **One Container, One Port (`:8008`)**: The FastAPI backend listens on port 8000 internally and proxies all non-API web traffic to the co-hosted Next.js standalone server on port 3000. Docker Compose maps this to `http://localhost:8008`.
- **Zero-Config Graph Engine**: `prepare_data` automatically builds the local SQLite graph store from committed synthetic CSVs (`data/synthetic/`) containing 12,230 transactions, 4,196 identity records, 28 closed cases, and 20 investigation cases in under 3 seconds.
- **Default Demo Mode (`DEMO_MODE=1`)**: No `NEBIUS_API_KEY` is required. Precomputed cases (`cases/*.json`) replay the recorded decisions and Nemotron advisory reasoning. If an investigator runs a fresh case without a key, the deterministic policy engine (R1?R10) and Noisy-OR Bayesian scorer still make the definitive decision (`served_by: "deterministic-fallback"`, `llm_used: false`), ensuring zero 500 errors.

---

## 2. Docker Architecture & Build Details

The repository includes a production multi-stage `Dockerfile`:

- **Stage 1 (UI Build)**: Uses `node:20-slim` to install dependencies and run `npm run build` in `sentinel-ui`, generating the standalone Next.js bundle (`.next/standalone`).
- **Stage 2 (Runtime)**: Uses `python:3.12-slim` with Node.js 20 installed.
  - Installs Python dependencies with network retry flags (`--default-timeout=120 --retries 5`).
  - Copies backend code, synthetic CSVs, prompts, and precomputed cases.
  - Copies the standalone UI assets into `/app/ui/standalone/`.
  - Executes `scripts/docker_entrypoint.sh`.

---

## 3. Hosted Deployment on Render (`render.yaml`)

The repository includes a ready-to-deploy Render Blueprint specification (`render.yaml`).

### Setup Steps:
1. In the **Render Dashboard**, select **New +** -> **Blueprint**.
2. Connect the `hhgoa-sentinel-console` repository.
3. Render parses `render.yaml` and provisions the web service:
   - **Service Name**: `hhgoa-fraud-api`
   - **Runtime**: Python 3.12
   - **Build Command**:
     ```bash
     pip install -r requirements.txt && TRANSACTIONS_CSV=data/synthetic/transactions.csv IDENTITY_CSV=data/synthetic/identity.csv CLOSED_CASES_CSV=data/synthetic/closed_cases_history.csv CASE_PACK_CSV=data/synthetic/case_pack.csv python -m backend.scripts.prepare_data
     ```
   - **Start Command**:
     ```bash
     uvicorn backend.main:app --host 0.0.0.0 --port $PORT
     ```
   - **Health Check Path**: `/health`

---

## 4. Environment Variables Reference

| Environment Variable | Default Value | Description |
|---|---|---|
| `PYTHON_VERSION` | `3.12` | Runtime Python version pinned for build |
| `APP_ENV` | `development` | Application environment mode |
| `DEMO_MODE` | `1` | `1` = zero-credit replay mode; `0` = live inferences |
| `GRAPH_BACKEND` | `local` | `local` = SQLite graph store; `tigergraph` = cloud GSQL |
| `NEBIUS_API_KEY` | `""` | Optional API key for Nebius Token Factory |
| `NEBIUS_BASE_URL` | `https://api.tokenfactory.nebius.com/v1` | OpenAI-compatible endpoint |
| `NEBIUS_MODEL_NANO` | `nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B` | Roles 1 & 2 model identifier |
| `NEBIUS_MODEL_SUPER` | `nvidia/nemotron-3-super-120b-a12b` | Mid-tier model identifier |
| `NEBIUS_MODEL_ULTRA` | `nvidia/Nemotron-3-Ultra-550b-a55b` | Roles 3 & 4 model identifier |
| `LLM_DAILY_CALL_CAP` | `200` (Render: `40`) | Global daily hard cap on model inferences |
| `LLM_CALLS_PER_IP_PER_HOUR`| `20` (Render: `10`) | Per-IP rate limiter |
| `TG_HOST` | `""` | Optional TigerGraph Savanna Cloud endpoint |
| `TG_GRAPH` | `fraud_investigation` | TigerGraph target graph name |
| `TG_SECRET` | `""` | TigerGraph REST++ auth token secret |

---

## 5. Post-Deploy Verification Checklist

Once deployed to a live environment (Docker or Render), execute these four verification checks before declaring the deployment operational:

### Step 1: Health Check Probe
```bash
curl -f https://<your-host>/health
```
- **Expected Status**: HTTP 200 OK
- **Expected Payload**: `{"status": "healthy", "graph": {"status": "healthy"}, "app_db": "healthy", "graph_mode": "local", ...}`

### Step 2: Investigation Case Run & Evidence Ledger
```bash
curl -f https://<your-host>/api/investigations/CASE-001
```
- **Expected Status**: HTTP 200 OK
- **Validation**: Confirm `verdict` is populated (`legitimate` or `fraud`), `evidence` contains structured cards with `ref` tags, and `risk` details are returned.

### Step 3: Deep-Link Refresh Test (HTML vs JSON)
```bash
curl -f -H "Accept: text/html" https://<your-host>/cases/CASE-004
```
- **Expected Status**: HTTP 200 OK
- **Validation**: Verifies the reverse proxy serves the HTML console page on direct browser refresh without returning raw JSON or a 404 error.

### Step 4: Cap & Rate Limiter Test
```bash
# Rapidly fire requests to the analyst Q&A endpoint:
for i in {1..25}; do curl -s -o /dev/null -w "%{http_code}
" -X POST https://<your-host>/api/cases/CASE-001/ask -H "Content-Type: application/json" -d '{"question": "What is the fraud probability?"}'; done
```
- **Expected Result**: First 10?20 requests return HTTP 200; subsequent requests return HTTP 429 (`Rate limit exceeded: max 20 requests per IP per hour`) or fallback notice. Confirm that the application never produces an unhandled HTTP 500 error.

> **Deployment Status**: The Render Blueprint specification (`render.yaml`) and Docker container configuration are fully prepared and verified. Live hosted URL will be recorded once provisioned by the operator.

---

## 6. Hosted Demo Topology (Blueprint)

The canonical deployment is the single-container Docker demo (`docker compose up`), where the Next.js `sentinel-ui` console and FastAPI backend are co-hosted with unified proxying and local synthetic SQLite graph storage.

For multi-host cloud deployment (e.g., Render + Vercel):

| Component | Target | Details |
|---|---|---|
| Console | Vercel (`sentinel-ui`) | Next.js production build, with `NEXT_PUBLIC_API_PROXY_TARGET` pointing to the backend API origin |
| API | Render (`render.yaml`) | Service name `hhgoa-fraud-api`, Python 3.12, `GRAPH_BACKEND=local`, `DEMO_MODE=1` |

Notes on hosted operation:
- The Render service specification in `render.yaml` provisions `hhgoa-fraud-api`. If hosted on a free Render tier, instances sleep after inactivity and require 30–60 s to spin up on initial access.
- When deploying the console to Vercel, set `NEXT_PUBLIC_API_PROXY_TARGET` to the live backend URL so API routes are transparently proxied without CORS friction.
- For air-gapped or zero-backend demonstration, `sentinel-ui` can also be built with `NEXT_PUBLIC_DEMO_DATA=1` to serve directly from committed benchmark snapshots.

---

## 7. Keep-alive (free-tier hosted demo)

The Render demo service is on the free plan, which sleeps after inactivity; the
first request after a pause takes roughly 30-60 s. A 10-minute external check
keeps the demo warm and doubles as an availability alert.

### Uptime monitor setup (any of these; all free)

**UptimeRobot (recommended)**

1. Create an account at <https://uptimerobot.com>.
2. **Add New Monitor** → Monitor Type **HTTP(s)**.
3. Friendly Name: `Sentinel Graph API`.
4. URL: `https://<your-render-service>.onrender.com/health` (or the proxied
   console `/health` path if you prefer to monitor the frontend).
5. Monitoring Interval: **10 minutes**.
6. Leave "Alert Contacts" as your email; optionally add your console URL as a
   second monitor with the same interval.
7. Save. Expected result: **HTTP 200** with body containing `"status":"healthy"`.
   A timeout on the first probe usually means the free instance was asleep and
   is waking — the second probe should pass.

**cron-job.org (alternative)**

1. Create an account at <https://cron-job.org>.
2. Create a cron job: URL `https://<your-render-service>.onrender.com/health`,
   schedule every **10 minutes**, request method GET.
3. Enable "Save responses" for the first runs so a non-200 status is visible.
4. Optional: enable failure notifications to your email.

**GitHub Actions (alternative, no third party)**

A scheduled workflow (`.github/workflows/keepalive.yml`) can `curl -fsS` the
`/health` URL every 10 minutes with `on: schedule: - cron: "*/10 * * * *"`.
Note that GitHub's scheduler is best-effort and can be delayed by several
minutes under load; UptimeRobot or cron-job.org is more reliable.

### What the probe proves, and what it does not

- It proves the API process is up and the SQLite graph store opened (`/health`
  returns `status`, `graph.status`, `app_db`), not that any particular case is
  correct.
- It does **not** spend Nemotron credits: `/health` never calls the LLM.
- It does not protect against Render's monthly free-hour exhaustion — check the
  Render dashboard's usage if the service starts returning 503/502.

---

## 8. Enabling live Nemotron on the hosted demo (Render dashboard)

The hosted API runs with no key so the demo cannot spend credits. The console
still shows real Nemotron text because `cases/_nemotron_cache.json` records one
live run for all 20 cases (`scripts/export_nemotron_cache.py`, recorded
2026-10-25); the API labels those answers `cached live run (2026-10-25)`.

To turn on **live** calls for the hosted demo:

1. Render Dashboard → **hhgoa-fraud-api** → **Environment** → **Add Environment Variable**.
2. Add `NEBIUS_API_KEY` = your Nebius Token Factory key. Keep **Secret** checked
   (it is stored encrypted and never shown again).
3. Add `LLM_DAILY_CALL_CAP` = `60`.
4. Add `LLM_CALLS_PER_IP_PER_HOUR` = `10`.
5. Add `APP_ENV` = `production`.
   - Consequence: approval decisions without `APPROVAL_TOKEN` are refused with
     503 (fail-closed), so also add `APPROVAL_TOKEN` if the demo must approve
     actions; otherwise the demo is read-only, which is the safe default.
6. **Save Changes** — Render redeploys automatically.
7. Verify after boot:
   - `https://<your-render-service>.onrender.com/health` → `"nebius_available": true`
   - `https://<your-render-service>.onrender.com/api/llm/status` → shows the
     model ids and a call log that grows only when a genuinely new question is
     asked.
   - Ask the same question twice; the second answer is served from the on-disk
     cache (`.env`-free; stored under `data/logs/` on the instance).

Caps are enforced by `backend/api_limits.py`: the per-IP hourly limit returns
429, the global daily cap returns 503, and both are covered by tests. The
committed recording is never written to by the API.
