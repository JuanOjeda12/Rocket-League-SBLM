$ErrorActionPreference = 'Stop'
$projectDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$gameAddress = 'http://127.0.0.1:8080'
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Instala Node.js 22 o posterior.' }
Push-Location $projectDirectory
try {
    if (-not (Test-Path -LiteralPath 'node_modules/ws/package.json')) {
        & npm.cmd ci
        if ($LASTEXITCODE -ne 0) { throw 'No se pudo instalar la dependencia de red.' }
    }
    try { $response = Invoke-RestMethod -Uri "$gameAddress/api/info" -TimeoutSec 2 } catch { $response = $null }
    if ($response.name -ne 'Rocket Arena') {
        Start-Process -FilePath 'node' -ArgumentList 'server/index.mjs' -WorkingDirectory $projectDirectory -WindowStyle Hidden -RedirectStandardOutput 'server.log' -RedirectStandardError 'server-error.log'
        Start-Sleep -Seconds 2
    }
    Start-Process $gameAddress
} finally { Pop-Location }
