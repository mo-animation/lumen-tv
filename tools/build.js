/* Builds everything that gets published:
     update/bundle.json   over-the-air update the TV downloads (Settings -> Check for updates)
     update/version.json  small file the TV checks on start
     release/lumen.ipk    package the Mac / Windows installers put on a TV
   Usage: node tools/build.js [--bump] */
const fs = require('fs'), path = require('path'), cp = require('child_process');
const root = path.join(__dirname, '..'), app = path.join(root, 'app');
const vf = path.join(app, 'js', 'version.js');
let v = JSON.parse(fs.readFileSync(vf, 'utf8').match(/=\s*(\{.*\})/)[1].replace(/(\w+):/g, '"$1":').replace(/'/g, '"'));
if (process.argv.includes('--bump')) {
  const p = v.version.split('.').map(Number); p[2]++;
  v = { build: v.build + 1, version: p.join('.') };
  fs.writeFileSync(vf, `window.LUMEN_BUILD = { build: ${v.build}, version: '${v.version}' };\n`);
}
const ai = path.join(app, 'appinfo.json'), info = JSON.parse(fs.readFileSync(ai, 'utf8'));
if (info.version !== v.version) { info.version = v.version; fs.writeFileSync(ai, JSON.stringify(info, null, 2) + '\n'); }

/* config travels with updates too, so TVs installed earlier get new keys / repo settings */
const cfg = fs.readFileSync(path.join(app, 'js', 'config.js'), 'utf8').match(/LUMEN_CFG\s*=\s*(\{[^}]*\})/)[1];
const cfgJs = `(function(){var c=${cfg},w=window.LUMEN_CFG||(window.LUMEN_CFG={});for(var k in c)if(c[k]&&!w[k])w[k]=c[k];})();`;
const js = [cfgJs].concat(['core', 'api', 'nav', 'ui', 'player', 'screens'].map(n => fs.readFileSync(path.join(app, 'js', n + '.js'), 'utf8'))).join('\n;\n');
const css = fs.readFileSync(path.join(app, 'css', 'app.css'), 'utf8');
fs.mkdirSync(path.join(root, 'update'), { recursive: true });
fs.writeFileSync(path.join(root, 'update', 'bundle.json'), JSON.stringify({ build: v.build, version: v.version, css, js }));
fs.writeFileSync(path.join(root, 'update', 'version.json'), JSON.stringify({ build: v.build, version: v.version }) + '\n');
console.log(`update/bundle.json -> build ${v.build} (v${v.version}), ${Math.round((js.length + css.length) / 1024)} KB`);

const pkg = path.join(root, '.tools', 'node_modules', '.bin', process.platform === 'win32' ? 'ares-package.cmd' : 'ares-package');
if (!fs.existsSync(pkg)) { console.log('release/lumen.ipk skipped (LG tools not installed in .tools)'); process.exit(0); }
const out = path.join(root, 'release'), tmp = path.join(root, 'dist');
fs.rmSync(tmp, { recursive: true, force: true }); fs.mkdirSync(tmp, { recursive: true }); fs.mkdirSync(out, { recursive: true });
cp.execFileSync(pkg, ['--no-minify', app, '-o', tmp], { stdio: 'ignore' });
const ipk = fs.readdirSync(tmp).find(f => f.endsWith('.ipk'));
fs.copyFileSync(path.join(tmp, ipk), path.join(out, 'lumen.ipk'));
fs.writeFileSync(path.join(out, 'version.txt'), v.version + '\n');
console.log(`release/lumen.ipk -> v${v.version}`);

/* installers as zips: a zip keeps the Mac script's run permission after download */
if (process.platform !== 'win32') {
  const inst = path.join(root, 'installers');
  for (const [file, zip] of [['Lumen Installer (Mac).command', 'Lumen-Installer-Mac.zip'], ['Lumen Installer (Windows).bat', 'Lumen-Installer-Windows.zip']]) {
    const z = path.join(out, zip); fs.rmSync(z, { force: true });
    cp.execFileSync('zip', ['-q', '-X', '-j', z, path.join(inst, file)]);
  }
  console.log('release/Lumen-Installer-Mac.zip, release/Lumen-Installer-Windows.zip');
}
