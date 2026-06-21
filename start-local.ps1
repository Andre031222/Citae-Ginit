# start-local.ps1 — Levanta backend y frontend de CITAE en local
# Uso: .\start-local.ps1
# Cierra ambas ventanas para detener.

$root = $PSScriptRoot

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  CITAE — arranque local"                           -ForegroundColor Cyan
Write-Host "  Backend  -> http://localhost:5000"                -ForegroundColor Cyan
Write-Host "  Frontend -> http://localhost:3000"                -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# Backend (nueva ventana)
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd '$root'; Write-Host '[BACKEND] pnpm dev:backend' -ForegroundColor Green; pnpm dev:backend"
)

# Espera breve para que el backend arranque primero
Start-Sleep -Seconds 3

# Frontend (nueva ventana). Las variables de entorno ya van en el script "dev" vía cross-env.
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd '$root'; Write-Host '[FRONTEND] pnpm dev:frontend' -ForegroundColor Yellow; pnpm dev:frontend"
)

Write-Host ""
Write-Host "Ambos procesos iniciados en ventanas separadas." -ForegroundColor Green
Write-Host "Abre http://localhost:3000 en tu navegador."     -ForegroundColor Green
Write-Host "Cierra esas ventanas para detenerlos."           -ForegroundColor Gray
