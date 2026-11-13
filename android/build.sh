#!/bin/bash
# Builds release/lumen.apk with the plain Android SDK tools (no Gradle). Runs on GitHub Actions.
# Needs: ANDROID_HOME, JDK 17, and KS_FILE + KS_PASS (signing key, PKCS12).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; A="$ROOT/android"; OUT="$A/build"
BT="$ANDROID_HOME/build-tools/$(ls "$ANDROID_HOME/build-tools" | sort -V | tail -1)"
PLAT="$ANDROID_HOME/platforms/$(ls "$ANDROID_HOME/platforms" | sort -V | tail -1)/android.jar"
VER="$(sed -nE "s/.*version: '([^']+)'.*/\1/p" "$ROOT/app/js/version.js")"
CODE="$(sed -nE "s/.*build: ([0-9]+).*/\1/p" "$ROOT/app/js/version.js")"
rm -rf "$OUT" && mkdir -p "$OUT/classes" "$OUT/dex" "$OUT/assets" "$OUT/res"
rsync -a --exclude 'appinfo.json' --exclude 'config.xml' "$ROOT/app/" "$OUT/assets/"
"$BT/aapt2" compile --dir "$A/res" -o "$OUT/res/res.zip"
"$BT/aapt2" link -I "$PLAT" --manifest "$A/AndroidManifest.xml" -R "$OUT/res/res.zip" -A "$OUT/assets" \
  --min-sdk-version 21 --target-sdk-version 34 --version-code "$CODE" --version-name "$VER" -o "$OUT/base.apk"
javac --release 8 -nowarn -classpath "$PLAT" -d "$OUT/classes" $(find "$A/src" -name '*.java')
"$BT/d8" --release --min-api 21 --lib "$PLAT" --output "$OUT/dex" $(find "$OUT/classes" -name '*.class')
(cd "$OUT/dex" && zip -q -j "$OUT/base.apk" classes.dex)
"$BT/zipalign" -f -p 4 "$OUT/base.apk" "$OUT/aligned.apk"
"$BT/apksigner" sign --ks "$KS_FILE" --ks-type PKCS12 --ks-pass "pass:$KS_PASS" --out "$ROOT/release/lumen.apk" "$OUT/aligned.apk"
"$BT/apksigner" verify "$ROOT/release/lumen.apk"
echo "release/lumen.apk -> v$VER ($CODE)"
