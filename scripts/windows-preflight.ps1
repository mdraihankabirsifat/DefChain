$ErrorActionPreference = 'Continue'

function Report-Command($Name, $Hint = '') {
  $command = Get-Command $Name -ErrorAction SilentlyContinue
  if ($command) { Write-Host "[OK] $Name -> $($command.Source)" -ForegroundColor Green; return $true }
  Write-Host "[MISSING] $Name. $Hint" -ForegroundColor Red
  return $false
}

Write-Host 'DefChain Windows/WSL preflight' -ForegroundColor Cyan
$wslOk = Report-Command 'wsl.exe' 'Enable WSL2 and install Ubuntu from an elevated terminal.'
$dockerOk = Report-Command 'docker.exe' 'Install Docker Desktop and enable Settings > Resources > WSL Integration > Ubuntu.'
$gitOk = Report-Command 'git.exe' 'Install Git for Windows.'
$nodeOk = Report-Command 'node.exe' 'Install Node.js 20 or 22 LTS.'
$npmOk = Report-Command 'npm.cmd' 'Install npm with Node.js. Use npm.cmd if PowerShell blocks npm.ps1.'
$curlOk = Report-Command 'curl.exe' 'Install curl.'

if ($wslOk) {
  Write-Host "`nWSL status:" -ForegroundColor Cyan
  wsl.exe --status
  wsl.exe --list --verbose
  Write-Host "`nUbuntu checks:" -ForegroundColor Cyan
  wsl.exe -d Ubuntu -- bash -lc 'for c in node npm docker curl jq openssl git; do if command -v "$c" >/dev/null; then echo "[OK] $c -> $(command -v "$c")"; else echo "[MISSING] $c"; fi; done; docker info >/dev/null 2>&1 && echo "[OK] Docker daemon reachable" || echo "[MISSING] Docker daemon is not reachable"'
}

if ($dockerOk) {
  docker.exe info 2>$null | Out-Null
  if ($LASTEXITCODE -eq 0) { Write-Host '[OK] Docker daemon reachable' -ForegroundColor Green }
  else { Write-Host '[MISSING] Start Docker Desktop and enable Ubuntu WSL integration.' -ForegroundColor Red }
}

$ports = 4000,4101,4102,4103,4104,5173,7050,7051,8051,9051,10051
foreach ($port in $ports) {
  $used = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
  if ($used) { Write-Host "[BUSY] Port $port" -ForegroundColor Yellow }
  else { Write-Host "[OK] Port $port free" -ForegroundColor Green }
}

if (-not ($wslOk -and $dockerOk -and $gitOk -and $nodeOk -and $npmOk -and $curlOk)) {
  Write-Host "`nRequired human action: install missing prerequisites, open this repository inside WSL Ubuntu, then run: cp .env.example .env && npm install && npm run bootstrap:lite" -ForegroundColor Yellow
  exit 1
}
