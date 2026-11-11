# Radar 2.0 Shared Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a shared foundation in `lbonil3/radars` so National Radar and Texas Opportunity load one shell for theme, chrome, filters, backup, capture, and PWA helpers, without changing data collection or shipping the desktop layout.

**Architecture:** A new `shared/` folder at the repo root holds vanilla UMD modules (browser global + `module.exports`) and CSS. Each app's `index.html` loads shared CSS and JS first, then its own files. There is no bundler. Device keys are namespaced (`radars.theme` for the whole product; `national.*` and `texas.*` per app). Existing keys are copied to the new names once and never deleted, so a rollback can still read them. Capture backup files gain version 2 and new app ids, while version 1 files with the old app ids still restore.

**Tech Stack:** Vanilla JavaScript, no dependencies, Node 18+ for tests (`node test.js`), GitHub Pages, GitHub Actions.

## Global Constraints

- Vanilla JS, no build step, no new dependencies
- GitHub Pages from `main` at https://lbonil3.github.io/radars/
- Routes `/national/` and `/texas/` stay as they are
- Live pages carry no links to the repository
- Phone-first remains the default experience
- No relative path may escape the repo (`scripts/check-paths.js` stays in force)
- Data collection and refresh workflows stay as they are
- Backups stay per app (no combined National-and-Texas backup file)
- Frozen: do not edit `lbonil3/hydraulics-tools` radar folders
- Migration must never delete a user's starred items, notes, or saved filters; old keys are copied, not removed
- A leftover National version module is removed only when tests show nothing loads it
- Do not implement the two-column desktop map/list layout; only CSS/JS hooks the shell needs so phase 2 can add it

## File structure

| File | Responsibility |
|---|---|
| `shared/storage.js` | Read/write JSON and string keys; copy-legacy-to-new-key migration that never deletes the old key |
| `shared/theme.js` | Day / Night / Auto preference (`radars.theme`), resolve, apply before paint, migrate `nr.theme` |
| `shared/filters.js` | Saved filter sets, active tags, clear helpers; per-app keys `national.filtersets` / `texas.filtersets`; migrate `nr.filtersets` |
| `shared/capture.js` | Move of `national/capture.js`; capture model plus backup v2 (accepts v1) |
| `shared/cache.js` | Shared cache-version constant and per-app precache file lists for service workers |
| `shared/shell.css` | Home button (moved from `home-btn.css`) and two-column desktop layout hooks |
| `shared/test-storage.js` | Storage and migration tests |
| `shared/test-theme.js` | Theme tests |
| `shared/test-filters.js` | Filter-set tests |
| `shared/test-capture.js` | Capture tests (moved from `national/test-capture.js`, plus v2 backup cases) |
| `shared/test-cache.js` | Cache list and SW wiring tests |
| `national/v6.js` | Keeps National work-type and due-within filters; delegates saved sets to `RadarFilters` |
| `national/index.html`, `national/app.js`, `national/sw.js` | Load shared files; use new keys; cache shared files |
| `texas/index.html`, `texas/app.js`, `texas/sw.js` (new), `texas/style.css` | Same, plus a first service worker and day-theme CSS |
| `index.html`, `sw.js` | Landing uses shared theme; precache shared files |
| `test.js` | Syntax-check `shared/` and run `shared/test-*.js` |
| `.github/workflows/test.yml` | Run `node test.js` on pull requests and on pushes to `main` |
| `README.md` | Point at `shared/capture.js` instead of `national/capture.js` |

`home-btn.css` is deleted after `shared/shell.css` replaces it. `national/capture.js` and `national/test-capture.js` are deleted after the move. National leftover modules (`v2.js`, `v4.js`, `v6.js`, `combined.js`) stay until a later task or phase proves they are unused.

Do not restructure `national/app.js` or `texas/app.js` beyond the wiring this plan shows.

---

### Task 1: Shared storage helper

**Files:**
- Create: `shared/storage.js`
- Create: `shared/test-storage.js`

**Interfaces:**
- Consumes: nothing
- Produces: `RadarStorage` (global or `module.exports`) with:
  - `migrateCopy(ls, fromKey, toKey)` → `true` if a copy was written, else `false`. If `toKey` already has a non-empty value, do nothing. If `fromKey` is missing or empty, do nothing. Never `removeItem` on `fromKey`.
  - `read(ls, key, fallbackKeys)` → string or `null`. Tries `key`, then each name in `fallbackKeys` (default `[]`).
  - `write(ls, key, value)` → `true` on success, `false` if `setItem` throws.
  - `readJSON(ls, key, fallbackKeys, fallbackValue)` → parsed value, or `fallbackValue` (default `null`) on missing/corrupt JSON.
  - `writeJSON(ls, key, value)` → `true`/`false` via `write` and `JSON.stringify`.

- [ ] **Step 1: Write the failing test**

Create `shared/test-storage.js`:

```javascript
// Shared storage helper. Run: node shared/test-storage.js
const assert = require('assert');
const S = require('./storage.js');

function mem(map) {
  const o = { map: Object.assign({}, map) };
  o.getItem = function (k) { return Object.prototype.hasOwnProperty.call(this.map, k) ? this.map[k] : null; };
  o.setItem = function (k, v) { this.map[k] = String(v); };
  o.removeItem = function (k) { delete this.map[k]; };
  return o;
}

const a = mem({ 'nr.theme': 'night' });
assert.strictEqual(S.read(a, 'radars.theme', ['nr.theme']), 'night');
assert.strictEqual(S.migrateCopy(a, 'nr.theme', 'radars.theme'), true);
assert.strictEqual(a.getItem('radars.theme'), 'night');
assert.strictEqual(a.getItem('nr.theme'), 'night', 'legacy key is not deleted');
assert.strictEqual(S.migrateCopy(a, 'nr.theme', 'radars.theme'), false, 'already migrated');
a.setItem('radars.theme', 'day');
S.migrateCopy(a, 'nr.theme', 'radars.theme');
assert.strictEqual(a.getItem('radars.theme'), 'day', 'existing new key wins');

const b = mem({});
assert.strictEqual(S.migrateCopy(b, 'nr.theme', 'radars.theme'), false);
assert.strictEqual(S.read(b, 'radars.theme', ['nr.theme']), null);

const c = mem({});
assert.ok(S.writeJSON(c, 'national.watch', { x: true }));
assert.deepStrictEqual(S.readJSON(c, 'national.watch', ['nr.watch'], {}), { x: true });
c.setItem('national.watch', '{bad');
assert.deepStrictEqual(S.readJSON(c, 'national.watch', [], {}), {}, 'corrupt JSON => fallback, no throw');

const boom = {
  getItem: function () { throw new Error('blocked'); },
  setItem: function () { throw new Error('blocked'); }
};
assert.strictEqual(S.read(boom, 'k', []), null);
assert.strictEqual(S.write(boom, 'k', 'v'), false);
assert.strictEqual(S.readJSON(boom, 'k', [], { z: 1 }).z, 1);
console.log('shared storage tests passed');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node shared/test-storage.js`

