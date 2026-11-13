# Lumen

A fast, clean IPTV front end for TVs (Xtream Codes and M3U), with TMDB details, posters and trailers.
Runs on **LG** (webOS), **Samsung** (Tizen) and **Android TV / Google TV** (Sony, TCL, Xiaomi, Philips, TV boxes).

## Install on a TV

One installer for every TV: it asks for the TV's IP, works out the brand, and installs the right version.

| Computer | Download | Then |
|---|---|---|
| Mac | [Lumen-Installer-Mac.zip](release/Lumen-Installer-Mac.zip) | Unzip, right-click **Lumen Installer (Mac).command** → Open |
| Windows | [Lumen-Installer-Windows.zip](release/Lumen-Installer-Windows.zip) | Unzip, double-click **Lumen Installer (Windows).bat** (SmartScreen: More info → Run anyway) |

Before running it, on the TV:

- **LG:** open the Developer Mode app, turn on *Dev Mode Status* and *Key Server*. First install asks for the passphrase shown there.
- **Android TV / Google TV:** unlock Developer options (Settings → System → About → click the build number 7 times), then turn on *USB debugging* / *Network debugging* (or *Wireless debugging* on newer Google TV). Accept the "Allow debugging?" prompt.
- **Samsung:** Apps → type 12345 → Developer mode ON, Host PC IP = your computer's IP, restart the TV. Samsung requires a signed app, so the installer hands over to [TizenBrew Installer](https://github.com/reisxd/TizenBrewInstaller), which makes the certificate (TVs from about 2023 ask for a Samsung account) and installs `mo-animation/lumen-tv`.

The installer needs Node.js and offers to install it if missing.

## Updates

After the first install, updates come from this repo: on the TV open **Settings → Check for updates**.
To publish: change files in `app/`, then run `Publish update.command` (Mac). GitHub Actions builds the Android APK and the release.

---

## التسطيب

installer واحد لكل الشاشات: بيسأل على IP الشاشة، يعرف نوعها لوحده (LG / سامسونج / أندرويد)، ويسطّب النسخة المناسبة.

- **ماك:** نزّل `Lumen-Installer-Mac.zip`، فك الضغط، كليك يمين ← Open.
- **ويندوز:** نزّل `Lumen-Installer-Windows.zip`، فك الضغط، دبل كليك على ملف `.bat`.

التحديثات بعد كده من جوه التطبيق: الإعدادات ← البحث عن تحديثات.
