/* Builds the package for the LG Content Store: store/<id>_<version>_all.ipk
   It is the same app as the TV build, with these differences:
     - it is called "Lumen Player" (another store app already uses the name Lumen)
     - its own app ID (STORE.id below; LG never lets it change after the first release)
     - window.LUMEN_STORE = true: no over-the-air updates, no Developer Mode renewal,
       and Back on the first screen goes straight to the TV's Home screen (LG QA rule)
     - no config.local.js, and LG's splash image
   Every store update has to go through LG's review again, so build this only when submitting.
   Usage: node tools/store.js */
const fs = require('fs'), path = require('path'), cp = require('child_process');
const root = path.join(__dirname, '..'), app = path.join(root, 'app'), out = path.join(root, 'store');

const STORE = { id: 'io.github.mo-animation.lumen', title: 'Lumen Player', vendor: 'Lumen Player' };

const v = JSON.parse(fs.readFileSync(path.join(app, 'js', 'version.js'), 'utf8').match(/=\s*(\{.*\})/)[1]
  .replace(/(\w+):/g, '"$1":').replace(/'/g, '"'));
const pkg = path.join(root, '.tools', 'node_modules', '.bin', process.platform === 'win32' ? 'ares-package.cmd' : 'ares-package');
if (!fs.existsSync(pkg)) { console.error('LG tools are missing: install @webos-tools/cli in .tools first'); process.exit(1); }

const tmp = path.join(root, 'dist', 'store-app');
fs.rmSync(tmp, { recursive: true, force: true });
fs.cpSync(app, tmp, { recursive: true, filter: f => !/config\.local\.js$|\.DS_Store$/.test(f) });

const info = JSON.parse(fs.readFileSync(path.join(tmp, 'appinfo.json'), 'utf8'));
Object.assign(info, STORE, { version: v.version, splashBackground: 'splash.png' });
fs.writeFileSync(path.join(tmp, 'appinfo.json'), JSON.stringify(info, null, 2) + '\n');
fs.copyFileSync(path.join(out, 'images', 'splash_1920x1080.png'), path.join(tmp, 'splash.png'));

const idx = path.join(tmp, 'index.html'), html = fs.readFileSync(idx, 'utf8');
const local = '<script src="js/config.local.js"></script>';
if (!html.includes(local)) { console.error('index.html changed: update tools/store.js'); process.exit(1); }
fs.writeFileSync(idx, html.replace(local, '<script>window.LUMEN_STORE = true;</script>'));

fs.mkdirSync(out, { recursive: true });
for (const f of fs.readdirSync(out)) if (f.endsWith('.ipk')) fs.rmSync(path.join(out, f));
cp.execFileSync(pkg, ['--no-minify', tmp, '-o', out], { stdio: 'ignore' });
const ipk = fs.readdirSync(out).find(f => f.endsWith('.ipk'));
console.log(`store/${ipk}  (${STORE.id} v${v.version})`);
