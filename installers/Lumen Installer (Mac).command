#!/bin/bash
# Lumen installer (macOS) for LG, Samsung and Android TV / Google TV. Double-click to run.
# Makes sure Node.js is available, then runs the latest installer from GitHub.
REPO="mo-animation/lumen-tv"
HOME_DIR="$HOME/Library/Application Support/Lumen Installer"
HERE="$(cd "$(dirname "$0")" && pwd)"
fail() { printf "\n\033[1;31mFailed: %s\033[0m\n" "$1"; read -r -p "Press Enter to close." _; exit 1; }
clear
mkdir -p "$HOME_DIR" || fail "Cannot create $HOME_DIR"

for d in /opt/homebrew/bin /usr/local/bin; do [ -x "$d/node" ] && export PATH="$d:$PATH"; done
if ! command -v node >/dev/null 2>&1; then
  printf "\n\033[1;36m==> Node.js is needed (one time)\033[0m\n"
  BREW="$(command -v brew || ls /opt/homebrew/bin/brew /usr/local/bin/brew 2>/dev/null | head -1)"
  if [ -n "$BREW" ]; then
    read -r -p "Install Node.js with Homebrew now? [Y/n] " A
    [[ "$A" =~ ^[Nn] ]] && fail "Node.js is required. Get it from https://nodejs.org and run this again."
    "$BREW" install node || fail "Could not install Node.js."
    export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
  else
    open "https://nodejs.org/en/download" 2>/dev/null
    fail "Install Node.js (LTS) from the page that just opened, then run this installer again."
  fi
fi

CORE="$HOME_DIR/lumen-install.js"
if ! curl -fsSL "https://raw.githubusercontent.com/$REPO/main/installers/lumen-install.js" -o "$CORE.part" 2>/dev/null; then
  rm -f "$CORE.part"
  if [ -f "$HERE/lumen-install.js" ]; then cp "$HERE/lumen-install.js" "$CORE"; elif [ ! -f "$CORE" ]; then fail "Could not download the installer. Check the internet connection."; fi
else
  mv "$CORE.part" "$CORE"
fi
exec node "$CORE"
