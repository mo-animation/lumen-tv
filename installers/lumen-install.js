#!/usr/bin/env node
/* Lumen installer core (Mac, Windows, Linux). Started by the Mac / Windows launchers.
   Asks for the TV's IP, works out whether it is LG (webOS), Samsung (Tizen) or Android TV / Google TV,
   then installs the matching Lumen build. Only Node.js built-ins are used. */
'use strict';
const fs = require('fs'), path = require('path'), os = require('os'), net = require('net'), https = require('https'), cp = require('child_process'), readline = require('readline');

const REPO = 'mo-animation/lumen-tv';
const RAW = process.env.LUMEN_RAW || `https://raw.githubusercontent.com/${REPO}/main/release/`;
const WIN = process.platform === 'win32', MAC = process.platform === 'darwin';
const HOME = process.env.LUMEN_HOME || (WIN ? path.join(process.env.LOCALAPPDATA || os.homedir(), 'LumenInstaller')
  : MAC ? path.join(os.homedir(), 'Library', 'Application Support', 'Lumen Installer') : path.join(os.homedir(), '.lumen-installer'));
const APP_ID = 'com.lumen.iptv';

/* ---------- small helpers ---------- */
const C = { b: '\x1b[1m', c: '\x1b[1;36m', g: '\x1b[1;32m', r: '\x1b[1;31m', y: '\x1b[1;33m', x: '\x1b[0m' };
const step = m => console.log(`\n${C.c}==> ${m}${C.x}`);
const note = m => console.log(m);
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
/* line queue: works both typed by hand and piped in */
const lines = [], waiters = []; let closed = false;
rl.on('line', l => { const w = waiters.shift(); if (w) w(l.trim()); else lines.push(l.trim()); });
rl.on('close', () => { closed = true; while (waiters.length) waiters.shift()(''); });
const ask = q => new Promise(r => { process.stdout.write(q); if (lines.length) return r(lines.shift()); if (closed) { process.stdout.write('\n'); return r(''); } waiters.push(r); });
async function fail(m) { console.log(`\n${C.r}Failed: ${m}${C.x}`); await ask('Press Enter to close.'); process.exit(1); }
async function done(m) { console.log(`\n${C.g}${m}${C.x}`); await ask('Press Enter to close.'); process.exit(0); }
const yes = async q => !/^n/i.test(await ask(q + ' [Y/n] '));

function run(cmd, args, opts) {
  const r = cp.spawnSync(cmd, args, Object.assign({ stdio: 'inherit', shell: WIN && /\.cmd$/i.test(cmd) }, opts || {}));
  return r.status === 0;
}
function out(cmd, args) {
  const r = cp.spawnSync(cmd, args, { encoding: 'utf8', shell: WIN && /\.cmd$/i.test(cmd) });
  return ((r.stdout || '') + (r.stderr || '')).trim();
}
function download(url, dest, hops) {
  hops = hops || 0;
  return new Promise((res, rej) => {
    const opt = { headers: { 'User-Agent': 'lumen-installer' } };
    https.get(url, opt, r => {
      if (r.statusCode >= 300 && r.statusCode < 400 && r.headers.location && hops < 5) { r.resume(); return download(new URL(r.headers.location, url).href, dest, hops + 1).then(res, rej); }
      if (r.statusCode !== 200) { r.resume(); return rej(new Error('HTTP ' + r.statusCode)); }
      const f = fs.createWriteStream(dest + '.part');
      r.pipe(f); f.on('finish', () => f.close(() => { fs.renameSync(dest + '.part', dest); res(dest); })); f.on('error', rej);
    }).on('error', rej);
  });
}
function getJson(url) {
  return new Promise((res, rej) => {
    https.get(url, { headers: { 'User-Agent': 'lumen-installer', Accept: 'application/vnd.github+json' } }, r => {
      let d = ''; r.on('data', c => d += c); r.on('end', () => { try { res(JSON.parse(d)); } catch (e) { rej(e); } });
    }).on('error', rej);
  });
}
function probe(ip, port, ms) {
  return new Promise(res => {
    const s = net.connect({ host: ip, port });
    const end = ok => { s.destroy(); res(ok); };
    s.setTimeout(ms || 1500, () => end(false)); s.once('connect', () => end(true)); s.once('error', () => end(false));
  });
}
function unzip(zip, dir) {
  fs.mkdirSync(dir, { recursive: true });
  return WIN ? run('powershell', ['-NoProfile', '-Command', `Expand-Archive -Force -LiteralPath '${zip}' -DestinationPath '${dir}'`])
    : run('unzip', ['-q', '-o', zip, '-d', dir]);
}
function localIpFor(tvIp) {
  const pre = tvIp.split('.').slice(0, 3).join('.') + '.';
  let any = '';
  for (const list of Object.values(os.networkInterfaces())) for (const a of list || []) {
    if (a.family !== 'IPv4' && a.family !== 4 || a.internal) continue;
    if (a.address.startsWith(pre)) return a.address;
    any = any || a.address;
  }
  return any;
}
async function fetchPkg(file) {
  const dest = path.join(HOME, file);
  try { await download(RAW + file, dest); } catch (e) { await fail('Could not download ' + file + ' from GitHub. Check the internet connection.'); }
  let v = ''; try { await download(RAW + 'version.txt', path.join(HOME, 'version.txt')); v = fs.readFileSync(path.join(HOME, 'version.txt'), 'utf8').trim(); } catch (e) { }
  note(`Lumen ${v || 'latest'} ready.`);
  return dest;
}

