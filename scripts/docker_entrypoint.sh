#!/bin/sh
set -eu

# Rebuild the SQLite store from the synthetic CSVs.
echo "Preparing data store..."
python -m backend.scripts.prepare_data

echo "Starting unified Sentinel API and Console on port 8000..."
exec python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --log-level info
