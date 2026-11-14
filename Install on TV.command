#!/bin/bash
# Lumen -> LG TV installer (macOS). Double-click this file.
# Needs: Developer Mode app running on the TV with "Dev Mode Status" ON and "Key Server" ON,
#        Mac and TV on the same network.
cd "$(dirname "$0")" || exit 1
BIN="$PWD/.tools/node_modules/.bin"
DEV="lgtv"
APP_ID="com.lumen.iptv"

say_step() { printf "\n\033[1;36m==> %s\033[0m\n" "$1"; }
fail() { printf "\n\033[1;31mFailed: %s\033[0m\n" "$1"; read -r -p "Press Enter to close." _; exit 1; }

if ! command -v node >/dev/null 2>&1; then fail "Node.js is not installed. Get it from https://nodejs.org and run this again."; fi

if [ ! -x "$BIN/ares-install" ]; then
  say_step "Downloading LG webOS tools (first run only)"
  mkdir -p .tools && (cd .tools && { [ -f package.json ] || npm init -y >/dev/null; } && npm install @webos-tools/cli --no-audit --no-fund) || fail "Could not download the LG tools."
fi

SAVED=""; [ -f .tv-ip ] && SAVED="$(cat .tv-ip)"
say_step "TV address"
echo "The IP is shown in the Developer Mode app on the TV."
if [ -n "$SAVED" ]; then read -r -p "TV IP address [$SAVED]: " IP; IP="${IP:-$SAVED}"; else read -r -p "TV IP address: " IP; fi
[[ "$IP" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]] || fail "That does not look like an IP address."
echo "$IP" > .tv-ip

if "$BIN/ares-setup-device" -l 2>/dev/null | grep -q "^$DEV "; then MODE="-m"; else MODE="-a"; fi
"$BIN/ares-setup-device" $MODE "$DEV" -i "username=prisoner" -i "host=$IP" -i "port=9922" >/dev/null || fail "Could not register the TV."

say_step "Building the app package"
rm -rf dist && mkdir -p dist
"$BIN/ares-package" --no-minify app -o dist >/dev/null || fail "Packaging failed."
IPK="$(ls dist/*.ipk | head -1)"
echo "Built $(basename "$IPK")"

install_app() { "$BIN/ares-install" --device "$DEV" "$IPK"; }

say_step "Installing on the TV ($IP)"
if ! install_app; then
  say_step "Pairing with the TV"
  echo "Turn ON 'Key Server' in the Developer Mode app, then type the Passphrase it shows."
  "$BIN/ares-novacom" --device "$DEV" --getkey || fail "Could not get the key. Check Key Server is ON and the IP is right."
  say_step "Installing on the TV ($IP)"
  install_app || fail "Install failed. Check Dev Mode Status is ON and the session has not expired."
fi

# Developer Mode switches off after ~50 hours and deletes Lumen: renew it and let Lumen keep renewing it
TOK="$("$BIN/ares-novacom" --device "$DEV" --run "cat /var/luna/preferences/devmode_enabled" 2>/dev/null | grep -oiE '[0-9a-f]{32,}' | head -1)"
PARAMS=()
if [ -n "$TOK" ]; then
  curl -fsS "https://developer.lge.com/secure/ResetDevModeSession.dev?sessionToken=$TOK" >/dev/null 2>&1
  PARAMS=(--params "{\"lmDevToken\":\"$TOK\"}")
fi

say_step "Launching Lumen"
"$BIN/ares-launch" --device "$DEV" "$APP_ID" "${PARAMS[@]}" || echo "Installed, but could not launch it. Open Lumen from the TV's app list."

printf "\n\033[1;32mDone. Lumen is on your TV.\033[0m\n"
read -r -p "Press Enter to close." _