/* ---------- which TV ---------- */
async function detect(ip) {
  const ports = [9922, 3000, 3001, 26101, 8001, 8002, 5555, 8008, 8009];
  const open = {};
  (await Promise.all(ports.map(p => probe(ip, p).then(ok => [p, ok])))).forEach(([p, ok]) => { open[p] = ok; });
  if (open[9922]) return { kind: 'lg', ready: true };
  if (open[26101]) return { kind: 'samsung', ready: true };
  if (open[5555]) return { kind: 'android', ready: true };
  if (open[3000] || open[3001]) return { kind: 'lg', ready: false };
  if (open[8001] || open[8002]) return { kind: 'samsung', ready: false };
  if (open[8008] || open[8009]) return { kind: 'android', ready: false };
  return null;
}
const NAMES = { lg: 'LG (webOS)', samsung: 'Samsung (Tizen)', android: 'Android TV / Google TV (Sony, TCL, Xiaomi, Philips, TV boxes...)' };

/* ---------- LG ---------- */
async function lg(ip, ready) {
  if (!ready) note(`${C.y}This looks like an LG TV, but Developer Mode is not answering.${C.x}\nOn the TV open the Developer Mode app and turn ON "Dev Mode Status" and "Key Server".`);
  const tools = path.join(HOME, 'tools'), bin = n => path.join(tools, 'node_modules', '.bin', n + (WIN ? '.cmd' : ''));
  if (!fs.existsSync(bin('ares-install'))) {
    step('Downloading LG webOS tools (one time, about a minute)');
    fs.mkdirSync(tools, { recursive: true });
    if (!fs.existsSync(path.join(tools, 'package.json'))) fs.writeFileSync(path.join(tools, 'package.json'), '{"name":"lumen-installer-tools","private":true}');
    if (!run(WIN ? 'npm.cmd' : 'npm', ['install', '@webos-tools/cli', '--no-audit', '--no-fund', '--loglevel=error'], { cwd: tools }) || !fs.existsSync(bin('ares-install')))
      await fail('Could not download the LG tools. Check the internet connection.');
  }
  step('Downloading the latest Lumen for LG');
  const ipk = await fetchPkg('lumen.ipk');
  const dev = 'lgtv-' + ip.replace(/\./g, '-');
  const known = out(bin('ares-setup-device'), ['-l']).split('\n').some(l => l.startsWith(dev + ' '));
  if (!run(bin('ares-setup-device'), [known ? '-m' : '-a', dev, '-i', 'username=prisoner', '-i', 'host=' + ip, '-i', 'port=9922'], { stdio: 'ignore' }))
    await fail('Could not register the TV.');
  step(`Installing on the TV (${ip})`);
  if (!run(bin('ares-install'), ['--device', dev, ipk])) {
    step('Pairing with this TV (first time only)');
    note("In the Developer Mode app: turn ON 'Key Server', then type the Passphrase shown on the TV (6 characters).");
    if (!run(bin('ares-novacom'), ['--device', dev, '--getkey'])) await fail('Pairing failed. Check that Key Server is ON and the IP is right.');
    step(`Installing on the TV (${ip})`);
    if (!run(bin('ares-install'), ['--device', dev, ipk])) await fail('Install failed. Check that Dev Mode Status is ON and its session has time left.');
  }
  step('Opening Lumen on the TV');
  if (!run(bin('ares-launch'), ['--device', dev, APP_ID], { stdio: 'ignore' })) note("Installed. Open Lumen from the TV's app list.");
}

