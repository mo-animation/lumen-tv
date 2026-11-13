#!/bin/bash
# Lumen installer for LG TVs (macOS). Works on its own: download this one file and double-click it.
# The TV needs the Developer Mode app with "Dev Mode Status" ON and "Key Server" ON,
# and the Mac and the TV must be on the same network.

REPO="mo-animation/lumen-tv"
IPK_URL="${LUMEN_IPK_URL:-https://raw.githubusercontent.com/$REPO/main/release/lumen.ipk}"
HOME_DIR="$HOME/Library/Application Support/Lumen Installer"
BIN="$HOME_DIR/tools/node_modules/.bin"
APP_ID="com.lumen.iptv"

step() { printf "\n\033[1;36m==> %s\033[0m\n" "$1"; }
fail() { printf "\n\033[1;31mFailed: %s\033[0m\n" "$1"; read -r -p "Press Enter to close." _; exit 1; }
clear
printf "\033[1mLumen installer for LG TVs\033[0m\n"
mkdir -p "$HOME_DIR" || fail "Cannot create $HOME_DIR"

# --- Node.js (needed by LG's install tools) ---
if ! command -v node >/dev/null 2>&1; then
  for d in /opt/homebrew/bin /usr/local/bin; do [ -x "$d/node" ] && export PATH="$d:$PATH"; done
fi
if ! command -v node >/dev/null 2>&1; then
  step "Node.js is needed (one time)"
  if command -v brew >/dev/null 2>&1 || [ -x /opt/homebrew/bin/brew ]; then
    read -r -p "Install Node.js with Homebrew now? [Y/n] " A
    [[ "$A" =~ ^[Nn] ]] && fail "Node.js is required. Get it from https://nodejs.org and run this again."
    "$(command -v brew || echo /opt/homebrew/bin/brew)" install node || fail "Could not install Node.js."
    export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
  else
    open "https://nodejs.org/en/download" 2>/dev/null
    fail "Install Node.js (LTS) from the page that just opened, then run this installer again."
  fi
fi

# --- LG webOS tools ---
if [ ! -x "$BIN/ares-install" ]; then
  step "Downloading LG webOS tools (one time, about a minute)"
  mkdir -p "$HOME_DIR/tools" && cd "$HOME_DIR/tools" || fail "Cannot open tools folder."
  [ -f package.json ] || npm init -y >/dev/null 2>&1
  npm install @webos-tools/cli --no-audit --no-fund --loglevel=error || fail "Could not download the LG tools. Check the internet connection."
fi

# --- Latest Lumen package ---
step "Downloading the latest Lumen"
IPK="$HOME_DIR/lumen.ipk"
curl -fsSL "$IPK_URL" -o "$IPK.part" || fail "Could not download Lumen from GitHub."
mv "$IPK.part" "$IPK"
V="$(curl -fsSL "${IPK_URL%lumen.ipk}version.txt" 2>/dev/null)"; echo "Lumen ${V:-latest} ready."

# --- Which TV ---
step "Which TV?"
echo "Open the Developer Mode app on the TV: the IP address is shown there."
SAVED="$(cat "$HOME_DIR/last-ip" 2>/dev/null)"
if [ -n "$SAVED" ]; then read -r -p "TV IP address [$SAVED]: " IP; IP="${IP:-$SAVED}"; else read -r -p "TV IP address: " IP; fi
IP="$(echo "$IP" | tr -d ' ')"
[[ "$IP" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]] || fail "That does not look like an IP address (example: 192.168.1.20)."
echo "$IP" > "$HOME_DIR/last-ip"
DEV="lgtv-${IP//./-}"
if "$BIN/ares-setup-device" -l 2>/dev/null | grep -q "^$DEV "; then MODE="-m"; else MODE="-a"; fi
"$BIN/ares-setup-device" $MODE "$DEV" -i "username=prisoner" -i "host=$IP" -i "port=9922" >/dev/null 2>&1 || fail "Could not register the TV."

# --- Install ---
install_app() { "$BIN/ares-install" --device "$DEV" "$IPK"; }
step "Installing on the TV ($IP)"
if ! install_app; then
  step "Pairing with this TV (first time only)"
  echo "In the Developer Mode app: turn ON 'Key Server', then type the Passphrase shown on the TV (6 characters)."
  "$BIN/ares-novacom" --device "$DEV" --getkey || fail "Pairing failed. Check that Key Server is ON and the IP is right."
  step "Installing on the TV ($IP)"
  install_app || fail "Install failed. Check that Dev Mode Status is ON and its session has time left."
fi

step "Opening Lumen on the TV"
"$BIN/ares-launch" --device "$DEV" "$APP_ID" >/dev/null 2>&1 || echo "Installed. Open Lumen from the TV's app list."

printf "\n\033[1;32mDone. Lumen is installed on %s.\033[0m\nNext updates install from inside the app: Settings -> Check for updates.\n" "$IP"
read -r -p "Press Enter to close." _