Expected: FAIL with a module-not-found error for `./storage.js` (or `RadarStorage` / function not defined).

- [ ] **Step 3: Write minimal implementation**

Create `shared/storage.js`:

```javascript
/* Key read/write and copy-forward migration. Browser + Node, no dependencies. Never deletes a legacy key. */
(function (root, factory) { if (typeof module === 'object' && module.exports) module.exports = factory(); else root.RadarStorage = factory(); })(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  function migrateCopy(ls, fromKey, toKey) {
    try {
      var cur = ls.getItem(toKey);
      if (cur !== null && cur !== '') return false;
      var old = ls.getItem(fromKey);
      if (old === null || old === '') return false;
      ls.setItem(toKey, old);
      return true;
    } catch (e) { return false; }
  }
  function read(ls, key, fallbackKeys) {
    try {
      var v = ls.getItem(key);
      if (v !== null && v !== '') return v;
      var fb = fallbackKeys || [];
      for (var i = 0; i < fb.length; i++) {
        v = ls.getItem(fb[i]);
        if (v !== null && v !== '') return v;
      }
      return null;
    } catch (e) { return null; }
  }
  function write(ls, key, value) {
    try { ls.setItem(key, value); return true; } catch (e) { return false; }
  }
  function readJSON(ls, key, fallbackKeys, fallbackValue) {
    var fb = fallbackValue === undefined ? null : fallbackValue;
    var raw = read(ls, key, fallbackKeys);
    if (raw === null) return fb;
    try { return JSON.parse(raw); } catch (e) { return fb; }
  }
  function writeJSON(ls, key, value) {
    try { return write(ls, key, JSON.stringify(value)); } catch (e) { return false; }
  }
  return { migrateCopy: migrateCopy, read: read, write: write, readJSON: readJSON, writeJSON: writeJSON };
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node shared/test-storage.js`

Expected: `shared storage tests passed`

- [ ] **Step 5: Commit**

```bash
git add shared/storage.js shared/test-storage.js
git commit -m "feat(shared): add storage helper with copy-forward key migration"
```

---

### Task 2: Shared theme module

**Files:**
- Create: `shared/theme.js`
- Create: `shared/test-theme.js`

**Interfaces:**
- Consumes: `RadarStorage` from Task 1 (`require('./storage.js')` in Node; in the browser, `storage.js` must load first and theme uses `root.RadarStorage`)
- Produces: `RadarTheme` with:
  - `KEY = 'radars.theme'`
  - `LEGACY_KEYS = ['nr.theme']`
  - `COLORS = { day: '#f5f7fb', night: '#0a1020' }`
  - `readPref(ls)` → `'day'|'night'|'auto'`, default `'day'`
  - `setPref(ls, pref)` → `true`/`false`; invalid pref is ignored and returns `false`
  - `resolve(pref, darkQueryMatches)` → `'day'|'night'`
  - `migrate(ls)` → calls `RadarStorage.migrateCopy(ls, 'nr.theme', 'radars.theme')`
  - `apply(doc, pref, opts)` → sets `data-theme`, `data-theme-pref`, `colorScheme` on `doc.documentElement`; updates `#themeColor` and `#sbStyle` if present; toggles `.on` / `aria-pressed` on `[data-theme-set]`. `opts.colors` may override `COLORS`. `opts.dark` is a boolean; if omitted, use `resolve` with `opts.darkQueryMatches`.
  - `bind(doc, ls, opts)` → migrate, apply `readPref(ls)`, listen to `[data-theme-set]` clicks and `prefers-color-scheme` changes when pref is `auto`.

In the browser bundle, do not `require()`. Use:

```javascript
var Storage = (typeof module === 'object' && module.exports) ? require('./storage.js') : root.RadarStorage;
```

- [ ] **Step 1: Write the failing test**

Create `shared/test-theme.js`:

```javascript
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
console.log('shared theme tests passed');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node shared/test-theme.js`

Expected: FAIL with a module-not-found error for `./theme.js`.

- [ ] **Step 3: Write minimal implementation**

Create `shared/theme.js` as a UMD module. Use `RadarStorage` for read/write/migrate. Valid prefs are only `day`, `night`, `auto`. `apply` uses `COLORS.day` / `COLORS.night` (or `opts.colors`) for `#themeColor`, and `default` / `black-translucent` for `#sbStyle`. Implement `bind` now even if Task 2 tests do not call it (Task 3 will).

