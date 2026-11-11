// Shared PWA cache lists. Run: node shared/test-cache.js
const assert = require('assert');
const fs = require('fs'), path = require('path');
const C = require('./cache.js');
const root = path.resolve(__dirname, '..');

assert.strictEqual(C.VERSION, 22);
assert.strictEqual(C.name('national'), 'radars-national-v22');
assert.strictEqual(C.name('texas'), 'radars-texas-v22');
assert.strictEqual(C.name('home'), 'radars-home-v22');

function appDir(app) {
  if (app === 'national') return path.join(root, 'national');
  if (app === 'texas') return path.join(root, 'texas');
  return root;
}
const sharedNames = ['storage.js', 'theme.js', 'filters.js', 'shell.js', 'capture.js', 'shell.css', 'cache.js'];
for (const app of ['national', 'texas', 'home']) {
  const list = C.files(app);
  assert.ok(Array.isArray(list) && list.length, app + ' file list');
  for (const f of list) {
    const rel = f === './' ? 'index.html' : f;
    assert.ok(fs.existsSync(path.resolve(appDir(app), rel)), app + ' missing ' + f);
  }
  const joined = list.join('\n');
  for (const name of sharedNames) assert.ok(joined.indexOf('shared/' + name) >= 0, app + ' lists shared/' + name);
}

const workers = [
  ['national/sw.js', '../shared/cache.js', 'national'],
  ['texas/sw.js', '../shared/cache.js', 'texas'],
  ['sw.js', './shared/cache.js', 'home']
];
for (const [rel, script, app] of workers) {
  const sw = fs.readFileSync(path.join(root, rel), 'utf8');
  assert.ok(sw.indexOf("importScripts('" + script + "')") >= 0, rel + ' importScripts cache.js');
  assert.ok(sw.indexOf("RadarCache.name('" + app + "')") >= 0, rel + ' uses RadarCache.name');
  assert.ok(sw.indexOf("RadarCache.files('" + app + "')") >= 0, rel + ' uses RadarCache.files');
  assert.ok(sw.indexOf('radars-national-v21') < 0, rel + ' does not hard-code radars-national-v21');
}

const texasApp = fs.readFileSync(path.join(root, 'texas/app.js'), 'utf8');
const texasHtml = fs.readFileSync(path.join(root, 'texas/index.html'), 'utf8');
assert.ok(/navigator\.serviceWorker\.register\('sw\.js'\)/.test(texasApp + texasHtml), 'Texas registers sw.js');
assert.ok(/location\.protocol === 'https:' \|\| location\.hostname === 'localhost'/.test(texasApp + texasHtml), 'Texas registers only on HTTPS or localhost');

console.log('shared cache tests passed');
