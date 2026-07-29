@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0GENERATE_SECRETS.ps1"
pause
