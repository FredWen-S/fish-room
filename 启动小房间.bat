@echo off
chcp 65001 >nul
cd /d "%~dp0"
start "" /b cmd /c "timeout /t 2 >nul & start http://127.0.0.1:18765"
python server.py
if errorlevel 1 pause
