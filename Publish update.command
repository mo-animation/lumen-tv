#!/bin/bash
# Publishes a new version to GitHub. On the TV: Settings -> Check for updates.
cd "$(dirname "$0")" || exit 1
fail() { printf "\n\033[1;31mFailed: %s\033[0m\n" "$1"; read -r -p "Press Enter to close." _; exit 1; }
git rev-parse --git-dir >/dev/null 2>&1 || fail "This folder is not connected to a GitHub repo yet."
git remote get-url origin >/dev/null 2>&1 || fail "No GitHub remote set (git remote add origin ...)."
node tools/build.js --bump || fail "Build failed."
V="$(node -e "const s=require('fs').readFileSync('app/js/version.js','utf8');console.log(s.match(/version: '([^']+)'/)[1])")"
git add -A && git commit -q -m "Release v$V" || fail "Nothing to publish."
git push -q origin HEAD || fail "Push to GitHub failed."
printf "\n\033[1;32mPublished v%s. On the TV open Settings -> Check for updates (can take a few minutes to appear).\033[0m\n" "$V"
read -r -p "Press Enter to close." _
