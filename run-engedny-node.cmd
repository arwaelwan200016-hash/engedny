@echo off
cd /d "%~dp0"
start "Engedny local server" cmd /c "node server.js"
timeout /t 2 /nobreak >nul
start "" http://localhost:3000
