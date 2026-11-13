/* Builds update/bundle.json (the over-the-air update the TV downloads) from app/. Usage: node tools/build.js [--bump] */
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), app = path.join(root, 'app');
const vf = path.join(app, 'js', 'version.js');
let v = JSON.parse(fs.readFileSync(vf, 'utf8').match(/=\s*(\{.*\})/)[1].replace(/(\w+):/g, '"$1":').replace(/'/g, '"'));
if (process.argv.includes('--bump')) {
  const p = v.version.split('.').map(Number); p[2]++;
  v = { build: v.build + 1, version: p.join('.') };
  fs.writeFileSync(vf, `window.LUMEN_BUILD = { build: ${v.build}, version: '${v.version}' };\n`);
  const ai = path.join(app, 'appinfo.json'), info = JSON.parse(fs.readFileSync(ai, 'utf8'));
  info.version = v.version; fs.writeFileSync(ai, JSON.stringify(info, null, 2) + '\n');
}
const js = ['core', 'api', 'nav', 'ui', 'player', 'screens'].map(n => fs.readFileSync(path.join(app, 'js', n + '.js'), 'utf8')).join('\n;\n');
const css = fs.readFileSync(path.join(app, 'css', 'app.css'), 'utf8');
fs.mkdirSync(path.join(root, 'update'), { recursive: true });
fs.writeFileSync(path.join(root, 'update', 'bundle.json'), JSON.stringify({ build: v.build, version: v.version, css, js }));
fs.writeFileSync(path.join(root, 'update', 'version.json'), JSON.stringify({ build: v.build, version: v.version }) + '\n');
console.log(`update/bundle.json -> build ${v.build} (v${v.version}), ${Math.round((js.length + css.length) / 1024)} KB`);
