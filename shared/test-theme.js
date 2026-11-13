// Shared theme. Run: node shared/test-theme.js
const assert = require('assert');
const T = require('./theme.js');

function mem(map) {
  const o = { map: Object.assign({}, map) };
  o.getItem = function (k) { return Object.prototype.hasOwnProperty.call(this.map, k) ? this.map[k] : null; };
  o.setItem = function (k, v) { this.map[k] = String(v); };
  return o;
}
function doc() {
  const attrs = {}, els = [];
  const el = {
    attrs: attrs,
    style: { colorScheme: '' },
    setAttribute: function (k, v) { this.attrs[k] = String(v); },
    getAttribute: function (k) { return this.attrs[k]; }
  };
  return {
    documentElement: el,
    theme: { setAttribute: function (k, v) { this[k] = v; } },
    sb: { setAttribute: function (k, v) { this[k] = v; } },
    buttons: [
      { name: 'day', classList: { on: false, toggle: function (c, v) { if (c === 'on') this.on = v; } }, attrs: {}, setAttribute: function (k, v) { this.attrs[k] = v; }, getAttribute: function (k) { return k === 'data-theme-set' ? this.name : this.attrs[k]; } },
      { name: 'night', classList: { on: false, toggle: function (c, v) { if (c === 'on') this.on = v; } }, attrs: {}, setAttribute: function (k, v) { this.attrs[k] = v; }, getAttribute: function (k) { return k === 'data-theme-set' ? this.name : this.attrs[k]; } }
    ],
    getElementById: function (id) { return id === 'themeColor' ? this.theme : id === 'sbStyle' ? this.sb : null; },
    querySelectorAll: function (sel) { return sel === '[data-theme-set]' ? this.buttons : []; }
  };
}

assert.strictEqual(T.KEY, 'radars.theme');
assert.deepStrictEqual(T.LEGACY_KEYS, ['nr.theme']);
assert.strictEqual(T.readPref(mem({})), 'day');
assert.strictEqual(T.readPref(mem({ 'nr.theme': 'night' })), 'night');
assert.strictEqual(T.readPref(mem({ 'radars.theme': 'auto', 'nr.theme': 'night' })), 'auto', 'new key wins');
assert.strictEqual(T.readPref(mem({ 'radars.theme': 'purple' })), 'day', 'invalid pref => day');
const ls = mem({ 'nr.theme': 'night' });
T.migrate(ls);
assert.strictEqual(ls.getItem('radars.theme'), 'night');
assert.strictEqual(ls.getItem('nr.theme'), 'night');
assert.strictEqual(T.resolve('day', true), 'day');
assert.strictEqual(T.resolve('night', false), 'night');
assert.strictEqual(T.resolve('auto', true), 'night');
assert.strictEqual(T.resolve('auto', false), 'day');
const d = doc();
T.apply(d, 'night', { darkQueryMatches: false });
assert.strictEqual(d.documentElement.attrs['data-theme'], 'night');
assert.strictEqual(d.documentElement.attrs['data-theme-pref'], 'night');
assert.strictEqual(d.documentElement.style.colorScheme, 'dark');
assert.strictEqual(d.theme.content, '#0a1020');
assert.strictEqual(d.sb.content, 'black-translucent');
assert.ok(d.buttons[1].classList.on && !d.buttons[0].classList.on);
const d2 = doc();
T.apply(d2, 'auto', { darkQueryMatches: false });
assert.strictEqual(d2.documentElement.attrs['data-theme'], 'day');
assert.strictEqual(d2.theme.content, '#f5f7fb');
assert.ok(T.setPref(ls, 'auto') && T.readPref(ls) === 'auto');
assert.strictEqual(T.setPref(ls, 'nope'), false);
const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
for (const rel of ['national/index.html', 'texas/index.html', 'index.html']) {
  const html = fs.readFileSync(path.join(root, rel), 'utf8');
  assert.ok(html.includes("localStorage.getItem('radars.theme')"), rel + ' before-paint reads radars.theme');
  assert.ok(html.includes('../shared/storage.js') || html.includes('shared/storage.js'), rel + ' loads storage.js');
  assert.ok(html.includes('../shared/theme.js') || html.includes('shared/theme.js'), rel + ' loads theme.js');
  assert.ok(html.includes('data-theme-set'), rel + ' has theme buttons');
}
const napp = fs.readFileSync(path.join(root, 'national/app.js'), 'utf8');
assert.ok(/RadarTheme\.bind/.test(napp), 'national app binds RadarTheme');
assert.ok(!/localStorage\.setItem\('nr\.theme'/.test(napp), 'national app no longer writes nr.theme');
const tapp = fs.readFileSync(path.join(root, 'texas/app.js'), 'utf8');
assert.ok(/RadarTheme\.bind/.test(tapp), 'texas app binds RadarTheme');
console.log('shared theme tests passed');