/* ---------- Android TV / Google TV ---------- */
async function android(ip, ready) {
  const pt = path.join(HOME, 'platform-tools'), adb = path.join(pt, WIN ? 'adb.exe' : 'adb');
  if (!fs.existsSync(adb)) {
    step("Downloading Google's Android platform-tools (adb), one time");
    note('Terms: https://developer.android.com/studio/releases/platform-tools');
    if (!(await yes('Download and use them?'))) await fail('adb is needed to install on Android TV.');
    const zip = path.join(HOME, 'platform-tools.zip');
    try { await download(`https://dl.google.com/android/repository/platform-tools-latest-${WIN ? 'windows' : MAC ? 'darwin' : 'linux'}.zip`, zip); }
    catch (e) { await fail('Could not download platform-tools.'); }
    if (!unzip(zip, HOME) || !fs.existsSync(adb)) await fail('Could not unpack platform-tools.');
    if (!WIN) fs.chmodSync(adb, 0o755);
  }
  run(adb, ['start-server'], { stdio: 'ignore' });
  let target = ip + ':5555';
  if (!ready) {
    note(`${C.y}This looks like an Android / Google TV, but debugging over the network is off.${C.x}`);
    note('On the TV: Settings > System > About > click "Android TV OS build" 7 times to unlock Developer options.');
    note('Then Settings > System > Developer options, and turn on ONE of these:');
    note('  A) "USB debugging" / "Network debugging" (most TVs), or');
    note('  B) "Wireless debugging" (newer Google TV), then "Pair device with pairing code".');
    const how = await ask('Which did you turn on? [A/B]: ');
    if (/^b/i.test(how)) {
      const pair = await ask('Pairing IP:port shown under "Pair device with pairing code": ');
      const code = await ask('Pairing code: ');
      if (!run(adb, ['pair', pair.replace(/\s/g, ''), code.replace(/\s/g, '')])) await fail('Pairing failed. Check the IP:port and the code.');
      const port = await ask('Now the port shown on the main "Wireless debugging" screen (IP address & Port): ');
      target = ip + ':' + port.replace(/.*:/, '').replace(/\D/g, '');
    } else if (!(await probe(ip, 5555, 3000))) {
      await fail('The TV is still not answering on port 5555. Turn on USB/Network debugging and try again.');
    }
  }
  step(`Connecting to the TV (${target})`);
  note('If the TV asks "Allow debugging?", tick "Always allow from this computer" and choose Allow.');
  out(adb, ['connect', target]);
  let state = '';
  for (let i = 0; i < 40; i++) {
    state = out(adb, ['-s', target, 'get-state']);
    if (/^device/m.test(state)) break;
    if (/offline|not found|cannot/i.test(state)) out(adb, ['connect', target]);
    await new Promise(r => setTimeout(r, 1500));
  }
  if (!/^device/m.test(state)) await fail('The TV did not allow the connection. Accept the "Allow debugging" prompt and run this again.');
  step('Downloading the latest Lumen for Android TV');
  const apk = await fetchPkg('lumen.apk');
  step(`Installing on the TV (${target})`);
  let res = out(adb, ['-s', target, 'install', '-r', apk]);
  if (/INSTALL_FAILED_UPDATE_INCOMPATIBLE|signatures do not match/i.test(res)) {
    note(`${C.y}An older Lumen with a different signature is on this TV.${C.x}`);
    if (!(await yes('Remove it and install the new one? (its settings and history on this TV are deleted)'))) await fail('Install cancelled.');
    out(adb, ['-s', target, 'uninstall', APP_ID]);
    res = out(adb, ['-s', target, 'install', '-r', apk]);
  }
  if (!/Success/.test(res)) { note(res); await fail('Install failed.'); }
  step('Opening Lumen on the TV');
  out(adb, ['-s', target, 'shell', 'monkey', '-p', APP_ID, '-c', 'android.intent.category.LEANBACK_LAUNCHER', '1']);
}

