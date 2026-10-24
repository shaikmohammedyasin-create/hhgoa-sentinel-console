# Deployment & Operations Guide

Sentinel Graph can be deployed in three supported modes:
1. **Single-Container Docker (Recommended for judges & local demo)**: Both the Next.js analyst console and FastAPI backend co-hosted on a single URL (`http://localhost:8008`).
2. **Hosted Cloud Deployment (Render Blueprint)**: Automated deployment of the backend API via `render.yaml`.
3. **Local Bare-Metal Development**: Running backend and frontend in separate processes.

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
- **One Container, One Port**: The FastAPI backend listens on port 8000 and proxies all non-API web traffic to the co-hosted Next.js standalone server on port 3000. Docker Compose maps this to `http://localhost:8008`.
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

### Container Entrypoint Sequence (`docker_entrypoint.sh`):
1. Runs `python -m backend.scripts.prepare_data` to ensure the SQLite graph database `data/prepared/investigation.db` is initialized.
2. Launches `node /app/ui/standalone/server.js` on port 3000 in the background.
3. Launches `uvicorn backend.main:app --host 0.0.0.0 --port 8000`.
4. Reverse-proxy middleware in `backend/main.py` catches all frontend routes (`/`, `/cases/*`, `/_next/*`) and transparently streams responses from the internal Node server.

---

## 3. Hosted Deployment on Render (`render.yaml`)

The repository includes a ready-to-deploy Render Blueprint specification (`render.yaml`).

### Setup Steps:
1. In the **Render Dashboard**, select **New +** -> **Blueprint**.
2. Connect the `hhgoa-sentinel-console` repository.
3. Render parses `render.yaml` and provisions:
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

### Environment Variables:
| Variable | Value | Purpose |
|---|---|---|
| `PYTHON_VERSION` | `3.12` | Runtime version |
| `APP_ENV` | `development` | Environment mode |
| `DEMO_MODE` | `1` | Default zero-credit safe mode |
| `GRAPH_BACKEND` | `local` | SQLite traversal engine |
| `NEBIUS_API_KEY` | *(Secret, sync: false)* | Optional: Nebius Token Factory API key |
| `NEBIUS_DAILY_CALL_CAP` | `40` | Hard cap on daily LLM calls |
| `NEBIUS_PER_IP_HOURLY_LIMIT` | `10` | IP rate limit for demo protection |
| `NEBIUS_CACHE_DIR` | `/tmp/nebius_cache` | Cache directory |

---

## 4. Live Mode (Nebius Token Factory)

To enable live NVIDIA Nemotron inferences instead of demo replay:

```yaml
# In docker-compose.yml or Render Environment:
environment:
  DEMO_MODE: "0"
  NEBIUS_API_KEY: "your-nebius-api-key"
```

### Models Used (Verified against Token Factory endpoint):
| Role | Model Tier | Model Catalog ID |
|---|---|---|
| Role 1: Pattern Proposal | Nano | `nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B` |
| Role 2: Verification Draft | Nano | `nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B` |
| Role 3: Narrative & SAR Draft | Ultra | `nvidia/Nemotron-3-Ultra-550b-a55b` |
| Role 4: Analyst Interactive Q&A | Ultra | `nvidia/Nemotron-3-Ultra-550b-a55b` |

### Built-in Spend Protections:
- **Per-IP Rate Limiting**: Max 20 calls/IP/hour (`LLM_CALLS_PER_IP_PER_HOUR`).
- **Global Daily Cap**: Max 200 calls/day (`LLM_DAILY_CALL_CAP`). Once hit, requests gracefully fall back to deterministic policies without 500 errors.
- **Cache Replay**: Successful responses are cached in `data/logs/llm_answer_cache.json` (replays do not bill credits).
- **Audit Logging**: Every call is logged with prompt/completion token counts and latency to `data/logs/nebius_calls.jsonl`, inspectable at `/api/llm/status`.

---

## 5. System Health Check (`/health`)

The `/health` endpoint provides structured observability into backend subsystems:

```json
{
  "status": "healthy",
  "graph": {
    "local": "healthy"
  },
  "app_db": "healthy",
  "llm_provider": "none",
  "nebius_available": true,
  "graph_mode": "sqlite",
  "app_env": "development",
  "demo_mode": true,
  "graph_hint": null
}
```

- `status`: `"healthy"` or `"degraded"`.
- `nebius_available`: Boolean indicating whether valid Nebius credentials and base URL are loaded.
- `graph_mode`: Active graph engine (`sqlite` or `tigergraph`).

---

## 6. Operational Hazards & Traps

### (a) Sleep / Restart Behavior (Free Tier Hosting)
- When hosted on Render free tier, the service spins down after 15 minutes of inactivity.
- **Wake-up Latency**: The initial cold-start request takes ~15?20 seconds for Uvicorn to bind and initialize.
- **Safe State Reset**: The SQLite graph database is built at deployment time and remains intact. Ephemeral in-memory rate-limiter counters reset safely upon container restart without blocking traffic or corrupting state.

### (b) Stale-Port 8008 Trap
- If a developer or background test previously launched an unmanaged server on port 8008 (e.g., `uvicorn backend.main:app --port 8008`), Windows or Linux may route traffic to the zombie process rather than the Docker container.
- **Symptom**: `http://localhost:8008` returns a 500 error or stale responses, and `/api/llm/status` shows unexpected call history.
- **Detection & Resolution**:
  - **Windows (PowerShell)**:
    ```powershell
    Get-NetTCPConnection -LocalPort 8008
    Stop-Process -Id <PID> -Force
    ```
  - **Linux / macOS**:
    ```bash
    lsof -i :8008
    kill -9 <PID>
    ```
  - Re-run `docker compose up` and verify `hhgoa-demo` is the container bound to the port.

---

## 7. Local Development (No Docker)

To run the frontend and backend natively on your local machine:

### Backend:
```bash
python -m venv .venv
# Activate: .venv\Scripts\activate (Windows) or source .venv/bin/activate (Linux/macOS)
pip install -r requirements.txt
python -m backend.scripts.prepare_data
uvicorn backend.main:app --port 8000 --reload
```

### Frontend:
```bash
cd sentinel-ui
npm ci
NEXT_PUBLIC_API_BASE=http://127.0.0.1:8000 npm run dev
# Open http://localhost:3000
```
