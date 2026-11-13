<# : batch launcher - the PowerShell part is below
@echo off
title Lumen installer
set "LUMEN_SELF=%~f0"
powershell -NoProfile -ExecutionPolicy Bypass -Command "iex ((Get-Content -LiteralPath $env:LUMEN_SELF -Raw))"
exit /b
#>
# Lumen installer (Windows) for LG, Samsung and Android TV / Google TV. Double-click to run.
# Makes sure Node.js is available, then runs the latest installer from GitHub.
$Repo = 'mo-animation/lumen-tv'
$Home2 = Join-Path $env:LOCALAPPDATA 'LumenInstaller'
$Here = Split-Path -Parent $env:LUMEN_SELF
function Fail($m) { Write-Host ''; Write-Host "Failed: $m" -ForegroundColor Red; Read-Host 'Press Enter to close' | Out-Null; exit 1 }
function RefreshPath { $env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User') }
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$ProgressPreference = 'SilentlyContinue'
Clear-Host
New-Item -ItemType Directory -Force -Path $Home2 | Out-Null

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host ''; Write-Host '==> Node.js is needed (one time)' -ForegroundColor Cyan
  if (Get-Command winget -ErrorAction SilentlyContinue) {
    $a = Read-Host 'Install Node.js now? [Y/n]'
    if ($a -match '^[Nn]') { Fail 'Node.js is required. Get it from https://nodejs.org and run this again.' }
    winget install -e --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
    RefreshPath
  }
  if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Start-Process 'https://nodejs.org/en/download'
    Fail 'Install Node.js (LTS) from the page that just opened, then run this installer again.'
  }
}

$Core = Join-Path $Home2 'lumen-install.js'
try {
  Invoke-WebRequest -UseBasicParsing -Uri "https://raw.githubusercontent.com/$Repo/main/installers/lumen-install.js" -OutFile "$Core.part"
  Move-Item -Force "$Core.part" $Core
} catch {
  $local = Join-Path $Here 'lumen-install.js'
  if (Test-Path $local) { Copy-Item -Force $local $Core } elseif (-not (Test-Path $Core)) { Fail 'Could not download the installer. Check the internet connection.' }
}
& node $Core
