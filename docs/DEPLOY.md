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

## 6. Currently deployed instances (24 October 2026)

| Component | URL | Where |
|---|---|---|
| Console | https://sentinel-ui-nu.vercel.app | Vercel project `sentinel-ui`, production |
| API | https://sentinel-console-api.onrender.com | Render web service `sentinel-console-api` (free, Oregon) |

The console proxies `/api/*`, `/investigations/*`, `/benchmark/*` and `/health` to the Render service through `NEXT_PUBLIC_API_PROXY_TARGET`, so the browser talks to a single origin and no CORS is involved. The API runs `DEMO_MODE=1` with `GRAPH_BACKEND=local` and builds its SQLite graph from the committed synthetic CSVs during deploy.

Notes:

- Render free instances sleep when idle; the first request after a pause takes roughly 30-60 s to wake.
- The older `hhgoa-fraud-api` Render service is still attached to the `HHGoa26-Agentic-Fraud-Investigation` repository and was left untouched.
- Redeploy the console with `cd sentinel-ui && vercel deploy --prod --yes`; redeploy the API with `render deploys create srv-dbefmsvavr4c73aph5c0 --confirm`.
- The Vercel project previously served the static snapshot build (`NEXT_PUBLIC_DEMO_DATA=1`); that variable was removed in favour of the live proxy. Re-add it and redeploy to return to snapshot mode.
