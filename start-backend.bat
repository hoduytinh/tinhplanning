@echo off
REM ============================================================
REM  LeadBoard - chay BACKEND (FastAPI) tren Windows, khong Docker
REM  Double-click file nay hoac chay: start-backend.bat
REM ============================================================
cd /d "%~dp0backend"

echo [backend] Ap dung migration...
".venv\Scripts\python.exe" -m alembic upgrade head

echo [backend] Seed du lieu mau (idempotent)...
".venv\Scripts\python.exe" -m seed

echo [backend] Khoi dong API tai http://localhost:8000  (docs: /docs)
".venv\Scripts\python.exe" -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload --reload-dir core --reload-dir modules --reload-include "main.py"
