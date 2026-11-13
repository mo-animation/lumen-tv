# Lumen

A fast, clean IPTV front end for LG webOS TVs (Xtream Codes and M3U), with TMDB details, posters and trailers.

## Install on a TV

On the TV: open the **Developer Mode** app and turn on **Dev Mode Status** and **Key Server**. The computer and TV must be on the same network.

| Computer | Download | Then |
|---|---|---|
| Mac | [Lumen-Installer-Mac.zip](release/Lumen-Installer-Mac.zip) | Unzip, right-click **Lumen Installer (Mac).command** → Open |
| Windows | [Lumen-Installer-Windows.zip](release/Lumen-Installer-Windows.zip) | Unzip, double-click **Lumen Installer (Windows).bat** (if SmartScreen appears: More info → Run anyway) |

The installer downloads the latest Lumen, asks for the TV's IP (shown in the Developer Mode app), and installs it. The first time on each TV it asks for the 6-character passphrase shown in Developer Mode. It needs Node.js and offers to install it if missing.

## Updates

After the first install, updates come from this repo: on the TV open **Settings → Check for updates**.

To publish a new version: change files in `app/`, then run `Publish update.command` (Mac). It rebuilds `update/` and `release/` and pushes.

---

## التسطيب على شاشة

على الشاشة: افتح تطبيق **Developer Mode** وشغّل **Dev Mode Status** و**Key Server**. الكمبيوتر والشاشة لازم يكونوا على نفس الشبكة.

- **ماك:** نزّل `Lumen-Installer-Mac.zip`، فك الضغط، كليك يمين على الملف ← Open.
- **ويندوز:** نزّل `Lumen-Installer-Windows.zip`، فك الضغط، دبل كليك على ملف `.bat`.

اكتب IP الشاشة، وأول مرة لكل شاشة اكتب الـ Passphrase اللي ظاهر في Developer Mode. التحديثات بعد كده من جوه التطبيق: الإعدادات ← البحث عن تحديثات.
