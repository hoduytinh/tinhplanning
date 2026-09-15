@echo off
REM ============================================================
REM  LeadBoard - khoi dong BACKEND + FRONTEND (khong Docker)
REM  - Tu kiem tra xem da chay tot chua, neu roi thi bo qua.
REM  - Neu port bi xung dot/tien trinh cu con song thi tu tat
REM    roi khoi dong lai, chay backend truoc, frontend sau.
REM  Double-click file nay moi lan muon chay du an.
REM ============================================================
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-leadboard.ps1"
echo.
pause
