#!/usr/bin/env bash
set -euo pipefail

DATA_DIR="${DATA_DIR:-/data}"
PORT="${PORT:-8000}"
APP_ENV="${APP_ENV:-development}"

echo "[entrypoint] Ensuring data directory exists at ${DATA_DIR}..."
mkdir -p "${DATA_DIR}"

echo "[entrypoint] Running Alembic migrations..."
alembic upgrade head

if [ "${APP_ENV}" = "production" ]; then
    # Production: admin is seeded idempotently at app startup (main.py).
    # Skip sample data seeding and run without --reload.
    echo "[entrypoint] APP_ENV=production — skipping sample data seed."
    echo "[entrypoint] Starting API server (workers=${WEB_CONCURRENCY:-2})..."
    exec uvicorn main:app --host 0.0.0.0 --port "${PORT}" --workers "${WEB_CONCURRENCY:-2}"
else
    echo "[entrypoint] Seeding sample data (idempotent)..."
    python -m seed
    echo "[entrypoint] Starting API server (reload)..."
    exec uvicorn main:app --host 0.0.0.0 --port "${PORT}" --reload
fi
