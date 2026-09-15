@echo off
REM ============================================================
REM  LeadBoard - TAT TRIET DE backend + frontend cu (reset port)
REM  Double-click file nay khi muon dep sach truoc khi chay lai.
REM ============================================================
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\stop-leadboard.ps1"
echo.
pause