```javascript
/* Product theme: Day default, Night, or Auto. Key radars.theme; copy-forward from nr.theme. Browser + Node. */
(function (root, factory) {
  var Storage = (typeof module === 'object' && module.exports) ? require('./storage.js') : root.RadarStorage;
  var api = factory(Storage);
  if (typeof module === 'object' && module.exports) module.exports = api; else root.RadarTheme = api;
})(typeof self !== 'undefined' ? self : this, function (Storage) {
  'use strict';
  var KEY = 'radars.theme', LEGACY_KEYS = ['nr.theme'], VALID = { day: 1, night: 1, auto: 1 };
  var COLORS = { day: '#f5f7fb', night: '#0a1020' };
  function migrate(ls) { return Storage.migrateCopy(ls, LEGACY_KEYS[0], KEY); }
  function readPref(ls) {
    migrate(ls);
    var v = Storage.read(ls, KEY, LEGACY_KEYS);
    return v && VALID[v] ? v : 'day';
  }
  function setPref(ls, pref) {
    if (!VALID[pref]) return false;
    return Storage.write(ls, KEY, pref);
  }
  function resolve(pref, darkQueryMatches) {
    if (pref === 'night') return 'night';
    if (pref === 'auto' && darkQueryMatches) return 'night';
    return 'day';
  }
  function apply(doc, pref, opts) {
    opts = opts || {};
    var p = VALID[pref] ? pref : 'day';
    var dark = typeof opts.dark === 'boolean' ? opts.dark : resolve(p, !!opts.darkQueryMatches) === 'night';
    var t = dark ? 'night' : 'day';
    var colors = opts.colors || COLORS;
    var d = doc.documentElement;
    d.setAttribute('data-theme', t);
    d.setAttribute('data-theme-pref', p);
    d.style.colorScheme = dark ? 'dark' : 'light';
    var m = doc.getElementById('themeColor'); if (m) m.setAttribute('content', dark ? colors.night : colors.day);
    var b = doc.getElementById('sbStyle'); if (b) b.setAttribute('content', dark ? 'black-translucent' : 'default');
    var nodes = doc.querySelectorAll('[data-theme-set]');
    for (var i = 0; i < nodes.length; i++) {
      var x = nodes[i], on = x.getAttribute('data-theme-set') === p;
      x.classList.toggle('on', on);
      x.setAttribute('aria-pressed', String(on));
    }
  }
  function bind(doc, ls, opts) {
    opts = opts || {};
    function currentDark() {
      if (typeof opts.darkQueryMatches === 'boolean') return opts.darkQueryMatches;
      return !!(doc.defaultView && doc.defaultView.matchMedia && doc.defaultView.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    function go() { apply(doc, readPref(ls), { darkQueryMatches: currentDark(), colors: opts.colors }); }
    migrate(ls); go();
    var nodes = doc.querySelectorAll('[data-theme-set]');
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].addEventListener('click', function (e) {
        e.stopPropagation();
        setPref(ls, this.getAttribute('data-theme-set'));
        go();
      });
    }
    var win = doc.defaultView;
    if (win && win.matchMedia) {
      var mq = win.matchMedia('(prefers-color-scheme: dark)');
      var onMq = function () { if (readPref(ls) === 'auto') go(); };
      if (mq.addEventListener) mq.addEventListener('change', onMq);
      else if (mq.addListener) mq.addListener(onMq);
    }
  }
  return { KEY: KEY, LEGACY_KEYS: LEGACY_KEYS, COLORS: COLORS, readPref: readPref, setPref: setPref, resolve: resolve, migrate: migrate, apply: apply, bind: bind };
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node shared/test-theme.js && node shared/test-storage.js`

Expected: both print a passed line.

- [ ] **Step 5: Commit**

```bash
git add shared/theme.js shared/test-theme.js
git commit -m "feat(shared): add Day/Night/Auto theme with radars.theme key"
```

---

### Task 3: Wire theme into National, Texas, and the landing page

