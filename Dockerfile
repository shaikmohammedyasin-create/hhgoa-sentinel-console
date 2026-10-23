# HHGOA Agentic Fraud Investigation — single-container demo.
#
# Two-stage build:
#   1. Build the Next.js console (sentinel-ui) as a standalone Node server
#   2. Python 3.12 + Node 20 runtime: FastAPI backend on 8000, co-hosted
#      UI server on 3000, proxy in the FastAPI app for every non-API path.
#
# Judge-friendly defaults:
#   - GRAPH_BACKEND=local: no TigerGraph cloud needed.
#   - DEMO_MODE=1 (default): Nemotron answers replay from the committed
#     answer files — zero API credits. Live mode: set NEBIUS_API_KEY +
#     DEMO_MODE=0 (still rate-limited per-IP and by the global daily cap).
#
# Run:
#   docker compose up --build
#   open http://localhost:8008

# ── Stage 1: build the Next.js console ───────────────────────────────────────
FROM node:20-slim AS ui-build
WORKDIR /ui
COPY sentinel-ui/package.json sentinel-ui/package-lock.json ./
RUN npm ci
COPY sentinel-ui/ ./
RUN npm run build

# ── Stage 2: runtime ─────────────────────────────────────────────────────────
FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

# Node for the co-hosted UI server
RUN apt-get update && apt-get install -y --no-install-recommends \
      curl \
      ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Python deps
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Python backend
COPY backend ./backend
COPY cases ./cases
COPY prompts ./prompts
COPY scripts ./scripts
COPY tigergraph ./tigergraph
COPY data/README.md data/README.md
COPY data/synthetic ./data/synthetic

# Built Next.js console: standalone server + static assets + public dir.
COPY --from=ui-build /ui/.next/standalone/ /app/ui/standalone/
COPY --from=ui-build /ui/.next/static /app/ui/standalone/.next/static/
COPY --from=ui-build /ui/public /app/ui/standalone/public/

# Synthetic CSVs are the data source inside the container.
ENV TRANSACTIONS_CSV=data/synthetic/transactions.csv \
    IDENTITY_CSV=data/synthetic/identity.csv \
    CLOSED_CASES_CSV=data/synthetic/closed_cases_history.csv \
    CASE_PACK_CSV=data/synthetic/case_pack.csv \
    GRAPH_BACKEND=local \
    DEMO_MODE=${DEMO_MODE:-1}

EXPOSE 8000

# Entry script: prepare data, start Node UI server, start uvicorn.
COPY scripts/docker_entrypoint.sh /usr/local/bin/docker_entrypoint.sh
RUN chmod +x /usr/local/bin/docker_entrypoint.sh

ENTRYPOINT ["docker_entrypoint.sh"]
