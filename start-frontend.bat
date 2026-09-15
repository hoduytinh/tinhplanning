@echo off
REM ============================================================
REM  LeadBoard - chay FRONTEND (Vite + React) tren Windows
REM  Su dung Node portable, khong can cai dat vao he thong.
REM  Double-click file nay hoac chay: start-frontend.bat
REM ============================================================

REM --- Duong dan toi Node portable (chinh lai neu ban de o cho khac) ---
set "NODE_DIR=C:\Users\thoduy\OneDrive - Marvell\Documents\GitHub\node-v24.21.0-win-x64"
set "PATH=%NODE_DIR%;%PATH%"

cd /d "%~dp0frontend"

if not exist "node_modules" (
  echo [frontend] Cai dependencies lan dau...
  call npm.cmd install
)

echo [frontend] Khoi dong giao dien tai http://localhost:5173
call npm.cmd run dev