**Files:**
- Modify: `national/index.html` (head theme script and script tags)
- Modify: `national/app.js` (replace local theme functions with `RadarTheme.bind`)
- Modify: `texas/index.html` (before-paint theme script, theme buttons, script tags)
- Modify: `texas/app.js` (call `RadarTheme.bind` at startup)
- Modify: `texas/style.css` (add `html[data-theme=day]` variable overrides, modeled on National's day palette but keeping Texas teal accents)
- Modify: `index.html` (before-paint theme script, theme buttons, shared CSS/JS)
- Modify: `index.html` inline styles so landing colors use `data-theme` (night stays the current dark look)

**Interfaces:**
- Consumes: `RadarTheme` from Task 2
- Produces: all three pages share `radars.theme`; picking Night on National makes Texas and the landing Night on the next load (and the reverse)

Inline before-paint snippet (same on every page; National already has an equivalent that reads `nr.theme` — replace it). Put it immediately after the `theme-color` / `sbStyle` meta tags:

```html
<script>
(function(){
  var p='day';
  try{
    if(window.localStorage){
      p=localStorage.getItem('radars.theme')||localStorage.getItem('nr.theme')||'day';
    }
  }catch(e){}
  if(p!=='night'&&p!=='auto'&&p!=='day')p='day';
  var t=p==='night'?'night':(p==='auto'&&window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches?'night':'day');
  var d=document.documentElement;d.setAttribute('data-theme',t);d.setAttribute('data-theme-pref',p);d.style.colorScheme=t==='night'?'dark':'light';
  var dayC=d.getAttribute('data-theme-day')||'#f5f7fb', nightC=d.getAttribute('data-theme-night')||'#0a1020';
  var m=document.getElementById('themeColor');if(m)m.setAttribute('content',t==='night'?nightC:dayC);
  var b=document.getElementById('sbStyle');if(b)b.setAttribute('content',t==='night'?'black-translucent':'default');
})();
</script>
```

For Texas and landing, set `data-theme-night` on `<html>` to the current default (`#07100e` for Texas, `#0a1020` for landing) so the first paint uses the right theme-color before `theme.js` loads. Day stays `#f5f7fb`.

- [ ] **Step 1: Write / extend failing wiring checks**

Add to the end of `shared/test-theme.js` (before the final `console.log`), after reading the three HTML files from the repo root:

```javascript
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
```

Keep the existing unit tests above this block. Move the original `console.log` so it only runs once at the end.

- [ ] **Step 2: Run test to verify it fails**

Run: `node shared/test-theme.js`

Expected: FAIL because the HTML files do not yet load `shared/theme.js` / `radars.theme`.

- [ ] **Step 3: Wire the pages**

National `index.html`:
- Replace the existing before-paint `<script>` (the one that reads `nr.theme`) with the snippet above.
- After `style.css`, do not add a second theme stylesheet yet (National already has `html[data-theme=day]` rules).
- Before `proj.js`, add:

```html
<script src="../shared/storage.js"></script>
<script src="../shared/theme.js"></script>
```

National `app.js`: delete `themePref`, `applyTheme`, the `[data-theme-set]` click handler, the `matchMedia` listener, and the `applyTheme(themePref())` call (the block that today starts around the "Theme: Day is the default" comment). Replace that whole block with:

```javascript
  if (window.RadarTheme) RadarTheme.bind(document, window.localStorage);
```

Texas `index.html`:
- Give `<html>` an id-less attribute: `data-theme-night="#07100e"`.
- Add `id="themeColor"` to the existing theme-color meta and add `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" id="sbStyle">` if missing.
- Insert the before-paint snippet.
- In the header, after the Home link, add:

```html
<div class="throw" role="group" aria-label="Theme"><button type="button" data-theme-set="day">Day</button><button type="button" data-theme-set="night">Night</button><button type="button" data-theme-set="auto">Auto</button></div>
```

- Before `../national/capture.js` (still the old path until Task 4), add:

```html
<script src="../shared/storage.js"></script>
<script src="../shared/theme.js"></script>
```

Texas `app.js`: at the start of the existing startup path (the same place that calls `loadData()`), add `if (window.RadarTheme) RadarTheme.bind(document, window.localStorage, { colors: { day: '#f5f7fb', night: '#07100e' } });`

Texas `style.css`: after the existing `:root{...}` rule, add a day-theme override that flips the CSS variables to a light palette and fixes only the hard-coded dark backgrounds that would break Day (header gradient, chips, tabs). Use:

```css
html[data-theme=day]{--bg:#f5f7fb;--panel:#ffffff;--panel2:#eef2f8;--line:#c9d3e3;--ink:#0f1a2e;--dim:#4a5875;--acc:#0f766e;--warn:#8a5a00;--bad:#b4233a}
html[data-theme=day] .top{background:linear-gradient(180deg,#e6f4f1,var(--bg))}
html[data-theme=day] .tabs{background:rgba(255,255,255,.97)}
html[data-theme=day] .chip.on{color:var(--ink)}
```

Add more `html[data-theme=day]` overrides only for selectors that stay unreadable in a quick visual check (for example white text on a now-white chip). Do not restyle the Intel magazine.

Landing `index.html`:
- Add the before-paint snippet in `<head>`.
- Add `id="themeColor"` on the theme-color meta.
- Add Day/Night/Auto buttons in the `.install` row (visible, not hidden with the install prompt):

```html
<div class="throw" role="group" aria-label="Theme"><button type="button" data-theme-set="day">Day</button><button type="button" data-theme-set="night">Night</button><button type="button" data-theme-set="auto">Auto</button></div>
```

- Before the existing inline install `<script>`, add:

```html
<script src="shared/storage.js"></script>
<script src="shared/theme.js"></script>
<script>if (window.RadarTheme) RadarTheme.bind(document, window.localStorage);</script>
```

- Scope the current dark colors under `html[data-theme=night]` (and keep them as the no-preference fallback by also leaving them on `:root` which before-paint will set to night or day). Add `html[data-theme=day]` rules that use a light background (`#f5f7fb`), dark ink (`#0f1a2e`), and dim (`#4a5875`), keeping the existing card layout.

Style the shared `.throw [data-theme-set]` buttons in each page's CSS or, if already adding `shared/shell.css` in Task 7, a temporary 8-line rule in `texas/style.css` and the landing `<style>` is enough: min-height 44px, pressed / `.on` state visible.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node shared/test-theme.js && node test.js`

Expected: theme tests passed, and the full suite still passes. If `test.js` does not yet syntax-check `shared/`, run `node --check shared/storage.js` and `node --check shared/theme.js` as well. (Task 9 makes `test.js` include `shared/`.)

If a Texas or landing HTML assertion in an existing test fails because of the new tags, update that test to allow the new markup; do not revert the wiring.

- [ ] **Step 5: Commit**

```bash
git add national/index.html national/app.js texas/index.html texas/app.js texas/style.css index.html shared/test-theme.js
git commit -m "feat: wire shared Day/Night/Auto theme across National, Texas, and home"
```

---

### Task 4: Move capture.js into shared/

**Files:**
- Create: `shared/capture.js` (move, contents unchanged in this task)
- Create: `shared/test-capture.js` (move of `national/test-capture.js`, with the require path updated)
- Modify: `national/index.html`, `national/sw.js`, `national/test.js`
- Modify: `texas/index.html`, `texas/test.js`
- Modify: `README.md` (the sentence that cites `national/capture.js`)
- Delete: `national/capture.js`, `national/test-capture.js`

**Interfaces:**
- Consumes: none new
- Produces: `RadarCapture` from `shared/capture.js` with the same exports as today (`BACKUP_APP`, `OPP_BACKUP_APP`, `makeBackup`, `parseBackup`, and the rest). No backup-format change in this task.

- [ ] **Step 1: Write the failing path checks by moving the test first**

Copy `national/test-capture.js` to `shared/test-capture.js` and change only the require:

```javascript
const C = require('./capture.js');
```

Change `national/test.js` to `require('../shared/test-capture.js')` instead of `require('./test-capture.js')`.

In `texas/test.js`, change the capture block to require `../shared/capture.js` and to assert the HTML contains `../shared/capture.js` (not `../national/capture.js`).

- [ ] **Step 2: Run tests to verify they fail**

Run: `node national/test.js` and `node texas/test.js`

Expected: FAIL because `shared/capture.js` does not exist yet and/or the HTML still points at `national/capture.js`.

- [ ] **Step 3: Move the file and update references**

```bash
git mv national/capture.js shared/capture.js
```

If `git mv` is awkward after the test file already moved, copy the exact contents of today's `national/capture.js` into `shared/capture.js` and delete `national/capture.js`.

Update:
- `national/index.html`: `<script src="../shared/capture.js"></script>` (still before `v2.js` / `app.js`)
- `national/sw.js` `FILES`: replace `'./capture.js'` with `'../shared/capture.js'`
- `texas/index.html`: `<script src="../shared/capture.js"></script>`
- `README.md`: say Texas shares `shared/capture.js`
- Delete `national/test-capture.js` once `shared/test-capture.js` and the `national/test.js` require are in place

Do not change backup `app` ids or version yet.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node test.js`

Expected: `all radars tests passed`

- [ ] **Step 5: Commit**

```bash
git add shared/capture.js shared/test-capture.js national/index.html national/sw.js national/test.js national/capture.js national/test-capture.js texas/index.html texas/test.js README.md
git commit -m "refactor: move capture model to shared/capture.js"
```

---

### Task 5: Backup version 2, still accepting version 1

**Files:**
- Modify: `shared/capture.js`
- Modify: `shared/test-capture.js`
- Modify: `texas/test.js` (the cross-app reject assertion, which today uses `OPP_BACKUP_APP` and the default National id)

**Interfaces:**
- Consumes: Task 4 `RadarCapture`
- Produces: updated `RadarCapture`:
  - `BACKUP_VERSION = 2`
  - `APPS = { national: { id: 'radars-national', legacy: ['hydraulics-tools-radar-capture'] }, texas: { id: 'radars-texas', legacy: ['hydraulics-tools-opportunity-radar-capture'] } }`
  - `BACKUP_APP` remains `'hydraulics-tools-radar-capture'` (legacy National id, so existing tests and files stay meaningful)
  - `OPP_BACKUP_APP` remains `'hydraulics-tools-opportunity-radar-capture'`
  - `makeBackup(watch, caps, nowIso, appId)` writes `version: 2`. If `appId` is omitted, write `app: 'radars-national'`. If `appId` is a legacy id, still write the new id for that family (`hydraulics-tools-opportunity-radar-capture` → `radars-texas`).
  - `parseBackup(text, appId)` accepts `version` 1 or 2. It accepts a file whose `app` is the requested id or any legacy/new id in the same family. Default `appId` is the National family. A Texas file is still rejected when National is requested, and the reverse. Unknown versions still error with the existing message shape: `'This backup is version ' + j.version + ', which this page does not understand.'`

`applyBackup` is unchanged.

- [ ] **Step 1: Write the failing tests**

Append to `shared/test-capture.js` (keep every existing test, including current v1 parse behavior — update any test that required `version === 1` on a newly made backup):

```javascript
const v2 = C.makeBackup({ a: true }, { a: C.clean({ notes: 'n' }) }, '2026-11-11T12:00:00Z');
assert.strictEqual(v2.version, 2);
assert.strictEqual(v2.app, 'radars-national');
assert.ok(C.parseBackup(JSON.stringify(v2)).ok);
assert.ok(C.parseBackup(JSON.stringify(v2), 'radars-national').ok);
assert.ok(C.parseBackup(JSON.stringify(v2), C.BACKUP_APP).ok, 'legacy National id still accepts a new National file');

const v1 = { app: C.BACKUP_APP, version: 1, exportedAt: 'old', watch: { a: true }, capture: { a: C.clean({ notes: 'old' }) } };
assert.ok(C.parseBackup(JSON.stringify(v1)).ok, 'version 1 National backup still restores');
assert.ok(C.parseBackup(JSON.stringify(v1), 'radars-national').ok);

const tx = C.makeBackup({ b: true }, { b: C.clean({ notes: 't' }) }, 'now', C.OPP_BACKUP_APP);
assert.strictEqual(tx.app, 'radars-texas');
assert.ok(C.parseBackup(JSON.stringify(tx), C.OPP_BACKUP_APP).ok);
assert.ok(C.parseBackup(JSON.stringify(tx), 'radars-texas').ok);
assert.strictEqual(C.parseBackup(JSON.stringify(tx)).ok, false, 'National parse rejects a Texas backup');
assert.strictEqual(C.parseBackup(JSON.stringify(v2), 'radars-texas').ok, false);

const v1tx = { app: C.OPP_BACKUP_APP, version: 1, watch: { b: true }, capture: {} };
assert.ok(C.parseBackup(JSON.stringify(v1tx), 'radars-texas').ok, 'version 1 Texas backup still restores');
assert.strictEqual(C.parseBackup(JSON.stringify({ app: 'radars-national', version: 3, watch: {}, capture: {} })).ok, false);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node shared/test-capture.js`

Expected: FAIL on `v2.version === 2` and/or `v2.app === 'radars-national'` because `makeBackup` still writes version 1 and `hydraulics-tools-radar-capture`.

- [ ] **Step 3: Update `makeBackup` and `parseBackup`**

In `shared/capture.js`, add `BACKUP_VERSION`, `APPS`, and a helper `familyIds(appId)` that returns the set of accepted ids for that family. Change `makeBackup` to emit `version: 2` and the new canonical id. Change `parseBackup` to accept version 1 or 2 and family ids as specified. Keep the same error strings for invalid JSON, wrong family, and unsupported version. Continue to reject `__proto__` keys and to `clean()` capture entries.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node shared/test-capture.js && node test.js`

Expected: all passed. Update the Texas test comment and assertions so they use the new ids where they check `makeBackup` output, but still prove a Texas backup cannot be parsed as National (and the reverse). Do not remove the assertion that the live Texas watch key `opportunityRadar.watch.v1` is still written — that key changes in Task 6, not here. If a test required `version: 1` on a freshly made backup, point it at a hand-built v1 fixture instead.

- [ ] **Step 5: Commit**

```bash
git add shared/capture.js shared/test-capture.js texas/test.js
git commit -m "feat(shared): write capture backups as version 2 and still restore version 1"
```

---

### Task 6: Namespace National and Texas device keys

**Files:**
- Modify: `national/app.js`
- Modify: `national/v6.js`
- Modify: `national/test-v6.js`
- Modify: `texas/app.js`
- Modify: `texas/test.js`

**Interfaces:**
- Consumes: `RadarStorage` from Task 1; `RadarFilters` is Task 7 — this task only changes keys
- Produces: runtime keys:
  - National: `national.watch`, `national.capture`, `national.confirmedOnly`, `national.tab`, `national.topOpen`, `national.filtersets`
  - Texas: `texas.watch` (value shape unchanged: the existing watch objects that may contain `.cap`)
  - Legacy keys left in place: `nr.watch`, `nr.capture`, `nr.confirmedOnly`, `nr.tab`, `nr.topOpen`, `nr.filtersets`, `opportunityRadar.watch.v1`

On startup, call `RadarStorage.migrateCopy` for each pair, then read with `RadarStorage.read` / `readJSON` (new key, legacy fallback). Writes go only to the new keys.

- [ ] **Step 1: Write the failing tests**

In `national/test-v6.js`, change the fake `localStorage` assertion that today requires `nr.filtersets` so it expects `national.filtersets`, and add:

```javascript
const legacy = { v: JSON.stringify([V.snapshot('Legacy', { states: ['TX'] }, 'upcoming', 'tx')]), getItem(k) { return k === 'nr.filtersets' ? this.v : k === 'national.filtersets' ? this.neu : null; }, setItem(k, v) { if (k === 'national.filtersets') this.neu = v; } };
assert.strictEqual(V.load(legacy)[0].name, 'Legacy');
assert.ok(V.save(legacy, V.load(legacy)));
assert.ok(legacy.neu && legacy.v, 'legacy filtersets key is not deleted');
```

In `texas/test.js`, replace `assert.ok(app.indexOf("'opportunityRadar.watch.v1'") > 0, 'existing watch key unchanged');` with:

```javascript
assert.ok(app.indexOf("'texas.watch'") > 0, 'watch list uses texas.watch');
assert.ok(app.indexOf('opportunityRadar.watch.v1') > 0, 'legacy watch key still migrated');
```

Add a small block to `shared/test-storage.js` that documents the official pairs (as comments plus one loop) so the pairs stay consistent:

```javascript
const pairs = [
  ['nr.watch', 'national.watch'],
  ['nr.capture', 'national.capture'],
  ['nr.confirmedOnly', 'national.confirmedOnly'],
  ['nr.tab', 'national.tab'],
  ['nr.topOpen', 'national.topOpen'],
  ['nr.filtersets', 'national.filtersets'],
  ['opportunityRadar.watch.v1', 'texas.watch']
];
pairs.forEach(function (p) {
  const ls = mem({ [p[0]]: 'keep' });
  assert.ok(S.migrateCopy(ls, p[0], p[1]));
  assert.strictEqual(ls.getItem(p[0]), 'keep');
  assert.strictEqual(ls.getItem(p[1]), 'keep');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node national/test-v6.js && node texas/test.js`

Expected: FAIL on the new key names.

- [ ] **Step 3: Wire the keys**

`national/v6.js`: change `KEY` to `'national.filtersets'`. In `load(ls)`, first `RadarStorage.migrateCopy(ls, 'nr.filtersets', KEY)` when `RadarStorage` is available; in Node tests, `require('../shared/storage.js')` at the top of the UMD factory the same way `theme.js` does. `save` writes `KEY` only.

`national/app.js`: at the existing WATCH / CAP / CONF / tab / topOpen load sites, migrate and then read/write the new keys. Use `window.RadarStorage` (already on the page from Task 3). Example for the watch list:

```javascript
  if (window.RadarStorage) RadarStorage.migrateCopy(localStorage, 'nr.watch', 'national.watch');
  var WATCH = {}; try { WATCH = JSON.parse((window.RadarStorage ? RadarStorage.read(localStorage, 'national.watch', ['nr.watch']) : localStorage.getItem('nr.watch')) || '{}') || {}; } catch (e) { WATCH = {}; }
  function saveWatch() { try { localStorage.setItem('national.watch', JSON.stringify(WATCH)); } catch (e) { toast('Could not save the watchlist on this device.'); } }
```

Repeat the same pattern for `nr.capture` → `national.capture`, `nr.confirmedOnly` → `national.confirmedOnly`, `nr.tab` → `national.tab`, `nr.topOpen` → `national.topOpen`.

`texas/app.js`:

```javascript
  var WATCH_KEY = 'texas.watch';
  var WATCH_KEY_LEGACY = 'opportunityRadar.watch.v1';
  if (window.RadarStorage) RadarStorage.migrateCopy(localStorage, WATCH_KEY_LEGACY, WATCH_KEY);
  try { state.watch = JSON.parse((window.RadarStorage ? RadarStorage.read(localStorage, WATCH_KEY, [WATCH_KEY_LEGACY]) : localStorage.getItem(WATCH_KEY)) || '{}') || {}; } catch (e) { state.watch = {}; }
  function saveWatch() { try { localStorage.setItem(WATCH_KEY, JSON.stringify(state.watch)); } catch (e) { toast('Could not save the watchlist (browser storage is blocked).'); } }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node test.js`

Expected: `all radars tests passed`

- [ ] **Step 5: Commit**

```bash
git add national/app.js national/v6.js national/test-v6.js texas/app.js texas/test.js shared/test-storage.js
git commit -m "feat: namespace National and Texas device keys with copy-forward migration"
```

---

### Task 7: Shared filter-set module; v6 delegates to it

**Files:**
- Create: `shared/filters.js`
- Create: `shared/test-filters.js`
- Modify: `national/v6.js` (delegate set/tag helpers)
- Modify: `national/index.html` (load `shared/filters.js` before `v6.js`)
- Modify: `texas/index.html` (load `shared/filters.js` so the module is in both apps; do not change the Texas filter UI in this task)
- Modify: `national/sw.js` (precache `../shared/filters.js` — or leave this to Task 8 if you bump the cache only once there; if you add the script now, also add it to `FILES` so offline loads do not break)

**Interfaces:**
- Consumes: `RadarStorage` from Task 1
- Produces: `RadarFilters` with:
  - `keyFor(app)` → `'national.filtersets'` or `'texas.filtersets'`
  - `legacyFor(app)` → `'nr.filtersets'` for `'national'`, `null` otherwise
  - `MAX_SETS = 30`
  - `clean`, `snapshot`, `load(ls, app)`, `save(ls, app, sets)`, `upsert`, `remove`, `applyTo`, `merge`, `activeTags`, `removeTag` — same behavior as today's `national/v6.js` helpers (including `activeTags` / `removeTag` argument shapes)
- `NRV6.load(ls)` becomes `RadarFilters.load(ls, 'national')` (and the same for `save`). `NRV6.KEY` stays `'national.filtersets'` so `national/test-v6.js` can keep asserting the key name. Work-type / due-within (`WORK`, `DUE`, `extra`, `workOf`, `workLabel`) stay in `v6.js`.

- [ ] **Step 1: Write the failing tests**

Create `shared/test-filters.js` by adapting the saved-set and tag tests from `national/test-v6.js` so they call `RadarFilters` with `app: 'national'` and, separately, `app: 'texas'` (texas key is `texas.filtersets`, no legacy). Include: snapshot/upsert/apply/delete, corrupt JSON → `[]`, merge by name, per-app isolation (saving a National set does not appear in `RadarFilters.load(ls, 'texas')`), and `nr.filtersets` copy-forward for National only.

- [ ] **Step 2: Run test to verify it fails**

Run: `node shared/test-filters.js`

Expected: FAIL, module not found.

- [ ] **Step 3: Implement `shared/filters.js` and delegate from `v6.js`**

Move the set/tag function bodies from `v6.js` into `shared/filters.js` (UMD, uses `RadarStorage`). Keep a thin wrapper in `v6.js`:

```javascript
function filters() { return (typeof module === 'object' && module.exports) ? require('../shared/filters.js') : root.RadarFilters; }
function load(ls) { return filters().load(ls, 'national'); }
function save(ls, sets) { return filters().save(ls, 'national', sets); }
```

Wire `clean`, `snapshot`, `upsert`, `remove`, `applyTo`, `merge`, `activeTags`, `removeTag` the same way (pass-through). Load `../shared/filters.js` in National HTML after `theme.js` and before `v6.js`. Load it in Texas HTML after `theme.js` as well.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node shared/test-filters.js && node national/test-v6.js && node test.js`

Expected: all passed.

- [ ] **Step 5: Commit**

```bash
git add shared/filters.js shared/test-filters.js national/v6.js national/index.html texas/index.html national/sw.js
git commit -m "feat(shared): add filter-set module and delegate National v6 saved sets to it"
```

---

### Task 8: Shared chrome CSS, Home button move, load errors, desktop hooks

**Files:**
- Create: `shared/shell.css`
- Modify: `national/index.html`, `texas/index.html`, `index.html`
- Delete: `home-btn.css` after references move
- Modify: `national/sw.js`, `sw.js` (replace `../home-btn.css` / add `shared/shell.css` — full cache list lands in Task 9 if you prefer one cache bump)
- Modify: any test that mentions `home-btn.css` (`scripts/check-pwa.js` only if the landing SW precaches it; grep first)

**Interfaces:**
- Consumes: none
- Produces: `.homebtn` rules (exactly the current `home-btn.css` contents) plus:

```css
/* Hooks for the phase-2 two-column desktop layout. No markup changes required in this phase. */
@media (min-width: 900px) {
  .lgrid, .shell-lgrid { display: grid; grid-template-columns: minmax(220px, 34%) 1fr; gap: 16px; align-items: start; }
}
```

National already uses `.lgrid`. Do not change the Texas map layout in this task.

Also add a shared on-page load-error helper as a 10-line inline script in each of the three HTML files, in `<head>`:

```html
<script>
window.RadarLoadError=function(name){
  if(document.getElementById('radar-load-error'))return;
  var p=document.createElement('p');
  p.id='radar-load-error';p.setAttribute('role','alert');
  p.textContent='This page failed to load a required file ('+name+'). Check your connection and refresh.';
  function put(){document.body?document.body.insertBefore(p,document.body.firstChild):document.addEventListener('DOMContentLoaded',put);}
  put();
};
</script>
```

Add `onerror="RadarLoadError(this.src||this.href)"` to every shared `<script>` and `<link rel="stylesheet">` for files under `shared/`.

- [ ] **Step 1: Write the failing tests**

Add to `shared/test-theme.js` or a new `shared/test-shell.js`:

```javascript
const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
assert.ok(fs.existsSync(path.join(root, 'shared/shell.css')));
assert.ok(!fs.existsSync(path.join(root, 'home-btn.css')), 'root home-btn.css is removed');
const css = fs.readFileSync(path.join(root, 'shared/shell.css'), 'utf8');
assert.ok(/\.homebtn/.test(css));
assert.ok(/@media \(min-width: 900px\)/.test(css) && /\.lgrid/.test(css));
for (const rel of ['national/index.html', 'texas/index.html', 'index.html']) {
  const html = fs.readFileSync(path.join(root, rel), 'utf8');
  assert.ok(html.includes('shared/shell.css'), rel + ' loads shell.css');
  assert.ok(!html.includes('home-btn.css'), rel + ' does not load home-btn.css');
  assert.ok(html.includes('RadarLoadError'), rel + ' defines a load-error hook');
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node shared/test-shell.js` (or the file you added the assertions to)

Expected: FAIL because `shared/shell.css` does not exist and HTML still links `home-btn.css`.

- [ ] **Step 3: Implement**

Create `shared/shell.css` with the current `home-btn.css` plus the desktop hook and a small `.throw [data-theme-set]` rule (min-height 44px, `.on` state). Point all three HTML files at `shared/shell.css` (National/Texas: `../shared/shell.css`; landing: `shared/shell.css`). Insert the `RadarLoadError` snippet and `onerror` attributes. Delete `home-btn.css`. Update SW file lists and any check that required `home-btn.css`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node test.js` and the new shell assertions.

Expected: all passed, including `scripts/check-paths.js` and `scripts/check-pwa.js`.

- [ ] **Step 5: Commit**

```bash
git add shared/shell.css shared/test-shell.js national/index.html texas/index.html index.html national/sw.js sw.js home-btn.css scripts/check-pwa.js
git commit -m "feat(shared): move Home button CSS into the shell and add load-error plus desktop hooks"
```

---

### Task 9: Shared PWA cache list and Texas service worker

**Files:**
- Create: `shared/cache.js`
- Create: `shared/test-cache.js`
- Modify: `national/sw.js`, `sw.js`
- Create: `texas/sw.js`
- Modify: `texas/app.js` or `texas/index.html` (register the SW the same way National does: HTTPS or localhost only, `navigator.serviceWorker.register('sw.js')`)
- Modify: `texas/index.html` if registration lives there
- Modify: `scripts/check-pwa.js` only if landing precache assertions need the new shared files

**Interfaces:**
- Consumes: none
- Produces: `RadarCache` with:
  - `VERSION = 22` (National is on `radars-national-v21` today; bump once here)
  - `files(app)` where `app` is `'national' | 'texas' | 'home'`
  - National prefix stays `radars-national-` and the cache name is `'radars-national-v' + VERSION`
  - Texas prefix `radars-texas-` and `'radars-texas-v' + VERSION`
  - Home prefix stays `radars-home-` and `'radars-home-v' + VERSION` (home is `v1` today)

Each service worker starts with `importScripts` of `../shared/cache.js` (home: `./shared/cache.js`), then:

```javascript
var CACHE = RadarCache.name('national'); // or 'texas' / 'home'
var FILES = RadarCache.files('national');
```

`RadarCache.name(app)` returns the full cache string above. `files('national')` must include every file National caches today, with `./capture.js` and `../home-btn.css` already replaced by `../shared/capture.js` and `../shared/shell.css`, plus `../shared/storage.js`, `../shared/theme.js`, `../shared/filters.js`, `../shared/cache.js`. `files('texas')` lists Texas's static files (`./`, `./index.html`, `./style.css`, `./magazine.css`, `./app.js`, `./model.js`, `./map.js`, `./intel.js`, `./intel-ui.js`, `./newsletter.js`, `./magazine.js`, `./texas-geo.js`, `./data/opportunities.json`, manifest and icons, and the shared files). `files('home')` is the current home list plus shared landing files. Keep today's fetch policy: National stays network-first; home stays stale-while-revalidate and still must not handle `national/` or `texas/` URLs.

- [ ] **Step 1: Write the failing tests**

Create `shared/test-cache.js` that:
- Requires `./cache.js`
- Asserts `VERSION === 22` and `name('national') === 'radars-national-v22'`
- Asserts each `files(app)` entry exists on disk (resolve relative to that app directory; `'./'` means `index.html`)
- Asserts shared files appear in all three lists
- Reads each `sw.js` and asserts it `importScripts` `shared/cache.js`, uses `RadarCache.name` / `RadarCache.files`, and does not hard-code an older National cache such as `radars-national-v21`
- Asserts Texas `app.js` or `index.html` registers `sw.js`

- [ ] **Step 2: Run test to verify it fails**

Run: `node shared/test-cache.js`

Expected: FAIL, module not found or SWs not wired.

- [ ] **Step 3: Implement `shared/cache.js` and the three service workers**

Implement `RadarCache` as UMD. Rewrite `national/sw.js` and `sw.js` to import it and use `FILES` / `CACHE` from it; keep their existing install/activate/fetch logic, including National's `radars-national-` prefix filter on delete and home's `radars-home-` prefix filter. Create `texas/sw.js` as a copy of National's network-first worker, with prefix `radars-texas-`. Register it from Texas at startup.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node shared/test-cache.js && node scripts/check-pwa.js && node test.js`

Expected: all passed. Update `national/test-v6.js` if it still asserts `/radars-national-v2[1-9]/` and `'./v6.js'` only — it should still pass on v22, but change the SW assertion if it looks for `'./capture.js'` or `home-btn.css`.

- [ ] **Step 5: Commit**

```bash
git add shared/cache.js shared/test-cache.js national/sw.js sw.js texas/sw.js texas/app.js texas/index.html scripts/check-pwa.js national/test-v6.js
git commit -m "feat(shared): centralize PWA cache lists and add a Texas service worker"
```

---

### Task 10: Root test runner and CI workflow

**Files:**
- Modify: `test.js`
- Create: `.github/workflows/test.yml`

**Interfaces:**
- Consumes: all `shared/test-*.js` files from earlier tasks
- Produces: `node test.js` syntax-checks `shared/` as well as `.`, `national`, and `texas`, and runs every `shared/test-*.js` before the existing national/texas/path/pwa/workflow checks. A new workflow runs `node test.js` on `pull_request` and on `push` to `main`. Do not change `refresh-national.yml`, `refresh-opportunities.yml`, or `publish-newsletter.yml`.

- [ ] **Step 1: Write the failing checks**

Change `test.js` to:

```javascript
// Runs every check: node test.js
const { execFileSync } = require('child_process');
const fs = require('fs'), path = require('path');
for (const d of ['.', 'shared', 'national', 'texas']) {
  if (!fs.existsSync(path.join(__dirname, d))) continue;
  for (const f of fs.readdirSync(path.join(__dirname, d))) {
    if (/\.js$/.test(f)) execFileSync(process.execPath, ['--check', path.join(__dirname, d, f)], { stdio: 'inherit' });
  }
}
console.log('syntax ok');
const sharedTests = fs.readdirSync(path.join(__dirname, 'shared')).filter((f) => /^test-.*\.js$/.test(f)).sort().map((f) => 'shared/' + f);
for (const f of sharedTests.concat(['national/test.js', 'texas/test.js', 'scripts/check-paths.js', 'scripts/check-pwa.js', 'scripts/check-workflows.js'])) {
  console.log('> node ' + f);
  execFileSync(process.execPath, [f], { stdio: 'inherit', cwd: __dirname });
}
console.log('all radars tests passed');
```

Add `.github/workflows/test.yml`:

```yaml
name: Tests
on:
  pull_request:
  push:
    branches: [main]
permissions:
  contents: read
jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - name: Run tests
        run: node test.js
```

If `actions/checkout@v5` is not available in this repo's Actions environment, use `@v4` and still pin Node 22. Do not edit `scripts/check-workflows.js`; it only asserts the refresh workflows.

- [ ] **Step 2: Run the suite**

Run: `node test.js`

Expected: syntax ok, every `shared/test-*.js` runs, then the existing checks, then `all radars tests passed`.

(This task is a runner change, so a "fail first" step is the missing `shared/` loop. After Step 1 the suite should already pass if Tasks 1–9 are done. If a shared test was not wired, this is what surfaces it.)

- [ ] **Step 3: Confirm path and PWA checks still pass as part of that run**

Expected: `check-paths ok` and `check-pwa ok` appear in the `node test.js` output.

- [ ] **Step 4: Commit**

```bash
git add test.js .github/workflows/test.yml
git commit -m "ci: run the full Node test suite on pull requests and main"
```

---

## Self-review (spec coverage)

| Spec requirement | Task |
|---|---|
| `shared/` folder, vanilla JS, no bundler, script-tag order | 3, 4, 7, 8, 9 |
| Theme is one product key; applied before first paint; Day / Night / Auto | 2, 3 |
| Stars, capture, saved filters, last view are per-app | 6, 7 |
| Existing keys and backups migrate once; old keys not deleted | 1, 5, 6 |
| Capture moves to `shared/capture.js` | 4 |
| Backup version field, per-app identity, bad file does not clobber | 5 (clobber already prevented by `parseBackup` + existing restore flow) |
| Shared CSS / Home button / desktop hooks, no phase-2 layout | 8 |
| Load-error on-page message | 8 |
| Shared cache version + file list; each SW includes it | 9 |
| Texas SW added so both apps can use the helper | 9 |
| `node test.js` stays the runner; shared tests added | 10 |
| Test workflow on PRs and `main` | 10 |
| No data-refresh changes; hydraulics-tools untouched; no combined backup; no URL or repo links on live pages | Global constraints, no task edits those |
| Leftover v2/v4/v6 modules remain until unused | v6 kept for work/due; not deleted |

No placeholders remain in the tasks above. Names (`RadarStorage`, `RadarTheme`, `RadarFilters`, `RadarCapture`, `RadarCache`, `radars.theme`, `national.*`, `texas.watch`, backup ids `radars-national` / `radars-texas`) are consistent across tasks.
