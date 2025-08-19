# Clean start helper for local development
# Stops node processes (if any) and starts Next.js dev server in foreground

Write-Host "Stopping existing node processes (if any)..."
Get-Process node -ErrorAction SilentlyContinue | ForEach-Object { Write-Host "Stopping PID: $($_.Id)"; Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue }

Write-Host "Starting dev server (stable mode)..."
cd $PSScriptRoot\..\
# Use stable dev script (without Turbopack)
npm run dev:stable
