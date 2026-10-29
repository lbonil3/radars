#!/usr/bin/env node
// Landing page PWA checks: manifest fields + icon files/sizes, index.html tags, sw.js precache files exist and cache naming. Run: node scripts/check-pwa.js
const fs = require('fs'), path = require('path'), assert = require('assert');
const ROOT = path.resolve(__dirname, '..'), rd = (f) => fs.readFileSync(path.join(ROOT, f));
const pngSize = (f) => { const b = rd(f); assert.strictEqual(b.toString('ascii', 1, 4), 'PNG', f + ' is not a PNG'); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };
const m = JSON.parse(rd('manifest.webmanifest'));
assert.strictEqual(m.name, 'Radars'); assert.strictEqual(m.short_name, 'Radars');
assert.strictEqual(m.start_url, './'); assert.strictEqual(m.scope, './'); assert.strictEqual(m.display, 'standalone');
assert.ok(/^#[0-9a-f]{6}$/i.test(m.theme_color) && /^#[0-9a-f]{6}$/i.test(m.background_color));
for (const ic of m.icons) { const [w, h] = pngSize(ic.src); assert.strictEqual(w + 'x' + h, ic.sizes, ic.src + ' size'); }
assert.ok(m.icons.some((i) => i.sizes === '192x192' && /any/.test(i.purpose || 'any')), '192 any icon');
assert.ok(m.icons.some((i) => i.sizes === '512x512' && /any/.test(i.purpose || 'any')), '512 any icon');
assert.ok(m.icons.some((i) => i.sizes === '512x512' && /maskable/.test(i.purpose || '')), '512 maskable icon');
assert.deepStrictEqual(pngSize('icons/apple-touch-icon.png'), [180, 180]);
const html = rd('index.html').toString();
for (const s of ['rel="manifest" href="manifest.webmanifest"', 'name="theme-color" content="' + m.theme_color + '"', 'apple-mobile-web-app-capable', 'apple-mobile-web-app-title" content="Radars"', 'rel="apple-touch-icon" href="icons/apple-touch-icon.png"', "register('sw.js')", 'id="installBtn"', 'beforeinstallprompt', 'id="iosHint"', 'display-mode: standalone'])
  assert.ok(html.includes(s), 'index.html missing ' + s);
const sw = rd('sw.js').toString();
const files = JSON.parse(sw.match(/var FILES = (\[[^\]]*\])/)[1].replace(/'/g, '"'));
for (const f of files) assert.ok(fs.existsSync(path.join(ROOT, f === './' ? 'index.html' : f)), 'sw precache file missing: ' + f);
for (const f of ['./index.html', './manifest.webmanifest'].concat(m.icons.map((i) => './' + i.src))) assert.ok(files.includes(f), 'sw does not precache ' + f);
assert.ok(/var PREFIX = 'radars-home-'/.test(sw) && /k\.indexOf\(PREFIX\) === 0/.test(sw), 'sw must only delete its own radars-home-* caches');
assert.ok(!files.some((f) => /^\.\/(national|texas)\/.*\.(html|js)$/.test(f)), 'root sw must not precache app pages');
console.log('check-pwa ok: manifest, ' + m.icons.length + ' icons, ' + files.length + ' precached files');
