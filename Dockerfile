# HHGOA Agentic Fraud Investigation — single-container demo (Path B: Clean-Room UI).
#
# Single-stage Python 3.12 runtime:
#   FastAPI backend on 8000 serves both the API and the clean-room
#   vanilla analyst console (frontend/) directly at root (/).
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

FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

RUN apt-get update && apt-get install -y --no-install-recommends \
      curl \
      ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Python deps.
COPY requirements.txt ./
RUN pip install --no-cache-dir --default-timeout=120 --retries 5 -r requirements.txt

# Python backend & Clean-Room Frontend
COPY backend ./backend
COPY frontend ./frontend
COPY cases ./cases
COPY prompts ./prompts
COPY scripts ./scripts
COPY tigergraph ./tigergraph
COPY data/README.md data/README.md
COPY data/synthetic ./data/synthetic

# Synthetic CSVs are the data source inside the container.
ENV TRANSACTIONS_CSV=data/synthetic/transactions.csv \
    IDENTITY_CSV=data/synthetic/identity.csv \
    CLOSED_CASES_CSV=data/synthetic/closed_cases_history.csv \
    CASE_PACK_CSV=data/synthetic/case_pack.csv \
    GRAPH_BACKEND=local \
    DEMO_MODE=${DEMO_MODE:-1}

EXPOSE 8000

# Entry script: prepare data, start unified uvicorn server.
COPY scripts/docker_entrypoint.sh /usr/local/bin/docker_entrypoint.sh
RUN chmod +x /usr/local/bin/docker_entrypoint.sh

ENTRYPOINT ["docker_entrypoint.sh"]
