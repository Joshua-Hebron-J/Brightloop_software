# Brightloop Software - One-Click Launcher
$env:PATH = "$PSScriptRoot\.tools\node-v20.18.0-win-x64;$env:PATH"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " ⚡ Brightloop Software — Subscription Management System" -ForegroundColor White
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Starting Vite Development Server on http://localhost:3000..." -ForegroundColor Green
Write-Host "Press Ctrl+C to terminate server." -ForegroundColor Yellow
Write-Host ""

npm run dev
