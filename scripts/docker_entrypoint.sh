#!/bin/sh
set -eu

# Rebuild the SQLite store from the synthetic CSVs.
echo "Preparing data store..."
python -m backend.scripts.prepare_data

# Start the Next.js UI server if it was baked into this image.
UI_DIR="/app/ui/standalone"
if [ -d "$UI_DIR" ]; then
  echo "Starting Next.js UI server on port 3000..."
  (
    cd "$UI_DIR"
    PORT=3000 HOSTNAME=0.0.0.0 exec node server.js
  ) &
  UI_PID=$!
  echo "UI PID: $UI_PID"
  export UI_PORT=3000
else
  echo "No UI in this image; serving API only."
fi

echo "Starting API server on port 8000..."
exec python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --log-level info