/* ---------- Samsung ---------- */
async function samsung(ip, ready) {
  const me = localIpFor(ip);
  note(`${C.y}Samsung only runs apps signed with a Samsung certificate.${C.x}`);
  note('This step uses TizenBrew Installer (free, open source: github.com/reisxd/TizenBrewInstaller), which makes the');
  note('certificate and installs apps on the TV. On TVs from about 2023 on (Tizen 7+) it asks you to sign in to a Samsung account.');
  if (!ready) {
    note('\nFirst, turn on Developer Mode on the TV:');
    note('  1. Open Apps, then type 1 2 3 4 5 with the remote.');
    note(`  2. Turn Developer mode ON and set "Host PC IP" to ${C.b}${me || 'this computer\'s IP'}${C.x}.`);
    note('  3. Restart the TV (hold the power button until it turns off and on).');
    await ask('Press Enter when that is done.');
  } else note(`Developer Mode is on. Its "Host PC IP" must be ${C.b}${me || "this computer's IP"}${C.x}.`);
  step('Downloading TizenBrew Installer');
  let rel; try { rel = await getJson('https://api.github.com/repos/reisxd/TizenBrewInstaller/releases/latest'); } catch (e) { }
  const assets = (rel && rel.assets) || [];
  const arch = process.arch === 'arm64' ? /arm64|aarch64/i : /x64|amd64|x86_64/i;
  const want = WIN ? /\.exe$/i : MAC ? /\.dmg$/i : /\.AppImage$/i;
  const cands = assets.filter(a => want.test(a.name));
  const asset = cands.filter(a => arch.test(a.name))[0] || cands.filter(a => !/arm64|aarch64|x64|amd64|x86_64/i.test(a.name))[0] || cands[0];
  let file = '';
  if (asset) {
    file = path.join(os.homedir(), 'Downloads', asset.name);
    try { await download(asset.browser_download_url, file); note('Saved to ' + file); } catch (e) { file = ''; }
  }
  if (file) {
    if (!WIN && !MAC) fs.chmodSync(file, 0o755);
    if (WIN) run('cmd', ['/c', 'start', '', file], { stdio: 'ignore' }); else if (MAC) run('open', [file], { stdio: 'ignore' }); else cp.spawn(file, { detached: true, stdio: 'ignore' }).unref();
  } else {
    note('Could not download it automatically. Get it from: https://github.com/reisxd/TizenBrewInstaller/releases/latest');
    if (MAC) run('open', ['https://github.com/reisxd/TizenBrewInstaller/releases/latest'], { stdio: 'ignore' });
    if (WIN) run('cmd', ['/c', 'start', '', 'https://github.com/reisxd/TizenBrewInstaller/releases/latest'], { stdio: 'ignore' });
  }
  if (MAC && file) note('macOS may block it the first time: right-click the app > Open.');
  console.log(`\n${C.b}In TizenBrew Installer:${C.x}`);
  note(`  1. Connect to the TV at ${C.b}${ip}${C.x}.`);
  note('  2. Install TizenBrew (sign in to Samsung if it asks).');
  note(`  3. Choose to install an app from GitHub and enter ${C.b}${REPO}${C.x}`);
  note('Lumen then appears on the TV. Updates come from inside the app: Settings > Check for updates.');
  await ask('\nPress Enter when Lumen is on the TV.');
}

/* ---------- main ---------- */
(async function main() {
  console.log(`${C.b}Lumen installer${C.x}  (LG, Samsung, Android TV / Google TV)`);
  fs.mkdirSync(HOME, { recursive: true });
  step('Which TV?');
  note('Find the TV\'s IP in its network settings (LG: also shown in the Developer Mode app).');
  const lastFile = path.join(HOME, 'last-ip');
  const saved = fs.existsSync(lastFile) ? fs.readFileSync(lastFile, 'utf8').trim() : '';
  let ip = (await ask(saved ? `TV IP address [${saved}]: ` : 'TV IP address: ')).replace(/\s/g, '') || saved;
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) await fail('That does not look like an IP address (example: 192.168.1.20).');
  fs.writeFileSync(lastFile, ip);

  step('Looking at the TV');
  let d = await detect(ip);
  if (d) {
    note(`Found: ${C.b}${NAMES[d.kind]}${C.x}`);
    if (!(await yes('Is that right?'))) d = null;
  } else note('Could not tell the TV type (is it on, and on the same network?).');
  if (!d) {
    const k = await ask('Choose the TV type:  1) LG   2) Samsung   3) Android TV / Google TV  : ');
    d = { kind: { 1: 'lg', 2: 'samsung', 3: 'android' }[k.trim()], ready: false };
    if (!d.kind) await fail('No TV type chosen.');
  }
  if (d.kind === 'lg') await lg(ip, d.ready);
  else if (d.kind === 'android') await android(ip, d.ready);
  else await samsung(ip, d.ready);
  await done(`Done. Lumen is on the TV at ${ip}.\nNext updates install from inside the app: Settings > Check for updates.`);
})().catch(e => fail(e && e.message || String(e)));
