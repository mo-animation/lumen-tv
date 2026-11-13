<# : batch launcher - the PowerShell installer is below
@echo off
title Lumen installer for LG TVs
set "LUMEN_SELF=%~f0"
powershell -NoProfile -ExecutionPolicy Bypass -Command "iex ((Get-Content -LiteralPath $env:LUMEN_SELF -Raw))"
exit /b
#>
# Lumen installer for LG TVs (Windows). Works on its own: download this one file and double-click it.
# The TV needs the Developer Mode app with "Dev Mode Status" ON and "Key Server" ON,
# and the PC and the TV must be on the same network.

$Repo   = 'mo-animation/lumen-tv'
$IpkUrl = if ($env:LUMEN_IPK_URL) { $env:LUMEN_IPK_URL } else { "https://raw.githubusercontent.com/$Repo/main/release/lumen.ipk" }
$Home2  = Join-Path $env:LOCALAPPDATA 'LumenInstaller'
$Tools  = Join-Path $Home2 'tools'
$Bin    = Join-Path $Tools 'node_modules\.bin'
$AppId  = 'com.lumen.iptv'

function Step($m) { Write-Host ''; Write-Host "==> $m" -ForegroundColor Cyan }
function Fail($m) { Write-Host ''; Write-Host "Failed: $m" -ForegroundColor Red; Read-Host 'Press Enter to close' | Out-Null; exit 1 }
function Tool($n) { Join-Path $Bin "$n.cmd" }
function RefreshPath { $env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User') }

[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$ProgressPreference = 'SilentlyContinue'
Clear-Host
Write-Host 'Lumen installer for LG TVs' -ForegroundColor White
New-Item -ItemType Directory -Force -Path $Tools | Out-Null

# --- Node.js (needed by LG's install tools) ---
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Step 'Node.js is needed (one time)'
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

# --- LG webOS tools ---
if (-not (Test-Path (Tool 'ares-install'))) {
  Step 'Downloading LG webOS tools (one time, about a minute)'
  Push-Location $Tools
  if (-not (Test-Path 'package.json')) { & npm.cmd init -y | Out-Null }
  & npm.cmd install '@webos-tools/cli' --no-audit --no-fund --loglevel=error
  $ok = $LASTEXITCODE -eq 0
  Pop-Location
  if (-not $ok -or -not (Test-Path (Tool 'ares-install'))) { Fail 'Could not download the LG tools. Check the internet connection.' }
}

# --- Latest Lumen package ---
Step 'Downloading the latest Lumen'
$Ipk = Join-Path $Home2 'lumen.ipk'
try { Invoke-WebRequest -UseBasicParsing -Uri $IpkUrl -OutFile $Ipk } catch { Fail 'Could not download Lumen from GitHub.' }
try { $v = (Invoke-WebRequest -UseBasicParsing -Uri ($IpkUrl -replace 'lumen\.ipk$', 'version.txt')).Content.Trim() } catch { $v = 'latest' }
Write-Host "Lumen $v ready."

# --- Which TV ---
Step 'Which TV?'
Write-Host 'Open the Developer Mode app on the TV: the IP address is shown there.'
$LastFile = Join-Path $Home2 'last-ip.txt'
$Saved = if (Test-Path $LastFile) { (Get-Content $LastFile -Raw).Trim() } else { '' }
$Ip = if ($Saved) { Read-Host "TV IP address [$Saved]" } else { Read-Host 'TV IP address' }
if (-not $Ip -and $Saved) { $Ip = $Saved }
$Ip = ($Ip -replace '\s', '')
if ($Ip -notmatch '^\d{1,3}(\.\d{1,3}){3}$') { Fail 'That does not look like an IP address (example: 192.168.1.20).' }
Set-Content -Path $LastFile -Value $Ip
$Dev = 'lgtv-' + ($Ip -replace '\.', '-')
$known = (& (Tool 'ares-setup-device') -l 2>$null) | Select-String -Pattern ("^" + [regex]::Escape($Dev) + " ")
$mode = if ($known) { '-m' } else { '-a' }
& (Tool 'ares-setup-device') $mode $Dev -i 'username=prisoner' -i "host=$Ip" -i 'port=9922' | Out-Null
if ($LASTEXITCODE -ne 0) { Fail 'Could not register the TV.' }

# --- Install ---
function InstallApp { & (Tool 'ares-install') --device $Dev $Ipk | Out-Host; return ($LASTEXITCODE -eq 0) }
Step "Installing on the TV ($Ip)"
if (-not (InstallApp)) {
  Step 'Pairing with this TV (first time only)'
  Write-Host "In the Developer Mode app: turn ON 'Key Server', then type the Passphrase shown on the TV (6 characters)."
  & (Tool 'ares-novacom') --device $Dev --getkey
  if ($LASTEXITCODE -ne 0) { Fail 'Pairing failed. Check that Key Server is ON and the IP is right.' }
  Step "Installing on the TV ($Ip)"
  if (-not (InstallApp)) { Fail 'Install failed. Check that Dev Mode Status is ON and its session has time left.' }
}

Step 'Opening Lumen on the TV'
& (Tool 'ares-launch') --device $Dev $AppId | Out-Null
if ($LASTEXITCODE -ne 0) { Write-Host "Installed. Open Lumen from the TV's app list." }

Write-Host ''
Write-Host "Done. Lumen is installed on $Ip." -ForegroundColor Green
Write-Host 'Next updates install from inside the app: Settings -> Check for updates.'
Read-Host 'Press Enter to close' | Out-Null
