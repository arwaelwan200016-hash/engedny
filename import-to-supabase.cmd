@echo off
setlocal
cd /d "%~dp0"
echo Engedny - Import local data into Supabase
echo Copy the completed Transaction pooler connection string first.
echo Do not share this connection string with anyone.
set "NODE_EXE=C:\Users\Elwan\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if not exist "%NODE_EXE%" (
  echo Node.js was not found. Please install Node.js from https://nodejs.org/
  pause
  exit /b 1
)
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$env:DATABASE_URL=(Get-Clipboard -Raw).Trim(); if (-not $env:DATABASE_URL.StartsWith('postgres')) { Write-Host 'Copy the PostgreSQL connection string first.'; exit 1 }; & '%NODE_EXE%' 'C:\Users\Elwan\Documents\New folder\EngednyNode\scripts\migrate-sqlite-to-supabase.js'"
pause
