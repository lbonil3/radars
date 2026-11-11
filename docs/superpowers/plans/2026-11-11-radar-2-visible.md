# Radar 2.0 Visible 2.0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Put National Radar and Texas Opportunity on one shared desktop-leading shell: at 1024px and wider, a list with a small map beside it and details docked in the right column; below 1024px, the phone layout as today. Texas gains List-first navigation, Pursuits with the weekly list, and saved filter sets. National's Map tab gains the PR #19 map tools. Data collection does not change.

**Architecture:** `shared/shell.js` (`RadarShell`) owns tabs, the More menu, last-view memory (`<app>.tab` through `RadarStorage`), the Filters drawer and the detail panel or sheet. `shared/shell.css` owns the one 1024px two-column layout through `.shell-*` classes. Each app keeps its own data, cards, map and accent, and calls the shell. The weekly list moves to `shared/weekly.js` (`RadarWeekly`) so both apps use it. Texas filter sets go through `RadarFilters` with `app: 'texas'`. National's map helpers are a DOM-free port in `national/mapview.js` (`NationalMapView`). The Map-tab interactions stay in `national/app.js`, and the map colors come from theme tokens. All modules are vanilla UMD (browser global plus `module.exports`), with no bundler.

**Tech Stack:** Vanilla JavaScript, HTML and CSS, no dependencies, Node 18+ for tests (`node test.js`), GitHub Pages, GitHub Actions (existing Tests workflow). Review screenshots use Python Playwright with Chrome, outside the repo, and are not part of CI.

## Global Constraints

- Vanilla JS, no build step, no new dependencies
- GitHub Pages from `main` at [https://lbonil3.github.io/radars/](https://lbonil3.github.io/radars/)
- Routes `/national/` and `/texas/` stay as they are
- Live pages carry no links to the repository
- No relative path may escape the repo (`scripts/check-paths.js` stays in force)
- Backups stay per app; there is no combined National-and-Texas backup file
- Migration never deletes user data
- When a shipped file changes, bump `RadarCache.VERSION` and include any new shared or app files in `RadarCache.files`

## File structure

| File | Responsibility |
|---|---|
| `shared/shell.js` | `RadarShell`: tabs and More menu, `<app>.tab` memory, Filters drawer, detail panel (desktop) or sheet (phone), map-failure guard, no-location label (new, Task 1) |
| `shared/test-shell-controller.js` | `RadarShell` tests against a fake document, storage and media query (new, Task 1) |
| `shared/shell.css` | Home button plus the 1024px two-column shell, drawer, scrim, docked detail (Task 2). Pursuits header and weekly sheet CSS (moved, Task 5). Filter tags and sets CSS (moved, Task 8) |
| `shared/test-shell.js` | CSS checks: breakpoint equals `RadarShell.QUERY`, no 900px / `.lgrid`, no accent (rewritten, Task 2) |
| `shared/weekly.js` | `RadarWeekly`: weekly-list builders, `.ics`, the weekly sheet controller (new, moved from `national/weekly.js`, Task 5) |
| `shared/test-weekly.js` | Weekly builders and sheet for National and Texas (new, Task 5; Texas names in Task 7) |
| `shared/filters.js` | Adds the Texas filter shape and app-aware entry points (Task 8) |
| `shared/cache.js` | SHARED list gains `shell.js` (Task 1) and `weekly.js` (Task 5); National list gains `./mapview.js` (Task 9) and loses `./weekly.js` (Task 5); `VERSION` 22 to 23 (Task 11) |
| `national/index.html`, `national/app.js`, `national/style.css` | National on the shell (Task 3), dormant code out (Task 4), shared weekly (Task 5), filter CSS moved (Task 8), map helpers loaded (Task 9), Map tab tools and tokens (Task 10) |
| `national/test-shell.js` | National shell wiring (new, Task 3) |
| `national/test-dormant.js` | Explicit unused check for the removed National code (new, Task 4) |
| `national/mapview.js` | `NationalMapView` pure map helpers (new, Task 9; `nextSelection` in Task 10) |
| `national/test-mapview.js` | Ported PR #19 helper tests plus sizing, 1040 view, shading, selection (new, Task 9) |
| `national/test-maptools.js` | Map tab wiring and theme-token checks (new, Task 10) |
| `national/weekly.js`, `national/test-weekly.js` | Deleted (Task 5) |
| `texas/index.html`, `texas/app.js`, `texas/style.css` | Texas on the shell (Task 6), Pursuits (Task 7), filter sets and tags (Task 8) |
| `texas/test-shell.js`, `texas/test-pursuits.js`, `texas/test-filtersets.js` | Texas shell, Pursuits, filter-set wiring (new, Tasks 6, 7, 8) |
| `README.md`, `national/README.md`, `texas/README.md` | Radar 2.0 layout notes (Task 11) |

## Before you start

- [ ] **Check out the base and create the branch.** The base is `cursor/radar-2-foundation-design-spec-779b` (PR #1), at `af9dd83a308437f25ace97f656d07e0bcfe9e3f4` when this plan was written:

```bash
git fetch origin
git checkout -b cursor/radar-2-visible-2-0 origin/cursor/radar-2-foundation-design-spec-779b
git log -1 --format=%H    # expect af9dd83a308437f25ace97f656d07e0bcfe9e3f4
node test.js              # expect the last line: all radars tests passed
```

If the head is not `af9dd83a308437f25ace97f656d07e0bcfe9e3f4` (PR #1 moved), stop and tell Luis before applying the patches. They were checked against that commit, and `git apply --check` shows whether they still fit.

- [ ] **Commit the spec and this plan to the branch** (docs only):

```bash
mkdir -p docs/superpowers/specs docs/superpowers/plans
cp <spec>/2026-11-11-radar-2-visible-design.md docs/superpowers/specs/
cp <plan>/2026-11-11-radar-2-visible.md docs/superpowers/plans/
git add docs/superpowers && git commit -m "docs: Radar 2.0 visible 2.0 spec and implementation plan"
```

Here `<spec>` and `<plan>` are the folders the two documents were handed over in.

- [ ] **How to apply the code in each task.** Every code step is a complete `git apply` patch: new files appear in full, and every changed line is shown with its context. Save the block exactly as shown, without the fence lines, to the file named in the step, then run the command in that step. `--whitespace=nowarn` is there only because some existing lines are very long. If `git apply --check` fails, stop. Do not hand-edit around it.

- [ ] **Create the review screenshot tool once, outside the repo**, at `/tmp/radar-shots.py`. It is not a repo file, not a dependency, and not run in CI. It needs `pip install playwright` and uses Google Chrome, or Playwright's Chromium after `python3 -m playwright install chromium`. It serves the working tree locally, blocks service workers, loads each page at desktop 1280x800 and phone 390x844, optionally clicks a tab, saves `<page>[-<tab>]-desktop.png` and `-phone.png`, and exits 1 if any page logs a console error or page error:

```python
# Review screenshots for Radar 2.0 (scratch tool, not a repo file).
# Needs Python Playwright outside the repo (pip install playwright). Not a repo dependency, not run in CI.
# Usage: python3 shots.py <repo dir> <out dir> <page> [<page> ...]   pages: national texas home, or national:map / texas:pursuits to open a tab
import sys, os, threading, functools, http.server, socketserver
from playwright.sync_api import sync_playwright
root, out, pages = sys.argv[1], sys.argv[2], sys.argv[3:]
os.makedirs(out, exist_ok=True)
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
H = functools.partial(Quiet, directory=root)
srv = socketserver.TCPServer(('127.0.0.1', 0), H); port = srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()
SIZES = {'desktop': (1280, 800), 'phone': (390, 844)}
bad = 0
with sync_playwright() as p:
    try: b = p.chromium.launch(channel='chrome')   # the box's Google Chrome
    except Exception: b = p.chromium.launch()        # or: python3 -m playwright install chromium
    for spec in pages:
        app, _, tab = spec.partition(':')
        url = 'http://127.0.0.1:%d/%s' % (port, '' if app == 'home' else app + '/')
        for name, (w, h) in SIZES.items():
            ctx = b.new_context(viewport={'width': w, 'height': h}, service_workers='block')
            pg = ctx.new_page(); errs = []
            pg.on('pageerror', lambda e: errs.append(str(e)))
            pg.on('console', lambda m: m.type == 'error' and errs.append(m.text))
            pg.goto(url); pg.wait_for_timeout(2500)
            if tab:
                pg.evaluate("t => { const b = document.querySelector('.tabs [data-tab=\"' + t + '\"]'); if (b) b.click(); }", tab); pg.wait_for_timeout(800)
            f = os.path.join(out, '%s%s-%s.png' % (app, '-' + tab if tab else '', name))
            pg.screenshot(path=f)
            print(f, 'errors:', errs if errs else 'none'); bad += len(errs)
            ctx.close()
    b.close()
srv.shutdown()
sys.exit(1 if bad else 0)
```

Each task's review step runs it like this: `python3 /tmp/radar-shots.py . /tmp/radar-shots/task-NN <pages...>`. The expected output is one line per image ending in `errors: none`, and exit code 0. Send the images to Luis and wait for his OK before starting the next task.


### Task 1: Shared shell controller (`shared/shell.js`)

**Files:**
- Create: `shared/shell.js`, `shared/test-shell-controller.js`
- Modify: `shared/cache.js`, `shared/test-cache.js`

**Interfaces:**
- Consumes: `RadarStorage` (`read`, `write`, `migrateCopy`) from `shared/storage.js`; a document root, a `localStorage`-like object and a `matchMedia` result passed in.
- Produces: `window.RadarShell` / `module.exports` with `BREAKPOINT` (1024), `QUERY` (`'(min-width: 1024px)'`), `MAP_FAIL_TEXT`, `tabKey(app)` (`national.tab` / `texas.tab`), `restoreTab(ls, app, allowed, legacyKeys)` (List when nothing valid is stored), `guardMap(doc, noteId, fn, hideId)`, `noLocLabel(n)`, and `bind(opts)`.
- `bind(opts)` options: `app`, `doc`, `ls`, `media`, `tabs`, `more`, `labels`, `cols`, `legacyTabKeys`, `onDetailClose`, `onTab`. Returns `{ app, initial, showTab, current, openDetail, closeDetail({ silent }), isDetailOpen, openFilters, closeFilters, isFiltersOpen, isDesktop, setMore }`. It also wires `#tabMoreBtn`, a capture-phase outside click that closes More, `#btnMore` / `#advClose` / `#advBg`, Escape, and a media change that re-docks the detail.
- `RadarCache` SHARED list gains `shell.js` after `filters.js` (no page loads it yet).

- [ ] **Step 1: Write the failing tests**

Save as `/tmp/radar2-task01-tests.patch` (test files only: `shared/test-cache.js`, `shared/test-shell-controller.js`), then run `git apply --whitespace=nowarn /tmp/radar2-task01-tests.patch`.

```diff
diff --git a/shared/test-cache.js b/shared/test-cache.js
--- a/shared/test-cache.js
+++ b/shared/test-cache.js
@@ -14,7 +14,7 @@ function appDir(app) {
   if (app === 'texas') return path.join(root, 'texas');
   return root;
 }
-const sharedNames = ['storage.js', 'theme.js', 'filters.js', 'capture.js', 'shell.css', 'cache.js'];
+const sharedNames = ['storage.js', 'theme.js', 'filters.js', 'shell.js', 'capture.js', 'shell.css', 'cache.js'];
 for (const app of ['national', 'texas', 'home']) {
   const list = C.files(app);
   assert.ok(Array.isArray(list) && list.length, app + ' file list');
diff --git a/shared/test-shell-controller.js b/shared/test-shell-controller.js
new file mode 100644
--- /dev/null
+++ b/shared/test-shell-controller.js
@@ -0,0 +1,167 @@
+// Shared shell controller (tabs, More, last view, filter drawer, detail panel / sheet). Run: node shared/test-shell-controller.js
+const assert = require('assert');
+const Shell = require('./shell.js');
+
+function mem(map) {
+  const o = { map: Object.assign({}, map) };
+  o.getItem = function (k) { return Object.prototype.hasOwnProperty.call(this.map, k) ? this.map[k] : null; };
+  o.setItem = function (k, v) { this.map[k] = String(v); };
+  o.removeItem = function (k) { delete this.map[k]; };
+  return o;
+}
+// Minimal DOM: just what shell.js touches (ids, hidden, classList, attributes, parent/child moves, listeners).
+function el(id, attrs) {
+  const e = { id: id, hidden: false, attrs: Object.assign({}, attrs || {}), children: [], parentNode: null, style: {}, textContent: '', listeners: {} };
+  const cls = new Set();
+  e.classList = { add: (c) => cls.add(c), remove: (c) => cls.delete(c), contains: (c) => cls.has(c), toggle: (c, v) => { const on = v === undefined ? !cls.has(c) : !!v; if (on) cls.add(c); else cls.delete(c); return on; } };
+  e.setAttribute = (k, v) => { e.attrs[k] = String(v); };
+  e.getAttribute = (k) => (k in e.attrs ? e.attrs[k] : null);
+  e.removeAttribute = (k) => { delete e.attrs[k]; };
+  e.appendChild = (c) => { if (c.parentNode) c.parentNode.children = c.parentNode.children.filter((x) => x !== c); c.parentNode = e; e.children.push(c); return c; };
+  e.addEventListener = (t, fn) => { (e.listeners[t] = e.listeners[t] || []).push(fn); };
+  e.fire = (t, ev) => (e.listeners[t] || []).forEach((fn) => fn(Object.assign({ target: e, stopPropagation() {}, preventDefault() {} }, ev || {})));
+  e.focus = () => { e.doc.activeElement = e; };
+  e.closest = (sel) => { for (let n = e; n; n = n.parentNode) if (sel.split(',').some((s) => s.trim() === '#' + n.id)) return n; return null; };
+  return e;
+}
+function makeDoc(viewIds, colsIds) {
+  const doc = { listeners: {}, activeElement: null };
+  const body = el('body'); body.doc = doc; doc.body = body;
+  const byId = {};
+  const add = (e, parent) => { e.doc = doc; byId[e.id] = e; (parent || body).appendChild(e); return e; };
+  viewIds.forEach((v) => { const view = add(el('v-' + v)); if (colsIds[v]) add(el(colsIds[v]), view); });
+  ['tabMore', 'tabMoreBtn', 'tabMoreLbl', 'adv', 'advBg', 'advClose', 'btnMore', 'sheet', 'mapFail', 'mapWrap'].forEach((id) => add(el(id)));
+  byId.tabMore.hidden = true; byId.adv.hidden = true; byId.advBg.hidden = true; byId.sheet.hidden = true;
+  const tabs = viewIds.map((v) => { const b = el('tab-' + v, { 'data-tab': v }); b.doc = doc; return b; });
+  doc.getElementById = (id) => byId[id] || null;
+  doc.querySelectorAll = (sel) => (sel === '.tabs [data-tab]' ? tabs : []);
+  doc.addEventListener = (t, fn) => { (doc.listeners[t] = doc.listeners[t] || []).push(fn); };
+  doc.fire = (t, ev) => (doc.listeners[t] || []).forEach((fn) => fn(Object.assign({ stopPropagation() {}, preventDefault() {} }, ev || {})));
+  doc.tabs = tabs;
+  return doc;
+}
+function media(matches) { const m = { matches: matches, fns: [] }; m.addEventListener = (t, fn) => m.fns.push(fn); m.set = (v) => { m.matches = v; m.fns.forEach((fn) => fn({ matches: v })); }; return m; }
+
+assert.strictEqual(Shell.BREAKPOINT, 1024);
+assert.strictEqual(Shell.QUERY, '(min-width: 1024px)');
+assert.strictEqual(Shell.tabKey('national'), 'national.tab');
+assert.strictEqual(Shell.tabKey('texas'), 'texas.tab');
+
+// ---- tab memory: first visit opens List; a later visit restores the last view, Map included
+const NAT = { tabs: ['list', 'map', 'pursuits'], more: ['timeline', 'break', 'data'], labels: { timeline: 'Timeline', break: 'Breakdown', data: 'Data' }, cols: { list: 'colsList', map: 'colsMap' } };
+const views = NAT.tabs.concat(NAT.more);
+assert.strictEqual(Shell.restoreTab(mem({}), 'national', views, ['nr.tab']), 'list', 'first visit => List');
+assert.strictEqual(Shell.restoreTab(mem({ 'national.tab': 'map' }), 'national', views, ['nr.tab']), 'map', 'Map is restored too');
+assert.strictEqual(Shell.restoreTab(mem({ 'national.tab': 'radar' }), 'national', views, []), 'list', 'unknown view => List');
+const legacy = mem({ 'nr.tab': 'pursuits' });
+assert.strictEqual(Shell.restoreTab(legacy, 'national', views, ['nr.tab']), 'pursuits');
+assert.strictEqual(legacy.getItem('national.tab'), 'pursuits', 'legacy key copied forward');
+assert.strictEqual(legacy.getItem('nr.tab'), 'pursuits', 'legacy key never deleted');
+const blocked = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
+assert.strictEqual(Shell.restoreTab(blocked, 'national', views, ['nr.tab']), 'list', 'blocked storage => List, no throw');
+
+// ---- bind + showTab: views, tab bar, More label, storage
+let ls = mem({}), doc = makeDoc(views, NAT.cols), mq = media(true), seen = [];
+let sh = Shell.bind(Object.assign({ app: 'national', doc: doc, ls: ls, media: mq, onTab: (id) => seen.push(id) }, NAT));
+assert.strictEqual(sh.initial, 'list');
+assert.strictEqual(sh.showTab('map'), 'map');
+assert.strictEqual(ls.getItem('national.tab'), 'map');
+assert.ok(doc.getElementById('v-list').hidden && !doc.getElementById('v-map').hidden, 'only the Map view shows');
+assert.ok(doc.tabs[1].classList.contains('on') && doc.tabs[1].getAttribute('aria-current') === 'page');
+assert.ok(!doc.tabs[0].classList.contains('on') && doc.tabs[0].getAttribute('aria-current') === 'false');
+sh.showTab('break');
+assert.ok(doc.getElementById('tabMoreBtn').classList.contains('on'), 'More highlights for a view inside it');
+assert.strictEqual(doc.getElementById('tabMoreLbl').textContent, 'Breakdown');
+sh.showTab('nope');
+assert.strictEqual(sh.current(), 'list', 'unknown id => List');
+assert.strictEqual(doc.getElementById('tabMoreLbl').textContent, '');
+assert.deepStrictEqual(seen, ['map', 'break', 'list']);
+assert.strictEqual(doc.body.getAttribute('data-shell-tab'), 'list');
+sh.showTab('timeline', { save: false });
+assert.strictEqual(ls.getItem('national.tab'), 'list', 'save:false leaves the stored view alone');
+const ls2 = mem({ 'national.tab': 'data' });
+assert.strictEqual(Shell.bind(Object.assign({ app: 'national', doc: makeDoc(views, NAT.cols), ls: ls2, media: mq }, NAT)).initial, 'data', 'bind restores the last view');
+
+// ---- Texas writes texas.tab and never touches National's key
+const TX = { tabs: ['list', 'map', 'pursuits', 'intel'], more: ['timeline', 'agencies', 'sources'], labels: { timeline: 'Timeline', agencies: 'Agencies', sources: 'Sources' }, cols: { list: 'colsList', map: 'colsMap' } };
+const shared = mem({ 'national.tab': 'map' });
+const tx = Shell.bind(Object.assign({ app: 'texas', doc: makeDoc(TX.tabs.concat(TX.more), TX.cols), ls: shared, media: mq }, TX));
+assert.strictEqual(tx.initial, 'list', 'Texas first visit => List, not National\'s stored Map');
+tx.showTab('intel');
+assert.strictEqual(shared.getItem('texas.tab'), 'intel');
+assert.strictEqual(shared.getItem('national.tab'), 'map', 'National key untouched');
+
+// ---- More menu: button toggles, outside click and Escape close it
+doc.getElementById('tabMoreBtn').fire('click');
+assert.ok(!doc.getElementById('tabMore').hidden && doc.getElementById('tabMoreBtn').getAttribute('aria-expanded') === 'true');
+doc.fire('click', { target: doc.getElementById('v-list') });
+assert.ok(doc.getElementById('tabMore').hidden, 'outside click closes More');
+doc.getElementById('tabMoreBtn').fire('click');
+doc.fire('keydown', { key: 'Escape' });
+assert.ok(doc.getElementById('tabMore').hidden, 'Escape closes More');
+
+// ---- filter drawer from the right: open, Close, scrim, Escape
+doc.getElementById('btnMore').fire('click');
+assert.ok(!doc.getElementById('adv').hidden && !doc.getElementById('advBg').hidden && sh.isFiltersOpen());
+assert.ok(doc.getElementById('adv').classList.contains('shell-drawer-open'));
+assert.strictEqual(doc.getElementById('btnMore').getAttribute('aria-expanded'), 'true');
+assert.strictEqual(doc.activeElement, doc.getElementById('advClose'), 'focus moves into the drawer');
+doc.getElementById('advClose').fire('click');
+assert.ok(doc.getElementById('adv').hidden && doc.getElementById('advBg').hidden && !sh.isFiltersOpen());
+assert.strictEqual(doc.activeElement, doc.getElementById('btnMore'), 'focus returns to Filters');
+sh.openFilters(); doc.getElementById('advBg').fire('click'); assert.ok(!sh.isFiltersOpen(), 'scrim closes');
+sh.openFilters(); doc.fire('keydown', { key: 'Escape' }); assert.ok(!sh.isFiltersOpen(), 'Escape closes');
+doc.getElementById('btnMore').fire('click'); doc.getElementById('btnMore').fire('click'); assert.ok(!sh.isFiltersOpen(), 'Filters toggles');
+
+// ---- desktop: details swap the right column of the list view; closing restores it; the list column never moves
+let closed = 0;
+ls = mem({}); doc = makeDoc(views, NAT.cols); mq = media(true);
+sh = Shell.bind(Object.assign({ app: 'national', doc: doc, ls: ls, media: mq, onDetailClose: () => closed++ }, NAT));
+sh.showTab('list');
+const sheet = doc.getElementById('sheet'), colsList = doc.getElementById('colsList'), colsMap = doc.getElementById('colsMap');
+assert.strictEqual(sh.isDesktop(), true);
+assert.strictEqual(sh.openDetail(), true, 'docked on desktop');
+assert.ok(!sheet.hidden && sheet.parentNode === colsList && sheet.classList.contains('shell-docked'));
+assert.ok(colsList.classList.contains('shell-has-detail'), 'right column swapped for details');
+assert.strictEqual(sheet.getAttribute('aria-modal'), 'false');
+assert.strictEqual(doc.body.style.overflow, '', 'desktop panel does not lock page scroll');
+assert.strictEqual(sh.closeDetail(), true);
+assert.ok(sheet.hidden && !colsList.classList.contains('shell-has-detail') && !sheet.classList.contains('shell-docked'), 'map column comes back');
+assert.strictEqual(closed, 1, 'onDetailClose runs once');
+assert.strictEqual(sh.closeDetail(), false, 'closing twice is a no-op'); assert.strictEqual(closed, 1);
+// Map tab: details swap the records column (same right column), map stays
+sh.showTab('map'); sh.openDetail();
+assert.ok(sheet.parentNode === colsMap && colsMap.classList.contains('shell-has-detail') && !colsList.classList.contains('shell-has-detail'));
+// switching tabs closes details silently
+sh.showTab('list'); assert.ok(sheet.hidden && !sh.isDetailOpen()); assert.strictEqual(closed, 1, 'tab switch closes without the callback');
+// views with no two-column layout keep the modal sheet even on desktop
+sh.showTab('pursuits'); assert.strictEqual(sh.openDetail(), false);
+assert.ok(sheet.parentNode === doc.body && sheet.getAttribute('aria-modal') === 'true' && !sheet.classList.contains('shell-docked'));
+sh.closeDetail();
+
+// ---- phone (under 1024px): bottom sheet, modal, body scroll locked
+mq.set(false); sh.showTab('list');
+assert.strictEqual(sh.isDesktop(), false);
+assert.strictEqual(sh.openDetail(), false);
+assert.ok(sheet.parentNode === doc.body && !sheet.hidden && sheet.getAttribute('aria-modal') === 'true');
+assert.strictEqual(doc.body.style.overflow, 'hidden');
+assert.ok(!colsList.classList.contains('shell-has-detail'));
+// crossing the breakpoint while open re-places the details
+mq.set(true);
+assert.ok(sheet.parentNode === colsList && sheet.classList.contains('shell-docked') && doc.body.style.overflow === '');
+sh.closeDetail(); assert.strictEqual(doc.body.style.overflow, '');
+// no media query (old browser) => phone behaviour
+assert.strictEqual(Shell.bind(Object.assign({ app: 'national', doc: makeDoc(views, NAT.cols), ls: mem({}) }, NAT)).isDesktop(), false);
+
+// ---- map failure note and the no-location chip text
+assert.strictEqual(Shell.guardMap(doc, 'mapFail', () => {}, 'mapWrap'), true);
+assert.ok(doc.getElementById('mapFail').hidden && !doc.getElementById('mapWrap').hidden);
+assert.strictEqual(Shell.guardMap(doc, 'mapFail', () => { throw new Error('boom'); }, 'mapWrap'), false);
+assert.ok(!doc.getElementById('mapFail').hidden && doc.getElementById('mapWrap').hidden);
+assert.strictEqual(doc.getElementById('mapFail').textContent, Shell.MAP_FAIL_TEXT);
+assert.ok(/list and record details still work/.test(Shell.MAP_FAIL_TEXT));
+assert.strictEqual(Shell.guardMap(doc, 'missing', () => {}), true, 'missing note id is fine');
+assert.strictEqual(Shell.noLocLabel(0), '');
+assert.strictEqual(Shell.noLocLabel(1), '1 record with no location (in the list, not on the map)');
+assert.strictEqual(Shell.noLocLabel(1234), '1,234 records with no location (in the list, not on the map)');
+console.log('shared shell controller tests passed');
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
node shared/test-cache.js
node shared/test-shell-controller.js
```

Expected:

- `node shared/test-cache.js`: exit 1, with `AssertionError [ERR_ASSERTION]: national lists shared/shell.js`
- `node shared/test-shell-controller.js`: exit 1, with `Error: Cannot find module './shell.js'`

- [ ] **Step 3: Implement**

Save as `/tmp/radar2-task01-impl.patch`, then run `git apply --whitespace=nowarn /tmp/radar2-task01-impl.patch`.

```diff
diff --git a/shared/cache.js b/shared/cache.js
--- a/shared/cache.js
+++ b/shared/cache.js
@@ -5,7 +5,7 @@
 })(typeof self !== 'undefined' ? self : this, function () {
   'use strict';
   var VERSION = 22;
-  var SHARED = ['storage.js', 'theme.js', 'filters.js', 'capture.js', 'shell.css', 'cache.js'];
+  var SHARED = ['storage.js', 'theme.js', 'filters.js', 'shell.js', 'capture.js', 'shell.css', 'cache.js'];
   function shared(prefix) { return SHARED.map(function (f) { return prefix + f; }); }
   function name(app) {
     var prefix = app === 'texas' ? 'radars-texas-' : app === 'home' ? 'radars-home-' : 'radars-national-';
diff --git a/shared/shell.js b/shared/shell.js
new file mode 100644
--- /dev/null
+++ b/shared/shell.js
@@ -0,0 +1,128 @@
+/* Shared app shell for National and Texas: tab bar and More menu, last-view memory (<app>.tab), the Filters drawer,
+   and the details panel (desktop, 1024px and wider) or bottom sheet (phone). Browser + Node, no dependencies.
+   It never fetches records and never draws cards or maps; each app does that and calls these methods. */
+(function (root, factory) {
+  var Storage = (typeof module === 'object' && module.exports) ? require('./storage.js') : root.RadarStorage;
+  var api = factory(Storage);
+  if (typeof module === 'object' && module.exports) module.exports = api; else root.RadarShell = api;
+})(typeof self !== 'undefined' ? self : this, function (Storage) {
+  'use strict';
+  var BREAKPOINT = 1024;
+  var QUERY = '(min-width: 1024px)'; // same value as the @media rule in shared/shell.css
+  var MAP_FAIL_TEXT = 'The map could not be drawn here. The list and record details still work.';
+  function tabKey(app) { return (app === 'texas' ? 'texas' : 'national') + '.tab'; }
+  function restoreTab(ls, app, allowed, legacyKeys) {
+    var key = tabKey(app), legacy = legacyKeys || [];
+    legacy.forEach(function (k) { Storage.migrateCopy(ls, k, key); });
+    var v = Storage.read(ls, key, legacy);
+    return allowed.indexOf(v) >= 0 ? v : 'list';
+  }
+  function guardMap(doc, noteId, fn, hideId) {
+    var note = doc.getElementById(noteId), hide = hideId ? doc.getElementById(hideId) : null;
+    try {
+      fn();
+      if (note) note.hidden = true;
+      if (hide) hide.hidden = false;
+      return true;
+    } catch (e) {
+      if (note) { note.textContent = MAP_FAIL_TEXT; note.hidden = false; }
+      if (hide) hide.hidden = true;
+      return false;
+    }
+  }
+  function noLocLabel(n) {
+    if (!n) return '';
+    return n.toLocaleString('en-US') + ' record' + (n === 1 ? '' : 's') + ' with no location (in the list, not on the map)';
+  }
+  function bind(opts) {
+    var doc = opts.doc, ls = opts.ls, media = opts.media || null, app = opts.app;
+    var more = opts.more || [], all = (opts.tabs || []).concat(more), labels = opts.labels || {}, cols = opts.cols || {};
+    var $ = function (id) { return doc.getElementById(id); };
+    var st = { tab: restoreTab(ls, app, all, opts.legacyTabKeys), detail: false, filters: false };
+    function isDesktop() { return !!(media && media.matches); }
+    function colsFor(id) { return cols[id] ? $(cols[id]) : null; }
+    function setMore(open) {
+      var m = $('tabMore'), b = $('tabMoreBtn');
+      if (m) m.hidden = !open;
+      if (b) b.setAttribute('aria-expanded', String(!!open));
+    }
+    function clearDock() {
+      all.forEach(function (id) { var c = colsFor(id); if (c) c.classList.remove('shell-has-detail'); });
+      var s = $('sheet'); if (s) s.classList.remove('shell-docked');
+      doc.body.classList.remove('shell-docked-open');
+    }
+    function openDetail() {
+      var sheet = $('sheet'); if (!sheet) return false;
+      var c = colsFor(st.tab), dock = isDesktop() && !!c;
+      clearDock();
+      if (dock) {
+        if (sheet.parentNode !== c) c.appendChild(sheet);
+        c.classList.add('shell-has-detail'); sheet.classList.add('shell-docked'); doc.body.classList.add('shell-docked-open');
+        sheet.setAttribute('aria-modal', 'false'); doc.body.style.overflow = '';
+      } else {
+        if (sheet.parentNode !== doc.body) doc.body.appendChild(sheet);
+        sheet.setAttribute('aria-modal', 'true'); doc.body.style.overflow = 'hidden';
+      }
+      sheet.hidden = false; st.detail = true;
+      return dock;
+    }
+    function closeDetail(o) {
+      var sheet = $('sheet'), was = st.detail;
+      if (sheet) sheet.hidden = true;
+      clearDock(); doc.body.style.overflow = ''; st.detail = false;
+      if (was && !(o && o.silent) && opts.onDetailClose) opts.onDetailClose();
+      return was;
+    }
+    function openFilters() {
+      var d = $('adv'), bg = $('advBg'), b = $('btnMore'), c = $('advClose'); if (!d) return;
+      d.hidden = false; d.classList.add('shell-drawer-open'); if (bg) bg.hidden = false;
+      if (b) b.setAttribute('aria-expanded', 'true');
+      st.filters = true; if (c && c.focus) c.focus();
+    }
+    function closeFilters() {
+      var d = $('adv'), bg = $('advBg'), b = $('btnMore'), was = st.filters; if (!d) return;
+      d.hidden = true; d.classList.remove('shell-drawer-open'); if (bg) bg.hidden = true;
+      if (b) b.setAttribute('aria-expanded', 'false');
+      st.filters = false; if (was && b && b.focus) b.focus();
+    }
+    function showTab(id, o) {
+      if (all.indexOf(id) < 0) id = 'list';
+      if (st.detail) closeDetail({ silent: true });
+      st.tab = id;
+      if (!(o && o.save === false)) Storage.write(ls, tabKey(app), id);
+      all.forEach(function (k) { var v = $('v-' + k); if (v) v.hidden = k !== id; });
+      var btns = doc.querySelectorAll('.tabs [data-tab]');
+      for (var i = 0; i < btns.length; i++) { var on = btns[i].getAttribute('data-tab') === id; btns[i].classList.toggle('on', on); btns[i].setAttribute('aria-current', on ? 'page' : 'false'); }
+      var inMore = more.indexOf(id) >= 0, mb = $('tabMoreBtn'), ml = $('tabMoreLbl');
+      if (mb) mb.classList.toggle('on', inMore);
+      if (ml) ml.textContent = inMore ? (labels[id] || id) : '';
+      setMore(false);
+      doc.body.setAttribute('data-shell-tab', id);
+      if (opts.onTab) opts.onTab(id);
+      return id;
+    }
+    var moreBtn = $('tabMoreBtn');
+    if (moreBtn) moreBtn.addEventListener('click', function (e) { if (e && e.stopPropagation) e.stopPropagation(); var m = $('tabMore'); setMore(m ? m.hidden : false); });
+    doc.addEventListener('click', function (e) { var t = e && e.target; if (!(t && t.closest && t.closest('#tabMore,#tabMoreBtn'))) setMore(false); }, true);
+    var fBtn = $('btnMore'), fClose = $('advClose'), fBg = $('advBg');
+    if (fBtn) fBtn.addEventListener('click', function () { if (st.filters) closeFilters(); else openFilters(); });
+    if (fClose) fClose.addEventListener('click', closeFilters);
+    if (fBg) fBg.addEventListener('click', closeFilters);
+    doc.addEventListener('keydown', function (e) {
+      if (!e || e.key !== 'Escape') return;
+      if (st.filters) { closeFilters(); return; }
+      var m = $('tabMore'); if (m && !m.hidden) setMore(false);
+    });
+    if (media) {
+      var onChange = function () { if (st.detail) openDetail(); };
+      if (media.addEventListener) media.addEventListener('change', onChange); else if (media.addListener) media.addListener(onChange);
+    }
+    return {
+      app: app, initial: st.tab, showTab: showTab, current: function () { return st.tab; },
+      openDetail: openDetail, closeDetail: closeDetail, isDetailOpen: function () { return st.detail; },
+      openFilters: openFilters, closeFilters: closeFilters, isFiltersOpen: function () { return st.filters; },
+      isDesktop: isDesktop, setMore: setMore
+    };
+  }
+  return { BREAKPOINT: BREAKPOINT, QUERY: QUERY, MAP_FAIL_TEXT: MAP_FAIL_TEXT, tabKey: tabKey, restoreTab: restoreTab, bind: bind, guardMap: guardMap, noLocLabel: noLocLabel };
+});
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
node shared/test-cache.js
node shared/test-shell-controller.js
node test.js
```

Expected: `shared/test-cache.js` ends with `shared cache tests passed`; `shared/test-shell-controller.js` ends with `shared shell controller tests passed`; `node test.js` ends with `all radars tests passed`.

- [ ] **Step 5: Review screenshots (desktop 1280x800, phone 390x844)**

```bash
python3 /tmp/radar-shots.py . /tmp/radar-shots/task-01 home national texas
```

Expected: 6 lines ending in `errors: none`, and exit code 0. Check: Nothing visible changes: no page loads `shell.js` yet. Both apps and the landing page look the same as on the base branch, with no console errors. Send the images to Luis and wait for his review before you commit and start Task 2.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Radar 2.0: add shared shell controller (RadarShell)"
```


### Task 2: Shared 1024px shell layout (`shared/shell.css`)

**Files:**
- Modify: `shared/shell.css`, `shared/test-shell.js`

**Interfaces:**
- Consumes: the `.shell-*` class names used by `RadarShell` (Task 1).
- Produces: `.shell-head`, `.shell .shell-scrim`, `.shell .shell-drawer` (fixed right, `width:min(480px,92vw)`) with `.drawhead`, `.shell-cols`, `.shell-primary`, `.shell-side`, `.shell-noloc`, `.shell-mapfail`; inside `@media (min-width: 1024px)` the `minmax(0,3fr) minmax(0,2fr)` grid, the sticky side column, `.shell-has-detail > .shell-side{display:none}`, and the docked detail sheet. Selectors are prefixed with `.shell` so app stylesheets, which load later, do not override them. The unused 900px `.lgrid` / `.shell-lgrid` hook is gone. No accent colors.
- `.homebtn` and `.throw` rules are kept.

- [ ] **Step 1: Write the failing tests**

Save as `/tmp/radar2-task02-tests.patch` (test files only: `shared/test-shell.js`), then run `git apply --whitespace=nowarn /tmp/radar2-task02-tests.patch`.

```diff
diff --git a/shared/test-shell.js b/shared/test-shell.js
--- a/shared/test-shell.js
+++ b/shared/test-shell.js
@@ -5,8 +5,26 @@ const root = path.resolve(__dirname, '..');
 assert.ok(fs.existsSync(path.join(root, 'shared/shell.css')));
 assert.ok(!fs.existsSync(path.join(root, 'home-btn.css')), 'root home-btn.css is removed');
 const css = fs.readFileSync(path.join(root, 'shared/shell.css'), 'utf8');
+const Shell = require('./shell.js');
 assert.ok(/\.homebtn/.test(css));
-assert.ok(/@media \(min-width: 900px\)/.test(css) && /\.lgrid/.test(css));
+// one breakpoint for CSS and JS
+assert.ok(css.includes('@media ' + Shell.QUERY + ' {'), 'shell.css uses the same 1024px query as RadarShell.QUERY');
+assert.ok(!/min-width:\s*900px/.test(css) && !/\.lgrid/.test(css), 'the unused 900px .lgrid / .shell-lgrid hook is gone');
+const desk = css.slice(css.indexOf('@media ' + Shell.QUERY));
+// two columns about 60 / 40, sticky side column, details swap that column, list column unmoved
+assert.ok(/\.shell-cols\{display:grid;grid-template-columns:minmax\(0,3fr\) minmax\(0,2fr\)/.test(desk), '60/40 grid at 1024px+');
+assert.ok(/\.shell-cols > \.shell-primary\{grid-column:1;grid-row:1\}/.test(desk), 'primary column stays in column 1');
+assert.ok(/\.shell-cols > \.shell-side\{grid-column:2;grid-row:1;position:sticky/.test(desk), 'side column is sticky in column 2');
+assert.ok(/\.shell-cols\.shell-has-detail > \.shell-side\{display:none\}/.test(desk), 'details hide the side column');
+assert.ok(/\.shell-cols > \.sheet\.shell-docked\{grid-column:2;grid-row:1;position:sticky/.test(desk), 'details take the same column');
+assert.ok(/\.sheet\.shell-docked \.sheet-bg\{display:none\}/.test(desk), 'no backdrop on the desktop panel');
+// phone: stacked, drawer from the right at every width
+const phone = css.slice(0, css.indexOf('@media ' + Shell.QUERY));
+assert.ok(/\.shell-cols\{display:flex;flex-direction:column/.test(phone), 'stacked under 1024px');
+assert.ok(/\.shell \.shell-drawer\{position:fixed;top:0;right:0;bottom:0/.test(phone), 'Filters drawer from the right');
+assert.ok(/\.shell \.shell-scrim\{position:fixed;inset:0/.test(phone));
+assert.ok(/\.shell-head\{/.test(phone) && /\.shell-mapfail\{/.test(phone) && /\.shell-noloc\{/.test(phone));
+assert.ok(!/--acc\s*:/.test(css), 'shell.css never sets an app accent');
 for (const rel of ['national/index.html', 'texas/index.html', 'index.html']) {
   const html = fs.readFileSync(path.join(root, rel), 'utf8');
   assert.ok(html.includes('shared/shell.css'), rel + ' loads shell.css');
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
node shared/test-shell.js
```

Expected:

- `node shared/test-shell.js`: exit 1, with `AssertionError [ERR_ASSERTION]: shell.css uses the same 1024px query as RadarShell.QUERY`

- [ ] **Step 3: Implement**

Save as `/tmp/radar2-task02-impl.patch`, then run `git apply --whitespace=nowarn /tmp/radar2-task02-impl.patch`.

```diff
diff --git a/shared/shell.css b/shared/shell.css
--- a/shared/shell.css
+++ b/shared/shell.css
@@ -6,7 +6,31 @@
 @media print{.homebtn{display:none}}
 .throw [data-theme-set]{min-height:44px;padding:0 12px}
 .throw [data-theme-set].on{font-weight:700;box-shadow:inset 0 0 0 2px currentColor}
-/* Hooks for the phase-2 two-column desktop layout. No markup changes required in this phase. */
-@media (min-width: 900px) {
-  .lgrid, .shell-lgrid { display: grid; grid-template-columns: minmax(220px, 34%) 1fr; gap: 16px; align-items: start; }
+
+/* ===== Radar 2.0 shell (shared/shell.js). Layout only: each app's style.css sets its own colors and accent. ===== */
+/* Slim header: Home, app name, freshness, Day / Night / Auto */
+.shell-head{display:flex;flex-wrap:wrap;align-items:center;gap:2px 12px}
+.shell-head h1{margin:0}
+.shell-head .throw{display:flex;gap:4px;align-items:center;margin:0 0 0 auto;padding:0;border:0}
+.shell-head .throw [data-theme-set]{border-radius:10px;border:1px solid var(--line);background:var(--panel);color:var(--ink);font-size:13px;font-weight:600;cursor:pointer}
+.shell-head .throw [data-theme-set].on{border-color:var(--acc);color:var(--acc);box-shadow:none}
+/* Filters drawer from the right, at every width */
+.shell .shell-scrim{position:fixed;inset:0;z-index:44;background:rgba(0,0,0,.45)}
+.shell .shell-drawer{position:fixed;top:0;right:0;bottom:0;z-index:45;width:min(480px,92vw);margin:0;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:calc(10px + env(safe-area-inset-top)) calc(14px + env(safe-area-inset-right)) calc(24px + env(safe-area-inset-bottom)) 14px;background:var(--panel);border:0;border-left:1px solid var(--line);border-radius:0;box-shadow:-8px 0 24px rgba(0,0,0,.25)}
+.shell .shell-drawer .drawhead{display:flex;align-items:center;justify-content:space-between;gap:8px;position:sticky;top:-10px;z-index:1;background:var(--panel);padding:4px 0}
+/* Two columns on desktop (primary ~60%, side ~40%); stacked on a phone in source order */
+.shell-cols{display:flex;flex-direction:column;gap:8px}
+.shell-primary{min-width:0}
+.shell-noloc{display:inline-flex;align-items:center;min-height:30px;padding:0 10px;border-radius:15px;border:1px dashed var(--line);color:var(--dim);font-size:12.5px}
+.shell-noloc[hidden]{display:none}
+.shell-mapfail{margin:8px 0;padding:10px 12px;border:1px dashed var(--line);border-radius:12px;color:var(--dim);font-size:14px}
+@media (min-width: 1024px) {
+  .shell-head .throw [data-theme-set]{min-height:36px;padding:0 10px}
+  .shell-cols{display:grid;grid-template-columns:minmax(0,3fr) minmax(0,2fr);gap:16px;align-items:start}
+  .shell-cols > .shell-primary{grid-column:1;grid-row:1}
+  .shell-cols > .shell-side{grid-column:2;grid-row:1;position:sticky;top:8px;max-height:calc(100vh - var(--tabs-h, 64px) - 24px);overflow-y:auto;min-width:0}
+  .shell-cols.shell-has-detail > .shell-side{display:none}
+  .shell-cols > .sheet.shell-docked{grid-column:2;grid-row:1;position:sticky;inset:auto;top:8px;display:block;z-index:auto;max-height:calc(100vh - var(--tabs-h, 64px) - 24px);overflow-y:auto;min-width:0}
+  .shell-cols > .sheet.shell-docked .sheet-bg{display:none}
+  .shell-cols > .sheet.shell-docked .sheet-card{position:static;width:auto;max-width:none;max-height:none;margin:0;border:1px solid var(--line);border-radius:12px;box-shadow:none}
 }
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
node shared/test-shell.js
node test.js
```

Expected: `shared/test-shell.js` ends with `shared shell tests passed`; `node test.js` ends with `all radars tests passed`.

- [ ] **Step 5: Review screenshots (desktop 1280x800, phone 390x844)**

```bash
python3 /tmp/radar-shots.py . /tmp/radar-shots/task-02 home national texas
```

Expected: 6 lines ending in `errors: none`, and exit code 0. Check: Still nothing visible: no page uses the `.shell-*` classes yet. The Home button looks the same on both apps. Send the images to Luis and wait for his review before you commit and start Task 3.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Radar 2.0: shared 1024px shell layout in shell.css"
```


### Task 3: National moves into the shell

**Files:**
- Create: `national/test-shell.js`
- Modify: `national/app.js`, `national/index.html`, `national/style.css`, `national/test-ui.js`, `national/test-v4.js`, `national/test.js`

**Interfaces:**
- Consumes: `RadarShell.bind`, `RadarShell.guardMap`, `RadarShell.noLocLabel` (Task 1); `.shell-*` layout (Task 2).
- Produces in `national/index.html`: `body.shell` with `data-app="national"`, `header.shell-head` with Day / Night / Auto after `#fresh` (removed from More), `#adv` as `drawer shell-drawer` with `role="dialog"` and `#advClose`, `#advBg` scrim, `#colsMap` (`#mapWrap`, `#mapFail`, `details#topDet.topdet.shell-side`), `#colsList` (`aside#mini.mini.shell-side` with `#miniFail` and `#miniNoLoc`, then `.lmain.shell-primary`), and `<script src="../shared/shell.js">` with the `RadarLoadError` hook.
- Produces in `national/app.js`: `var SHELL = window.RadarShell.bind({ app: 'national', ..., legacyTabKeys: ['nr.tab'], onDetailClose: function () { render(); } })`; `setTab` uses `SHELL.showTab`; `openSheet` / `closeSheet` call `SHELL.openDetail()` / `SHELL.closeDetail()`; `renderMapTop(list)` split out of `renderMap`; `render()` wraps both maps in `RadarShell.guardMap`. The list count `#listCount` is shown again.
- Removes the 1200px rules, `.lgrid`, and the `#listCount{display:none}` rules from `national/style.css`.

- [ ] **Step 1: Write the failing tests**

Save as `/tmp/radar2-task03-tests.patch` (test files only: `national/test-shell.js`, `national/test-ui.js`, `national/test-v4.js`, `national/test.js`), then run `git apply --whitespace=nowarn /tmp/radar2-task03-tests.patch`.

```diff
diff --git a/national/test-shell.js b/national/test-shell.js
new file mode 100644
--- /dev/null
+++ b/national/test-shell.js
@@ -0,0 +1,37 @@
+// National Radar on the shared Radar 2.0 shell (required from test.js). Run alone: node national/test-shell.js
+const assert = require('assert'), fs = require('fs'), path = require('path');
+const read = (f) => fs.readFileSync(path.join(__dirname, f), 'utf8');
+const html = read('index.html'), app = read('app.js'), css = read('style.css');
+// shell loaded after filters.js, before app.js, with the load-error hook
+const iShell = html.indexOf('<script src="../shared/shell.js" onerror="RadarLoadError(this.src||this.href)"></script>');
+assert.ok(iShell > html.indexOf('../shared/filters.js') && iShell < html.indexOf('<script src="app.js"'), 'shared/shell.js loads before app.js');
+assert.ok(/<body class="shell" data-app="national">/.test(html) && /<header class="top shell-head">/.test(html), 'shell body and slim header');
+// header: Home, name, freshness, theme; the theme left the More menu
+const head = html.slice(html.indexOf('<header'), html.indexOf('</header>'));
+assert.ok(/class="homebtn"/.test(head) && /<h1>/.test(head) && /id="fresh"/.test(head) && /class="throw"[^>]*aria-label="Theme"/.test(head), 'header holds Home, name, freshness and Day / Night / Auto');
+assert.ok(!/id="thLbl"/.test(html), 'no Theme block in More');
+// tab bar unchanged: List, Map, Pursuits, More (Timeline, Breakdown, Data)
+const nav = html.slice(html.indexOf('<nav class="tabs"'), html.indexOf('</nav>', html.indexOf('<nav class="tabs"')));
+const order = (nav.replace(/<div class="tabmore"[\s\S]*<\/div>/, '').match(/data-tab="(\w+)"/g) || []).map((s) => s.slice(10, -1));
+assert.deepStrictEqual(order, ['list', 'map', 'pursuits'], 'List, Map, Pursuits, then More');
+// Filters drawer from the right with a close button and scrim
+assert.ok(/<div id="adv" class="drawer shell-drawer" hidden role="dialog" aria-label="Filters">/.test(html) && /id="advClose"/.test(html) && /<div class="shell-scrim" id="advBg" hidden><\/div>/.test(html), 'Filters drawer');
+// two columns: List = records + small map, Map = map + records; phone order = DOM order
+const vl = html.slice(html.indexOf('<section id="v-list"'), html.indexOf('<section id="v-timeline"'));
+assert.ok(/<div class="shell-cols" id="colsList"><aside class="mini shell-side" id="mini"/.test(vl) && /<div class="lmain shell-primary">/.test(vl), 'List: small map first on a phone, list in the wide column');
+const vm = html.slice(html.indexOf('<section id="v-map"'), html.indexOf('<section id="v-list"'));
+assert.ok(vm.indexOf('class="shell-cols" id="colsMap"') > 0 && vm.indexOf('class="shell-primary"') < vm.indexOf('id="usmap"') && vm.indexOf('id="usmap"') < vm.indexOf('class="topdet shell-side" id="topDet"'), 'Map: map, then the records beside it');
+// map failure note and no-location chip
+assert.ok(/<p class="shell-mapfail" id="mapFail" hidden><\/p>/.test(vm) && /<p class="shell-mapfail" id="miniFail" hidden><\/p>/.test(vl) && /id="miniNoLoc" hidden/.test(vl), 'failure notes and no-location chip');
+assert.ok(/RadarShell\.guardMap\(document, 'mapFail', function \(\) \{ renderMap\(list\); \}, 'mapWrap'\); renderMapTop\(list\);/.test(app), 'Map tab: a broken map leaves the records list working');
+assert.ok(/RadarShell\.guardMap\(document, 'miniFail', function \(\) \{ renderMini\(list\); \}, 'usmini'\);/.test(app), 'List tab: a broken small map leaves the list working');
+assert.ok(/RadarShell\.noLocLabel\(nost\)/.test(app), 'no-location chip text from the shell');
+// app wiring: one controller, no local breakpoint, no own tab memory
+assert.ok(/var SHELL = window\.RadarShell\.bind\(\{ app: 'national'/.test(app) && /legacyTabKeys: \['nr\.tab'\]/.test(app) && /cols: \{ list: 'colsList', map: 'colsMap' \}/.test(app), 'National binds the shared shell');
+assert.ok(!/1200px/.test(app) && !/\bWIDE\b/.test(app) && !/classList\.toggle\('docked'/.test(app), 'no app-local breakpoint or docking');
+assert.ok(/SHELL\.openDetail\(\)/.test(app) && /function closeSheet\(\) \{ SHELL\.closeDetail\(\); \}/.test(app), 'details go through the shell');
+assert.ok(!/localStorage\.setItem\('national\.tab'/.test(app) && !/\$\('btnMore'\)\.addEventListener/.test(app) && !/\$\('tabMoreBtn'\)\.addEventListener/.test(app), 'tab memory, More and Filters toggles live in the shell');
+// CSS: no app-local wide layout left
+assert.ok(!/min-width:\s*1200px/.test(css) && !/\.lgrid/.test(css) && !/body\.docked/.test(css) && !/#listCount\{display:none\}/.test(css) && !/\.thlbl/.test(css), 'old 1200px layout removed');
+assert.ok(/@media \(min-width:1024px\)\{\.minisum\{display:none\}\.minihead\{display:flex\}\}/.test(css), 'small-map header follows the shared breakpoint');
+console.log('national shell tests passed');
diff --git a/national/test-ui.js b/national/test-ui.js
--- a/national/test-ui.js
+++ b/national/test-ui.js
@@ -58,7 +58,7 @@ assert.ok(/class="scmore/.test(app) && /More &#9662;/.test(app), 'other scopes b
 }
 // P3 (trivial ones): plainer scope wording, last view remembered; closed More menu takes no space
 assert.ok(app.includes("label: 'Early notices (no fee yet)'") && app.includes("label: 'Big projects (no fee yet)'"), 'plainer wording');
-assert.ok(/localStorage\.setItem\('national\.tab', t\)/.test(app) && /\n    setTab\(S\.tab\);\n/.test(app) && /tab: 'list'/.test(app), 'last view remembered; List is the default (v6)');
+assert.ok(/S\.tab = SHELL\.initial;/.test(app) && /S\.tab = SHELL\.showTab\(t\);/.test(app) && /\n    setTab\(S\.tab\);\n/.test(app) && /tab: 'list'/.test(app), 'last view remembered by the shared shell; List is the default');
 assert.ok(/id="usmini"/.test(html) && /data-tab="map">Expand map/.test(html) && /function markersHtml/.test(app) && /function renderMapV5/.test(app), 'v6.1: small map with Expand map, count markers, v5 bubbles kept dormant');
 assert.ok(css.includes('.scmore:not([open]) .scmenu{display:none}'));
 module.exports = { html, app, css };
@@ -74,5 +74,6 @@ console.log('national ui (P1 header) tests passed');
   assert.ok(/html\[data-theme=day\]\{--bg:/.test(css), 'Day variables');
   assert.ok(/^:root\{--bg:#0a1020/m.test(css), 'Night look unchanged');
   assert.ok(html.includes('id="themeColor"') && /themeColor/.test(head) && /RadarTheme\.bind/.test(app), 'browser UI color follows the theme');
-  assert.ok(/\.tabs button\[data-tab\]/.test(app), 'tab highlighting does not touch theme buttons');
+  const nav = html.slice(html.indexOf('<nav class="tabs"'), html.indexOf('</nav>', html.indexOf('<nav class="tabs"')));
+  assert.ok(!/data-theme-set/.test(nav) && /<header[\s\S]*data-theme-set="auto"[\s\S]*<\/header>/.test(html), 'theme buttons live in the header, outside the tab bar');
 }
diff --git a/national/test-v4.js b/national/test-v4.js
--- a/national/test-v4.js
+++ b/national/test-v4.js
@@ -74,11 +74,10 @@ console.log('national v4 tests passed');
 // v4.4 interface polish
 {
   const css = fs.readFileSync(path.join(__dirname, 'style.css'), 'utf8');
-  assert.ok(/<details class="topdet" id="topDet"><summary[^>]*>Top of this view/.test(html) && /function initTopDet\(\)/.test(app) && /nr\.topOpen/.test(app), 'top-of-view list is collapsible and remembered');
+  assert.ok(/<details class="topdet shell-side" id="topDet"><summary[^>]*>Top of this view/.test(html) && /function initTopDet\(\)/.test(app) && /nr\.topOpen/.test(app), 'top-of-view list is collapsible and remembered');
   assert.ok(/function emptyActions\(\)/.test(app) && /emptyActions\(\);/.test(app) && /data-way/.test(app) && /function wayOut\(k\)/.test(app), 'empty states offer one-tap ways out');
   ['clear', 'conf', 'digest', 'scope'].forEach((k) => assert.ok(app.includes("'" + k), 'way out: ' + k));
-  assert.ok(/@media \(min-width:1200px\)\{[\s\S]*#v-map:not\(\[hidden\]\)\{display:grid/.test(css) && /body\.docked \.sheet\{/.test(css) && /classList\.toggle\('docked', dock\)/.test(app), 'two-column desktop layout with a docked detail panel');
-  assert.ok(!/@media \(max-width[^)]*\)\{[^}]*body\.docked/.test(css), 'mobile layout unchanged');
+  assert.ok(/id="colsMap"/.test(html) && /SHELL\.openDetail\(\)/.test(app), 'two-column desktop layout with a docked detail panel (shared shell, national/test-shell.js)');
 }
 console.log('national v4.4 tests passed');
 // v4.5 one combined, ungrouped set
diff --git a/national/test.js b/national/test.js
--- a/national/test.js
+++ b/national/test.js
@@ -214,4 +214,5 @@ require('./test-ui.js');
 require('./test-v5.js');
 require('./test-weekly.js');
 require('./test-v6.js');
+require('./test-shell.js');
 console.log('national-radar tests passed');
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
node national/test-shell.js
node national/test-ui.js
node national/test-v4.js
```

Expected:

- `node national/test-shell.js`: exit 1, with `AssertionError [ERR_ASSERTION]: shared/shell.js loads before app.js`
- `node national/test-ui.js`: exit 1, with `AssertionError [ERR_ASSERTION]: last view remembered by the shared shell; List is the default`
- `node national/test-v4.js`: exit 1, with `AssertionError [ERR_ASSERTION]: top-of-view list is collapsible and remembered`

- [ ] **Step 3: Implement**

Save as `/tmp/radar2-task03-impl.patch`, then run `git apply --whitespace=nowarn /tmp/radar2-task03-impl.patch`.

```diff
diff --git a/national/app.js b/national/app.js
--- a/national/app.js
+++ b/national/app.js
@@ -351,15 +351,15 @@
   }
   var miniBuilt = false;
   function renderMini(list) {
-    if (!G) { $('mini').hidden = true; return; }
+    if (!G) throw new Error('us-geo.js did not load');
     if (!miniBuilt) { miniBuilt = true; var h = '<g class="gSt">'; Object.keys(G.states).forEach(function (k) { h += '<path class="st" data-st="' + k + '" d="' + G.states[k].d + '"><title>' + esc(G.states[k].n) + '</title></path>'; }); $('usmini').innerHTML = h + '</g><g class="gMk"></g>'; }
     var by = stateTotals(list); $('usmini').querySelectorAll('.st').forEach(function (p) { var k = p.getAttribute('data-st'); p.classList.toggle('sel', S.f.states.indexOf(k) >= 0); p.classList.toggle('has', !!by[k]); });
     $('usmini').querySelector('.gMk').innerHTML = markersHtml(by, true);
-    var sel = S.f.states; $('miniSel').textContent = sel.length ? 'showing ' + sel.join(', ') + ' (tap again to remove)' : 'tap a state to filter the list'; $('miniSel2').textContent = $('miniSel').textContent; if (WIDE.matches) $('miniDet').open = true;
-    var nost = list.filter(function (r) { return !r.state; }).length; $('miniNote').textContent = Object.keys(by).length + ' states' + (nost ? ' · ' + nost + ' with no state' : '');
+    var sel = S.f.states; $('miniSel').textContent = sel.length ? 'showing ' + sel.join(', ') + ' (tap again to remove)' : 'tap a state to filter the list'; $('miniSel2').textContent = $('miniSel').textContent; if (SHELL.isDesktop()) $('miniDet').open = true;
+    var nost = list.filter(function (r) { return !r.state; }).length, nl = $('miniNoLoc'); $('miniNote').textContent = Object.keys(by).length + ' states'; nl.textContent = RadarShell.noLocLabel(nost); nl.hidden = !nost;
   }
   function renderMap(list) {
-    buildMap(); if (!G) { $('usmap').innerHTML = ''; return; }
+    buildMap(); if (!G) throw new Error('us-geo.js did not load');
     var by = stateTotals(list); document.querySelectorAll('#gSt .st').forEach(function (p) { var k = p.getAttribute('data-st'); p.classList.toggle('sel', S.f.states.indexOf(k) >= 0); p.classList.toggle('has', !!by[k]); });
     $('gBub').innerHTML = markersHtml(by, false);
     var pins = ''; list.forEach(function (r) { if (r.lat && r.lon) { var xy = project(r.lon, r.lat, r.state); pins += '<circle class="pin" data-open="' + esc(r.id) + '" cx="' + xy[0].toFixed(1) + '" cy="' + xy[1].toFixed(1) + '" r="5"><title>' + esc(r.title) + '</title></circle>'; } });
@@ -367,6 +367,8 @@
     var nostate = list.filter(function (r) { return !r.state; }).length, pinned = list.filter(function (r) { return r.lat; }).length;
     $('legend').innerHTML = '<span><i class="lg-v"></i>Number = records in the state; blue = some records state a dollar value (hover or tap for the total)</span><span><i class="lg-c"></i>Amber = count only (no stated value)</span><span><i class="lg-p"></i>Pin = city named in the source (' + pinned + ')</span>';
     $('mapNote').textContent = (list.length ? 'Tap a state to filter the list by it. ' : '') + (nostate ? nostate + ' record(s) name no state (for example nationwide contracts) and are not on the map; they are in the List. ' : '');
+  }
+  function renderMapTop(list) {
     var top = sortFor(list, S.sort).slice(0, 5);
     $('topHint').textContent = list.length > 5 ? '(5 of ' + list.length + ')' : '';
     cardsInto($('mapTop'), top, emptyScopeHtml());
@@ -504,11 +506,11 @@
     else if (k === 'scope') S.scope = 'all';
     S.rows = 50; render();
   }
-  var WIDE = window.matchMedia ? matchMedia('(min-width: 1200px)') : { matches: false };
+  var SHELL = window.RadarShell.bind({ app: 'national', doc: document, ls: window.localStorage, media: window.matchMedia ? window.matchMedia(window.RadarShell.QUERY) : null, tabs: ['list', 'map', 'pursuits'], more: ['timeline', 'break', 'data'], labels: { timeline: 'Timeline', break: 'Breakdown', data: 'Data' }, cols: { list: 'colsList', map: 'colsMap' }, legacyTabKeys: ['nr.tab'], onDetailClose: function () { render(); } });
   function initTopDet() {
     if (window.RadarStorage) RadarStorage.migrateCopy(localStorage, 'nr.topOpen', 'national.topOpen');
     var d = $('topDet'), v = null; try { v = window.RadarStorage ? RadarStorage.read(localStorage, 'national.topOpen', ['nr.topOpen']) : localStorage.getItem('nr.topOpen'); } catch (e) { v = null; }
-    d.open = v === null ? WIDE.matches : v === '1';
+    d.open = v === null ? SHELL.isDesktop() : v === '1';
     d.addEventListener('toggle', function () { try { localStorage.setItem('national.topOpen', d.open ? '1' : '0'); } catch (e) { /* private mode */ } });
   }
   function renderHealthDot() {
@@ -747,7 +749,7 @@
     if (r.bucket === 'nofee') h += '<h3>Why it is under "Fee not stated"</h3><p class="note" style="margin:0">Engineering notice with a water-sector title that is open or upcoming, but the source states no fee. It is not counted as over $20M.</p>';
     h += '</details>';
     $('shBody').innerHTML = h; $('sheet').hidden = false; $('sheet').setAttribute('data-id', id); $('shStar').className = 'star big' + (WATCH[id] ? ' on' : ''); $('shStar').innerHTML = WATCH[id] ? '&#9733;' : '&#9734;';
-    refreshCapPanel(id); var dock = WIDE.matches; document.body.classList.toggle('docked', dock); $('sheet').setAttribute('aria-modal', String(!dock)); if (!dock) document.body.style.overflow = 'hidden'; $('shClose').focus();
+    refreshCapPanel(id); SHELL.openDetail(); $('shClose').focus();
     if (r._ln === 'road') initWhatIf(r);
   }
   function sheetMoneyPse(r) {
@@ -766,7 +768,7 @@
     }
     return h;
   }
-  function closeSheet() { var was = !$('sheet').hidden; $('sheet').hidden = true; document.body.style.overflow = ''; document.body.classList.remove('docked'); if (was) render(); }
+  function closeSheet() { SHELL.closeDetail(); } // shared shell: the map / records column comes back; onDetailClose re-renders
 
 
   // ---------- roadway: construction cost base + what-if ----------
@@ -830,15 +832,11 @@
   function render() {
     var list = scoped();
     renderModes(); renderScopes(); renderDigest(); renderSince(); renderCapBar(); renderKpis(list); renderFilters();
-    if (S.tab === 'map') renderMap(list); else if (S.tab === 'list') { renderList(list); renderMini(list); } else if (S.tab === 'timeline') renderTimeline(list); else if (S.tab === 'break') renderBreak(list); else if (S.tab === 'pursuits') renderPursuits(); else renderData();
+    if (S.tab === 'map') { RadarShell.guardMap(document, 'mapFail', function () { renderMap(list); }, 'mapWrap'); renderMapTop(list); } else if (S.tab === 'list') { renderList(list); RadarShell.guardMap(document, 'miniFail', function () { renderMini(list); }, 'usmini'); } else if (S.tab === 'timeline') renderTimeline(list); else if (S.tab === 'break') renderBreak(list); else if (S.tab === 'pursuits') renderPursuits(); else renderData();
     renderPurBadge();
   }
   function setTab(t) {
-    try { localStorage.setItem('national.tab', t); } catch (e) { /* ignore */ } // P3: remember the last view
-    S.tab = t; ['map', 'list', 'timeline', 'break', 'pursuits', 'data'].forEach(function (k) { $('v-' + k).hidden = k !== t; });
-    document.querySelectorAll('.tabs button[data-tab]').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-tab') === t); });
-    document.querySelectorAll('.tabs button[data-tab]').forEach(function (b) { b.setAttribute('aria-current', b.getAttribute('data-tab') === t ? 'page' : 'false'); });
-    var inMore = ['timeline', 'break', 'data'].indexOf(t) >= 0; $('tabMoreBtn').classList.toggle('on', inMore); $('tabMoreLbl').textContent = inMore ? ({ timeline: 'Timeline', break: 'Breakdown', data: 'Data' })[t] : ''; $('tabMore').hidden = true; $('tabMoreBtn').setAttribute('aria-expanded', 'false');
+    S.tab = SHELL.showTab(t); // shared shell: views, tab bar, More menu and the last view (national.tab)
     render(); window.scrollTo(0, 0);
   }
   function toggle(arr, k) { var i = arr.indexOf(k); if (i >= 0) arr.splice(i, 1); else arr.push(k); }
@@ -878,7 +876,7 @@
     var q6 = e.target.closest('[data-wt],[data-due],[data-tag-k],[data-fs-apply],[data-fs-del],#ftClear,#tmWhat');
     if (q6) {
       if (q6.id === 'ftClear') { resetFilters(); return; }
-      if (q6.id === 'tmWhat') { $('tabMore').hidden = true; $('tabMoreBtn').setAttribute('aria-expanded', 'false'); if ($('bannerMore').hidden) $('btnBanner').click(); $('banner').scrollIntoView({ block: 'start' }); return; }
+      if (q6.id === 'tmWhat') { SHELL.setMore(false); if ($('bannerMore').hidden) $('btnBanner').click(); $('banner').scrollIntoView({ block: 'start' }); return; }
       if (q6.hasAttribute('data-wt')) { toggle(S.f.work, q6.getAttribute('data-wt')); S.rows = 50; render(); return; }
       if (q6.hasAttribute('data-due')) { var dv = q6.getAttribute('data-due'); S.f.dueWithin = dv ? +dv : null; S.rows = 50; render(); return; }
       if (q6.hasAttribute('data-tag-k')) { removeTagK(q6.getAttribute('data-tag-k'), q6.getAttribute('data-tag-v')); return; }
@@ -921,11 +919,8 @@
   $('q').addEventListener('input', function () { S.f.q = this.value.trim(); S.rows = 50; render(); });
   $('sort').addEventListener('change', function () { S.sort = this.value; render(); });
   $('btnMoreRows').addEventListener('click', function () { S.rows += 50; render(); });
-  $('btnMore').addEventListener('click', function () { var o = $('adv').hidden; $('adv').hidden = !o; this.setAttribute('aria-expanded', String(o)); });
   $('digestPill').addEventListener('click', function (e) { e.stopPropagation(); if (S.digest) { S.digest = null; $('digest').hidden = true; this.setAttribute('aria-expanded', 'false'); render(); return; } var o = $('digest').hidden; $('digest').hidden = !o; this.setAttribute('aria-expanded', String(o)); });
-  $('tabMoreBtn').addEventListener('click', function (e) { e.stopPropagation(); var o = $('tabMore').hidden; $('tabMore').hidden = !o; this.setAttribute('aria-expanded', String(o)); });
   document.addEventListener('click', function (e) { // close popovers on outside click
-    if (!e.target.closest('#tabMore,#tabMoreBtn')) { $('tabMore').hidden = true; $('tabMoreBtn').setAttribute('aria-expanded', 'false'); }
     document.querySelectorAll('details.scmore[open]').forEach(function (d) { if (!d.contains(e.target)) d.open = false; });
   }, true);
   if (window.RadarTheme) RadarTheme.bind(document, window.localStorage);
@@ -948,8 +943,7 @@
   function loadJ(u) { return fetch(u, { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }); }
   Promise.all([loadJ('data/national.json'), loadJ('data/roadway.json').catch(function () { return null; }), loadJ('data/cost-prices.json').catch(function () { return null; }), loadJ('data/pse.json').catch(function () { return null; }), loadJ('data/source-status.json').catch(function () { return null; }), loadJ('../texas/data/source-status.json').catch(function () { return null; })]).then(function (x) {
     HEALTH = V4.health([x[4], x[5]]); renderHealthDot();
-    if (window.RadarStorage) RadarStorage.migrateCopy(localStorage, 'nr.tab', 'national.tab');
-    var lastTab = null; try { lastTab = window.RadarStorage ? RadarStorage.read(localStorage, 'national.tab', ['nr.tab']) : localStorage.getItem('nr.tab'); } catch (e) { lastTab = null; } if (['map', 'list', 'timeline', 'break', 'pursuits', 'data'].indexOf(lastTab) >= 0 && lastTab !== 'map') S.tab = lastTab; // v6: List is the default; the full map is one tap away
+    S.tab = SHELL.initial; // shared shell: List on a first visit, then the last view (Map included)
     DATA_W = x[0]; DATA_R = x[1]; PRICES = x[2]; DATA_P = x[3]; migrateWatch(); NEWBASE = V2.baseline(lsx, ssn, latestAsOf());
     setMode();
     setTab(S.tab);
diff --git a/national/index.html b/national/index.html
--- a/national/index.html
+++ b/national/index.html
@@ -42,13 +42,14 @@ window.RadarLoadError=function(name){
   <link rel="stylesheet" href="../shared/shell.css" onerror="RadarLoadError(this.src||this.href)">
   <link rel="stylesheet" href="style.css">
 </head>
-<body>
-<header class="top">
+<body class="shell" data-app="national">
+<header class="top shell-head">
   <div class="top-l">
     <a class="homebtn" href="../" aria-label="Back to Radars home">&#8592; Home</a>
     <h1>National Radar</h1>
   </div>
   <div class="fresh" id="fresh" role="status" aria-live="polite"><span class="dot" id="freshDot"></span><span id="freshTxt">Loading data…</span><button type="button" class="pill" id="digestPill" aria-expanded="false" aria-controls="digest" hidden></button><button type="button" class="linkbtn wc" id="btnBanner" aria-expanded="false" aria-controls="bannerMore">What counts &rsaquo;</button></div>
+  <div class="throw" role="group" aria-label="Theme"><button type="button" data-theme-set="day">Day</button><button type="button" data-theme-set="night">Night</button><button type="button" data-theme-set="auto">Auto</button></div>
 </header>
 <section class="since" id="since" aria-label="Since you last visited" hidden></section>
 
@@ -80,8 +81,8 @@ window.RadarLoadError=function(name){
     <button type="button" class="btn" id="btnMore" aria-expanded="false" aria-controls="adv"><span id="fLbl">Filters</span> <b class="fbadge" id="advCount" hidden></b></button>
     <button type="button" class="switch" id="btnConfOnly" role="switch" aria-checked="false"><span class="knob" aria-hidden="true"></span><span class="swl">Confirmed only</span></button>
   </div>
-  <div id="adv" class="drawer" hidden>
-    <div class="drawhead"><h3>Filters</h3><button type="button" class="btn small" id="btnReset">Reset filters</button></div>
+  <div id="adv" class="drawer shell-drawer" hidden role="dialog" aria-label="Filters">
+    <div class="drawhead"><h3>Filters</h3><button type="button" class="btn small" id="btnReset">Reset filters</button><button type="button" class="btn small" id="advClose">Close</button></div>
     <h3>Saved filter sets <span class="hint">on this device; included in the capture backup</span></h3>
     <div class="fsets" id="fsets"></div>
     <div class="fsrow"><input id="fsName" type="text" maxlength="60" placeholder="Name the current filters" aria-label="Name for this filter set" autocomplete="off"><button type="button" class="btn small" id="fsSave">Save</button></div>
@@ -136,25 +137,32 @@ window.RadarLoadError=function(name){
   <div class="active" id="activeNote" hidden></div>
 </section>
 
+<div class="shell-scrim" id="advBg" hidden></div>
 <main id="main">
   <section id="v-map" class="view" hidden aria-label="US map">
-    <div class="mapwrap">
-      <svg id="usmap" viewBox="0 0 975 610" role="img" aria-label="Map of the United States. Numbers show record counts per state. Use the List tab for an accessible list."></svg>
-      <details class="legd"><summary>Legend</summary><div class="legend" id="legend"></div></details>
+    <div class="shell-cols" id="colsMap">
+      <div class="shell-primary">
+        <div class="mapwrap" id="mapWrap">
+          <svg id="usmap" viewBox="0 0 975 610" role="img" aria-label="Map of the United States. Numbers show record counts per state. Use the List tab for an accessible list."></svg>
+          <details class="legd"><summary>Legend</summary><div class="legend" id="legend"></div></details>
+        </div>
+        <p class="shell-mapfail" id="mapFail" hidden></p>
+        <p class="note" id="mapNote"></p>
+      </div>
+      <details class="topdet shell-side" id="topDet"><summary class="sec">Top of this view <span class="hint" id="topHint"></span></summary>
+      <div id="mapTop" class="cards"></div></details>
     </div>
-    <p class="note" id="mapNote"></p>
-    <details class="topdet" id="topDet"><summary class="sec">Top of this view <span class="hint" id="topHint"></span></summary>
-    <div id="mapTop" class="cards"></div></details>
   </section>
 
   <section id="v-list" class="view" aria-label="List">
-    <div class="lgrid"><aside class="mini" id="mini" aria-label="Small map">
+    <div class="shell-cols" id="colsList"><aside class="mini shell-side" id="mini" aria-label="Small map">
       <details id="miniDet"><summary class="minisum"><span>Map</span> <span class="hint" id="miniSel">tap a state to filter the list</span></summary>
         <div class="minihead"><b>Map</b> <span class="hint" id="miniSel2">tap a state to filter the list</span></div>
         <div class="miniwrap"><svg id="usmini" viewBox="0 0 975 610" role="img" aria-label="Small US map. Numbers are record counts per state. Tap a state to filter the list."></svg></div>
-        <div class="minibar"><span class="hint" id="miniNote"></span><button type="button" class="linkbtn" data-tab="map">Expand map &rsaquo;</button></div>
+        <p class="shell-mapfail" id="miniFail" hidden></p>
+        <div class="minibar"><span class="hint" id="miniNote"></span><span class="shell-noloc" id="miniNoLoc" hidden></span><button type="button" class="linkbtn" data-tab="map">Expand map &rsaquo;</button></div>
       </details></aside>
-    <div class="lmain">
+    <div class="lmain shell-primary">
     <div class="qrow" id="qrow" aria-label="Quick filters">
       <details class="qf" id="qfState"><summary class="qchip" id="qsState">State</summary><div class="qpop" id="qpState"></div></details>
       <details class="qf" id="qfWork"><summary class="qchip" id="qsWork">Work type</summary><div class="qpop" id="qpWork"></div></details>
@@ -210,8 +218,6 @@ window.RadarLoadError=function(name){
     <button type="button" data-tab="timeline" role="menuitem">Timeline</button>
     <button type="button" data-tab="break" role="menuitem">Breakdown</button>
     <button type="button" data-tab="data" role="menuitem">Data &amp; sources <b class="hwarn" id="healthWarn" hidden></b></button>
-    <div class="thlbl" id="thLbl">Theme</div>
-    <div class="throw" role="group" aria-labelledby="thLbl"><button type="button" data-theme-set="day">Day</button><button type="button" data-theme-set="night">Night</button><button type="button" data-theme-set="auto">Auto</button></div>
   </div>
 </nav>
 
@@ -233,6 +239,7 @@ window.RadarLoadError=function(name){
 <script src="../shared/storage.js" onerror="RadarLoadError(this.src||this.href)"></script>
 <script src="../shared/theme.js" onerror="RadarLoadError(this.src||this.href)"></script>
 <script src="../shared/filters.js" onerror="RadarLoadError(this.src||this.href)"></script>
+<script src="../shared/shell.js" onerror="RadarLoadError(this.src||this.href)"></script>
 <script src="proj.js"></script>
 <script src="us-geo.js"></script>
 <script src="../shared/capture.js" onerror="RadarLoadError(this.src||this.href)"></script>
diff --git a/national/style.css b/national/style.css
--- a/national/style.css
+++ b/national/style.css
@@ -298,11 +298,6 @@ html[data-theme=day] .switch.on .knob{background:rgba(15,122,74,.18)}
 html[data-theme=day] .fbadge{color:#fff}
 html[data-theme=day] .pill.hot{border-color:#1d5fbf;background:rgba(29,95,191,.12)}
 html[data-theme=day] .card{box-shadow:0 1px 2px rgba(15,26,46,.06)}
-/* Theme picker (More menu) */
-.throw{display:flex;gap:4px;padding:6px 4px 2px;border-top:1px solid var(--line);margin-top:4px}
-.tabs .tabmore .throw button{flex:1;min-height:40px;font-size:13px;border:1px solid var(--line);border-radius:10px;padding:0 6px}
-.tabs .tabmore .throw button.on{border-color:var(--acc);color:var(--acc);background:rgba(124,183,255,.16)}
-.thlbl{font-size:11px;color:var(--dim);padding:6px 6px 0}
 /* v4.1 source health */
 .hdot{display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--warn);margin-left:4px;vertical-align:middle}
 .hwarn{display:inline-block;margin-left:6px;padding:0 6px;border-radius:999px;font-size:11px;line-height:18px;border:1px solid var(--warn);color:var(--warn)}
@@ -331,17 +326,9 @@ html[data-theme=day] .card{box-shadow:0 1px 2px rgba(15,26,46,.06)}
 .topdet>summary::after{content:'\25BE';margin-left:auto;margin-right:calc(14px + env(safe-area-inset-right));color:var(--dim);font-size:14px}
 .topdet[open]>summary::after{content:'\25B4'}
 .ways{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0 4px}
-@media (min-width:1200px){
-  #v-map:not([hidden]){display:grid;grid-template-columns:minmax(0,1fr) 440px;grid-template-areas:'map top' 'note top';align-items:start;column-gap:0}
-  #v-map .mapwrap{grid-area:map}#v-map #mapNote{grid-area:note}
-  #v-map .topdet{grid-area:top;max-height:calc(100vh - var(--tabs-h) - 40px);overflow-y:auto;position:sticky;top:0;border-left:1px solid var(--line);padding-left:4px}
-  #v-map .topdet .cards{grid-template-columns:minmax(0,1fr)}
-  body.docked{padding-right:490px}
-  body.docked .sheet{left:auto;right:0;top:0;bottom:calc(var(--tabs-h) + env(safe-area-inset-bottom));width:480px;align-items:stretch;z-index:35}
-  body.docked .sheet-bg{display:none}
-  body.docked .sheet-card{max-width:none;max-height:none;height:100%;margin:0;border-radius:0;border-top:0;border-left:1px solid var(--line);box-shadow:-6px 0 18px rgba(0,0,0,.18)}
-  body.docked #v-map:not([hidden]){grid-template-columns:minmax(0,1fr)}
-  body.docked #v-map .topdet{display:none}
+@media (min-width:1024px){
+  .shell-side .cards{grid-template-columns:minmax(0,1fr)}
+  #v-map .topdet{border-left:1px solid var(--line);padding-left:4px}
 }
 
 /* v5: future preference */
@@ -351,7 +338,6 @@ html[data-theme=day] .card{box-shadow:0 1px 2px rgba(15,26,46,.06)}
 .card.past{opacity:.72}
 
 /* ===== v6.1: list first, small map beside / above the list; count markers ===== */
-.lgrid{display:flex;flex-direction:column;gap:8px}
 .mini{margin:0 0 4px;border:1px solid var(--line);border-radius:12px;background:var(--panel);overflow:hidden}.mini[hidden]{display:none}
 .minisum{display:flex;align-items:center;gap:8px;min-height:40px;padding:0 12px;cursor:pointer;font-size:14px;font-weight:600;color:var(--ink);list-style:none}
 .minisum::-webkit-details-marker{display:none}.minisum::after{content:"\25BE";margin-left:auto;color:var(--dim)}details[open]>.minisum::after{content:"\25B4"}
@@ -368,10 +354,6 @@ html[data-theme=day] .card{box-shadow:0 1px 2px rgba(15,26,46,.06)}
 .legend i.lg-v,.legend i.lg-c,.legend i.lg-p{border-radius:50%}.lg-v{background:#1d4ed8}.lg-c{background:#b45309}.lg-p{background:#fb7185}
 html[data-theme=day] .miniwrap{background:#dfe8f3}
 #usmap{max-height:62vh}
-@media (min-width:1200px){
-  .lgrid{display:grid;grid-template-columns:minmax(0,1fr) 380px;gap:14px;align-items:start}
-  .lgrid .mini{grid-column:2;grid-row:1;position:sticky;top:8px}.lgrid .lmain{grid-column:1;grid-row:1;min-width:0}
-}
 
 /* ===== v6.2: slim header, one control row, count-only KPI, phone tidy ===== */
 .top{display:flex;flex-wrap:wrap;align-items:center;gap:2px 12px;padding-bottom:4px}
@@ -400,7 +382,6 @@ html[data-theme=day] .miniwrap{background:#dfe8f3}
   .chip{min-height:34px;padding:0 10px;font-size:12.5px}
   .kline{font-size:12.5px;padding-bottom:4px}.kline .hint{display:none}
 }
-#listCount{display:none}
 @media (max-width:520px){.top .fresh .upd{display:none}}
 
 /* ===== v6.3: cards lead with name, agency/state, due date, Positionable; amount smaller ===== */
@@ -437,7 +418,6 @@ html[data-theme=day] .miniwrap{background:#dfe8f3}
   .top .fresh .wc{display:none}.tmwhat{display:block}
 }
 .minihead{display:none;align-items:center;gap:8px;min-height:36px;padding:0 12px;font-size:14px}.minihead .hint{font-size:12px}
-@media (min-width:1200px){.minisum{display:none}.minihead{display:flex}}
+@media (min-width:1024px){.minisum{display:none}.minihead{display:flex}}
 .qf:not([open]) .qpop{display:none}
-#listCount{display:none}
 @media (max-width:520px){.fres{display:none}}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
node national/test-shell.js
node national/test-ui.js
node national/test-v4.js
node test.js
```

Expected: `national/test-shell.js` ends with `national shell tests passed`; `national/test-ui.js` ends with `national ui (P1 header) tests passed`; `national/test-v4.js` ends with `national v4.5 tests passed`; `node test.js` ends with `all radars tests passed`.

- [ ] **Step 5: Review screenshots (desktop 1280x800, phone 390x844)**

```bash
python3 /tmp/radar-shots.py . /tmp/radar-shots/task-03 national national:map national:pursuits texas
```

Expected: 8 lines ending in `errors: none`, and exit code 0. Check: Desktop: National List shows the list on the left (about 60%) and the small map on the right, sticky while scrolling. Opening a card docks the detail in the right column and Close brings the map back. Map tab shows the map with Top of this view beside it. Theme buttons are in the header and the list count is visible. Phone: one column, bottom tabs, and the detail as a bottom sheet. Texas is unchanged. Send the images to Luis and wait for his review before you commit and start Task 4.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Radar 2.0: National moves into the shared shell"
```


### Task 4: National dormant code removal

**Files:**
- Create: `national/test-dormant.js`
- Modify: `national/app.js`, `national/index.html`, `national/style.css`, `national/test-ui.js`, `national/test.js`

**Interfaces:**
- Consumes: Task 3 National on the shell.
- Produces: `national/app.js` without `SCOPES_W` / `SCOPES_R` / `SCOPES_P` (only `var SCOPES = C.SCOPES;`), without the PS&E controls block, `renderMapV5`, `$('pseCtl').hidden = true`, and the `feeIn` / `costIn` / `dbIn` / `btnIncl` / `btnText` listeners; `national/index.html` without `#pseCtl`; `national/style.css` without `.pse-ctl` through `.exact button` and `.drawer .pse-ctl`. `renderDataPse` stays (the spec does not list it).
- `national/test-dormant.js` is the explicit unused check: none of those names remain in `app.js`, `index.html`, `style.css`, and no other National file references them.

- [ ] **Step 1: Write the failing tests**

Save as `/tmp/radar2-task04-tests.patch` (test files only: `national/test-dormant.js`, `national/test-ui.js`, `national/test.js`), then run `git apply --whitespace=nowarn /tmp/radar2-task04-tests.patch`.

```diff
diff --git a/national/test-dormant.js b/national/test-dormant.js
new file mode 100644
--- /dev/null
+++ b/national/test-dormant.js
@@ -0,0 +1,16 @@
+// Radar 2.0: dormant lane code is gone and the live code around it is kept (required from test.js).
+// Run alone: node national/test-dormant.js
+const assert = require('assert'), fs = require('fs'), path = require('path');
+const read = (f) => fs.readFileSync(path.join(__dirname, f), 'utf8');
+const html = read('index.html'), app = read('app.js'), css = read('style.css');
+// removed: v5 dollar-bubble map, old lane scope lists, the hidden fee / pipeline / advance / design-build panel
+['function renderMapV5', 'SCOPES_W', 'SCOPES_R', 'SCOPES_P', 'DB_ROLES', 'function chipsHtml', 'function renderPseCtl', 'PS&E controls'].forEach((s) => assert.ok(!app.includes(s), 'app.js no longer has ' + s));
+['pseCtl', 'feeIn', 'costIn', 'dbIn', 'btnIncl', 'btnText', 'feeOp', 'feePre', 'exactNote', 'pipeNote', 'advNote', 'dbRole', 'dbType', 'dbStage', 'dbNote', 'pcFee', 'pcPipe', 'pcAdv', 'pcDb'].forEach((id) => {
+  assert.ok(!html.includes('id="' + id + '"'), 'index.html no longer has #' + id);
+  assert.ok(!app.includes("$('" + id + "')"), 'app.js no longer reads #' + id);
+});
+['.pse-ctl', '.pcrow', '.pcop', '.pcl{', '.pc{', '.pc h3', '.exact{', '.exact button'].forEach((s) => assert.ok(!css.includes(s), 'style.css no longer has ' + s));
+// kept: the live map, scopes, amount chips and the confirmed switch
+assert.ok(/var SCOPES = C\.SCOPES;/.test(app) && /function renderMap\(list\)/.test(app) && /function markersHtml\(by, small\)/.test(app) && /function renderMini\(list\)/.test(app), 'live map and scopes kept');
+assert.ok(html.includes('id="fFee"') && /t\.hasAttribute\('data-fee'\)/.test(app) && html.includes('id="btnConfOnly"') && html.includes('id="costBox"'), 'live amount chips and Confirmed only kept');
+console.log('national dormant-code tests passed');
diff --git a/national/test-ui.js b/national/test-ui.js
--- a/national/test-ui.js
+++ b/national/test-ui.js
@@ -57,9 +57,9 @@ assert.ok(/class="scmore/.test(app) && /More &#9662;/.test(app), 'other scopes b
   assert.ok(/function renderHealth\(\)/.test(app) && /renderData\(\) \{\n    if \(!DATA\) return;\n    renderHealth\(\);/.test(app));
 }
 // P3 (trivial ones): plainer scope wording, last view remembered; closed More menu takes no space
-assert.ok(app.includes("label: 'Early notices (no fee yet)'") && app.includes("label: 'Big projects (no fee yet)'"), 'plainer wording');
+assert.ok(/var SCOPES = C\.SCOPES;/.test(app) && !/SCOPES_[WRP]/.test(app), 'one combined scope set; the old lane lists are gone (Radar 2.0)');
 assert.ok(/S\.tab = SHELL\.initial;/.test(app) && /S\.tab = SHELL\.showTab\(t\);/.test(app) && /\n    setTab\(S\.tab\);\n/.test(app) && /tab: 'list'/.test(app), 'last view remembered by the shared shell; List is the default');
-assert.ok(/id="usmini"/.test(html) && /data-tab="map">Expand map/.test(html) && /function markersHtml/.test(app) && /function renderMapV5/.test(app), 'v6.1: small map with Expand map, count markers, v5 bubbles kept dormant');
+assert.ok(/id="usmini"/.test(html) && /data-tab="map">Expand map/.test(html) && /function markersHtml/.test(app) && !/function renderMapV5/.test(app), 'v6.1: small map with Expand map, count markers; v5 bubbles removed in Radar 2.0');
 assert.ok(css.includes('.scmore:not([open]) .scmenu{display:none}'));
 module.exports = { html, app, css };
 // v6.3: card order: title, agency/state, date line with Positionable, then the amount (smaller)
diff --git a/national/test.js b/national/test.js
--- a/national/test.js
+++ b/national/test.js
@@ -215,4 +215,5 @@ require('./test-v5.js');
 require('./test-weekly.js');
 require('./test-v6.js');
 require('./test-shell.js');
+require('./test-dormant.js');
 console.log('national-radar tests passed');
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
node national/test-dormant.js
node national/test-ui.js
```

Expected:

- `node national/test-dormant.js`: exit 1, with `AssertionError [ERR_ASSERTION]: app.js no longer has function renderMapV5`
- `node national/test-ui.js`: exit 1, with `AssertionError [ERR_ASSERTION]: one combined scope set; the old lane lists are gone (Radar 2.0)`

- [ ] **Step 3: Implement**

Save as `/tmp/radar2-task04-impl.patch`, then run `git apply --whitespace=nowarn /tmp/radar2-task04-impl.patch`.

```diff
diff --git a/national/app.js b/national/app.js
--- a/national/app.js
+++ b/national/app.js
@@ -6,31 +6,6 @@
   var $ = function (id) { return document.getElementById(id); };
   var esc = function (s) { return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
   var SRC_SHORT = { 'srf-cw': 'EPA Clean Water SRF', 'srf-dw': 'EPA Drinking Water SRF', 'sam': 'SAM.gov', 'usaspending': 'USAspending', 'txdot-pcl': 'TxDOT projected contracts', 'nyc': 'NYC City Record', 'chicago': 'Chicago contracts', 'dhs-apfs': 'DHS forecast (APFS)', 'ag-forecast': 'Acquisition Gateway forecasts', 'caltrans-lar': 'Caltrans A&E look-ahead', 'caltrans-awards': 'Caltrans A&E awards', 'usaspending-rw': 'USAspending prime awards (roadway lane)', 'usaspending-sub': 'USAspending subawards', 'wsdot-proj': 'WSDOT projected design list', 'pse-usaspending': 'USAspending prime awards / IDVs (PS&E lens)', 'austin': 'City of Austin master agreements', 'txdot-pi': 'TxDOT Project Information', 'wssc': 'WSSC Water projected solicitations', 'cdot-sched': 'CDOT tentative advertisement schedule', 'la-dotd': 'Louisiana DOTD projected advertisements', 'dc-pass': 'DC OCP PASS forecast', 'sd-forecast': 'San Diego County procurement forecast' };
-  var SCOPES_W = [
-    { id: 'opp', label: 'Upcoming & open', sub: 'confirmed, fee > $20M' },
-    { id: 'review', label: 'Needs review', sub: 'uncertain, not confirmed' },
-    { id: 'nofee', label: 'Fee/amount not stated', sub: 'open/upcoming, no fee' },
-    { id: 'recompete', label: 'Recompete watch', sub: 'inferred from end dates' },
-    { id: 'awards', label: 'Awards / competitors', sub: 'awarded or closed' },
-    { id: 'watch', label: 'Watchlist', sub: 'starred on this device' }
-  ];
-  var SCOPES_R = [
-    { id: 'drain', label: 'Drainage fee > $5M', sub: 'drainage-specific fee stated by the source, upcoming/open' },
-    { id: 'total', label: 'Roadway fee stated (drainage share not stated)', sub: 'total fee > $20M, scope names drainage, share unknown' },
-    { id: 'review', label: 'Needs review', sub: 'uncertain, not confirmed' },
-    { id: 'awards', label: 'Awards / competitors', sub: 'awarded or closed' },
-    { id: 'watch', label: 'Watchlist', sub: 'starred on this device' }
-  ];
-  var SCOPES_P = [
-    { id: 'all', label: 'All fee records', sub: 'consultant fee stated by the source, any stage' },
-    { id: 'open', label: 'Upcoming / open', sub: 'fee stated, not yet awarded' },
-    { id: 'forecast', label: 'Forecast', sub: 'agency forecasts with a stated fee' },
-    { id: 'awarded', label: 'Awarded', sub: 'recompete and competitor intel' },
-    { id: 'advance', label: 'Early notices (no fee yet)', sub: 'agency forecasts before the solicitation; no fee filter applies' },
-    { id: 'pipeline', label: 'Big projects (no fee yet)', sub: 'stated project cost, NOT a fee' },
-    { id: 'db', label: 'Design-build', sub: 'DB value includes construction, NOT a fee' },
-    { id: 'watch', label: 'Watchlist', sub: 'starred on this device' }
-  ];
   var SCOPES = C.SCOPES; // v4.5: one combined set, no lanes
   var COLOR = { opp: '#34d399', review: '#fbbf24', nofee: '#94a3b8', award: '#7cb7ff', closed: '#64748b', recompete: '#fb7185' };
   var STATUS_LABEL = { open: 'Open', upcoming: 'Upcoming', awarded: 'Awarded' };
@@ -244,7 +219,7 @@
     chipSet('fSource', 'sources', itemsFor('sources', function (r) { return r.src; }, function (k) { return SRC_SHORT[k] || k; }), f.sources);
     var fees = [[null, 'Any (default)'], [1e6, '$1M+'], [5e6, '$5M+'], [20e6, '$20M+'], [50e6, '$50M+'], [100e6, '$100M+']];
     $('fFee').innerHTML = fees.map(function (x) { return '<button type="button" class="chip' + (f.feeMin === x[0] ? ' on' : '') + '" data-fee="' + x[0] + '" aria-pressed="' + (f.feeMin === x[0]) + '">' + x[1] + '</button>'; }).join('');
-    $('costBox').hidden = true; $('pseCtl').hidden = true;
+    $('costBox').hidden = true;
     var n = activeCount() - (f.q ? 1 : 0); setBadge(n); var nRes = scoped().length; $('fLbl').innerHTML = 'Filters' + (n ? ' (' + n + ')' : '') + ' <span class="fres">&middot; ' + nRes + '<span class="fresw"> results</span></span>'; $('advCount').hidden = true; renderQuick(); renderTags(); renderSets();
     var a = $('activeNote'); a.hidden = !activeCount(); a.textContent = activeCount() ? activeCount() + ' filter' + (activeCount() === 1 ? '' : 's') + ' on. Counts above reflect them.' : '';
   }
@@ -284,33 +259,6 @@
   }
   function deleteSet(name) { FS = V6.remove(FS, name); V6.save(window.localStorage, FS); renderSets(); toast('Deleted filter set "' + name + '".'); }
 
-  // ---------- PS&E controls ----------
-  var DB_ROLES = [['prime', 'DB prime opportunity (inferred)'], ['sub', 'Design-subconsultant to DB team (inferred)']];
-  function chipsHtml(key, items, sel) { return items.length ? items.map(function (it) { return '<button type="button" class="chip' + (sel.indexOf(it.k) >= 0 ? ' on' : '') + '" data-f="' + key + '" data-k="' + esc(it.k) + '" aria-pressed="' + (sel.indexOf(it.k) >= 0) + '">' + esc(it.label) + ' <small>' + it.n + '</small></button>'; }).join('') : '<span class="hint">none</span>'; }
-  function renderPseCtl() {
-    var on = S.mode === 'pse'; $('pseCtl').hidden = !on; if (!on) return;
-    var f = S.f, sc = S.scope, feeTab = sc !== 'pipeline' && sc !== 'db' && sc !== 'watch' && sc !== 'advance';
-    $('pcFee').hidden = !(feeTab || sc === 'watch' && false); $('pcPipe').hidden = sc !== 'pipeline'; $('pcDb').hidden = sc !== 'db'; $('pcAdv').hidden = sc !== 'advance'; $('advNote').innerHTML = TXP.adv || '';
-    var fin = $('feeIn'); if (document.activeElement !== fin) fin.value = f.feeMin === null ? '' : +(f.feeMin / 1e6).toFixed(3);
-    $('feeOp').innerHTML = f.inclusive ? '&ge;' : '&gt;';
-    $('btnIncl').setAttribute('aria-pressed', String(!!f.inclusive)); $('btnIncl').classList.toggle('on', !!f.inclusive); $('btnIncl').textContent = f.inclusive ? '\u2265 on: exactly ' + M.fmtMoney(f.feeMin || 0) + ' included' : '\u2265 include exactly ' + M.fmtMoney(f.feeMin || 0);
-    $('btnText').setAttribute('aria-pressed', String(!!f.noText)); $('btnText').classList.toggle('on', !!f.noText);
-    var pre = [[5e6, '> $5M'], [10e6, '> $10M'], [20e6, '> $20M'], [50e6, '> $50M']];
-    $('feePre').innerHTML = pre.map(function (x) { return '<button type="button" class="chip' + (f.feeMin === x[0] ? ' on' : '') + '" data-fee="' + x[0] + '" aria-pressed="' + (f.feeMin === x[0]) + '">' + x[1] + '</button>'; }).join('');
-    var ex = feeTab ? PS.exactAtThreshold(RECS, filterFor(sc, f), WATCH) : [], en = $('exactNote');
-    if (ex.length) { en.hidden = false; en.innerHTML = '<b>Exactly ' + esc(M.fmtMoneyFull(f.feeMin)) + ' &mdash; your cutoff is &gt;' + esc(M.fmtMoney(f.feeMin)) + ' (strictly greater), so ' + ex.length + ' record' + (ex.length === 1 ? ' is' : 's are') + ' not in the list.</b> Tap the &ge; button to include ' + (ex.length === 1 ? 'it' : 'them') + '.' + ex.slice(0, 6).map(function (r) { return '<button type="button" data-open="' + esc(r.id) + '">' + esc(r.title.slice(0, 110)) + ' &middot; ' + esc(r.agency) + '</button>'; }).join(''); }
-    else en.hidden = true;
-    var cin = $('costIn'); if (document.activeElement !== cin) cin.value = f.costMin === null ? '' : +(f.costMin / 1e6).toFixed(3);
-    $('pipeNote').innerHTML = TXP.pipe;
-    var din = $('dbIn'); if (document.activeElement !== din) din.value = f.dbMin === null ? '' : +(f.dbMin / 1e6).toFixed(3);
-    if (sc === 'db') {
-      var base = RECS.filter(function (r) { return r.lens === 'db'; }), cnt = function (fn) { return M.countBy(base, fn); }, cr = cnt(function (r) { return r.dbRole; }), ct = cnt(function (r) { return r.dbType; }), cs = cnt(function (r) { return r.stage; });
-      $('dbRole').innerHTML = chipsHtml('dbRoles', DB_ROLES.map(function (x) { return { k: x[0], label: x[1], n: cr[x[0]] || 0 }; }), f.dbRoles);
-      $('dbType').innerHTML = chipsHtml('dbTypes', Object.keys(ct).sort(function (a, b) { return ct[b] - ct[a]; }).map(function (k) { return { k: k, label: k, n: ct[k] }; }), f.dbTypes);
-      $('dbStage').innerHTML = chipsHtml('dbStages', Object.keys(cs).sort(function (a, b) { return cs[b] - cs[a]; }).map(function (k) { return { k: k, label: ({ open: 'Open', forecast: 'Forecast', awarded: 'Awarded', closed: 'Closed', unclear: 'Status unclear' })[k] || k, n: cs[k] }; }), f.dbStages);
-      $('dbNote').innerHTML = TXP.db;
-    }
-  }
   function renderDataPse() {
     var C = DATA.counts, gen = new Date(DATA.generatedAt), F = C.fee, D = C.db, P = C.pipeline, T = DATA.thresholds;
     $('dqFresh').innerHTML = '<p><b>Snapshot as of ' + esc(M.fmtDate(DATA.asOfDate)) + '</b> (US Central date), built ' + esc(gen.toLocaleString([], { dateStyle: 'full', timeStyle: 'short' })) + '. ' + C.total + ' records kept after removing ' + C.mergedDuplicates + ' duplicates (' + C.beforeDedupe + ' before).</p>' +
@@ -373,26 +321,6 @@
     $('topHint').textContent = list.length > 5 ? '(5 of ' + list.length + ')' : '';
     cardsInto($('mapTop'), top, emptyScopeHtml());
   }
-  function renderMapV5(list) { // dormant (v5 dollar bubbles), kept for rollback reference
-    buildMap(); if (!G) { $('usmap').innerHTML = ''; return; }
-    var byState = {}; list.forEach(function (r) { if (!r.state) return; var o = byState[r.state] = byState[r.state] || { n: 0, v: 0 }; o.n++; o.v += fee(r); });
-    var max = 0; Object.keys(byState).forEach(function (k) { max = Math.max(max, byState[k].v); });
-    document.querySelectorAll('#gSt .st').forEach(function (p) { p.classList.toggle('sel', S.f.states.indexOf(p.getAttribute('data-st')) >= 0); });
-    var b = '';
-    Object.keys(byState).forEach(function (k) {
-      var g = G.states[k]; if (!g) return; var o = byState[k], cnt = !o.v, r = cnt ? 16 + Math.min(8, o.n) : 20 + 28 * Math.sqrt(o.v / max);
-      b += '<g data-st="' + k + '"><circle class="bub' + (cnt ? ' cnt' : '') + '" data-st="' + k + '" cx="' + g.cx + '" cy="' + g.cy + '" r="' + r.toFixed(1) + '"><title>' + esc((M.STATE_NAMES[k] || k) + ': ' + o.n + ' record(s)' + (o.v ? ', ' + M.fmtMoney(o.v) + ' stated' : '')) + '</title></circle><text class="bubt" x="' + g.cx + '" y="' + (g.cy + 7) + '">' + esc(cnt ? o.n : M.fmtMoney(o.v)) + '</text></g>';
-    });
-    $('gBub').innerHTML = b;
-    var pins = ''; list.forEach(function (r) { if (r.lat && r.lon) { var xy = project(r.lon, r.lat, r.state); pins += '<circle class="pin" data-open="' + esc(r.id) + '" cx="' + xy[0].toFixed(1) + '" cy="' + xy[1].toFixed(1) + '" r="6"><title>' + esc(r.title) + '</title></circle>'; } });
-    $('gPin').innerHTML = pins;
-    var nostate = list.filter(function (r) { return !r.state; }).length, pinned = list.filter(function (r) { return r.lat; }).length;
-    $('legend').innerHTML = '<span><i style="background:rgba(124,183,255,.5)"></i>Bubble size = sum of stated values in this view</span><span><i style="background:rgba(251,191,36,.5)"></i>Amber = count only (no stated value)</span><span><i style="background:#fb7185"></i>Pin = city named in the source (' + pinned + ')</span>';
-    $('mapNote').textContent = (list.length ? 'Tap a state to filter by it. ' : '') + (nostate ? nostate + ' record(s) name no state (for example nationwide contracts) and are not on the map; they are in the List. ' : '') + 'Pins appear only when the source names a city that matches one place; otherwise only the state bubble is shown.';
-    var top = sortFor(list, 'fee').slice(0, 5);
-    $('topHint').textContent = list.length > 5 ? '(5 of ' + list.length + ', by stated value)' : '';
-    cardsInto($('mapTop'), top, emptyScopeHtml());
-  }
 
   // ---------- list ----------
   function renderList(list) {
@@ -931,13 +859,8 @@
   $('fsSave').addEventListener('click', saveSet); $('fsName').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); saveSet(); } });
   document.querySelectorAll('.qf').forEach(function (d) { d.addEventListener('toggle', function () { if (d.open) document.querySelectorAll('.qf[open]').forEach(function (o) { if (o !== d) o.open = false; }); }); });
   $('btnClear').addEventListener('click', resetFilters); $('btnReset').addEventListener('click', resetFilters);
-  $('feeIn').addEventListener('input', function () { var v = parseFloat(this.value); S.f.feeMin = isFinite(v) && v >= 0 ? Math.round(v * 1e6) : 0; S.rows = 50; render(); });
-  $('costIn').addEventListener('input', function () { var v = parseFloat(this.value); S.f.costMin = isFinite(v) && v >= 0 ? Math.round(v * 1e6) : 0; S.rows = 50; render(); });
-  $('dbIn').addEventListener('input', function () { var v = parseFloat(this.value); S.f.dbMin = isFinite(v) && v >= 0 ? Math.round(v * 1e6) : null; S.rows = 50; render(); });
-  $('btnIncl').addEventListener('click', function () { S.f.inclusive = !S.f.inclusive; render(); });
   function setConf(v) { CONF = !!v; S.f.hideUnconfirmed = CONF; try { localStorage.setItem('national.confirmedOnly', CONF ? '1' : '0'); } catch (e) { /* ignore */ } S.rows = 50; render(); }
   $('btnConfOnly').addEventListener('click', function () { setConf(!CONF); });
-  $('btnText').addEventListener('click', function () { S.f.noText = !S.f.noText; render(); });
 
   // ---------- start ----------
   function loadJ(u) { return fetch(u, { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }); }
diff --git a/national/index.html b/national/index.html
--- a/national/index.html
+++ b/national/index.html
@@ -92,34 +92,6 @@ window.RadarLoadError=function(name){
       <label class="region"><span class="vh">Region</span><select id="regionSel" aria-label="Region focus"></select></label>
       <a class="txlink" id="txLink" href="../texas/" hidden>Texas detail: Texas Opportunity &rarr;</a>
     </div>
-<div class="pse-ctl" id="pseCtl" aria-label="Fee and design-build controls" hidden>
-  <div class="pc" id="pcFee">
-    <label class="pcl" for="feeIn">Consultant fee threshold <span class="hint">(stated fee, in $ millions)</span></label>
-    <div class="pcrow">
-      <span class="pcop" id="feeOp" aria-hidden="true">&gt;</span><span class="pcd">$</span><input id="feeIn" type="number" inputmode="decimal" step="0.5" min="0" value="5" aria-label="Fee threshold in millions of dollars"><span class="pcd">M</span>
-      <button type="button" class="chip" id="btnIncl" aria-pressed="false">&ge; include exactly this</button>
-      <button type="button" class="chip" id="btnText" aria-pressed="false">Hide text-parsed</button>
-    </div>
-    <div class="chips" id="feePre"></div>
-    <div class="exact" id="exactNote" hidden></div>
-  </div>
-  <div class="pc" id="pcPipe" hidden>
-    <label class="pcl" for="costIn">Stated project cost greater than <span class="hint">($ millions; this is NOT a fee)</span></label>
-    <div class="pcrow"><span class="pcop" aria-hidden="true">&gt;</span><span class="pcd">$</span><input id="costIn" type="number" inputmode="decimal" step="5" min="0" value="50" aria-label="Project cost threshold in millions of dollars"><span class="pcd">M</span></div>
-    <p class="note" id="pipeNote"></p>
-  </div>
-  <div class="pc" id="pcAdv" hidden>
-    <p class="note" id="advNote"></p>
-  </div>
-  <div class="pc" id="pcDb" hidden>
-    <label class="pcl" for="dbIn">Design-build value greater than <span class="hint">($ millions; contract value / project cost, NOT a fee; blank = show all)</span></label>
-    <div class="pcrow"><span class="pcop" aria-hidden="true">&gt;</span><span class="pcd">$</span><input id="dbIn" type="number" inputmode="decimal" step="5" min="0" value="" placeholder="all" aria-label="Design-build value threshold in millions of dollars"><span class="pcd">M</span></div>
-    <h3>Your role <span class="hint">(inferred, not stated by the owner)</span></h3><div class="chips" id="dbRole"></div>
-    <h3>Procurement type</h3><div class="chips" id="dbType"></div>
-    <h3>Stage</h3><div class="chips" id="dbStage"></div>
-    <p class="note" id="dbNote"></p>
-  </div>
-</div>
     <h3>State</h3><div class="chips" id="fState"></div>
     <h3>Agency</h3><div class="chips" id="fAgency"></div>
     <h3>Status <span class="hint">(as the source states it)</span></h3><div class="chips" id="fStatus"></div>
diff --git a/national/style.css b/national/style.css
--- a/national/style.css
+++ b/national/style.css
@@ -136,15 +136,6 @@ table.wit input{width:92px;min-height:44px;padding:4px 6px;border-radius:8px;bor
 .wiln{border-bottom:1px solid var(--line);padding:8px 0;font-size:13px}.wiq{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:4px}.wiq input{width:100px;min-height:44px;padding:4px 8px;border-radius:8px;border:1px solid var(--line);background:var(--panel);color:var(--ink);font-size:16px;text-align:right}.wis{color:var(--dim)}
 
 /* ---- PS&E / H&H lens controls and badges ---- */
-.pse-ctl{margin:0 calc(14px + env(safe-area-inset-right)) 8px calc(14px + env(safe-area-inset-left));display:grid;gap:8px}
-.pc{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:8px 12px}
-.pcl{display:block;font-size:13px;font-weight:700;margin-bottom:4px}
-.pcrow{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
-.pcrow input[type=number]{width:96px;min-height:44px;padding:0 10px;border-radius:12px;border:1px solid var(--acc);background:var(--panel2);font-size:18px;font-weight:700;text-align:right}
-.pcop{font-size:22px;font-weight:800;color:var(--acc);min-width:18px;text-align:center}.pcd{font-size:18px;font-weight:700;color:var(--dim)}
-.pc h3{margin:8px 0 4px;font-size:13px}
-.exact{margin-top:8px;border:1px dashed var(--warn);border-radius:10px;padding:6px 10px;font-size:13px;color:var(--ink)}
-.exact button{display:block;width:100%;min-height:44px;text-align:left;background:none;border:0;border-top:1px solid var(--line);color:var(--acc);font-weight:600;cursor:pointer;padding:4px 0}
 .tag.conf{border-color:var(--ok);color:var(--ok)}.tag.unconf{border-color:var(--bad);color:var(--bad)}.tag.db{border-color:#c4b5fd;color:#c4b5fd}.tag.est{border-color:var(--warn);color:var(--warn);background:rgba(251,191,36,.08)}.tag.plain{border-color:var(--line);color:var(--dim)}
 .money.db{border-color:#c4b5fd}.money.pipe{border-color:#94a3b8}
 .estline{display:block;margin-top:4px;font-size:12.5px;color:var(--warn)}
@@ -246,7 +237,6 @@ body.wk-open{overflow:hidden}
 .fbadge{display:inline-block;min-width:20px;padding:0 6px;border-radius:999px;background:var(--acc);color:#0a1020;font-size:12px;line-height:20px;margin-left:4px}.fbadge[hidden]{display:none}
 .drawer{margin-top:8px;padding:8px 12px 12px;border:1px solid var(--line);border-radius:14px;background:var(--panel)}
 .drawhead{display:flex;align-items:center;justify-content:space-between;gap:8px}.drawhead h3{margin:4px 0}
-.drawer .pse-ctl{margin:8px 0 0;padding:0;border:0;background:none}
 .filters .rhint{margin:6px 2px 0;font-size:13.5px;color:var(--dim)}.filters .rhint .linkbtn{min-height:32px;font-size:13.5px}.linkbtn.dim{color:var(--dim)}
 @media (max-width:520px){.filters .switch{padding:0 10px 0 6px;font-size:13px;gap:6px}.filters .switch .knob{width:32px}.filters .switch.on .knob::after{left:12px}}
 
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
node national/test-dormant.js
node national/test-ui.js
node test.js
```

Expected: `national/test-dormant.js` ends with `national dormant-code tests passed`; `national/test-ui.js` ends with `national ui (P1 header) tests passed`; `node test.js` ends with `all radars tests passed`.

- [ ] **Step 5: Review screenshots (desktop 1280x800, phone 390x844)**

```bash
python3 /tmp/radar-shots.py . /tmp/radar-shots/task-04 national national:map texas
```

Expected: 6 lines ending in `errors: none`, and exit code 0. Check: Same as after Task 3. Nothing visible should change, with no console errors. Send the images to Luis and wait for his review before you commit and start Task 5.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Radar 2.0: remove National dormant map, lane scopes and #pseCtl"
```


### Task 5: Shared weekly list (`shared/weekly.js`)

**Files:**
- Create: `shared/test-weekly.js`, `shared/weekly.js`
- Modify: `national/app.js`, `national/index.html`, `national/style.css`, `national/test-v2.js`, `national/test.js`, `shared/cache.js`, `shared/shell.css`, `shared/test-cache.js`
- Delete: `national/test-weekly.js`, `national/weekly.js`

**Interfaces:**
- Consumes: `RadarCapture` (`blank`, `dueInfo`, `dueText`) for rows; the app's record lookup and `toast`.
- Produces: `window.RadarWeekly` with `pursuitRows`, `model`, `bodyHtml`, `text`, `docHtml`, `CSS` (all moved unchanged from `national/weekly.js`), `ics(events, nowIso, calName, appName)`, `dueEvents(rows)` (a row with `dueFrom === 'source'` gets the "closing date from the source" note), and `bindSheet({ doc, win, model, fileName, back, toast, download })`, which returns `{ open, close, print, share, copy, download }`.
- National: `var WKS = RadarWeekly.bindSheet(...)` replaces the old weekly glue, and `#btnPurPrint` calls `WKS.open`. `index.html` loads `../shared/weekly.js` with the `RadarLoadError` hook. `national/weekly.js` and `national/test-weekly.js` are deleted. The Pursuits header and weekly-sheet / print CSS move to the end of `shared/shell.css`. `RadarCache` SHARED gains `weekly.js`, and `./weekly.js` leaves the National list.
- `V2.pursuitRows` and `V4.ics` stay where they are, and the test asserts that `RadarWeekly` gives identical output.

- [ ] **Step 1: Write the failing tests**

Save as `/tmp/radar2-task05-tests.patch` (test files only: `national/test-v2.js`, `national/test-weekly.js`, `national/test.js`, `shared/test-cache.js`, `shared/test-weekly.js`), then run `git apply --whitespace=nowarn /tmp/radar2-task05-tests.patch`.

```diff
diff --git a/national/test-v2.js b/national/test-v2.js
--- a/national/test-v2.js
+++ b/national/test-v2.js
@@ -79,7 +79,8 @@ console.log('national v2 region tests passed');
   const csv = CP.toCSV(rows, today); assert.ok(csv.split('\n')[0].includes('Due') || csv.length > 0, 'capture CSV reused');
   const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8'), css = fs.readFileSync(path.join(__dirname, 'style.css'), 'utf8'), app = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
   assert.ok(html.includes('data-tab="pursuits"') && html.includes('id="v-pursuits"') && html.includes('id="btnPurPrint"') && html.includes('id="btnPurCsv"'));
-  assert.ok(/@media print\{[\s\S]*body\.print-weekly>\*:not\(#weekly\)\{display:none/.test(css) && !/visibility:hidden/.test(css.slice(css.indexOf('body.print-weekly'))), 'print stylesheet for the weekly list uses display:none, not visibility');
+  const scss = fs.readFileSync(path.join(__dirname, '..', 'shared', 'shell.css'), 'utf8');
+  assert.ok(/@media print\{[\s\S]*body\.print-weekly>\*:not\(#weekly\)\{display:none/.test(scss) && !/visibility:hidden/.test(scss.slice(scss.indexOf('body.print-weekly'))), 'print stylesheet for the weekly list uses display:none, not visibility');
   assert.ok(html.includes('id="weekly"') && ['wkPrint', 'wkShare', 'wkCopy', 'wkDl', 'wkClose'].every((k) => html.includes('id="' + k + '"')), 'weekly list sheet with its buttons');
   assert.ok(/btnPurCsv'\)\.addEventListener\('click', exportCapCsv\)/.test(app), 'pursuits CSV reuses the capture CSV export');
 }
diff --git a/national/test-weekly.js b/national/test-weekly.js
deleted file mode 100644
--- a/national/test-weekly.js
+++ /dev/null
@@ -1,14 +0,0 @@
-// v5.4 weekly list builders. Run alone: node national/test-weekly.js
-const assert = require('assert'); const W = require('./weekly.js'); const CP = require('../shared/capture.js');
-const fmt = (d) => d; const T = '2026-10-29';
-const rows = [{ id: 'a', week: true, flag: 'soon', cap: { due: '2026-11-02', decision: 'Go', next: 'Call PM', notes: 'Line1\nLine2 <b>' }, snap: { title: 'Drainage <PS&E>', agency: 'TxDOT', state: 'TX', url: 'https://example.test/a' } },
-  { id: 'b', week: false, flag: '', cap: { due: '', decision: 'Undecided' }, snap: { title: 'Water plant design', agency: 'City', state: 'WA' } }];
-const md = W.model(rows, T, CP, fmt);
-assert.strictEqual(md.week.length, 1); assert.strictEqual(md.later.length, 1); assert.strictEqual(md.later[0].due, 'No due date');
-const h = W.bodyHtml(md); assert.ok(h.indexOf('Drainage &lt;PS&amp;E&gt;') >= 0 && h.indexOf('<b>') === h.indexOf('<b>Due') , 'escaped');
-assert.ok(h.indexOf('This week') < h.indexOf('Later or no due date'), 'this week first');
-const t = W.text(md); assert.ok(/Next action: Call PM/.test(t) && /Go \/ No-go: Go/.test(t) && /TxDOT · TX/.test(t));
-const d = W.docHtml(md); assert.ok(/^<!doctype html>/.test(d) && !/<script|https?:\/\/(?!example\.test)/i.test(d), 'standalone file: no scripts, no external requests');
-assert.ok(!/github|repo/i.test(d + t));
-assert.ok(/No pursuits yet/.test(W.bodyHtml(W.model([], T, CP, fmt))));
-console.log('national weekly-list tests passed');
diff --git a/national/test.js b/national/test.js
--- a/national/test.js
+++ b/national/test.js
@@ -212,7 +212,6 @@ require('./test-v2.js');
 require('./test-v4.js');
 require('./test-ui.js');
 require('./test-v5.js');
-require('./test-weekly.js');
 require('./test-v6.js');
 require('./test-shell.js');
 require('./test-dormant.js');
diff --git a/shared/test-cache.js b/shared/test-cache.js
--- a/shared/test-cache.js
+++ b/shared/test-cache.js
@@ -14,7 +14,7 @@ function appDir(app) {
   if (app === 'texas') return path.join(root, 'texas');
   return root;
 }
-const sharedNames = ['storage.js', 'theme.js', 'filters.js', 'shell.js', 'capture.js', 'shell.css', 'cache.js'];
+const sharedNames = ['storage.js', 'theme.js', 'filters.js', 'shell.js', 'weekly.js', 'capture.js', 'shell.css', 'cache.js'];
 for (const app of ['national', 'texas', 'home']) {
   const list = C.files(app);
   assert.ok(Array.isArray(list) && list.length, app + ' file list');
diff --git a/shared/test-weekly.js b/shared/test-weekly.js
new file mode 100644
--- /dev/null
+++ b/shared/test-weekly.js
@@ -0,0 +1,58 @@
+// Shared weekly pursuits list (National and Texas). Run: node shared/test-weekly.js
+const assert = require('assert');
+const W = require('./weekly.js'), CP = require('./capture.js');
+const fmt = (d) => d; const T = '2026-10-29';
+// builders (moved unchanged from national/weekly.js)
+const rows = [{ id: 'a', week: true, flag: 'soon', cap: { due: '2026-11-02', decision: 'Go', next: 'Call PM', notes: 'Line1\nLine2 <b>' }, snap: { title: 'Drainage <PS&E>', agency: 'TxDOT', state: 'TX', url: 'https://example.test/a' } },
+  { id: 'b', week: false, flag: '', cap: { due: '', decision: 'Undecided' }, snap: { title: 'Water plant design', agency: 'City', state: 'WA' } }];
+const md = W.model(rows, T, CP, fmt);
+assert.strictEqual(md.week.length, 1); assert.strictEqual(md.later.length, 1); assert.strictEqual(md.later[0].due, 'No due date');
+const h = W.bodyHtml(md); assert.ok(h.indexOf('Drainage &lt;PS&amp;E&gt;') >= 0 && h.indexOf('<b>') === h.indexOf('<b>Due'), 'escaped');
+assert.ok(h.indexOf('This week') < h.indexOf('Later or no due date'), 'this week first');
+const t = W.text(md); assert.ok(/Next action: Call PM/.test(t) && /Go \/ No-go: Go/.test(t) && /TxDOT · TX/.test(t));
+const d = W.docHtml(md); assert.ok(/^<!doctype html>/.test(d) && !/<script|https?:\/\/(?!example\.test)/i.test(d), 'standalone file: no scripts, no external requests');
+assert.ok(!/github|repo/i.test(d + t));
+assert.ok(/No pursuits yet/.test(W.bodyHtml(W.model([], T, CP, fmt))));
+// pursuit rows: same result as National's V2.pursuitRows
+const V2 = require('../national/v2.js');
+const watch = { a: true, b: true, c: true };
+const cap = { a: CP.clean({ due: '2026-11-20', decision: 'Go' }), b: CP.clean({ due: '2026-10-25', next: 'call PM' }), c: CP.clean({}), d: CP.clean({ due: '2026-11-02', notes: 'not starred, has notes' }), e: CP.clean({}) };
+const snaps = { a: { title: 'A' }, b: { title: 'B' }, c: { title: 'C' }, d: { title: 'D' } };
+const pr = W.pursuitRows(watch, cap, (id) => snaps[id], T, CP);
+assert.deepStrictEqual(pr.map((r) => r.id), ['b', 'd', 'a', 'c'], 'overdue first, no date last, empty unstarred capture left out');
+assert.deepStrictEqual(pr.map((r) => r.week), [true, true, false, false], 'this week = overdue or due within 7 days');
+assert.deepStrictEqual(pr, V2.pursuitRows(watch, cap, (id) => snaps[id], T, CP), 'identical to National v2 rows');
+// calendar: National output unchanged; Texas names itself
+const V4 = require('../national/v4.js');
+const ev = [{ uid: 'due-x', date: '2026-11-20', title: 'Due: X, Y', desc: 'a\nb', url: 'https://example.test/x', alarms: ['P7D', 'P1D'] }];
+assert.strictEqual(W.ics(ev, '2026-10-29T12:00:00.000Z', 'National Radar: My pursuits'), V4.ics(ev, '2026-10-29T12:00:00.000Z', 'National Radar: My pursuits'), 'National .ics unchanged');
+const tx = W.ics(ev, '2026-10-29T12:00:00.000Z', 'Texas Radar: My pursuits', 'Texas Radar');
+assert.ok(tx.includes('PRODID:-//Texas Radar//Pursuits//EN') && tx.includes('UID:due-x@texas-radar') && tx.includes('X-WR-CALNAME:Texas Radar: My pursuits') && tx.includes('TRIGGER:-P7D') && tx.includes('TRIGGER:-P1D'));
+const de = W.dueEvents([{ id: 'p', cap: { due: '2026-11-19', decision: 'Go', next: 'Call' }, snap: { title: 'Lamar', agency: 'City of Austin', url: 'https://example.test/p' }, dueFrom: 'source' }, { id: 'q', cap: { due: '' }, snap: { title: 'No date' } }]);
+assert.strictEqual(de.length, 1, 'rows without a due date make no event');
+assert.ok(de[0].uid === 'due-p' && de[0].date === '2026-11-19' && de[0].title === 'Due: Lamar' && /Next action: Call/.test(de[0].desc) && /Decision: Go/.test(de[0].desc) && /stated by the source/.test(de[0].desc));
+assert.ok(/from your capture file/.test(W.dueEvents([{ id: 'r', cap: { due: '2026-11-19' }, snap: { title: 'R' } }])[0].desc));
+// the Weekly list sheet controller, on a tiny fake DOM
+function el(id) { const cls = new Set(); return { id, hidden: true, textContent: '', innerHTML: '', focused: false, l: {}, classList: { add: (...c) => c.forEach((x) => cls.add(x)), remove: (...c) => c.forEach((x) => cls.delete(x)), contains: (c) => cls.has(c) }, addEventListener(t, f) { this.l[t] = f; }, focus() { this.focused = true; }, appendChild() {} }; }
+const ids = ['weekly', 'wkBody', 'wkHint', 'wkClose', 'wkPrint', 'wkShare', 'wkCopy', 'wkDl', 'btnPurPrint'], E = {}; ids.forEach((i) => { E[i] = el(i); });
+const docL = {}, doc = { body: el('body'), getElementById: (i) => E[i] || null, addEventListener: (t, f) => { docL[t] = f; } };
+const winL = {}, saved = [], toasts = [];
+const win = { navigator: {}, addEventListener: (t, f) => { winL[t] = f; }, setTimeout: (f) => f() };
+const sheet = W.bindSheet({ doc, win, model: () => md, fileName: (ext) => 'texas-radar-weekly-' + T + '.' + ext, back: 'btnPurPrint', toast: (x) => toasts.push(x), download: (...a) => saved.push(a) });
+sheet.open();
+assert.ok(!E.weekly.hidden && doc.body.classList.contains('wk-open') && E.wkBody.innerHTML.includes('My pursuits') && E.wkShare.hidden && E.wkClose.focused, 'open: sheet shown, Share hidden without navigator.share');
+E.wkPrint.l.click();
+assert.ok(/Printing is not available here/.test(E.wkHint.textContent), 'no window.print: a plain hint, no error');
+E.wkDl.l.click();
+assert.deepStrictEqual(saved[0].slice(0, 2), ['texas-radar-weekly-2026-10-29.html', 'text/html;charset=utf-8']); assert.ok(/^<!doctype html>/.test(saved[0][2]) && saved[0][3] === false);
+docL.keydown({ key: 'Escape' });
+assert.ok(E.weekly.hidden && !doc.body.classList.contains('wk-open') && E.btnPurPrint.focused, 'Escape closes and returns focus');
+let printed = 0; win.print = () => { printed++; }; sheet.print();
+assert.ok(printed === 1 && !doc.body.classList.contains('print-weekly'), 'print runs, then the print class is cleared');
+// National loads the shared module instead of national/weekly.js
+const fs = require('fs'), path = require('path'), root = path.resolve(__dirname, '..');
+const nh = fs.readFileSync(path.join(root, 'national/index.html'), 'utf8'), na = fs.readFileSync(path.join(root, 'national/app.js'), 'utf8');
+assert.ok(nh.includes('<script src="../shared/weekly.js" onerror="RadarLoadError(this.src||this.href)"></script>') && !nh.includes('<script src="weekly.js">'), 'National loads shared/weekly.js');
+assert.ok(/var WKS = RadarWeekly\.bindSheet\(\{ doc: document, win: window/.test(na) && !/\bNRW\./.test(na) && /\$\('btnPurPrint'\)\.addEventListener\('click', WKS\.open\)/.test(na), 'National uses the shared Weekly list sheet');
+assert.ok(!fs.existsSync(path.join(root, 'national/weekly.js')) && !fs.existsSync(path.join(root, 'national/test-weekly.js')), 'national/weekly.js moved to shared/weekly.js');
+console.log('shared weekly-list tests passed');
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
node national/test-v2.js
node shared/test-cache.js
node shared/test-weekly.js
```

Expected:

- `node national/test-v2.js`: exit 1, with `AssertionError [ERR_ASSERTION]: print stylesheet for the weekly list uses display:none, not visibility`
- `node shared/test-cache.js`: exit 1, with `AssertionError [ERR_ASSERTION]: national lists shared/weekly.js`
- `node shared/test-weekly.js`: exit 1, with `Error: Cannot find module './weekly.js'`

- [ ] **Step 3: Implement**

Save as `/tmp/radar2-task05-impl.patch`, then run `git apply --whitespace=nowarn /tmp/radar2-task05-impl.patch`.

```diff
diff --git a/national/app.js b/national/app.js
--- a/national/app.js
+++ b/national/app.js
@@ -620,32 +620,8 @@
     $('purList').innerHTML = rows.length ? (wk.length ? '<h3>This week: overdue or due within 7 days (' + wk.length + ')</h3>' + wk.map(purItem).join('') : '<p class="note">Nothing overdue or due in the next 7 days.</p>') + (rest.length ? '<h3>Later or no due date (' + rest.length + ')</h3>' + rest.map(purItem).join('') : '')
       : '<p class="note empty">No pursuits yet. Star a record (&#9734;) in the List or Map to start a capture file; it shows up here with its due date, Go / No-go and next action.</p>';
   }
-  // v5.4: the weekly list opens as an in-app sheet (works even where window.print() is missing, e.g. iOS home-screen apps)
-  var WK = null;
-  function weeklyModel() { return NRW.model(purRows(), todayCentral(), CP, M.fmtDate); }
-  function printPursuits() { WK = weeklyModel(); $('wkBody').innerHTML = NRW.bodyHtml(WK); $('wkHint').textContent = ''; $('weekly').hidden = false; document.body.classList.add('wk-open'); $('wkShare').hidden = !navigator.share; $('wkClose').focus(); }
-  function closeWeekly() { $('weekly').hidden = true; document.body.classList.remove('wk-open', 'print-weekly'); $('btnPurPrint').focus(); }
-  function endPrint() { document.body.classList.remove('print-weekly'); }
-  function weeklyPrint() {
-    if (typeof window.print !== 'function') { $('wkHint').textContent = 'Printing is not available here. Use Share, Download or Copy text instead.'; return; }
-    document.body.classList.add('print-weekly');
-    setTimeout(function () { try { window.print(); } catch (e) { $('wkHint').textContent = 'Printing did not start. Use Share or Download, then print from that app.'; } setTimeout(endPrint, 1500); }, 60);
-    $('wkHint').textContent = 'If no print dialog appears (some iPhone home-screen apps), use Share or Download and print from there.';
-  }
-  function weeklyName(ext) { return 'national-radar-weekly-' + todayCentral() + '.' + ext; }
-  function weeklyShare() {
-    var md = WK || weeklyModel(), txt = NRW.text(md), data = { title: md.heading, text: txt };
-    try { var f = new File([NRW.docHtml(md)], weeklyName('html'), { type: 'text/html' }); if (navigator.canShare && navigator.canShare({ files: [f] })) data = { title: md.heading, text: md.heading, files: [f] }; } catch (e) { /* files not supported */ }
-    navigator.share(data).catch(function (e) { if (e && e.name !== 'AbortError') { if (data.files) navigator.share({ title: md.heading, text: txt }).catch(function () {}); } });
-  }
-  function weeklyCopy() {
-    var txt = NRW.text(WK || weeklyModel()), ok = function () { toast('Weekly list copied.'); $('wkHint').textContent = 'Copied. Paste it into a note, email or message.'; };
-    var fallback = function () { var ta = document.createElement('textarea'); ta.value = txt; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.top = '0'; ta.style.opacity = '0'; $('weekly').appendChild(ta); ta.select(); ta.setSelectionRange(0, txt.length); var done = false; try { done = document.execCommand('copy'); } catch (e) { done = false; } ta.remove(); if (done) ok(); else $('wkHint').textContent = 'Copy is blocked here. Select the list below and copy it, or use Download.'; };
-    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(ok, fallback); else fallback();
-  }
-  function weeklyDownload() { download(weeklyName('html'), 'text/html;charset=utf-8', NRW.docHtml(WK || weeklyModel()), false); $('wkHint').textContent = 'Saved as an HTML file. Open it to print or share.'; }
-  window.addEventListener('afterprint', endPrint);
-  if (window.matchMedia) { var mqp = window.matchMedia('print'); var onMq = function (e) { if (!e.matches) endPrint(); }; if (mqp.addEventListener) mqp.addEventListener('change', onMq); else if (mqp.addListener) mqp.addListener(onMq); }
+  // weekly list sheet: shared/weekly.js (Texas uses the same sheet)
+  var WKS = RadarWeekly.bindSheet({ doc: document, win: window, model: function () { return RadarWeekly.model(purRows(), todayCentral(), CP, M.fmtDate); }, fileName: function (ext) { return 'national-radar-weekly-' + todayCentral() + '.' + ext; }, back: 'btnPurPrint', toast: toast, download: download });
 
   // ---------- detail sheet ----------
   function openSheet(id) {
@@ -837,7 +813,7 @@
   document.addEventListener('click', function (e) { var w = e.target.closest('[data-way]'); if (w) wayOut(w.getAttribute('data-way')); });
   $('btnPurIcs').addEventListener('click', exportPursuitIcs); $('btnViewIcs').addEventListener('click', exportViewIcs);
   $('since').addEventListener('click', function (e) { if (e.target.closest('#sinceX')) { try { ssn && ssn.setItem(V4.SINCE_DISMISS, '1'); } catch (er) {} $('since').hidden = true; return; } var b = e.target.closest('[data-since]'); if (b) sinceTap(b.getAttribute('data-since')); });
-  $('btnCapCsv').addEventListener('click', exportCapCsv); $('btnPurCsv').addEventListener('click', exportCapCsv); $('btnPurPrint').addEventListener('click', printPursuits); $('wkClose').addEventListener('click', closeWeekly); $('wkPrint').addEventListener('click', weeklyPrint); $('wkShare').addEventListener('click', weeklyShare); $('wkCopy').addEventListener('click', weeklyCopy); $('wkDl').addEventListener('click', weeklyDownload); document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('weekly').hidden) closeWeekly(); }); $('btnBackup').addEventListener('click', exportBackup);
+  $('btnCapCsv').addEventListener('click', exportCapCsv); $('btnPurCsv').addEventListener('click', exportCapCsv); $('btnPurPrint').addEventListener('click', WKS.open); $('btnBackup').addEventListener('click', exportBackup);
   $('btnRestore').addEventListener('click', function () { S.restoreMode = 'merge'; $('restoreFile').value = ''; $('restoreFile').click(); });
   $('btnRestoreAll').addEventListener('click', function () { S.restoreMode = 'replace'; $('restoreFile').value = ''; $('restoreFile').click(); });
   $('restoreFile').addEventListener('change', function () { var f = this.files && this.files[0]; if (!f) return; var rd = new FileReader(); rd.onload = function () { restoreBackup(String(rd.result), S.restoreMode); }; rd.onerror = function () { toast('Could not read that file.'); }; rd.readAsText(f); });
diff --git a/national/index.html b/national/index.html
--- a/national/index.html
+++ b/national/index.html
@@ -223,7 +223,7 @@ window.RadarLoadError=function(name){
 <script src="roadway.js"></script>
 <script src="pse.js"></script>
 <script src="sources.js"></script>
-<script src="weekly.js"></script>
+<script src="../shared/weekly.js" onerror="RadarLoadError(this.src||this.href)"></script>
 <script src="v6.js"></script>
 <script src="app.js"></script>
 </body>
diff --git a/national/style.css b/national/style.css
--- a/national/style.css
+++ b/national/style.css
@@ -178,33 +178,8 @@ details.cap>summary{min-height:44px;display:flex;align-items:center;cursor:point
 .rhint{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin:0;font-size:14px;color:var(--ink)}.rhint[hidden],.txlink[hidden]{display:none}
 
 /* v2: My pursuits */
-.purhead{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px}.purhead h2{margin:8px 0;font-size:20px}
-.purbtns{display:flex;gap:8px;flex-wrap:wrap}
-.purcap{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}.purnotes{margin:6px 0 0;white-space:pre-wrap}
-.tabs button{position:relative}.tabbadge{position:absolute;top:6px;right:calc(50% - 40px);min-width:16px;padding:0 4px;border-radius:999px;background:#fbbf24;color:#111;font-size:10px;line-height:16px}.tabbadge[hidden]{display:none}
-.purlink{display:inline-flex;align-items:center;min-height:36px;font-size:13px;color:var(--acc);margin-top:4px}
 #v-pursuits{padding:0 12px}
 @media (max-width:420px){.tabs button{font-size:12px;letter-spacing:-.01em}}
-/* v5.4 Weekly list sheet: always white and readable, whatever the app theme */
-.wk-sheet{position:fixed;inset:0;z-index:1000;background:#fff;color:#111;overflow-y:auto;-webkit-overflow-scrolling:touch;color-scheme:light}
-.wk-sheet[hidden]{display:none}
-.wk-bar{position:sticky;top:0;background:#f3f4f6;border-bottom:1px solid #d1d5db;padding:calc(8px + env(safe-area-inset-top)) 12px 8px;display:flex;flex-wrap:wrap;align-items:center;gap:8px}
-.wk-bt{flex:1;font-size:17px;color:#111}.wk-acts{display:flex;flex-wrap:wrap;gap:8px;width:100%}
-.wk-btn{min-height:44px;padding:0 14px;border-radius:10px;border:1px solid #9ca3af;background:#fff;color:#111;font:600 15px/1 -apple-system,system-ui,sans-serif;cursor:pointer}
-.wk-btn.pri{background:#1d4ed8;border-color:#1d4ed8;color:#fff}.wk-hint{margin:0;width:100%;font-size:13px;color:#374151}.wk-hint:empty{display:none}
-.wk-doc{padding:12px 16px calc(24px + env(safe-area-inset-bottom));max-width:820px;margin:0 auto}
-.wk-doc .wk-title{font-size:20px;margin:0 0 8px;color:#111}.wk-doc .wk-h{font-size:16px;margin:16px 0 6px;border-bottom:2px solid #111;padding-bottom:2px;color:#111}
-.wk-doc .wk-l{margin:0;padding-left:22px}.wk-doc .wk-i{margin:0 0 10px;padding:6px 8px;border:1px solid #999;border-left:4px solid #111;break-inside:avoid;page-break-inside:avoid;color:#111}
-.wk-doc .wk-i.overdue{border-left-color:#b91c1c}.wk-doc .wk-i.soon{border-left-color:#b45309}.wk-doc .wk-t{font-weight:700}.wk-doc .wk-w,.wk-doc .wk-u{color:#333;font-size:13px}.wk-doc .wk-u{word-break:break-all}
-.wk-doc .wk-m{display:flex;flex-wrap:wrap;gap:4px 16px}.wk-doc .wk-notes{white-space:pre-wrap}.wk-doc .wk-e{color:#333}
-body.wk-open{overflow:hidden}
-@media print{
-  body.print-weekly>*:not(#weekly){display:none!important}
-  body.print-weekly{background:#fff!important;color:#000!important;overflow:visible!important}
-  body.print-weekly #weekly{position:static!important;display:block!important;overflow:visible!important;inset:auto;height:auto}
-  body.print-weekly .wk-bar{display:none!important}
-  body.print-weekly .wk-doc{padding:0;max-width:none}
-}
 
 /* v2: Confirmed-only switch, also-listed tag */
 .switch{display:inline-flex;align-items:center;gap:10px;min-height:44px;padding:0 16px 0 8px;border-radius:22px;border:1px solid var(--line);background:var(--panel);color:var(--ink);font:600 14px/1 system-ui,-apple-system,sans-serif;cursor:pointer}
diff --git a/national/weekly.js b/national/weekly.js
deleted file mode 100644
--- a/national/weekly.js
+++ /dev/null
@@ -1,33 +0,0 @@
-/* Weekly pursuits list: plain HTML / text builders (browser + Node). Used by the in-app Weekly list sheet, Share, Copy and Download. */
-(function (root, factory) { if (typeof module === 'object' && module.exports) module.exports = factory(); else root.NRW = factory(); })(this, function () {
-  'use strict';
-  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
-  function item(r, today, CP, fmtDate) {
-    var c = r.cap || {}, sn = r.snap || {};
-    return { title: sn.title || r.id, where: [sn.agency, sn.state].filter(Boolean).join(' · '), due: c.due ? fmtDate(c.due) + ' (' + CP.dueText(c.due, today) + ')' : 'No due date', flag: r.flag || '', decision: c.decision || 'Undecided', next: c.next || '', notes: c.notes || '', url: sn.url || '' };
-  }
-  function model(rows, today, CP, fmtDate) {
-    var m = function (r) { return item(r, today, CP, fmtDate); };
-    return { today: today, heading: 'My pursuits: week of ' + fmtDate(today), week: rows.filter(function (r) { return r.week; }).map(m), later: rows.filter(function (r) { return !r.week; }).map(m) };
-  }
-  function itemHtml(x) {
-    return '<li class="wk-i ' + esc(x.flag) + '"><div class="wk-t">' + esc(x.title) + '</div>' + (x.where ? '<div class="wk-w">' + esc(x.where) + '</div>' : '') +
-      '<div class="wk-m"><span><b>Due:</b> ' + esc(x.due) + '</span><span><b>Go / No-go:</b> ' + esc(x.decision) + '</span></div>' +
-      (x.next ? '<div class="wk-n"><b>Next action:</b> ' + esc(x.next) + '</div>' : '') + (x.notes ? '<div class="wk-notes"><b>Notes:</b> ' + esc(x.notes) + '</div>' : '') +
-      (x.url ? '<div class="wk-u">' + esc(x.url) + '</div>' : '') + '</li>';
-  }
-  function bodyHtml(md) {
-    var sec = function (h, list, empty) { return '<h2 class="wk-h">' + esc(h) + ' (' + list.length + ')</h2>' + (list.length ? '<ol class="wk-l">' + list.map(itemHtml).join('') + '</ol>' : '<p class="wk-e">' + esc(empty) + '</p>'); };
-    if (!md.week.length && !md.later.length) return '<h1 class="wk-title">' + esc(md.heading) + '</h1><p class="wk-e">No pursuits yet. Star a record to start a capture file.</p>';
-    return '<h1 class="wk-title">' + esc(md.heading) + '</h1>' + sec('This week: overdue or due within 7 days', md.week, 'Nothing overdue or due in the next 7 days.') + (md.later.length ? sec('Later or no due date', md.later, '') : '');
-  }
-  function text(md) {
-    var out = [md.heading, ''], one = function (x, i) { out.push((i + 1) + '. ' + x.title); if (x.where) out.push('   ' + x.where); out.push('   Due: ' + x.due + ' | Go / No-go: ' + x.decision); if (x.next) out.push('   Next action: ' + x.next); if (x.notes) out.push('   Notes: ' + x.notes); if (x.url) out.push('   ' + x.url); out.push(''); };
-    out.push('THIS WEEK: overdue or due within 7 days (' + md.week.length + ')'); if (!md.week.length) out.push('Nothing overdue or due in the next 7 days.', ''); md.week.forEach(one);
-    if (md.later.length) { out.push('LATER OR NO DUE DATE (' + md.later.length + ')'); md.later.forEach(one); }
-    return out.join('\n').trim() + '\n';
-  }
-  var CSS = 'body{font:15px/1.45 -apple-system,system-ui,Segoe UI,Roboto,sans-serif;color:#111;background:#fff;margin:0;padding:16px}.wk-title{font-size:20px;margin:0 0 8px}.wk-h{font-size:16px;margin:16px 0 6px;border-bottom:2px solid #111;padding-bottom:2px}.wk-l{margin:0;padding-left:22px}.wk-i{margin:0 0 10px;padding:6px 8px;border:1px solid #999;border-left:4px solid #111;break-inside:avoid;page-break-inside:avoid}.wk-i.overdue{border-left-color:#b91c1c}.wk-i.soon{border-left-color:#b45309}.wk-t{font-weight:700}.wk-w,.wk-u{color:#333;font-size:13px}.wk-u{word-break:break-all}.wk-m{display:flex;flex-wrap:wrap;gap:4px 16px}.wk-notes{white-space:pre-wrap}.wk-e{color:#333}';
-  function docHtml(md) { return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + esc(md.heading) + '</title><style>' + CSS + '</style></head><body>' + bodyHtml(md) + '</body></html>'; }
-  return { model: model, bodyHtml: bodyHtml, text: text, docHtml: docHtml, CSS: CSS };
-});
diff --git a/shared/cache.js b/shared/cache.js
--- a/shared/cache.js
+++ b/shared/cache.js
@@ -5,7 +5,7 @@
 })(typeof self !== 'undefined' ? self : this, function () {
   'use strict';
   var VERSION = 22;
-  var SHARED = ['storage.js', 'theme.js', 'filters.js', 'shell.js', 'capture.js', 'shell.css', 'cache.js'];
+  var SHARED = ['storage.js', 'theme.js', 'filters.js', 'shell.js', 'weekly.js', 'capture.js', 'shell.css', 'cache.js'];
   function shared(prefix) { return SHARED.map(function (f) { return prefix + f; }); }
   function name(app) {
     var prefix = app === 'texas' ? 'radars-texas-' : app === 'home' ? 'radars-home-' : 'radars-national-';
@@ -18,7 +18,7 @@
     if (app === 'texas') {
       return ['./', './index.html', './style.css', './magazine.css', './app.js', './model.js', './map.js', './intel.js', './intel-ui.js', './newsletter.js', './magazine.js', './texas-geo.js', './data/opportunities.json', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'].concat(shared('../shared/'));
     }
-    return ['./', './index.html', './style.css', './proj.js', './us-geo.js', './v2.js', './v4.js', './combined.js', './weekly.js', './v6.js', './model.js', './cost.js', './roadway.js', './pse.js', './sources.js', './app.js', './data/national.json', './data/roadway.json', './data/pse.json', './data/cost-prices.json', './data/source-status.json', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'].concat(shared('../shared/'));
+    return ['./', './index.html', './style.css', './proj.js', './us-geo.js', './v2.js', './v4.js', './combined.js', './v6.js', './model.js', './cost.js', './roadway.js', './pse.js', './sources.js', './app.js', './data/national.json', './data/roadway.json', './data/pse.json', './data/cost-prices.json', './data/source-status.json', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'].concat(shared('../shared/'));
   }
   return { VERSION: VERSION, name: name, files: files };
 });
diff --git a/shared/shell.css b/shared/shell.css
--- a/shared/shell.css
+++ b/shared/shell.css
@@ -34,3 +34,30 @@
   .shell-cols > .sheet.shell-docked .sheet-bg{display:none}
   .shell-cols > .sheet.shell-docked .sheet-card{position:static;width:auto;max-width:none;max-height:none;margin:0;border:1px solid var(--line);border-radius:12px;box-shadow:none}
 }
+
+/* Pursuits header and the Weekly list sheet (shared/weekly.js), moved from national/style.css */
+.purhead{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px}.purhead h2{margin:8px 0;font-size:20px}
+.purbtns{display:flex;gap:8px;flex-wrap:wrap}
+.purcap{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}.purnotes{margin:6px 0 0;white-space:pre-wrap}
+.tabs button{position:relative}.tabbadge{position:absolute;top:6px;right:calc(50% - 40px);min-width:16px;padding:0 4px;border-radius:999px;background:#fbbf24;color:#111;font-size:10px;line-height:16px}.tabbadge[hidden]{display:none}
+.purlink{display:inline-flex;align-items:center;min-height:36px;font-size:13px;color:var(--acc);margin-top:4px}
+/* v5.4 Weekly list sheet: always white and readable, whatever the app theme */
+.wk-sheet{position:fixed;inset:0;z-index:1000;background:#fff;color:#111;overflow-y:auto;-webkit-overflow-scrolling:touch;color-scheme:light}
+.wk-sheet[hidden]{display:none}
+.wk-bar{position:sticky;top:0;background:#f3f4f6;border-bottom:1px solid #d1d5db;padding:calc(8px + env(safe-area-inset-top)) 12px 8px;display:flex;flex-wrap:wrap;align-items:center;gap:8px}
+.wk-bt{flex:1;font-size:17px;color:#111}.wk-acts{display:flex;flex-wrap:wrap;gap:8px;width:100%}
+.wk-btn{min-height:44px;padding:0 14px;border-radius:10px;border:1px solid #9ca3af;background:#fff;color:#111;font:600 15px/1 -apple-system,system-ui,sans-serif;cursor:pointer}
+.wk-btn.pri{background:#1d4ed8;border-color:#1d4ed8;color:#fff}.wk-hint{margin:0;width:100%;font-size:13px;color:#374151}.wk-hint:empty{display:none}
+.wk-doc{padding:12px 16px calc(24px + env(safe-area-inset-bottom));max-width:820px;margin:0 auto}
+.wk-doc .wk-title{font-size:20px;margin:0 0 8px;color:#111}.wk-doc .wk-h{font-size:16px;margin:16px 0 6px;border-bottom:2px solid #111;padding-bottom:2px;color:#111}
+.wk-doc .wk-l{margin:0;padding-left:22px}.wk-doc .wk-i{margin:0 0 10px;padding:6px 8px;border:1px solid #999;border-left:4px solid #111;break-inside:avoid;page-break-inside:avoid;color:#111}
+.wk-doc .wk-i.overdue{border-left-color:#b91c1c}.wk-doc .wk-i.soon{border-left-color:#b45309}.wk-doc .wk-t{font-weight:700}.wk-doc .wk-w,.wk-doc .wk-u{color:#333;font-size:13px}.wk-doc .wk-u{word-break:break-all}
+.wk-doc .wk-m{display:flex;flex-wrap:wrap;gap:4px 16px}.wk-doc .wk-notes{white-space:pre-wrap}.wk-doc .wk-e{color:#333}
+body.wk-open{overflow:hidden}
+@media print{
+  body.print-weekly>*:not(#weekly){display:none!important}
+  body.print-weekly{background:#fff!important;color:#000!important;overflow:visible!important}
+  body.print-weekly #weekly{position:static!important;display:block!important;overflow:visible!important;inset:auto;height:auto}
+  body.print-weekly .wk-bar{display:none!important}
+  body.print-weekly .wk-doc{padding:0;max-width:none}
+}
diff --git a/shared/weekly.js b/shared/weekly.js
new file mode 100644
--- /dev/null
+++ b/shared/weekly.js
@@ -0,0 +1,103 @@
+/* Weekly pursuits list for National and Texas (browser + Node): pursuit rows, the plain HTML / text builders,
+   calendar (.ics) due-date events, and the in-app Weekly list sheet (Print, Share, Copy text, Download).
+   Moved from national/weekly.js (NRW) in Radar 2.0; the builders are unchanged. */
+(function (root, factory) { if (typeof module === 'object' && module.exports) module.exports = factory(); else root.RadarWeekly = factory(); })(typeof self !== 'undefined' ? self : this, function () {
+  'use strict';
+  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
+  // starred records plus records with a non-empty capture file, sorted by due date (overdue first, no date last)
+  function pursuitRows(watch, cap, snapFn, today, CP) {
+    var ids = {}; Object.keys(watch || {}).forEach(function (id) { ids[id] = 1; });
+    Object.keys(cap || {}).forEach(function (id) { if (cap[id] && !CP.isEmpty(cap[id])) ids[id] = 1; });
+    var rows = Object.keys(ids).map(function (id) { var c = (cap && cap[id]) || CP.blank(), sn = snapFn(id) || (c.snap) || { title: id }; var d = CP.dueInfo(c.due, today); return { id: id, cap: c, snap: sn, title: sn.title, flag: d.flag, days: d.days, week: d.flag === 'overdue' || (d.days !== null && d.days <= 7) }; });
+    return CP.sortRows(rows, 'due');
+  }
+  function item(r, today, CP, fmtDate) {
+    var c = r.cap || {}, sn = r.snap || {};
+    return { title: sn.title || r.id, where: [sn.agency, sn.state].filter(Boolean).join(' · '), due: c.due ? fmtDate(c.due) + ' (' + CP.dueText(c.due, today) + ')' : 'No due date', flag: r.flag || '', decision: c.decision || 'Undecided', next: c.next || '', notes: c.notes || '', url: sn.url || '' };
+  }
+  function model(rows, today, CP, fmtDate) {
+    var m = function (r) { return item(r, today, CP, fmtDate); };
+    return { today: today, heading: 'My pursuits: week of ' + fmtDate(today), week: rows.filter(function (r) { return r.week; }).map(m), later: rows.filter(function (r) { return !r.week; }).map(m) };
+  }
+  function itemHtml(x) {
+    return '<li class="wk-i ' + esc(x.flag) + '"><div class="wk-t">' + esc(x.title) + '</div>' + (x.where ? '<div class="wk-w">' + esc(x.where) + '</div>' : '') +
+      '<div class="wk-m"><span><b>Due:</b> ' + esc(x.due) + '</span><span><b>Go / No-go:</b> ' + esc(x.decision) + '</span></div>' +
+      (x.next ? '<div class="wk-n"><b>Next action:</b> ' + esc(x.next) + '</div>' : '') + (x.notes ? '<div class="wk-notes"><b>Notes:</b> ' + esc(x.notes) + '</div>' : '') +
+      (x.url ? '<div class="wk-u">' + esc(x.url) + '</div>' : '') + '</li>';
+  }
+  function bodyHtml(md) {
+    var sec = function (h, list, empty) { return '<h2 class="wk-h">' + esc(h) + ' (' + list.length + ')</h2>' + (list.length ? '<ol class="wk-l">' + list.map(itemHtml).join('') + '</ol>' : '<p class="wk-e">' + esc(empty) + '</p>'); };
+    if (!md.week.length && !md.later.length) return '<h1 class="wk-title">' + esc(md.heading) + '</h1><p class="wk-e">No pursuits yet. Star a record to start a capture file.</p>';
+    return '<h1 class="wk-title">' + esc(md.heading) + '</h1>' + sec('This week: overdue or due within 7 days', md.week, 'Nothing overdue or due in the next 7 days.') + (md.later.length ? sec('Later or no due date', md.later, '') : '');
+  }
+  function text(md) {
+    var out = [md.heading, ''], one = function (x, i) { out.push((i + 1) + '. ' + x.title); if (x.where) out.push('   ' + x.where); out.push('   Due: ' + x.due + ' | Go / No-go: ' + x.decision); if (x.next) out.push('   Next action: ' + x.next); if (x.notes) out.push('   Notes: ' + x.notes); if (x.url) out.push('   ' + x.url); out.push(''); };
+    out.push('THIS WEEK: overdue or due within 7 days (' + md.week.length + ')'); if (!md.week.length) out.push('Nothing overdue or due in the next 7 days.', ''); md.week.forEach(one);
+    if (md.later.length) { out.push('LATER OR NO DUE DATE (' + md.later.length + ')'); md.later.forEach(one); }
+    return out.join('\n').trim() + '\n';
+  }
+  var CSS = 'body{font:15px/1.45 -apple-system,system-ui,Segoe UI,Roboto,sans-serif;color:#111;background:#fff;margin:0;padding:16px}.wk-title{font-size:20px;margin:0 0 8px}.wk-h{font-size:16px;margin:16px 0 6px;border-bottom:2px solid #111;padding-bottom:2px}.wk-l{margin:0;padding-left:22px}.wk-i{margin:0 0 10px;padding:6px 8px;border:1px solid #999;border-left:4px solid #111;break-inside:avoid;page-break-inside:avoid}.wk-i.overdue{border-left-color:#b91c1c}.wk-i.soon{border-left-color:#b45309}.wk-t{font-weight:700}.wk-w,.wk-u{color:#333;font-size:13px}.wk-u{word-break:break-all}.wk-m{display:flex;flex-wrap:wrap;gap:4px 16px}.wk-notes{white-space:pre-wrap}.wk-e{color:#333}';
+  function docHtml(md) { return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + esc(md.heading) + '</title><style>' + CSS + '</style></head><body>' + bodyHtml(md) + '</body></html>'; }
+  // ---- calendar: all-day due-date events with reminders 1 week and 1 day before ----
+  function pad(n) { return (n < 10 ? '0' : '') + n; }
+  function icsEsc(s) { return String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n'); }
+  function u8len(s) { var n = 0; for (var i = 0; i < s.length; i++) { var c = s.charCodeAt(i); n += c < 0x80 ? 1 : c < 0x800 ? 2 : (c >= 0xd800 && c < 0xdc00) ? 4 : (c >= 0xdc00 && c < 0xe000) ? 0 : 3; } return n; }
+  function fold(line) { var out = [], cur = ''; Array.from(line).forEach(function (ch) { if (u8len(cur + ch) > 74) { out.push(cur); cur = ' ' + ch; } else cur += ch; }); out.push(cur); return out.join('\r\n'); }
+  function nextDay(d) { var x = new Date(Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10) + 1)); return x.getUTCFullYear() + pad(x.getUTCMonth() + 1) + pad(x.getUTCDate()); }
+  function slug(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
+  // events [{ uid, date, title, desc, url, alarms }] -> text/calendar; appName names the calendar product and the UID domain
+  function ics(events, nowIso, calName, appName) {
+    var app = appName || 'National Radar', stamp = String(nowIso || new Date().toISOString()).replace(/[-:]/g, '').replace(/\.\d+/, '').slice(0, 15) + 'Z';
+    var L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//' + app + '//Pursuits//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:' + icsEsc(calName || app)];
+    (events || []).filter(function (e) { return e && /^\d{4}-\d{2}-\d{2}$/.test(e.date || ''); }).forEach(function (e) {
+      L.push('BEGIN:VEVENT', 'UID:' + icsEsc(e.uid) + '@' + slug(app), 'DTSTAMP:' + stamp, 'DTSTART;VALUE=DATE:' + e.date.replace(/-/g, ''), 'DTEND;VALUE=DATE:' + nextDay(e.date), 'SUMMARY:' + icsEsc(e.title), 'TRANSP:TRANSPARENT');
+      if (e.desc) L.push('DESCRIPTION:' + icsEsc(e.desc)); if (e.url) L.push('URL:' + icsEsc(e.url));
+      (e.alarms || []).forEach(function (a) { L.push('BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + icsEsc(e.title), 'TRIGGER:-' + a, 'END:VALARM'); });
+      L.push('END:VEVENT');
+    });
+    L.push('END:VCALENDAR');
+    return L.map(fold).join('\r\n') + '\r\n';
+  }
+  // pursuit rows -> one due-date event per row that has a due date (row.dueFrom === 'source' marks a date stated by the source)
+  function dueEvents(rows) {
+    var ev = [];
+    (rows || []).forEach(function (r) {
+      var c = r.cap || {}, sn = r.snap || {}, t = sn.title || r.title || r.id; if (!c.due) return;
+      var desc = [sn.agency, sn.url ? 'Source: ' + sn.url : null, c.next ? 'Next action: ' + c.next : null, c.decision && c.decision !== 'Undecided' ? 'Decision: ' + c.decision : null].filter(Boolean).join('\n');
+      ev.push({ uid: 'due-' + r.id, date: c.due, title: 'Due: ' + t, desc: desc + (r.dueFrom === 'source' ? '\n(due date stated by the source)' : '\n(due date from your capture file)'), url: sn.url || null, alarms: ['P7D', 'P1D'] });
+    });
+    return ev;
+  }
+  // ---- the in-app Weekly list sheet (#weekly, #wkBody, #wkHint, #wkClose, #wkPrint, #wkShare, #wkCopy, #wkDl) ----
+  // o: { doc, win, model: () => md, fileName: (ext) => name, back: id to focus on close, toast: fn(text), download: fn(name, type, text, bom) }
+  function bindSheet(o) {
+    var doc = o.doc, win = o.win, nav = win.navigator || {}, md = null, $ = function (id) { return doc.getElementById(id); };
+    var hint = function (t) { $('wkHint').textContent = t; }, cur = function () { return md || o.model(); };
+    function open() { md = o.model(); $('wkBody').innerHTML = bodyHtml(md); hint(''); $('weekly').hidden = false; doc.body.classList.add('wk-open'); $('wkShare').hidden = !nav.share; $('wkClose').focus(); }
+    function close() { $('weekly').hidden = true; doc.body.classList.remove('wk-open', 'print-weekly'); var b = $(o.back); if (b) b.focus(); }
+    function endPrint() { doc.body.classList.remove('print-weekly'); }
+    function print() {
+      if (typeof win.print !== 'function') { hint('Printing is not available here. Use Share, Download or Copy text instead.'); return; }
+      doc.body.classList.add('print-weekly');
+      win.setTimeout(function () { try { win.print(); } catch (e) { hint('Printing did not start. Use Share or Download, then print from that app.'); } win.setTimeout(endPrint, 1500); }, 60);
+      hint('If no print dialog appears (some iPhone home-screen apps), use Share or Download and print from there.');
+    }
+    function share() {
+      var m = cur(), txt = text(m), data = { title: m.heading, text: txt };
+      try { var f = new win.File([docHtml(m)], o.fileName('html'), { type: 'text/html' }); if (nav.canShare && nav.canShare({ files: [f] })) data = { title: m.heading, text: m.heading, files: [f] }; } catch (e) { /* files not supported */ }
+      nav.share(data).catch(function (e) { if (e && e.name !== 'AbortError') { if (data.files) nav.share({ title: m.heading, text: txt }).catch(function () {}); } });
+    }
+    function copy() {
+      var txt = text(cur()), ok = function () { o.toast('Weekly list copied.'); hint('Copied. Paste it into a note, email or message.'); };
+      var fallback = function () { var ta = doc.createElement('textarea'); ta.value = txt; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.top = '0'; ta.style.opacity = '0'; $('weekly').appendChild(ta); ta.select(); ta.setSelectionRange(0, txt.length); var done = false; try { done = doc.execCommand('copy'); } catch (e) { done = false; } ta.remove(); if (done) ok(); else hint('Copy is blocked here. Select the list below and copy it, or use Download.'); };
+      if (nav.clipboard && nav.clipboard.writeText) nav.clipboard.writeText(txt).then(ok, fallback); else fallback();
+    }
+    function download() { o.download(o.fileName('html'), 'text/html;charset=utf-8', docHtml(cur()), false); hint('Saved as an HTML file. Open it to print or share.'); }
+    $('wkClose').addEventListener('click', close); $('wkPrint').addEventListener('click', print); $('wkShare').addEventListener('click', share); $('wkCopy').addEventListener('click', copy); $('wkDl').addEventListener('click', download);
+    doc.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('weekly').hidden) close(); });
+    win.addEventListener('afterprint', endPrint);
+    if (win.matchMedia) { var mqp = win.matchMedia('print'), onMq = function (e) { if (!e.matches) endPrint(); }; if (mqp.addEventListener) mqp.addEventListener('change', onMq); else if (mqp.addListener) mqp.addListener(onMq); }
+    return { open: open, close: close, print: print, share: share, copy: copy, download: download };
+  }
+  return { pursuitRows: pursuitRows, model: model, bodyHtml: bodyHtml, text: text, docHtml: docHtml, CSS: CSS, ics: ics, dueEvents: dueEvents, bindSheet: bindSheet };
+});
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
node national/test-v2.js
node shared/test-cache.js
node shared/test-weekly.js
node test.js
```

Expected: `national/test-v2.js` ends with `national v2 dedupe tests passed`; `shared/test-cache.js` ends with `shared cache tests passed`; `shared/test-weekly.js` ends with `shared weekly-list tests passed`; `node test.js` ends with `all radars tests passed`.

- [ ] **Step 5: Review screenshots (desktop 1280x800, phone 390x844)**

```bash
python3 /tmp/radar-shots.py . /tmp/radar-shots/task-05 national national:pursuits texas
```

Expected: 6 lines ending in `errors: none`, and exit code 0. Check: National Pursuits looks the same. Print weekly list opens the same white weekly sheet with Print, Share, Copy and Download, and the sheet stays readable in Night. Texas is unchanged. Send the images to Luis and wait for his review before you commit and start Task 6.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Radar 2.0: move the weekly list to shared/weekly.js"
```


### Task 6: Texas moves into the shell

**Files:**
- Create: `texas/test-shell.js`
- Modify: `texas/app.js`, `texas/index.html`, `texas/style.css`, `texas/test.js`

**Interfaces:**
- Consumes: `RadarShell.bind`, `RadarShell.guardMap`, `RadarShell.noLocLabel`; `.shell-*` layout; the existing `RadarMap` canvas (`texas/map.js`, unchanged).
- Produces in `texas/index.html`: shell body and header (theme after `#fresh`), the Filters drawer as `shell-drawer` with `#advClose` and the `#advBg` scrim, a hidden `v-map` (`#colsMap`, where `#mapSlotMap` holds `#mapwrap`, `#mapFail`, `#unmapped` and `#mapNoLoc`, plus a side column with "On the radar now" / `#mapTop`), and a visible `v-list` (`#colsList`, where `aside.shell-side.txmini#txMini` holds `details#txMiniDet` with `#mapSlotList`, `#listMapFail`, an Expand map `data-tab="map"` button and `#listNoLoc`, then `.shell-primary` with the list). Nav: List (on), Map, Intel, and More (`#tabMoreBtn`) with Timeline, Agencies, Sources.
- Produces in `texas/app.js`: `tab: 'list'`; `var map = null, SHELL = null;`; `placeMap()`, which moves the one canvas between `#mapSlotList` and `#mapSlotMap` and fits it when moved; `switchTab`; `[data-tab]` clicks; `SHELL = RadarShell.bind({ app: 'texas', tabs: ['list', 'map', 'intel'], more: ['timeline', 'agencies', 'sources'], ..., onDetailClose: detailClosed })`; `RadarMap` creation inside `guardMap` with `#listMapFail` as the fallback; no-location chips; startup `switchTab(SHELL.initial)`; `texas.tab` written through `RadarStorage`.
- Removes Texas's 900px / 1100px centering rule. Intel keeps its own 900px rules.

- [ ] **Step 1: Write the failing tests**

Save as `/tmp/radar2-task06-tests.patch` (test files only: `texas/test-shell.js`, `texas/test.js`), then run `git apply --whitespace=nowarn /tmp/radar2-task06-tests.patch`.

```diff
diff --git a/texas/test-shell.js b/texas/test-shell.js
new file mode 100644
--- /dev/null
+++ b/texas/test-shell.js
@@ -0,0 +1,40 @@
+// Texas Opportunity on the shared Radar 2.0 shell (required from texas/test.js). Run alone: node texas/test-shell.js
+const assert = require('assert'), fs = require('fs'), path = require('path');
+const read = (f) => fs.readFileSync(path.join(__dirname, f), 'utf8');
+const html = read('index.html'), app = read('app.js'), css = read('style.css');
+const Shell = require('../shared/shell.js');
+// shell loaded before app.js; shell body and slim header with the theme after the freshness line
+const iShell = html.indexOf('<script src="../shared/shell.js" onerror="RadarLoadError(this.src||this.href)"></script>');
+assert.ok(iShell > html.indexOf('../shared/filters.js') && iShell < html.indexOf('<script src="app.js"'), 'shared/shell.js loads before app.js');
+assert.ok(/<body class="shell" data-app="texas">/.test(html) && /<header class="top shell-head">/.test(html), 'shell body and header');
+const head = html.slice(html.indexOf('<header'), html.indexOf('</header>'));
+assert.ok(head.indexOf('class="homebtn"') < head.indexOf('<h1>') && head.indexOf('<h1>') < head.indexOf('id="fresh"') && head.indexOf('id="fresh"') < head.indexOf('class="throw"'), 'Home, name, freshness, then Day / Night / Auto');
+// List is the default view; the map moved to its own tab; More holds Timeline, Agencies, Sources
+assert.ok(/tab: 'list'/.test(app) && !/'radar'/.test(app) && !/v-radar|data-tab="radar"/.test(html), 'no Radar tab or view left');
+assert.ok(/<section id="v-list" class="view" aria-label="List">/.test(html) && /<section id="v-map" class="view" hidden aria-label="Radar map">/.test(html), 'List visible first, Map hidden');
+const nav = html.slice(html.indexOf('<nav class="tabs"'), html.indexOf('</nav>', html.indexOf('<nav class="tabs"')));
+const top = nav.replace(/<div class="tabmore"[\s\S]*<\/div>/, ''), menu = nav.slice(nav.indexOf('<div class="tabmore"'));
+assert.deepStrictEqual((top.match(/data-tab="(\w+)"/g) || []).map((x) => x.slice(10, -1)), ['list', 'map', 'intel'], 'List, Map, Intel, then More');
+assert.ok(/data-tab="list" class="on"/.test(top) && top.includes('id="tabMoreBtn"') && top.includes('id="tabMoreLbl"'));
+assert.deepStrictEqual((menu.match(/data-tab="(\w+)"/g) || []).map((x) => x.slice(10, -1)), ['timeline', 'agencies', 'sources'], 'More menu');
+assert.ok(/loadData\(\)\.then\(function \(d\) \{[^\n]*switchTab\(SHELL\.initial\)/.test(app), 'startup opens the remembered view (List on a first visit)');
+assert.ok(/SHELL = window\.RadarShell\.bind\(\{ app: 'texas'/.test(app) && /tabs: \['list', 'map', 'intel'\]/.test(app) && /more: \['timeline', 'agencies', 'sources'\]/.test(app) && /cols: \{ list: 'colsList', map: 'colsMap' \}/.test(app), 'Texas binds the shared shell');
+assert.strictEqual(Shell.tabKey('texas'), 'texas.tab');
+assert.ok(!/localStorage\.setItem\('texas\.tab'/.test(app) && !/\$\('btnMore'\)\.addEventListener/.test(app), 'tab memory and the Filters toggle live in the shell');
+// Filters drawer, two columns, one canvas map moved between the List side column and the Map tab
+assert.ok(/<div id="adv" class="shell-drawer" hidden role="dialog" aria-label="Filters">/.test(html) && /id="advClose"/.test(html) && /<div class="shell-scrim" id="advBg" hidden><\/div>/.test(html), 'Filters drawer');
+const vl = html.slice(html.indexOf('<section id="v-list"'), html.indexOf('<section id="v-intel"'));
+assert.ok(vl.indexOf('<div class="shell-cols" id="colsList">') >= 0 && vl.indexOf('class="shell-side txmini"') < vl.indexOf('<div class="shell-primary">') && vl.indexOf('<div class="shell-primary">') < vl.indexOf('id="list"'), 'List: map box first on a phone, list in the wide column');
+assert.ok(/<details class="txminidet" id="txMiniDet">/.test(vl) && /id="mapSlotList"/.test(vl) && /data-tab="map">Expand map/.test(vl), 'collapsible map box on the List tab');
+const vm = html.slice(html.indexOf('<section id="v-map"'), html.indexOf('<section id="v-timeline"'));
+assert.ok(vm.indexOf('id="colsMap"') > 0 && vm.indexOf('id="mapSlotMap"') < vm.indexOf('id="mapwrap"') && vm.indexOf('id="mapwrap"') < vm.indexOf('class="shell-side"') && vm.indexOf('class="shell-side"') < vm.indexOf('id="mapTop"'), 'Map: map, then the records beside it');
+assert.strictEqual((html.match(/<canvas /g) || []).length, 1, 'one canvas');
+assert.ok(/function placeMap\(\)/.test(app) && /state\.tab === 'list' \? \$\('mapSlotList'\) : \$\('mapSlotMap'\)/.test(app) && /\$\('txMiniDet'\)\.addEventListener\('toggle', placeMap\)/.test(app), 'the canvas moves with the view and only draws when shown');
+// details: shell panel beside the list or map; a map failure leaves the list working; no-location chip
+assert.ok(/SHELL\.openDetail\(\)/.test(app) && /function closeSheet\(\) \{ SHELL\.closeDetail\(\); \}/.test(app) && /onDetailClose: detailClosed/.test(app), 'details go through the shell');
+assert.ok(/RadarShell\.guardMap\(document, 'mapFail', function \(\) \{/.test(app) && /id="mapFail" hidden/.test(vm) && /id="listMapFail" hidden/.test(vl), 'map failure note');
+assert.ok(/RadarShell\.noLocLabel\(unmapped\)/.test(app) && /id="mapNoLoc" hidden/.test(vm) && /id="listNoLoc" hidden/.test(vl), 'no-location chip on both views');
+// the app-local 900px layout is gone; print CSS still finds main > section#v-intel
+assert.ok(!/body\{max-width:1100px/.test(css) && !/width:1100px/.test(css) && /@media \(min-width:1024px\)\{\.shell-cols\{/.test(css), 'shared 1024px breakpoint');
+assert.ok(/<main id="main">\n[\s\S]*<section id="v-intel" class="view" hidden/.test(html) && html.indexOf('<section id="v-intel"') > html.indexOf('<main id="main">') && html.indexOf('<section id="v-intel"') < html.indexOf('</main>'), 'Intel stays a direct section of main for print');
+console.log('texas shell tests passed');
diff --git a/texas/test.js b/texas/test.js
--- a/texas/test.js
+++ b/texas/test.js
@@ -247,15 +247,8 @@ assert.ok(!/sample data|fake|dummy|lorem/i.test(fs.readFileSync(path.join(dir, '
   assert.strictEqual(natBk.app, 'radars-national');
   assert.strictEqual(CP.parseBackup(JSON.stringify(natBk), 'radars-texas').ok, false, 'Texas rejects a National backup');
 }
-// Radar map is the default view on every load (not the List)
-{
-  const appSrc = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
-  const ih = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
-  assert.ok(/tab: 'radar'/.test(appSrc), 'initial state.tab is radar');
-  assert.ok(/loadData\(\)\.then\(function \(d\) \{[^\n]*switchTab\('radar'\)/.test(appSrc), 'startup switches to the radar view');
-  assert.ok(!/loadData\(\)\.then\(function \(d\) \{[^\n]*switchTab\('list'\)/.test(appSrc), 'startup must not jump to the List view');
-  assert.ok(/<section id="v-radar" class="view"(?![^>]*hidden)/.test(ih) && /data-tab="radar" class="on"/.test(ih), 'radar view visible and its tab active in the HTML');
-}
+// Radar 2.0 shell: List is the default view, Map is one tap away, the last view is remembered (texas.tab)
+require('./test-shell.js');
 
 // ---- Intel (news and planning signals)
 {
@@ -306,7 +299,7 @@ assert.ok(!/sample data|fake|dummy|lorem/i.test(fs.readFileSync(path.join(dir, '
   assert.ok(/continue-on-error: true\s+timeout-minutes: \d+\s+run: node scripts\/build-intel\.js/.test(wf), 'intel step cannot fail the job');
 }
 
-// Intel tab wiring: same-site data only, radar stays the default, own storage keys
+// Intel tab wiring: same-site data only, List stays the default, own storage keys
 {
   const ih = fs.readFileSync(path.join(dir, 'index.html'), 'utf8'), ui = fs.readFileSync(path.join(dir, 'intel-ui.js'), 'utf8'), appSrc = fs.readFileSync(path.join(dir, 'app.js'), 'utf8');
   assert.ok(/data-tab="intel"/.test(ih) && /id="v-intel" class="view" hidden/.test(ih) && /id="intelBadge"/.test(ih) && /id="srcIntel"/.test(ih));
@@ -314,7 +307,7 @@ assert.ok(!/sample data|fake|dummy|lorem/i.test(fs.readFileSync(path.join(dir, '
   assert.ok(ih.indexOf('src="intel.js"') > ih.indexOf('src="app.js"') && ih.indexOf('src="intel-ui.js"') > ih.indexOf('src="intel.js"'));
   assert.ok(!/fetch\(\s*['"]https?:/.test(ui), 'no external requests from the browser'); assert.ok(/fetch\('data\/intel\.json'/.test(ui));
   ['opportunityRadar.intelWatch.v1', 'opportunityRadar.intelRead.v1', 'opportunityRadar.intelSeen.v1'].forEach((k) => assert.ok(ui.indexOf(k) > 0, k));
-  assert.ok(/'intel', 'sources'\]\.forEach/.test(appSrc));
+  assert.ok(/tabs: \[[^\]]*'intel'\]/.test(appSrc) && /more: \['timeline', 'agencies', 'sources'\]/.test(appSrc), 'Intel is a tab, Sources is in More');
   assert.ok(!/github|repository/i.test(ih + ui), 'no repo mentions on the page');
 }
 
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
node texas/test-shell.js
```

Expected:

- `node texas/test-shell.js`: exit 1, with `AssertionError [ERR_ASSERTION]: shared/shell.js loads before app.js`

- [ ] **Step 3: Implement**

Save as `/tmp/radar2-task06-impl.patch`, then run `git apply --whitespace=nowarn /tmp/radar2-task06-impl.patch`.

```diff
diff --git a/texas/app.js b/texas/app.js
--- a/texas/app.js
+++ b/texas/app.js
@@ -10,7 +10,7 @@
   var state = {
     data: null, recs: [], byId: {}, sources: [], watch: {}, live: null,
     f: { q: '', rel: 'relevant', consult: true, eng: false, agencies: [], phases: [], kinds: [], kw: [], houston: false, located: false, watchOnly: false, month: null },
-    tab: 'radar', colorBy: 'agency', sort: 'date', rows: 100, filtered: [], today: new Date().toISOString().slice(0, 10)
+    tab: 'list', colorBy: 'agency', sort: 'date', rows: 100, filtered: [], today: new Date().toISOString().slice(0, 10)
   };
   if (window.RadarStorage) RadarStorage.migrateCopy(localStorage, WATCH_KEY_LEGACY, WATCH_KEY);
   try { state.watch = JSON.parse((window.RadarStorage ? RadarStorage.read(localStorage, WATCH_KEY, [WATCH_KEY_LEGACY]) : localStorage.getItem(WATCH_KEY)) || '{}') || {}; } catch (e) { state.watch = {}; }
@@ -165,6 +165,7 @@
   function renderMap() {
     var pts = mapPoints(); if (map) map.setPoints(pts);
     var unmapped = state.filtered.filter(function (r) { return !hasLoc(r); }).length;
+    var nl = RadarShell.noLocLabel(unmapped); $('mapNoLoc').textContent = nl; $('mapNoLoc').hidden = !unmapped; $('listNoLoc').textContent = nl; $('listNoLoc').hidden = !unmapped;
     $('unmapped').textContent = pts.length.toLocaleString('en-US') + ' of ' + state.filtered.length.toLocaleString('en-US') + ' shown records are on the map. ' + unmapped.toLocaleString('en-US') + ' have no location in their source (consultant procurements, funding lists, some projects); find them in the List and Timeline tabs. ' + pts.filter(function (p) { return p.approx; }).length + ' are placed at their county centroid (inferred, dashed ring).';
     var top = state.filtered.filter(function (r) { var d = r.date ? M.daysUntil(r.date, state.today) : null; return d !== null && d >= -30; });
     var chosen = top.slice().sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; }).slice(0, 8);
@@ -366,9 +367,10 @@
     h += '<p class="note" style="margin:6px 0 0">Source: ' + esc(s ? s.name : r.src) + (s && s.fetchedAt ? ', fetched ' + esc(fmtDT(s.fetchedAt)) : '') + '. Record ID: ' + esc(r.id) + '</p>';
     h = h.replace(/(<h2>[\s\S]*?<\/h2>)/, '$1<div id="capPanel"></div>');
     $('shBody').innerHTML = h; setStar($('shStar'), !!state.watch[id]); refreshCapPanel(id);
-    $('sheet').hidden = false; document.body.style.overflow = 'hidden';
+    SHELL.openDetail(); // shared shell: beside the list or map on a wide screen, a bottom sheet on a phone
   }
-  function closeSheet() { $('sheet').hidden = true; document.body.style.overflow = ''; curId = null; if (map) { map.focus = null; map.dirty = true; map._schedule(); } }
+  function closeSheet() { SHELL.closeDetail(); } // onDetailClose: detailClosed
+  function detailClosed() { curId = null; if (map) { map.focus = null; map.dirty = true; map._schedule(); } }
   function setStar(btn, on) { btn.classList.toggle('on', on); btn.innerHTML = on ? '&#9733;' : '&#9734;'; btn.setAttribute('aria-label', on ? 'Remove from watchlist' : 'Add to watchlist'); }
   function toggleWatch(id) {
     var r = state.byId[id] || ghosts().filter(function (g) { return g.id === id; })[0];
@@ -408,14 +410,20 @@
   }
 
   // ---------- events ----------
-  var map = null;
+  var map = null, SHELL = null;
+  // one canvas map: on the Map tab it fills the wide column; on the List tab it sits in the side column (a collapsible box on a phone)
+  function placeMap() {
+    var w = $('mapwrap'), slot = state.tab === 'list' ? $('mapSlotList') : $('mapSlotMap'), moved = w.parentNode !== slot;
+    if (moved) slot.appendChild(w);
+    if (!map) return;
+    var vis = !document.hidden && (state.tab === 'map' || (state.tab === 'list' && $('txMiniDet').open));
+    map.setVisible(vis); if (vis && moved) map.fit(state.f.houston ? 'hou' : 'tx');
+  }
   function switchTab(t) {
-    state.tab = t;
-    ['radar', 'timeline', 'agencies', 'list', 'intel', 'sources'].forEach(function (k) { $('v-' + k).hidden = k !== t; });
+    t = SHELL.showTab(t); state.tab = t; detailClosed(); // shared shell: views, tab bar, More menu, texas.tab
     $('kpis').hidden = t === 'intel'; document.querySelector('.filters').hidden = t === 'intel'; /* Intel has its own filters */
     if (t === 'intel' && window.TXIntelUI) window.TXIntelUI.onShow();
-    Array.prototype.forEach.call(document.querySelectorAll('.tabs button'), function (b) { b.classList.toggle('on', b.getAttribute('data-tab') === t); });
-    if (map) { map.setVisible(t === 'radar'); }
+    placeMap();
     if (t === 'timeline') scrollTimeline();
     window.scrollTo(0, 0);
   }
@@ -435,14 +443,16 @@
     if ((el = t.closest('[data-kw]'))) { toggleIn(state.f.kw, el.getAttribute('data-kw')); apply(); return; }
     if ((el = t.closest('[data-search]'))) { state.f.q = el.getAttribute('data-search'); $('q').value = state.f.q; apply(); switchTab('list'); return; }
     if ((el = t.closest('.seg button'))) { state.f.rel = el.getAttribute('data-rel'); apply(); return; }
-    if ((el = t.closest('.tabs button'))) { switchTab(el.getAttribute('data-tab')); return; }
+    if ((el = t.closest('[data-tab]'))) { switchTab(el.getAttribute('data-tab')); return; }
     if ((el = t.closest('[data-view]'))) { if (map) map.fit(el.getAttribute('data-view')); return; }
   }
   function init() {
+    SHELL = window.RadarShell.bind({ app: 'texas', doc: document, ls: window.localStorage, media: window.matchMedia ? window.matchMedia(window.RadarShell.QUERY) : null, tabs: ['list', 'map', 'intel'], more: ['timeline', 'agencies', 'sources'], labels: { timeline: 'Timeline', agencies: 'Agencies', sources: 'Sources' }, cols: { list: 'colsList', map: 'colsMap' }, onDetailClose: detailClosed });
+    if (SHELL.isDesktop()) $('txMiniDet').open = true;
+    $('txMiniDet').addEventListener('toggle', placeMap);
     document.addEventListener('click', onClick);
     document.addEventListener('keydown', function (e) { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('.card[data-id]')) { e.preventDefault(); openSheet(e.target.getAttribute('data-id')); } if (e.key === 'Escape' && !$('sheet').hidden) closeSheet(); });
     $('q').addEventListener('input', function () { clearTimeout(init._t); init._t = setTimeout(function () { state.f.q = $('q').value.trim(); apply(); }, 200); });
-    $('btnMore').addEventListener('click', function () { var o = $('adv').hidden; $('adv').hidden = !o; this.setAttribute('aria-expanded', o ? 'true' : 'false'); });
     $('btnCsv2').addEventListener('click', exportCsv);
     function onCap(e) { if (e.target.hasAttribute && e.target.hasAttribute('data-cap')) updateCapField(e.target); }
     document.addEventListener('input', onCap); document.addEventListener('change', onCap);
@@ -459,14 +469,17 @@
     $('btnMoreRows').addEventListener('click', function () { state.rows += 100; renderList(); });
     $('shClose').addEventListener('click', closeSheet); $('shBg').addEventListener('click', closeSheet);
     $('shStar').addEventListener('click', function () { if (curId) toggleWatch(curId); });
-    var canvas = $('map');
-    map = new window.RadarMap(canvas, window.TX_GEO, { sweep: true, onPick: function (ids, n) { if (ids.length) openSheet(ids[0], ids); }, onMove: function () { $('maphint').style.opacity = 0; } });
     var cen = M.countyCentroids(window.TX_GEO), named = {}; (window.TX_GEO.counties || []).forEach(function (c) { named[c.n] = cen[c.n.toLowerCase()]; }); window.TX_GEO._cent = named;
-    map.fit('tx'); renderLegend();
-    if (map.reduced) { $('btnSweep').setAttribute('aria-pressed', 'false'); $('btnSweep').textContent = 'Sweep: off'; }
-    document.addEventListener('visibilitychange', function () { map.setVisible(!document.hidden && state.tab === 'radar'); });
+    var drawn = RadarShell.guardMap(document, 'mapFail', function () { // a map that cannot draw leaves the list and details working
+      map = new window.RadarMap($('map'), window.TX_GEO, { sweep: true, onPick: function (ids, n) { if (ids.length) openSheet(ids[0], ids); }, onMove: function () { $('maphint').style.opacity = 0; } });
+      map.fit('tx');
+    }, 'mapwrap');
+    if (!drawn) { map = null; $('listMapFail').textContent = RadarShell.MAP_FAIL_TEXT; $('listMapFail').hidden = false; }
+    renderLegend();
+    if (map && map.reduced) { $('btnSweep').setAttribute('aria-pressed', 'false'); $('btnSweep').textContent = 'Sweep: off'; }
+    document.addEventListener('visibilitychange', placeMap);
     if (window.RadarTheme) RadarTheme.bind(document, window.localStorage, { colors: { day: '#f5f7fb', night: '#07100e' } });
-    loadData().then(function (d) { ingest(d); apply(); switchTab('radar'); /* always open on the Radar map; other views are one tap away */ setTimeout(function () { map.resize(); map.fit('tx'); map.dirty = true; map._schedule(); }, 50); })
+    loadData().then(function (d) { ingest(d); apply(); switchTab(SHELL.initial); /* List on a first visit, then the last view (texas.tab) */ setTimeout(function () { if (!map) return; map.resize(); map.fit('tx'); map.dirty = true; map._schedule(); }, 50); })
       .catch(function (e) { $('freshDot').className = 'dot bad'; $('freshTxt').textContent = 'Could not load data/opportunities.json (' + e.message + '). Nothing is shown; no sample data is substituted.'; });
   }
   M.MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
diff --git a/texas/index.html b/texas/index.html
--- a/texas/index.html
+++ b/texas/index.html
@@ -43,14 +43,14 @@ window.RadarLoadError=function(name){
   <link rel="stylesheet" href="style.css">
   <link rel="stylesheet" href="magazine.css">
 </head>
-<body>
-<header class="top">
+<body class="shell" data-app="texas">
+<header class="top shell-head">
   <div class="top-l">
     <a class="homebtn" href="../" aria-label="Back to Radars home">&#8592; Home</a>
-    <div class="throw" role="group" aria-label="Theme"><button type="button" data-theme-set="day">Day</button><button type="button" data-theme-set="night">Night</button><button type="button" data-theme-set="auto">Auto</button></div>
     <h1>Texas Opportunity</h1>
   </div>
   <div class="fresh" id="fresh" role="status" aria-live="polite"><span class="dot" id="freshDot"></span><span id="freshTxt">Loading data…</span></div>
+  <div class="throw" role="group" aria-label="Theme"><button type="button" data-theme-set="day">Day</button><button type="button" data-theme-set="night">Night</button><button type="button" data-theme-set="auto">Auto</button></div>
 </header>
 
 <section class="kpis" id="kpis" aria-label="Summary"></section>
@@ -61,7 +61,8 @@ window.RadarLoadError=function(name){
     <button type="button" class="btn" id="btnMore" aria-expanded="false" aria-controls="adv">Filters <span id="advCount"></span></button>
   </div>
   <div class="chips" id="quick" aria-label="Quick filters"></div>
-  <div id="adv" hidden>
+  <div id="adv" class="shell-drawer" hidden role="dialog" aria-label="Filters">
+    <div class="drawhead"><h3>Filters</h3><button type="button" class="btn small" id="advClose">Close</button></div>
     <h3>Drainage relevance <span class="hint">("likely" is inferred from type of work). In the Consultant services view only "Direct" narrows the list.</span></h3>
     <div class="seg" role="group" aria-label="Drainage relevance">
       <button type="button" data-rel="direct">Direct</button>
@@ -78,8 +79,12 @@ window.RadarLoadError=function(name){
   <div class="active" id="activeNote" hidden></div>
 </section>
 
+<div class="shell-scrim" id="advBg" hidden></div>
 <main id="main">
-  <section id="v-radar" class="view" aria-label="Radar map">
+  <section id="v-map" class="view" hidden aria-label="Radar map">
+    <div class="shell-cols" id="colsMap">
+      <div class="shell-primary">
+    <div class="mapslot" id="mapSlotMap">
     <div class="mapwrap" id="mapwrap">
       <canvas id="map" aria-label="Map of Texas with opportunity pins. Use the List tab for an accessible list."></canvas>
       <div class="mapbar">
@@ -91,9 +96,16 @@ window.RadarLoadError=function(name){
       <div class="legend" id="legend"></div>
       <div class="maphint" id="maphint">Drag to pan, pinch to zoom, tap a pin.</div>
     </div>
+    </div>
+    <p class="shell-mapfail" id="mapFail" hidden></p>
     <p class="note" id="unmapped"></p>
+    <div class="chips"><span class="shell-noloc" id="mapNoLoc" hidden></span></div>
+      </div>
+      <aside class="shell-side" aria-label="On the radar now">
     <h2 class="sec">On the radar now <span class="hint" id="nearHint"></span></h2>
     <div id="mapTop" class="cards"></div>
+      </aside>
+    </div>
   </section>
 
   <section id="v-timeline" class="view" hidden aria-label="Timeline">
@@ -113,7 +125,16 @@ window.RadarLoadError=function(name){
     <h2 class="sec">Local sponsors named in TxDOT data</h2><div id="bSponsor" class="bars"></div>
   </section>
 
-  <section id="v-list" class="view" hidden aria-label="List">
+  <section id="v-list" class="view" aria-label="List">
+    <div class="shell-cols" id="colsList">
+      <aside class="shell-side txmini" id="txMini" aria-label="Map">
+        <details class="txminidet" id="txMiniDet"><summary class="sec">Map <span class="hint">records with a location</span></summary>
+          <div class="mapslot" id="mapSlotList"></div>
+          <p class="shell-mapfail" id="listMapFail" hidden></p>
+          <div class="chips"><button type="button" class="btn small" data-tab="map">Expand map</button><span class="shell-noloc" id="listNoLoc" hidden></span></div>
+        </details>
+      </aside>
+      <div class="shell-primary">
     <div class="listbar">
       <label class="sortl">Sort <select id="sort"><option value="date">Upcoming first</option><option value="dateDesc">Date, latest first</option><option value="dateAsc">Date, oldest first</option><option value="cost">Cost, high to low</option><option value="agency">Agency</option><option value="title">Title</option><option value="due">My due date (watchlist)</option><option value="decision">My Go / No-go (watchlist)</option></select></label>
       <span id="listCount" class="hint"></span><button type="button" class="btn small" id="btnCsv2">Export CSV</button>
@@ -126,6 +147,8 @@ window.RadarLoadError=function(name){
     </div>
     <div id="list" class="cards"></div>
     <button type="button" class="btn wide" id="btnMoreRows" hidden>Show 100 more</button>
+      </div>
+    </div>
   </section>
 
   <section id="v-intel" class="view" hidden aria-label="Intel: news and planning signals">
@@ -174,12 +197,15 @@ window.RadarLoadError=function(name){
 </main>
 
 <nav class="tabs" aria-label="Views">
-  <button type="button" data-tab="radar" class="on">Radar</button>
-  <button type="button" data-tab="timeline">Timeline</button>
-  <button type="button" data-tab="agencies">Agencies</button>
-  <button type="button" data-tab="list">List</button>
+  <button type="button" data-tab="list" class="on">List</button>
+  <button type="button" data-tab="map">Map</button>
   <button type="button" data-tab="intel">Intel<span class="tbadge" id="intelBadge" hidden></span></button>
-  <button type="button" data-tab="sources">Sources</button>
+  <button type="button" id="tabMoreBtn" aria-expanded="false" aria-controls="tabMore">More<span id="tabMoreLbl" class="tml"></span></button>
+  <div class="tabmore" id="tabMore" role="menu" hidden>
+    <button type="button" data-tab="timeline" role="menuitem">Timeline</button>
+    <button type="button" data-tab="agencies" role="menuitem">Agencies</button>
+    <button type="button" data-tab="sources" role="menuitem">Sources</button>
+  </div>
 </nav>
 
 <div class="sheet" id="sheet" hidden role="dialog" aria-modal="true" aria-labelledby="shTitle">
@@ -194,6 +220,7 @@ window.RadarLoadError=function(name){
 <script src="../shared/storage.js" onerror="RadarLoadError(this.src||this.href)"></script>
 <script src="../shared/theme.js" onerror="RadarLoadError(this.src||this.href)"></script>
 <script src="../shared/filters.js" onerror="RadarLoadError(this.src||this.href)"></script>
+<script src="../shared/shell.js" onerror="RadarLoadError(this.src||this.href)"></script>
 <script src="../shared/capture.js" onerror="RadarLoadError(this.src||this.href)"></script>
 <script src="texas-geo.js"></script>
 <script src="model.js"></script>
diff --git a/texas/style.css b/texas/style.css
--- a/texas/style.css
+++ b/texas/style.css
@@ -101,7 +101,17 @@ select{min-height:44px;border-radius:10px;border:1px solid var(--line);backgroun
 .linkbtn.alt{background:var(--panel2);color:var(--ink);border:1px solid var(--line)}
 .pick{display:grid;gap:6px;margin:8px 0}
 .toast{position:fixed;left:50%;bottom:calc(var(--tabs-h) + env(safe-area-inset-bottom) + 14px);transform:translateX(-50%);background:#0f2a24;border:1px solid var(--acc);padding:10px 16px;border-radius:12px;z-index:60;max-width:90vw;font-size:14px}
-@media (min-width:900px){body{max-width:1100px;margin:0 auto}.cards{grid-template-columns:1fr 1fr}.tabs{left:50%;right:auto;width:1100px;transform:translateX(-50%)}.sheet-card{border-radius:18px}.sheet{align-items:center}}
+/* Radar 2.0 shell: More menu, map slots and the wide layout (breakpoint shared with shared/shell.css) */
+.tabmore{position:absolute;right:8px;bottom:calc(100% + 6px);display:flex;flex-direction:column;min-width:190px;padding:6px;border:1px solid var(--line);border-radius:14px;background:var(--panel);box-shadow:0 10px 30px rgba(0,0,0,.5)}
+.tabmore[hidden]{display:none}
+.tabs .tabmore button{flex:none;min-height:44px;text-align:left;padding:0 12px;border-radius:10px;font-size:14px}
+.tabs .tabmore button.on{background:rgba(94,234,212,.14);box-shadow:none}
+.tml{display:block;font-size:10px;font-weight:500;color:var(--acc)}.tml:empty{display:none}
+.txminidet{margin:6px 12px;border:1px solid var(--line);border-radius:12px;background:var(--panel)}
+.txminidet>summary{min-height:44px;display:flex;align-items:center;gap:8px;padding:0 12px;cursor:pointer;margin:0}
+.txminidet .chips{padding:6px 12px 10px}
+#mapSlotList .mapwrap{height:clamp(240px,38vh,420px)}
+@media (min-width:1024px){.shell-cols{padding:0 calc(14px + env(safe-area-inset-right)) 0 calc(14px + env(safe-area-inset-left))}.shell-primary .cards{grid-template-columns:1fr 1fr}.shell-side .cards{grid-template-columns:minmax(0,1fr)}.txminidet{margin:6px 0}#mapSlotList .mapwrap{height:clamp(300px,52vh,560px)}.sheet-card{border-radius:18px}.sheet{align-items:center}}
 @media (prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;transition:none!important}}
 
 /* ---- capture files (watchlist) ---- */
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
node texas/test-shell.js
node test.js
```

Expected: `texas/test-shell.js` ends with `texas shell tests passed`; `node test.js` ends with `all radars tests passed`.

- [ ] **Step 5: Review screenshots (desktop 1280x800, phone 390x844)**

```bash
python3 /tmp/radar-shots.py . /tmp/radar-shots/task-06 texas texas:map texas:intel national
```

Expected: 8 lines ending in `errors: none`, and exit code 0. Check: Texas opens on List. Desktop shows the list on the left and the canvas map on the right (pan, zoom and pins work), and the detail docks there. The Map tab shows the full map with "On the radar now" beside it. Intel is a tab, and Timeline, Agencies and Sources are under More. Phone: map strip above the list, detail as a bottom sheet. National is unchanged. Send the images to Luis and wait for his review before you commit and start Task 7.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Radar 2.0: Texas moves into the shared shell, opens on List"
```


### Task 7: Texas Pursuits and weekly list

**Files:**
- Create: `texas/test-pursuits.js`
- Modify: `shared/test-weekly.js`, `texas/app.js`, `texas/index.html`, `texas/style.css`, `texas/test-shell.js`, `texas/test.js`

**Interfaces:**
- Consumes: `RadarWeekly` (Task 5), `RadarCapture`, Texas `state.watch` and capture data already on the device (no new keys).
- Produces in `texas/index.html`: a `v-pursuits` section (`#btnPurPrint`, `#btnPurCsv`, `#btnPurIcs`, `#purWeek`, `#purList`), a Pursuits tab with `#purBadge` between Map and Intel, the weekly sheet markup (copied from National, after the toast), and `<script src="../shared/weekly.js">` after `capture.js`.
- Produces in `texas/app.js`: `purRows()` (starred plus capture rows; when a solicitation has no capture due date, its `r.date` is used and the row gets `dueFrom = 'source'`), `renderPurBadge`, `purItem`, `renderPursuits`, `exportPursuitIcs` (`texas-opportunity-pursuits.ics`, calendar "Texas Opportunity: My pursuits"), and `WKS = RadarWeekly.bindSheet(...)` with files `texas-opportunity-weekly-<date>.html|txt`. SHELL tabs become `['list', 'map', 'pursuits', 'intel']`.

- [ ] **Step 1: Write the failing tests**

Save as `/tmp/radar2-task07-tests.patch` (test files only: `shared/test-weekly.js`, `texas/test-pursuits.js`, `texas/test-shell.js`, `texas/test.js`), then run `git apply --whitespace=nowarn /tmp/radar2-task07-tests.patch`.

```diff
diff --git a/shared/test-weekly.js b/shared/test-weekly.js
--- a/shared/test-weekly.js
+++ b/shared/test-weekly.js
@@ -26,8 +26,8 @@ assert.deepStrictEqual(pr, V2.pursuitRows(watch, cap, (id) => snaps[id], T, CP),
 const V4 = require('../national/v4.js');
 const ev = [{ uid: 'due-x', date: '2026-11-20', title: 'Due: X, Y', desc: 'a\nb', url: 'https://example.test/x', alarms: ['P7D', 'P1D'] }];
 assert.strictEqual(W.ics(ev, '2026-10-29T12:00:00.000Z', 'National Radar: My pursuits'), V4.ics(ev, '2026-10-29T12:00:00.000Z', 'National Radar: My pursuits'), 'National .ics unchanged');
-const tx = W.ics(ev, '2026-10-29T12:00:00.000Z', 'Texas Radar: My pursuits', 'Texas Radar');
-assert.ok(tx.includes('PRODID:-//Texas Radar//Pursuits//EN') && tx.includes('UID:due-x@texas-radar') && tx.includes('X-WR-CALNAME:Texas Radar: My pursuits') && tx.includes('TRIGGER:-P7D') && tx.includes('TRIGGER:-P1D'));
+const tx = W.ics(ev, '2026-10-29T12:00:00.000Z', 'Texas Opportunity: My pursuits', 'Texas Opportunity');
+assert.ok(tx.includes('PRODID:-//Texas Opportunity//Pursuits//EN') && tx.includes('UID:due-x@texas-opportunity') && tx.includes('X-WR-CALNAME:Texas Opportunity: My pursuits') && tx.includes('TRIGGER:-P7D') && tx.includes('TRIGGER:-P1D'));
 const de = W.dueEvents([{ id: 'p', cap: { due: '2026-11-19', decision: 'Go', next: 'Call' }, snap: { title: 'Lamar', agency: 'City of Austin', url: 'https://example.test/p' }, dueFrom: 'source' }, { id: 'q', cap: { due: '' }, snap: { title: 'No date' } }]);
 assert.strictEqual(de.length, 1, 'rows without a due date make no event');
 assert.ok(de[0].uid === 'due-p' && de[0].date === '2026-11-19' && de[0].title === 'Due: Lamar' && /Next action: Call/.test(de[0].desc) && /Decision: Go/.test(de[0].desc) && /stated by the source/.test(de[0].desc));
@@ -38,13 +38,13 @@ const ids = ['weekly', 'wkBody', 'wkHint', 'wkClose', 'wkPrint', 'wkShare', 'wkC
 const docL = {}, doc = { body: el('body'), getElementById: (i) => E[i] || null, addEventListener: (t, f) => { docL[t] = f; } };
 const winL = {}, saved = [], toasts = [];
 const win = { navigator: {}, addEventListener: (t, f) => { winL[t] = f; }, setTimeout: (f) => f() };
-const sheet = W.bindSheet({ doc, win, model: () => md, fileName: (ext) => 'texas-radar-weekly-' + T + '.' + ext, back: 'btnPurPrint', toast: (x) => toasts.push(x), download: (...a) => saved.push(a) });
+const sheet = W.bindSheet({ doc, win, model: () => md, fileName: (ext) => 'texas-opportunity-weekly-' + T + '.' + ext, back: 'btnPurPrint', toast: (x) => toasts.push(x), download: (...a) => saved.push(a) });
 sheet.open();
 assert.ok(!E.weekly.hidden && doc.body.classList.contains('wk-open') && E.wkBody.innerHTML.includes('My pursuits') && E.wkShare.hidden && E.wkClose.focused, 'open: sheet shown, Share hidden without navigator.share');
 E.wkPrint.l.click();
 assert.ok(/Printing is not available here/.test(E.wkHint.textContent), 'no window.print: a plain hint, no error');
 E.wkDl.l.click();
-assert.deepStrictEqual(saved[0].slice(0, 2), ['texas-radar-weekly-2026-10-29.html', 'text/html;charset=utf-8']); assert.ok(/^<!doctype html>/.test(saved[0][2]) && saved[0][3] === false);
+assert.deepStrictEqual(saved[0].slice(0, 2), ['texas-opportunity-weekly-2026-10-29.html', 'text/html;charset=utf-8']); assert.ok(/^<!doctype html>/.test(saved[0][2]) && saved[0][3] === false);
 docL.keydown({ key: 'Escape' });
 assert.ok(E.weekly.hidden && !doc.body.classList.contains('wk-open') && E.btnPurPrint.focused, 'Escape closes and returns focus');
 let printed = 0; win.print = () => { printed++; }; sheet.print();
diff --git a/texas/test-pursuits.js b/texas/test-pursuits.js
new file mode 100644
--- /dev/null
+++ b/texas/test-pursuits.js
@@ -0,0 +1,22 @@
+// Texas Opportunity: My pursuits and the weekly list (required from texas/test.js). Run alone: node texas/test-pursuits.js
+const assert = require('assert'), fs = require('fs'), path = require('path');
+const read = (f) => fs.readFileSync(path.join(__dirname, f), 'utf8');
+const html = read('index.html'), app = read('app.js'), css = read('style.css');
+// tab with a due-soon badge, view with the three actions, the shared Weekly list sheet
+assert.ok(/<button type="button" data-tab="pursuits">Pursuits<span class="tbadge" id="purBadge" hidden><\/span><\/button>/.test(html), 'Pursuits tab with a badge');
+const v = html.slice(html.indexOf('<section id="v-pursuits"'), html.indexOf('<section id="v-intel"'));
+assert.ok(/<section id="v-pursuits" class="view" hidden aria-label="My pursuits">/.test(v) && ['btnPurPrint', 'btnPurCsv', 'btnPurIcs', 'purWeek', 'purList'].every((k) => v.includes('id="' + k + '"')), 'Pursuits view');
+assert.ok(html.includes('<div id="weekly" class="wk-sheet" hidden role="dialog" aria-modal="true" aria-label="Weekly list">') && ['wkBody', 'wkHint', 'wkClose', 'wkPrint', 'wkShare', 'wkCopy', 'wkDl'].every((k) => html.includes('id="' + k + '"')), 'Weekly list sheet');
+assert.ok(html.indexOf('<div id="weekly"') > html.indexOf('</main>'), 'the sheet sits outside main, so print-weekly can show it alone');
+const iW = html.indexOf('<script src="../shared/weekly.js" onerror="RadarLoadError(this.src||this.href)"></script>');
+assert.ok(iW > 0 && iW < html.indexOf('<script src="app.js"'), 'shared/weekly.js loads before app.js');
+// rows from the watchlist; a solicitation's closing date stands in for a missing due date and is labeled as the source's
+assert.ok(/RadarWeekly\.pursuitRows\(state\.watch, caps, snapFor, todayCentral\(\), CP\)/.test(app), 'shared pursuit rows');
+assert.ok(/r\.kind === 'solicitation' && r\.date\) c = Object\.assign\(\{\}, c, \{ due: r\.date \}\)/.test(app) && /row\.dueFrom = 'source'/.test(app) && /closing date from the source/.test(app), 'source closing date fallback, labeled');
+// Export CSV reuses the capture CSV; .ics names Texas; weekly sheet from the shared controller
+assert.ok(/\$\('btnPurCsv'\)\.addEventListener\('click', exportCapCsv\)/.test(app), 'Export CSV = capture CSV');
+assert.ok(/RadarWeekly\.ics\(ev, new Date\(\)\.toISOString\(\), 'Texas Opportunity: My pursuits', 'Texas Opportunity'\)/.test(app) && /'texas-opportunity-pursuits\.ics'/.test(app), '.ics export');
+assert.ok(/WKS = RadarWeekly\.bindSheet\(\{ doc: document, win: window/.test(app) && /'texas-opportunity-weekly-'/.test(app) && /\$\('btnPurPrint'\)\.addEventListener\('click', WKS\.open\)/.test(app), 'weekly list sheet');
+assert.ok(/renderPursuits\(\); renderPurBadge\(\);/.test(app) && /if \(t === 'pursuits'\) renderPursuits\(\);/.test(app), 'kept current');
+assert.ok(/#purList h3\{grid-column:1 \/ -1/.test(css));
+console.log('texas pursuits tests passed');
diff --git a/texas/test-shell.js b/texas/test-shell.js
--- a/texas/test-shell.js
+++ b/texas/test-shell.js
@@ -14,11 +14,11 @@ assert.ok(/tab: 'list'/.test(app) && !/'radar'/.test(app) && !/v-radar|data-tab=
 assert.ok(/<section id="v-list" class="view" aria-label="List">/.test(html) && /<section id="v-map" class="view" hidden aria-label="Radar map">/.test(html), 'List visible first, Map hidden');
 const nav = html.slice(html.indexOf('<nav class="tabs"'), html.indexOf('</nav>', html.indexOf('<nav class="tabs"')));
 const top = nav.replace(/<div class="tabmore"[\s\S]*<\/div>/, ''), menu = nav.slice(nav.indexOf('<div class="tabmore"'));
-assert.deepStrictEqual((top.match(/data-tab="(\w+)"/g) || []).map((x) => x.slice(10, -1)), ['list', 'map', 'intel'], 'List, Map, Intel, then More');
+assert.deepStrictEqual((top.match(/data-tab="(\w+)"/g) || []).map((x) => x.slice(10, -1)), ['list', 'map', 'pursuits', 'intel'], 'List, Map, Pursuits, Intel, then More');
 assert.ok(/data-tab="list" class="on"/.test(top) && top.includes('id="tabMoreBtn"') && top.includes('id="tabMoreLbl"'));
 assert.deepStrictEqual((menu.match(/data-tab="(\w+)"/g) || []).map((x) => x.slice(10, -1)), ['timeline', 'agencies', 'sources'], 'More menu');
 assert.ok(/loadData\(\)\.then\(function \(d\) \{[^\n]*switchTab\(SHELL\.initial\)/.test(app), 'startup opens the remembered view (List on a first visit)');
-assert.ok(/SHELL = window\.RadarShell\.bind\(\{ app: 'texas'/.test(app) && /tabs: \['list', 'map', 'intel'\]/.test(app) && /more: \['timeline', 'agencies', 'sources'\]/.test(app) && /cols: \{ list: 'colsList', map: 'colsMap' \}/.test(app), 'Texas binds the shared shell');
+assert.ok(/SHELL = window\.RadarShell\.bind\(\{ app: 'texas'/.test(app) && /tabs: \['list', 'map', 'pursuits', 'intel'\]/.test(app) && /more: \['timeline', 'agencies', 'sources'\]/.test(app) && /cols: \{ list: 'colsList', map: 'colsMap' \}/.test(app), 'Texas binds the shared shell');
 assert.strictEqual(Shell.tabKey('texas'), 'texas.tab');
 assert.ok(!/localStorage\.setItem\('texas\.tab'/.test(app) && !/\$\('btnMore'\)\.addEventListener/.test(app), 'tab memory and the Filters toggle live in the shell');
 // Filters drawer, two columns, one canvas map moved between the List side column and the Map tab
diff --git a/texas/test.js b/texas/test.js
--- a/texas/test.js
+++ b/texas/test.js
@@ -249,6 +249,7 @@ assert.ok(!/sample data|fake|dummy|lorem/i.test(fs.readFileSync(path.join(dir, '
 }
 // Radar 2.0 shell: List is the default view, Map is one tap away, the last view is remembered (texas.tab)
 require('./test-shell.js');
+require('./test-pursuits.js');
 
 // ---- Intel (news and planning signals)
 {
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
node shared/test-weekly.js
node texas/test-pursuits.js
node texas/test-shell.js
```

Expected:

- `node shared/test-weekly.js`: exit 0 (only names change here; it still passes), with `shared weekly-list tests passed`
- `node texas/test-pursuits.js`: exit 1, with `AssertionError [ERR_ASSERTION]: Pursuits tab with a badge`
- `node texas/test-shell.js`: exit 1, with `AssertionError [ERR_ASSERTION]: List, Map, Pursuits, Intel, then More`

- [ ] **Step 3: Implement**

Save as `/tmp/radar2-task07-impl.patch`, then run `git apply --whitespace=nowarn /tmp/radar2-task07-impl.patch`.

```diff
diff --git a/texas/app.js b/texas/app.js
--- a/texas/app.js
+++ b/texas/app.js
@@ -263,7 +263,7 @@
       '<li>Costs are what the agency lists (usually construction cost, not design fee). The label on each record says which.</li></ul>';
   }
   function renderAll() {
-    renderKpis(); renderFilters(); renderLegend(); renderMap(); renderAgencies(); renderTimeline(); renderList(); renderCapBar(); renderSources();
+    renderKpis(); renderFilters(); renderLegend(); renderMap(); renderAgencies(); renderTimeline(); renderList(); renderCapBar(); renderSources(); renderPursuits(); renderPurBadge();
     var fresh = state.data ? state.data.generatedAt : null;
     if (fresh) {
       var ageH = (Date.now() - Date.parse(fresh)) / 3600000;
@@ -321,6 +321,34 @@
   function capDownload(name, type, text, bom) { var blob = new Blob([(bom ? '\ufeff' : '') + text], { type: type }), a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500); }
   function capRows() { return Object.keys(state.watch).map(function (id) { var sn = snapFor(id) || { title: id }; return { id: id, cap: capOf(id), snap: sn }; }); }
   function exportCapCsv() { var rows = CP.sortRows(capRows(), state.sort === 'decision' ? 'decision' : 'due'); if (!rows.length) { toast('The watchlist is empty.'); return; } capDownload('texas-opportunity-capture-' + todayCentral() + '.csv', 'text/csv;charset=utf-8', CP.toCSV(rows, todayCentral()), true); toast('Exported ' + rows.length + ' capture file(s).'); }
+  // ---------- My pursuits: starred records by due date, weekly list and calendar (shared/weekly.js) ----------
+  function purRows() { // a solicitation's closing date stands in when the capture file has no due date
+    var caps = {}; Object.keys(state.watch).forEach(function (id) { var c = capOf(id), r = state.byId[id]; if (!c.due && r && r.kind === 'solicitation' && r.date) c = Object.assign({}, c, { due: r.date }); caps[id] = c; });
+    return RadarWeekly.pursuitRows(state.watch, caps, snapFor, todayCentral(), CP).map(function (row) { if (!capOf(row.id).due && row.cap.due) row.dueFrom = 'source'; return row; });
+  }
+  function renderPurBadge() { var n = purRows().filter(function (r) { return r.flag === 'overdue' || r.flag === 'soon'; }).length, b = $('purBadge'); b.hidden = !n; b.textContent = n; }
+  function purItem(r) {
+    var c = r.cap, sn = r.snap || {}, t = todayCentral();
+    var due = c.due ? '<span class="cdue ' + r.flag + '">' + (r.flag === 'overdue' ? '&#9888; ' : r.flag === 'soon' ? '&#9873; ' : '') + esc(CP.dueText(c.due, t)) + ' &middot; ' + esc(M.fmtDate(c.due)) + (r.dueFrom === 'source' ? ' (closing date from the source)' : '') + '</span>' : '<span class="cdue none">No due date</span>';
+    return '<div class="card pur ' + r.flag + '" style="--c:' + (r.flag === 'overdue' ? 'var(--bad)' : r.flag === 'soon' ? 'var(--warn)' : 'var(--acc)') + '" data-id="' + esc(r.id) + '" role="button" tabindex="0">' +
+      '<button type="button" class="star on" data-star="' + esc(r.id) + '" aria-label="Remove from watchlist">&#9733;</button><div class="b"><div class="t">' + esc(sn.title || r.id) + '</div>' +
+      '<div class="m"><span>' + esc(sn.agency || '') + '</span></div>' +
+      '<div class="purcap"><span class="cdec ' + c.decision.replace(/[^a-z]/gi, '').toLowerCase() + '">' + esc(c.decision) + '</span>' + due + (c.next ? '<span class="cnext">Next: ' + esc(c.next) + '</span>' : '') + '</div>' +
+      (c.notes ? '<p class="note purnotes">' + esc(c.notes.length > 240 ? c.notes.slice(0, 240) + '…' : c.notes) + '</p>' : '') + '</div></div>';
+  }
+  function renderPursuits() {
+    var rows = purRows(), wk = rows.filter(function (r) { return r.week; }), rest = rows.filter(function (r) { return !r.week; });
+    $('purWeek').textContent = 'week of ' + M.fmtDate(todayCentral());
+    $('purList').innerHTML = rows.length ? (wk.length ? '<h3>This week: overdue or due within 7 days (' + wk.length + ')</h3>' + wk.map(purItem).join('') : '<p class="note">Nothing overdue or due in the next 7 days.</p>') + (rest.length ? '<h3>Later or no due date (' + rest.length + ')</h3>' + rest.map(purItem).join('') : '')
+      : '<p class="note">No pursuits yet. Star a record (&#9734;) in the List or Map to start a capture file; it shows up here with its due date, Go / No-go and next action.</p>';
+  }
+  function exportPursuitIcs() {
+    var ev = RadarWeekly.dueEvents(purRows());
+    if (!ev.length) { toast('No due dates yet: add a due date in a capture file, or star a solicitation that states a closing date.'); return; }
+    capDownload('texas-opportunity-pursuits.ics', 'text/calendar', RadarWeekly.ics(ev, new Date().toISOString(), 'Texas Opportunity: My pursuits', 'Texas Opportunity'), false);
+    toast(ev.length + ' calendar event' + (ev.length === 1 ? '' : 's') + ' saved, with reminders 1 week and 1 day before each due date.');
+  }
+  var WKS = null;
   function exportBackup() {
     var ids = Object.keys(state.watch); if (!ids.length) { toast('The watchlist is empty, nothing to back up.'); return; }
     var caps = {}; ids.forEach(function (id) { var c = capOf(id); if (!c.snap) c.snap = snapFor(id) || undefined; caps[id] = c; });
@@ -425,6 +453,7 @@
     if (t === 'intel' && window.TXIntelUI) window.TXIntelUI.onShow();
     placeMap();
     if (t === 'timeline') scrollTimeline();
+    if (t === 'pursuits') renderPursuits();
     window.scrollTo(0, 0);
   }
   function toggleIn(arr, v) { var i = arr.indexOf(v); if (i >= 0) arr.splice(i, 1); else arr.push(v); }
@@ -447,7 +476,7 @@
     if ((el = t.closest('[data-view]'))) { if (map) map.fit(el.getAttribute('data-view')); return; }
   }
   function init() {
-    SHELL = window.RadarShell.bind({ app: 'texas', doc: document, ls: window.localStorage, media: window.matchMedia ? window.matchMedia(window.RadarShell.QUERY) : null, tabs: ['list', 'map', 'intel'], more: ['timeline', 'agencies', 'sources'], labels: { timeline: 'Timeline', agencies: 'Agencies', sources: 'Sources' }, cols: { list: 'colsList', map: 'colsMap' }, onDetailClose: detailClosed });
+    SHELL = window.RadarShell.bind({ app: 'texas', doc: document, ls: window.localStorage, media: window.matchMedia ? window.matchMedia(window.RadarShell.QUERY) : null, tabs: ['list', 'map', 'pursuits', 'intel'], more: ['timeline', 'agencies', 'sources'], labels: { timeline: 'Timeline', agencies: 'Agencies', sources: 'Sources' }, cols: { list: 'colsList', map: 'colsMap' }, onDetailClose: detailClosed });
     if (SHELL.isDesktop()) $('txMiniDet').open = true;
     $('txMiniDet').addEventListener('toggle', placeMap);
     document.addEventListener('click', onClick);
@@ -458,6 +487,8 @@
     document.addEventListener('input', onCap); document.addEventListener('change', onCap);
     document.addEventListener('toggle', function (e) { var d = e.target; if (d && d.hasAttribute && d.hasAttribute('data-capopen')) { var id = d.getAttribute('data-capopen'); if (d.open) capOpen[id] = true; else delete capOpen[id]; } }, true);
     $('btnCapCsv').addEventListener('click', exportCapCsv); $('btnBackup').addEventListener('click', exportBackup);
+    WKS = RadarWeekly.bindSheet({ doc: document, win: window, model: function () { return RadarWeekly.model(purRows(), todayCentral(), CP, M.fmtDate); }, fileName: function (ext) { return 'texas-opportunity-weekly-' + todayCentral() + '.' + ext; }, back: 'btnPurPrint', toast: toast, download: capDownload });
+    $('btnPurPrint').addEventListener('click', WKS.open); $('btnPurCsv').addEventListener('click', exportCapCsv); $('btnPurIcs').addEventListener('click', exportPursuitIcs);
     $('btnRestore').addEventListener('click', function () { restoreMode = 'merge'; $('restoreFile').value = ''; $('restoreFile').click(); });
     $('btnRestoreAll').addEventListener('click', function () { restoreMode = 'replace'; $('restoreFile').value = ''; $('restoreFile').click(); });
     $('restoreFile').addEventListener('change', function () { var f = this.files && this.files[0]; if (!f) return; var rd = new FileReader(); rd.onload = function () { restoreBackup(String(rd.result), restoreMode); }; rd.onerror = function () { toast('Could not read that file.'); }; rd.readAsText(f); });
diff --git a/texas/index.html b/texas/index.html
--- a/texas/index.html
+++ b/texas/index.html
@@ -151,6 +151,13 @@ window.RadarLoadError=function(name){
     </div>
   </section>
 
+  <section id="v-pursuits" class="view" hidden aria-label="My pursuits">
+    <div class="purhead"><h2>My pursuits <span class="hint" id="purWeek"></span></h2>
+      <div class="purbtns"><button type="button" class="btn small" id="btnPurPrint">Print weekly list</button><button type="button" class="btn small" id="btnPurCsv">Export CSV</button><button type="button" class="btn small" id="btnPurIcs">Add to calendar (.ics)</button></div></div>
+    <p class="note">Starred records, sorted by your due date, or by the source's closing date for a solicitation when you have not set one. Go / No-go, due date, next action and notes are your notes on this device.</p>
+    <div id="purList" class="cards"></div>
+  </section>
+
   <section id="v-intel" class="view" hidden aria-label="Intel: news and planning signals">
     <div class="idisc" role="note"><b>News and planning signals, not solicitations.</b> Items are collected automatically from public news feeds and agenda systems and tagged by keyword. They are not verified and may be incomplete; check the original source before acting.</div>
     <div class="seg imode" id="inMode" role="group" aria-label="Intel view"><button type="button" data-imode="feed" class="on">Feed</button><button type="button" data-imode="news">Weekly newsletter</button></div>
@@ -199,6 +206,7 @@ window.RadarLoadError=function(name){
 <nav class="tabs" aria-label="Views">
   <button type="button" data-tab="list" class="on">List</button>
   <button type="button" data-tab="map">Map</button>
+  <button type="button" data-tab="pursuits">Pursuits<span class="tbadge" id="purBadge" hidden></span></button>
   <button type="button" data-tab="intel">Intel<span class="tbadge" id="intelBadge" hidden></span></button>
   <button type="button" id="tabMoreBtn" aria-expanded="false" aria-controls="tabMore">More<span id="tabMoreLbl" class="tml"></span></button>
   <div class="tabmore" id="tabMore" role="menu" hidden>
@@ -216,12 +224,19 @@ window.RadarLoadError=function(name){
   </div>
 </div>
 <div class="toast" id="toast" role="status" aria-live="polite" hidden></div>
+<div id="weekly" class="wk-sheet" hidden role="dialog" aria-modal="true" aria-label="Weekly list">
+  <div class="wk-bar"><b class="wk-bt">Weekly list</b><button type="button" class="wk-btn" id="wkClose">Close</button>
+    <div class="wk-acts"><button type="button" class="wk-btn pri" id="wkPrint">Print / Save as PDF</button><button type="button" class="wk-btn" id="wkShare">Share</button><button type="button" class="wk-btn" id="wkCopy">Copy text</button><button type="button" class="wk-btn" id="wkDl">Download</button></div>
+    <p class="wk-hint" id="wkHint"></p></div>
+  <div id="wkBody" class="wk-doc"></div>
+</div>
 
 <script src="../shared/storage.js" onerror="RadarLoadError(this.src||this.href)"></script>
 <script src="../shared/theme.js" onerror="RadarLoadError(this.src||this.href)"></script>
 <script src="../shared/filters.js" onerror="RadarLoadError(this.src||this.href)"></script>
 <script src="../shared/shell.js" onerror="RadarLoadError(this.src||this.href)"></script>
 <script src="../shared/capture.js" onerror="RadarLoadError(this.src||this.href)"></script>
+<script src="../shared/weekly.js" onerror="RadarLoadError(this.src||this.href)"></script>
 <script src="texas-geo.js"></script>
 <script src="model.js"></script>
 <script src="map.js"></script>
diff --git a/texas/style.css b/texas/style.css
--- a/texas/style.css
+++ b/texas/style.css
@@ -107,6 +107,8 @@ select{min-height:44px;border-radius:10px;border:1px solid var(--line);backgroun
 .tabs .tabmore button{flex:none;min-height:44px;text-align:left;padding:0 12px;border-radius:10px;font-size:14px}
 .tabs .tabmore button.on{background:rgba(94,234,212,.14);box-shadow:none}
 .tml{display:block;font-size:10px;font-weight:500;color:var(--acc)}.tml:empty{display:none}
+#v-pursuits .purhead,#v-pursuits>.note{padding:0 calc(14px + env(safe-area-inset-right)) 0 calc(14px + env(safe-area-inset-left))}
+#purList h3{grid-column:1 / -1;margin:10px 0 2px;font-size:14px;color:var(--dim)}
 .txminidet{margin:6px 12px;border:1px solid var(--line);border-radius:12px;background:var(--panel)}
 .txminidet>summary{min-height:44px;display:flex;align-items:center;gap:8px;padding:0 12px;cursor:pointer;margin:0}
 .txminidet .chips{padding:6px 12px 10px}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
node shared/test-weekly.js
node texas/test-pursuits.js
node texas/test-shell.js
node test.js
```

Expected: `shared/test-weekly.js` ends with `shared weekly-list tests passed`; `texas/test-pursuits.js` ends with `texas pursuits tests passed`; `texas/test-shell.js` ends with `texas shell tests passed`; `node test.js` ends with `all radars tests passed`.

- [ ] **Step 5: Review screenshots (desktop 1280x800, phone 390x844)**

```bash
python3 /tmp/radar-shots.py . /tmp/radar-shots/task-07 texas texas:pursuits national
```

Expected: 6 lines ending in `errors: none`, and exit code 0. Check: Texas Pursuits lists starred records split into This week and Later, with the badge on the tab. A card whose date came from the source says "(closing date from the source)". Print weekly list opens the weekly sheet. The tab order is List, Map, Pursuits, Intel, More. Send the images to Luis and wait for his review before you commit and start Task 8.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Radar 2.0: Texas Pursuits tab and weekly list"
```


### Task 8: Texas saved filter sets and filter tags

**Files:**
- Create: `texas/test-filtersets.js`
- Modify: `national/style.css`, `shared/filters.js`, `shared/shell.css`, `shared/test-filters.js`, `texas/app.js`, `texas/index.html`, `texas/style.css`, `texas/test.js`

**Interfaces:**
- Consumes: `RadarFilters` (Phase 1) and `RadarStorage`.
- Produces in `shared/filters.js`: `snapshotTexas`, `cleanTexas`, `applyTexas` (resets `month` to null), `texasTags`, `removeTexasTag`, and the app-aware entry points `snapshotFor(app, ...)`, `cleanFor(app, list)`, `applyFor(app, fresh, set)`, `tagsFor(app, f, o)`, `removeTagFor(app, f, k, v)`, `mergeFor(app, a, b)`. `load` / `save` clean with `cleanFor(app)`. Texas fields: `q`, `rel`, `consult`, `eng`, `houston`, `located`, `watchOnly`, `agencies`, `phases`, `kinds`, `kw`. National behavior is unchanged.
- Produces in Texas: `#fsets` / `#fsName` / `#fsSave` in the drawer, `#ftags` after `#quick`, and in `app.js` `FS`, `freshFilters`, `renderTags` (replaces the old activeNote line), `renderSets`, `saveSet`, `applySet`, `deleteSet`. The Texas capture backup now carries `filtersets` (the field National already writes; a sets-only backup is allowed), merged by name on restore. The key is `texas.filtersets`.
- The `.ftags` through `.fsrow` CSS moves from `national/style.css` to `shared/shell.css`.

- [ ] **Step 1: Write the failing tests**

Save as `/tmp/radar2-task08-tests.patch` (test files only: `shared/test-filters.js`, `texas/test-filtersets.js`, `texas/test.js`), then run `git apply --whitespace=nowarn /tmp/radar2-task08-tests.patch`.

```diff
diff --git a/shared/test-filters.js b/shared/test-filters.js
--- a/shared/test-filters.js
+++ b/shared/test-filters.js
@@ -61,4 +61,27 @@ assert.deepStrictEqual(F.load(legacyTx, 'texas'), [], 'texas does not read the n
 assert.strictEqual(legacyTx.getItem('texas.filtersets'), null);
 assert.strictEqual(legacyTx.getItem('nr.filtersets'), JSON.stringify([F.snapshot('Legacy', { states: ['TX'] }, 'upcoming', 'tx')]));
 
+// Texas sets keep Texas fields (texas.filtersets); National sets are unchanged
+const txf = { q: 'drain', rel: 'direct', consult: true, eng: true, agencies: ['HCFCD'], phases: ['design'], kinds: ['solicitation'], kw: ['drainage'], houston: true, located: false, watchOnly: false, month: '2026-11' };
+const ts = F.snapshotFor('texas', ' Houston drainage ', txf);
+assert.deepStrictEqual(ts, { name: 'Houston drainage', app: 'texas', f: { q: 'drain', rel: 'direct', consult: true, eng: true, houston: true, located: false, watchOnly: false, agencies: ['HCFCD'], phases: ['design'], kinds: ['solicitation'], kw: ['drainage'] } }, 'Texas snapshot keeps Texas fields and drops the timeline month');
+assert.deepStrictEqual(F.snapshotFor('national', 'N', { states: ['TX'] }, 'upcoming', 'tx'), F.snapshot('N', { states: ['TX'] }, 'upcoming', 'tx'), 'National snapshot unchanged');
+assert.strictEqual(F.snapshotFor('texas', 'bad', { rel: 'nope', consult: 'yes' }).f.rel, 'relevant', 'unknown relevance falls back to the default');
+assert.strictEqual(F.snapshotFor('texas', 'bad', { consult: 'yes' }).f.consult, true, 'non-boolean switches fall back to the defaults');
+const txls = mem({});
+assert.ok(F.save(txls, 'texas', F.upsert([], ts)));
+assert.deepStrictEqual(F.load(txls, 'texas'), [ts], 'Texas round trip through texas.filtersets');
+assert.strictEqual(txls.getItem('national.filtersets'), null, 'Texas save never writes the National key');
+const fresh = { q: '', rel: 'relevant', consult: true, eng: false, agencies: [], phases: [], kinds: [], kw: [], houston: false, located: false, watchOnly: false, month: '2026-12' };
+const ap2 = F.applyFor('texas', fresh, ts);
+assert.deepStrictEqual([ap2.q, ap2.rel, ap2.eng, ap2.houston, ap2.agencies, ap2.kw, ap2.month], ['drain', 'direct', true, true, ['HCFCD'], ['drainage'], null]);
+ap2.agencies.push('X'); assert.deepStrictEqual(ts.f.agencies, ['HCFCD'], 'apply copies arrays');
+const ttags = F.tagsFor('texas', Object.assign({}, txf, { consult: false }), { phaseLabel: { design: 'Design' }, kindLabel: { solicitation: 'Open solicitation' }, kwLabel: { drainage: 'Drainage' }, monthLabel: (m) => 'Nov 2026' });
+assert.deepStrictEqual(ttags.map((t) => t.label), ['Search: drain', 'Drainage: direct only', 'All records (not only consultant services)', 'HCFCD', 'Design', 'Open solicitation', 'Drainage', 'Month: Nov 2026']);
+const rt = Object.assign({}, txf, { agencies: ['HCFCD'], consult: false });
+['q', 'rel', 'consult', 'month'].forEach((k) => F.removeTagFor('texas', rt, k)); F.removeTagFor('texas', rt, 'agencies', 'HCFCD');
+assert.deepStrictEqual([rt.q, rt.rel, rt.consult, rt.month, rt.agencies], ['', 'relevant', true, null, []], 'removing a Texas tag restores the default');
+assert.deepStrictEqual(F.tagsFor('national', f, {}), F.activeTags(f, {}), 'National tags unchanged');
+assert.deepStrictEqual(F.mergeFor('texas', [ts], [F.snapshotFor('texas', 'HOUSTON DRAINAGE', {}), F.snapshotFor('texas', 'Austin', {})]).map((s) => s.name), ['Houston drainage', 'Austin'], 'Texas backup restore merges by name');
+
 console.log('shared filter tests passed');
diff --git a/texas/test-filtersets.js b/texas/test-filtersets.js
new file mode 100644
--- /dev/null
+++ b/texas/test-filtersets.js
@@ -0,0 +1,21 @@
+// Texas Opportunity: saved filter sets and removable tags (required from texas/test.js). Run alone: node texas/test-filtersets.js
+const assert = require('assert'), fs = require('fs'), path = require('path');
+const read = (f) => fs.readFileSync(path.join(__dirname, f), 'utf8');
+const html = read('index.html'), app = read('app.js');
+const scss = fs.readFileSync(path.join(__dirname, '..', 'shared', 'shell.css'), 'utf8');
+// markup: sets at the top of the Filters drawer, tags under the quick chips
+const adv = html.slice(html.indexOf('<div id="adv"'), html.indexOf('<div class="active" id="activeNote"'));
+assert.ok(adv.indexOf('id="fsets"') > adv.indexOf('id="advClose"') && adv.indexOf('id="fsets"') < adv.indexOf('Drainage relevance') && adv.includes('id="fsName"') && adv.includes('id="fsSave"'), 'saved sets in the drawer');
+assert.ok(html.indexOf('<div class="ftags" id="ftags" aria-label="Active filters" hidden></div>') > html.indexOf('id="quick"'), 'tags under the quick filters');
+// one key, Texas fields, shared helpers
+assert.ok(/RadarFilters\.load\(window\.localStorage, 'texas'\)/.test(app) && /RadarFilters\.save\(window\.localStorage, 'texas', FS\)/.test(app), 'texas.filtersets through shared/filters.js');
+assert.ok(!/national\.filtersets|nr\.filtersets/.test(app), 'Texas never touches the National keys');
+assert.ok(/RadarFilters\.snapshotFor\('texas', name, state\.f\)/.test(app) && /RadarFilters\.applyFor\('texas', freshFilters\(\), set\)/.test(app) && /RadarFilters\.tagsFor\('texas', state\.f,/.test(app) && /RadarFilters\.removeTagFor\('texas', state\.f, tk,/.test(app), 'Texas-aware helpers');
+assert.ok(/\[data-fs-apply\]/.test(app) && /\[data-fs-del\]/.test(app) && /\[data-tag-k\]/.test(app) && /#ftClear/.test(app), 'tag and set clicks handled');
+// backup: per app, filter sets included like National
+assert.ok(/bk\.filtersets = FS;/.test(app) && /RadarFilters\.mergeFor\('texas', FS, j8\.filtersets\)/.test(app) && /RadarFilters\.cleanFor\('texas', j8\.filtersets\)/.test(app), 'Texas backup carries its filter sets');
+assert.ok(/CP\.makeBackup\(state\.watch, caps, new Date\(\)\.toISOString\(\), CAP_APP\)/.test(app), 'still a Texas-only backup file');
+// shared look for both apps
+assert.ok(/\.ftags\{display:flex/.test(scss) && /\.fsrow\{display:flex/.test(scss), 'tag and set styles live in shared/shell.css');
+assert.ok(!/\.ftags\{display:flex/.test(fs.readFileSync(path.join(__dirname, '..', 'national', 'style.css'), 'utf8')), 'moved out of national/style.css');
+console.log('texas filter-set tests passed');
diff --git a/texas/test.js b/texas/test.js
--- a/texas/test.js
+++ b/texas/test.js
@@ -250,6 +250,7 @@ assert.ok(!/sample data|fake|dummy|lorem/i.test(fs.readFileSync(path.join(dir, '
 // Radar 2.0 shell: List is the default view, Map is one tap away, the last view is remembered (texas.tab)
 require('./test-shell.js');
 require('./test-pursuits.js');
+require('./test-filtersets.js');
 
 // ---- Intel (news and planning signals)
 {
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
node shared/test-filters.js
node texas/test-filtersets.js
```

Expected:

- `node shared/test-filters.js`: exit 1, with `TypeError: F.snapshotFor is not a function`
- `node texas/test-filtersets.js`: exit 1, with `AssertionError [ERR_ASSERTION]: saved sets in the drawer`

- [ ] **Step 3: Implement**

Save as `/tmp/radar2-task08-impl.patch`, then run `git apply --whitespace=nowarn /tmp/radar2-task08-impl.patch`.

```diff
diff --git a/national/style.css b/national/style.css
--- a/national/style.css
+++ b/national/style.css
@@ -369,13 +369,6 @@ html[data-theme=day] .miniwrap{background:#dfe8f3}
 #qfDue .qpop{left:auto;right:0}
 .qpop .sortl{display:flex;flex-direction:column;gap:4px;margin-top:8px;font-size:13px;color:var(--dim)}
 #listCount{display:inline;margin-left:auto;font-size:12.5px}
-.ftags{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:0 0 8px}.ftags[hidden]{display:none}
-.ftag{display:inline-flex;align-items:center;gap:6px;min-height:30px;padding:0 10px;border-radius:15px;border:1px solid var(--acc);background:color-mix(in srgb,var(--acc) 10%,var(--panel));color:var(--ink);font-size:12.5px;cursor:pointer}
-.ftag span{font-size:15px;line-height:1;color:var(--dim)}.ftclear{min-height:30px;font-size:12.5px}
-.fsets{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 6px}.fset{display:inline-flex;align-items:center}
-.fsdel{min-width:32px;min-height:34px;border:1px solid var(--line);border-left:0;border-radius:0 17px 17px 0;background:var(--panel2);color:var(--dim);font-size:16px;cursor:pointer}
-.fset .chip{border-top-right-radius:0;border-bottom-right-radius:0}
-.fsrow{display:flex;gap:6px;margin-bottom:10px}.fsrow input{flex:1;min-width:0;min-height:38px;padding:0 10px;border-radius:10px;border:1px solid var(--line);background:var(--bg);color:var(--ink);font-size:14px}
 .tmwhat{display:none}
 @media (max-width:520px){
   .qchip{min-height:34px;padding:0 10px;font-size:12.5px}
diff --git a/shared/filters.js b/shared/filters.js
--- a/shared/filters.js
+++ b/shared/filters.js
@@ -1,4 +1,4 @@
-/* Saved filter sets and active-filter tags. Browser + Node, no dependencies. */
+/* Saved filter sets and active-filter tags for National (national.filtersets) and Texas (texas.filtersets). Browser + Node, no dependencies. */
 (function (root, factory) {
   var Storage = (typeof module === 'object' && module.exports) ? require('./storage.js') : root.RadarStorage;
   var api = factory(Storage);
@@ -39,19 +39,57 @@
     if (!Array.isArray(list)) return [];
     return list.filter(function (x) { return x && typeof x.name === 'string' && x.name.trim() && x.f && typeof x.f === 'object'; }).slice(0, MAX_SETS).map(function (x) { return snapshot(x.name, x.f, typeof x.scope === 'string' ? x.scope : 'upcoming', typeof x.region === 'string' ? x.region : 'all'); });
   }
+  // ---- Texas Opportunity sets and tags (its filter fields differ from National's) ----
+  var TX_ARR = ['agencies', 'phases', 'kinds', 'kw'], TX_FLAGS = ['consult', 'eng', 'houston', 'located', 'watchOnly'], TX_REL = ['direct', 'relevant', 'all'];
+  var TX_DEFAULT = { q: '', rel: 'relevant', consult: true, eng: false, houston: false, located: false, watchOnly: false };
+  function snapshotTexas(name, f) {
+    f = f || {}; var o = { name: String(name || '').trim().slice(0, 60), app: 'texas', f: { q: String(f.q || '').slice(0, 120), rel: TX_REL.indexOf(f.rel) >= 0 ? f.rel : 'relevant' } };
+    TX_FLAGS.forEach(function (k) { o.f[k] = typeof f[k] === 'boolean' ? f[k] : TX_DEFAULT[k]; });
+    TX_ARR.forEach(function (k) { o.f[k] = (Array.isArray(f[k]) ? f[k] : []).slice(0, 80).map(String); }); return o;
+  }
+  function cleanTexas(list) {
+    if (!Array.isArray(list)) return [];
+    return list.filter(function (x) { return x && typeof x.name === 'string' && x.name.trim() && x.f && typeof x.f === 'object'; }).slice(0, MAX_SETS).map(function (x) { return snapshotTexas(x.name, x.f); });
+  }
+  function applyTexas(fresh, set) { var f = fresh; f.q = set.f.q || ''; f.rel = set.f.rel; TX_FLAGS.forEach(function (k) { f[k] = set.f[k]; }); TX_ARR.forEach(function (k) { f[k] = (set.f[k] || []).slice(); }); f.month = null; return f; }
+  function texasTags(f, o) {
+    o = o || {}; var t = [], lab = function (m, k) { return (m && m[k]) || k; };
+    if (f.q) t.push({ k: 'q', v: '', label: 'Search: ' + f.q });
+    if (f.rel === 'direct') t.push({ k: 'rel', v: '', label: 'Drainage: direct only' }); else if (f.rel === 'all') t.push({ k: 'rel', v: '', label: 'Drainage: all' });
+    if (f.consult === false) t.push({ k: 'consult', v: '', label: 'All records (not only consultant services)' });
+    (f.agencies || []).forEach(function (a) { t.push({ k: 'agencies', v: a, label: a }); });
+    (f.phases || []).forEach(function (a) { t.push({ k: 'phases', v: a, label: lab(o.phaseLabel, a) }); });
+    (f.kinds || []).forEach(function (a) { t.push({ k: 'kinds', v: a, label: lab(o.kindLabel, a) }); });
+    (f.kw || []).forEach(function (a) { t.push({ k: 'kw', v: a, label: lab(o.kwLabel, a) }); });
+    if (f.month) t.push({ k: 'month', v: '', label: 'Month: ' + (o.monthLabel ? o.monthLabel(f.month) : f.month) });
+    return t;
+  }
+  function removeTexasTag(f, k, v) {
+    if (Array.isArray(f[k])) { var i = f[k].indexOf(v); if (i >= 0) f[k].splice(i, 1); }
+    else if (k === 'q') f.q = ''; else if (k === 'rel') f.rel = 'relevant'; else if (k === 'consult') f.consult = true; else if (k === 'month') f.month = null;
+    return f;
+  }
+  // app-aware entry points: National keeps its original format, Texas gets its own fields
+  function snapshotFor(app, name, f, scope, region) { return app === 'texas' ? snapshotTexas(name, f) : snapshot(name, f, scope, region); }
+  function cleanFor(app, list) { return app === 'texas' ? cleanTexas(list) : clean(list); }
+  function applyFor(app, fresh, set) { return app === 'texas' ? applyTexas(fresh, set) : applyTo(fresh, set); }
+  function tagsFor(app, f, o) { return app === 'texas' ? texasTags(f, o) : activeTags(f, o); }
+  function removeTagFor(app, f, k, v) { return app === 'texas' ? removeTexasTag(f, k, v) : removeTag(f, k, v); }
+  function mergeFor(app, a, b) { var out = cleanFor(app, a); cleanFor(app, b).forEach(function (s) { if (!out.some(function (x) { return x.name.toLowerCase() === s.name.toLowerCase(); })) out.push(s); }); return out.slice(0, MAX_SETS); }
   function load(ls, app) {
     try {
       var key = keyFor(app), legacy = legacyFor(app);
       if (legacy && Storage && Storage.migrateCopy) Storage.migrateCopy(ls, legacy, key);
       var raw = (Storage && Storage.read) ? Storage.read(ls, key, legacy ? [legacy] : []) : ls.getItem(key);
       if (typeof raw !== 'string' && legacy) { try { raw = ls.getItem(legacy); } catch (e2) { raw = null; } }
-      return clean(JSON.parse(raw || '[]'));
+      return cleanFor(app, JSON.parse(raw || '[]'));
     } catch (e) { return []; }
   }
-  function save(ls, app, sets) { try { ls.setItem(keyFor(app), JSON.stringify(clean(sets))); return true; } catch (e) { return false; } }
+  function save(ls, app, sets) { try { ls.setItem(keyFor(app), JSON.stringify(cleanFor(app, sets))); return true; } catch (e) { return false; } }
   function upsert(sets, set) { var out = sets.filter(function (x) { return x.name.toLowerCase() !== set.name.toLowerCase(); }); out.unshift(set); return out.slice(0, MAX_SETS); }
   function remove(sets, name) { return sets.filter(function (x) { return x.name !== name; }); }
   function applyTo(fresh, set) { var f = fresh; f.q = set.f.q || ''; f.feeMin = set.f.feeMin; f.dueWithin = set.f.dueWithin; ARR.forEach(function (k) { f[k] = (set.f[k] || []).slice(); }); return f; }
   function merge(a, b) { var out = clean(a); clean(b).forEach(function (s) { if (!out.some(function (x) { return x.name.toLowerCase() === s.name.toLowerCase(); })) out.push(s); }); return out.slice(0, MAX_SETS); }
-  return { MAX_SETS: MAX_SETS, keyFor: keyFor, legacyFor: legacyFor, clean: clean, snapshot: snapshot, load: load, save: save, upsert: upsert, remove: remove, applyTo: applyTo, merge: merge, activeTags: activeTags, removeTag: removeTag };
+  return { MAX_SETS: MAX_SETS, keyFor: keyFor, legacyFor: legacyFor, clean: clean, snapshot: snapshot, load: load, save: save, upsert: upsert, remove: remove, applyTo: applyTo, merge: merge, activeTags: activeTags, removeTag: removeTag,
+    snapshotFor: snapshotFor, cleanFor: cleanFor, applyFor: applyFor, tagsFor: tagsFor, removeTagFor: removeTagFor, mergeFor: mergeFor };
 });
diff --git a/shared/shell.css b/shared/shell.css
--- a/shared/shell.css
+++ b/shared/shell.css
@@ -61,3 +61,12 @@ body.wk-open{overflow:hidden}
   body.print-weekly .wk-bar{display:none!important}
   body.print-weekly .wk-doc{padding:0;max-width:none}
 }
+
+/* Removable filter tags and saved filter sets (shared/filters.js), moved from national/style.css */
+.ftags{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:0 0 8px}.ftags[hidden]{display:none}
+.ftag{display:inline-flex;align-items:center;gap:6px;min-height:30px;padding:0 10px;border-radius:15px;border:1px solid var(--acc);background:color-mix(in srgb,var(--acc) 10%,var(--panel));color:var(--ink);font-size:12.5px;cursor:pointer}
+.ftag span{font-size:15px;line-height:1;color:var(--dim)}.ftclear{min-height:30px;font-size:12.5px}
+.fsets{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 6px}.fset{display:inline-flex;align-items:center}
+.fsdel{min-width:32px;min-height:34px;border:1px solid var(--line);border-left:0;border-radius:0 17px 17px 0;background:var(--panel2);color:var(--dim);font-size:16px;cursor:pointer}
+.fset .chip{border-top-right-radius:0;border-bottom-right-radius:0}
+.fsrow{display:flex;gap:6px;margin-bottom:10px}.fsrow input{flex:1;min-width:0;min-height:38px;padding:0 10px;border-radius:10px;border:1px solid var(--line);background:var(--bg);color:var(--ink);font-size:14px}
diff --git a/texas/app.js b/texas/app.js
--- a/texas/app.js
+++ b/texas/app.js
@@ -141,12 +141,29 @@
     var n = state.f.agencies.length + state.f.phases.length + state.f.kinds.length + state.f.kw.length;
     n += (state.f.rel !== 'relevant' ? 1 : 0) + (state.f.consult ? 0 : 1);
     $('advCount').textContent = n ? '(' + n + ')' : '';
-    var notes = [];
-    if (state.f.month) notes.push('month ' + M.fmtMonth(state.f.month));
-    if (state.f.q) notes.push('search "' + state.f.q + '"');
-    $('activeNote').hidden = !notes.length; $('activeNote').textContent = notes.length ? 'Active: ' + notes.join(', ') : '';
+    renderTags(); $('activeNote').hidden = true; // the removable tags replace the old "Active:" line
     Array.prototype.forEach.call(document.querySelectorAll('.seg button'), function (b) { b.classList.toggle('on', b.getAttribute('data-rel') === state.f.rel); });
   }
+  // ---------- saved filter sets and removable tags (shared/filters.js, texas.filtersets) ----------
+  var FS = window.RadarFilters ? RadarFilters.load(window.localStorage, 'texas') : [];
+  function freshFilters() { return { q: '', rel: 'relevant', consult: true, eng: false, agencies: [], phases: [], kinds: [], kw: [], houston: false, located: false, watchOnly: false, month: null }; }
+  function renderTags() {
+    var pl = {}, kl = {}; M.PHASES.forEach(function (p) { pl[p.id] = p.label; }); M.KEYWORDS.forEach(function (k) { kl[k.id] = k.label; });
+    var tags = RadarFilters.tagsFor('texas', state.f, { phaseLabel: pl, kindLabel: KIND_LABEL, kwLabel: kl, monthLabel: M.fmtMonth }), el = $('ftags'); el.hidden = !tags.length;
+    el.innerHTML = tags.map(function (t) { return '<button type="button" class="ftag" data-tag-k="' + esc(t.k) + '" data-tag-v="' + esc(t.v) + '" aria-label="Remove filter ' + esc(t.label) + '">' + esc(t.label) + ' <span aria-hidden="true">&times;</span></button>'; }).join('') + (tags.length ? '<button type="button" class="ftclear" id="ftClear">Clear all</button>' : '');
+  }
+  function renderSets() {
+    $('fsets').innerHTML = FS.length ? FS.map(function (x) { return '<span class="fset"><button type="button" class="chip" data-fs-apply="' + esc(x.name) + '">' + esc(x.name) + '</button><button type="button" class="fsdel" data-fs-del="' + esc(x.name) + '" aria-label="Delete filter set ' + esc(x.name) + '">&times;</button></span>'; }).join('') : '<span class="hint">None yet. Set filters, name them and tap Save.</span>';
+  }
+  function saveSet() {
+    var name = $('fsName').value.trim(); if (!name) { toast('Type a name for this filter set first.'); $('fsName').focus(); return; }
+    FS = RadarFilters.upsert(FS, RadarFilters.snapshotFor('texas', name, state.f)); RadarFilters.save(window.localStorage, 'texas', FS); $('fsName').value = ''; renderSets(); toast('Saved filter set "' + name + '" on this device.');
+  }
+  function applySet(name) {
+    var set = FS.filter(function (x) { return x.name === name; })[0]; if (!set) return;
+    state.f = RadarFilters.applyFor('texas', freshFilters(), set); $('q').value = state.f.q || ''; if (map) map.fit(state.f.houston ? 'hou' : 'tx'); apply(); toast('Applied "' + name + '".');
+  }
+  function deleteSet(name) { FS = RadarFilters.remove(FS, name); RadarFilters.save(window.localStorage, 'texas', FS); renderSets(); toast('Deleted filter set "' + name + '".'); }
   function renderLegend() {
     var items;
     if (state.colorBy === 'phase') items = M.PHASES.map(function (p) { return [p.label, p.color]; });
@@ -350,15 +367,17 @@
   }
   var WKS = null;
   function exportBackup() {
-    var ids = Object.keys(state.watch); if (!ids.length) { toast('The watchlist is empty, nothing to back up.'); return; }
+    var ids = Object.keys(state.watch); if (!ids.length && !FS.length) { toast('The watchlist is empty, nothing to back up.'); return; }
     var caps = {}; ids.forEach(function (id) { var c = capOf(id); if (!c.snap) c.snap = snapFor(id) || undefined; caps[id] = c; });
     var bk = CP.makeBackup(state.watch, caps, new Date().toISOString(), CAP_APP); bk.meta = {}; ids.forEach(function (id) { var w = state.watch[id]; bk.meta[id] = { t: w.t || '', a: w.a || '', u: w.u || null, at: w.at || '' }; });
+    bk.filtersets = FS; // saved filter sets travel with the Texas backup (same field as National); still one file per app
     capDownload('texas-opportunity-capture-backup-' + todayCentral() + '.json', 'application/json', JSON.stringify(bk, null, 1), false); toast('Backup saved to your downloads.');
   }
   function restoreBackup(text, mode) {
     var p = CP.parseBackup(text, CAP_APP); if (!p.ok) { toast(p.error); return; }
     if (mode === 'replace' && !window.confirm('Replace the whole watchlist and every capture file on this device with the backup?')) return;
     var meta = {}; try { meta = JSON.parse(text.replace(/^\ufeff/, '')).meta || {}; } catch (e) { meta = {}; }
+    try { var j8 = JSON.parse(text.replace(/^\ufeff/, '')); if (j8 && Array.isArray(j8.filtersets)) { FS = mode === 'replace' ? RadarFilters.cleanFor('texas', j8.filtersets) : RadarFilters.mergeFor('texas', FS, j8.filtersets); RadarFilters.save(window.localStorage, 'texas', FS); renderSets(); } } catch (e) { /* parseBackup already validated */ }
     var cur = { watch: {}, capture: {} }; Object.keys(state.watch).forEach(function (id) { cur.watch[id] = true; if (state.watch[id].cap) cur.capture[id] = CP.clean(state.watch[id].cap); });
     var out = CP.applyBackup(cur, p, mode), next = {};
     Object.keys(out.watch).forEach(function (id) {
@@ -464,6 +483,10 @@
     if ((el = t.closest('[data-star]'))) { e.stopPropagation(); toggleWatch(el.getAttribute('data-star')); return; }
     if ((el = t.closest('[data-open]'))) { openSheet(el.getAttribute('data-open')); return; }
     if ((el = t.closest('.card[data-id]'))) { openSheet(el.getAttribute('data-id')); return; }
+    if ((el = t.closest('[data-tag-k]'))) { var tk = el.getAttribute('data-tag-k'); RadarFilters.removeTagFor('texas', state.f, tk, el.getAttribute('data-tag-v')); if (tk === 'q') $('q').value = ''; apply(); return; }
+    if (t.closest('#ftClear')) { state.f = freshFilters(); $('q').value = ''; if (map) map.fit('tx'); apply(); return; }
+    if ((el = t.closest('[data-fs-apply]'))) { applySet(el.getAttribute('data-fs-apply')); return; }
+    if ((el = t.closest('[data-fs-del]'))) { deleteSet(el.getAttribute('data-fs-del')); return; }
     if ((el = t.closest('[data-month]'))) { var k = el.getAttribute('data-month'); state.f.month = state.f.month === k ? null : k; apply(); return; }
     if ((el = t.closest('[data-q]'))) { var q = el.getAttribute('data-q'); if (q === 'houston') { state.f.houston = !state.f.houston; if (map) map.fit(state.f.houston ? 'hou' : 'tx'); } else if (q === 'watch') state.f.watchOnly = !state.f.watchOnly; else if (q === 'located') state.f.located = !state.f.located; else if (q === 'consult') { state.f.consult = !state.f.consult; if (!state.f.consult) state.f.eng = false; } else if (q === 'eng') state.f.eng = !state.f.eng; else if (q === 'month') state.f.month = null; apply(); return; }
     if ((el = t.closest('[data-agency]'))) { toggleIn(state.f.agencies, el.getAttribute('data-agency')); apply(); return; }
@@ -492,7 +515,8 @@
     $('btnRestore').addEventListener('click', function () { restoreMode = 'merge'; $('restoreFile').value = ''; $('restoreFile').click(); });
     $('btnRestoreAll').addEventListener('click', function () { restoreMode = 'replace'; $('restoreFile').value = ''; $('restoreFile').click(); });
     $('restoreFile').addEventListener('change', function () { var f = this.files && this.files[0]; if (!f) return; var rd = new FileReader(); rd.onload = function () { restoreBackup(String(rd.result), restoreMode); }; rd.onerror = function () { toast('Could not read that file.'); }; rd.readAsText(f); });
-    $('btnClear').addEventListener('click', function () { state.f = { q: '', rel: 'relevant', consult: true, eng: false, agencies: [], phases: [], kinds: [], kw: [], houston: false, located: false, watchOnly: false, month: null }; $('q').value = ''; apply(); });
+    $('btnClear').addEventListener('click', function () { state.f = freshFilters(); $('q').value = ''; apply(); });
+    $('fsSave').addEventListener('click', saveSet); $('fsName').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); saveSet(); } }); renderSets();
     $('btnColor').addEventListener('click', function () { state.colorBy = state.colorBy === 'agency' ? 'phase' : 'agency'; this.textContent = 'Color: ' + (state.colorBy === 'agency' ? 'agency' : 'stage'); renderLegend(); apply(); });
     $('btnSweep').addEventListener('click', function () { var on = this.getAttribute('aria-pressed') !== 'true'; this.setAttribute('aria-pressed', on ? 'true' : 'false'); this.textContent = 'Sweep: ' + (on ? 'on' : 'off'); if (map) map.setSweep(on); });
     $('btnCsv').addEventListener('click', exportCsv); $('btnLive').addEventListener('click', liveRefresh);
diff --git a/texas/index.html b/texas/index.html
--- a/texas/index.html
+++ b/texas/index.html
@@ -61,8 +61,12 @@ window.RadarLoadError=function(name){
     <button type="button" class="btn" id="btnMore" aria-expanded="false" aria-controls="adv">Filters <span id="advCount"></span></button>
   </div>
   <div class="chips" id="quick" aria-label="Quick filters"></div>
+  <div class="ftags" id="ftags" aria-label="Active filters" hidden></div>
   <div id="adv" class="shell-drawer" hidden role="dialog" aria-label="Filters">
     <div class="drawhead"><h3>Filters</h3><button type="button" class="btn small" id="advClose">Close</button></div>
+    <h3>Saved filter sets <span class="hint">(this device)</span></h3>
+    <div class="fsets" id="fsets"></div>
+    <div class="fsrow"><input id="fsName" type="text" maxlength="60" placeholder="Name the current filters" aria-label="Name for this filter set" autocomplete="off"><button type="button" class="btn small" id="fsSave">Save</button></div>
     <h3>Drainage relevance <span class="hint">("likely" is inferred from type of work). In the Consultant services view only "Direct" narrows the list.</span></h3>
     <div class="seg" role="group" aria-label="Drainage relevance">
       <button type="button" data-rel="direct">Direct</button>
diff --git a/texas/style.css b/texas/style.css
--- a/texas/style.css
+++ b/texas/style.css
@@ -109,6 +109,7 @@ select{min-height:44px;border-radius:10px;border:1px solid var(--line);backgroun
 .tml{display:block;font-size:10px;font-weight:500;color:var(--acc)}.tml:empty{display:none}
 #v-pursuits .purhead,#v-pursuits>.note{padding:0 calc(14px + env(safe-area-inset-right)) 0 calc(14px + env(safe-area-inset-left))}
 #purList h3{grid-column:1 / -1;margin:10px 0 2px;font-size:14px;color:var(--dim)}
+.filters .ftags{margin:8px 0 0}.ftclear{background:none;border:0;color:var(--acc);font-weight:600;cursor:pointer}
 .txminidet{margin:6px 12px;border:1px solid var(--line);border-radius:12px;background:var(--panel)}
 .txminidet>summary{min-height:44px;display:flex;align-items:center;gap:8px;padding:0 12px;cursor:pointer;margin:0}
 .txminidet .chips{padding:6px 12px 10px}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
node shared/test-filters.js
node texas/test-filtersets.js
node test.js
```

Expected: `shared/test-filters.js` ends with `shared filter tests passed`; `texas/test-filtersets.js` ends with `texas filter-set tests passed`; `node test.js` ends with `all radars tests passed`.

- [ ] **Step 5: Review screenshots (desktop 1280x800, phone 390x844)**

```bash
python3 /tmp/radar-shots.py . /tmp/radar-shots/task-08 texas national
```

Expected: 4 lines ending in `errors: none`, and exit code 0. Check: Texas shows removable filter tags under the quick chips, with Clear all. The Filters drawer has a name box and Save, and saved sets apply in one tap. National tags and sets look the same as before. Send the images to Luis and wait for his review before you commit and start Task 9.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Radar 2.0: Texas saved filter sets and filter tags"
```


### Task 9: National map helpers (`national/mapview.js`)

**Files:**
- Create: `national/mapview.js`, `national/test-mapview.js`
- Modify: `national/index.html`, `national/test.js`, `shared/cache.js`

**Interfaces:**
- Consumes: `national/us-geo.js` (975 x 610 land; unchanged).
- Produces: `window.NationalMapView` with `LAND {975,610}`, `VIEW {1040,610}`, `CALLOUT`, `CALLOUT_IF_NEEDED`, `CALLOUT_MAX_ZOOM` (1.8), `ZOOM_MAX` (8), `aggregate(list, valueOf)` -> `{ by, none, maxV, maxN }`, `markerRadius(n, small, k)` (today's 15/19 and 19/24 sizes divided by the zoom), `shade(n, maxN)` (sqrt, 0..1), `shadeAlpha(t)`, `calloutsOn(k)`, `frameFor(k)`, `clampZoom(z)`, `viewBoxFor(z)`, `zoomAt(z, ux, uy, factor)`, `toMapUnits(rect, z, clientX, clientY)`, `layoutCallouts(items, opts)` (as in PR #19), `legendFor(info)`, and `tooltipLines(name, o, money)`. No colors, lane modes, value bubbles, or `compactMoney`.
- `national/index.html` loads `mapview.js` after `us-geo.js`, and the National cache list gains `./mapview.js`. Nothing calls the helpers yet.

- [ ] **Step 1: Write the failing tests**

Save as `/tmp/radar2-task09-tests.patch` (test files only: `national/test-mapview.js`, `national/test.js`), then run `git apply --whitespace=nowarn /tmp/radar2-task09-tests.patch`.

```diff
diff --git a/national/test-mapview.js b/national/test-mapview.js
new file mode 100644
--- /dev/null
+++ b/national/test-mapview.js
@@ -0,0 +1,62 @@
+// National Radar map helpers (ported from hydraulics-tools PR #19). Run alone: node national/test-mapview.js (also run by national/test.js)
+const assert = require('assert'), fs = require('fs'), path = require('path');
+const V = require('./mapview.js');
+// aggregate: counts, how many carry a value, sum of stated values; no-state records kept apart for the Nationwide chip
+const agg = V.aggregate([{ state: 'TX', v: 10 }, { state: 'TX', v: 0 }, { state: 'DC', v: 5 }, { state: '', v: 7 }, { v: 0 }], (r) => r.v);
+assert.deepStrictEqual(agg.by.TX, { n: 2, nv: 1, v: 10 });
+assert.deepStrictEqual(agg.none, { n: 2, nv: 1, v: 7 });
+assert.strictEqual(agg.maxV, 10); assert.strictEqual(agg.maxN, 2);
+// count-marker sizing: today's radii at 1x, same on-screen size when zoomed
+assert.deepStrictEqual([V.markerRadius(5, false, 1), V.markerRadius(120, false, 1), V.markerRadius(5, true, 1), V.markerRadius(120, true, 1)], [15, 19, 19, 24], 'same sizes as markersHtml today');
+assert.strictEqual(V.markerRadius(5, false, 2), 7.5); assert.strictEqual(V.markerRadius(5, false, 0.5), 15, 'never larger than 1x');
+// shading: theme-agnostic 0..1, sqrt, monotonic
+assert.strictEqual(V.shade(0, 10), 0); assert.strictEqual(V.shade(10, 10), 1); assert.strictEqual(V.shade(5, 0), 0);
+assert.ok(Math.abs(V.shade(25, 100) - 0.5) < 1e-12, 'sqrt scale');
+assert.ok(V.shade(1, 100) < V.shade(50, 100) && V.shade(50, 100) < V.shade(100, 100));
+[0, 0.2, 0.5, 1].forEach((t) => { const a = V.shadeAlpha(t); assert.ok(a >= 0 && a <= 1, 'alpha in 0..1'); });
+assert.strictEqual(V.shadeAlpha(0), 0); assert.ok(V.shadeAlpha(0.01) > 0.15 - 1e-9 && V.shadeAlpha(1) === 0.75);
+const src = fs.readFileSync(path.join(__dirname, 'mapview.js'), 'utf8');
+assert.ok(!/#[0-9a-f]{6}\b|rgb\(/i.test(src), 'no colors in the helpers: Day and Night come from CSS tokens');
+assert.ok(!/encodingFor|'pse'|'road'|'water'|compactMoney|bubbleFor/.test(src), 'no lane modes or value bubbles ported');
+// viewBox: 1040 wide only while callouts are on (under 1.8x); the 975 x 610 land otherwise
+assert.deepStrictEqual([V.LAND, V.VIEW], [{ w: 975, h: 610 }, { w: 1040, h: 610 }]);
+assert.strictEqual(V.viewBoxFor({ k: 1, x: 0, y: 0 }), '0 0 1040 610');
+assert.ok(V.calloutsOn(1.79) && !V.calloutsOn(1.8), 'callouts off from 1.8x');
+assert.strictEqual(V.viewBoxFor({ k: 2, x: 0, y: 0 }), '0 0 487.5 305', 'zoomed views use the land frame');
+assert.deepStrictEqual(V.clampZoom({ k: 20, x: -50, y: 9999 }), { k: 8, x: 0, y: 610 - 610 / 8 }, 'zoom and pan stay inside the map');
+assert.deepStrictEqual(V.clampZoom({ k: 0.3, x: 40, y: 40 }), { k: 1, x: 0, y: 0 });
+const z2 = V.zoomAt({ k: 1, x: 0, y: 0 }, 500, 300, 1.5);
+assert.ok(z2.k === 1.5 && Math.abs((500 - z2.x) / (1040 / 1.5) - 500 / 1040) < 1e-9, 'the point under the pointer stays put');
+assert.deepStrictEqual(V.zoomAt({ k: 8, x: 10, y: 10 }, 100, 100, 2), V.clampZoom({ k: 8, x: 10, y: 10 }), 'max zoom');
+const mu = V.toMapUnits({ left: 0, top: 0, width: 1040, height: 610 }, { k: 1, x: 0, y: 0 }, 520, 305);
+assert.ok(Math.abs(mu.x - 520) < 1e-9 && Math.abs(mu.y - 305) < 1e-9 && mu.ppu === 1);
+const mu2 = V.toMapUnits({ left: 0, top: 0, width: 520, height: 600 }, { k: 1, x: 0, y: 0 }, 260, 300);
+assert.ok(Math.abs(mu2.x - 520) < 1e-9 && Math.abs(mu2.y - 305) < 1e-9, 'letterboxed SVG maps through the meet offset');
+// callouts: real us-geo centroids for the crowded Northeast, laid out in the 1040 view against the 975 land
+const geo = fs.readFileSync(path.join(__dirname, 'us-geo.js'), 'utf8');
+const G = new Function('window', geo + '\nreturn window.US_GEO;')({});
+assert.ok(G && G.states && G.states.DC && G.states.MD && G.proj.w === 975, 'us-geo land stays 975 wide');
+const it = (st, r) => ({ st, cx: G.states[st].cx, cy: G.states[st].cy, r });
+const ovl = (p, q, r1, r2) => Math.hypot(p.x - q.x, p.y - q.y) < r1 + r2;
+let co = V.layoutCallouts([it('DC', 15), it('MD', 15), it('VA', 15), it('NY', 19)], { right: V.VIEW.w - 3, gap: 3 });
+assert.ok(co.DC && co.MD && !co.VA && !co.NY, 'small Northeast states move out, big states stay');
+assert.ok(!ovl(co.DC, co.MD, 15, 15), 'DC no longer covers MD');
+assert.ok(co.DC.x - 15 >= V.LAND.w - 40 && co.DC.x + 15 <= V.VIEW.w, 'callouts sit in the Atlantic column inside the widened view');
+co = V.layoutCallouts(V.CALLOUT.map((st) => it(st, 45)), { right: V.VIEW.w - 3, gap: 3 });
+assert.strictEqual(Object.keys(co).length, 7);
+assert.strictEqual(new Set(Object.values(co).map((p) => p.x.toFixed(1))).size, 2, 'overflow splits into two columns');
+const ks = Object.keys(co);
+ks.forEach((k, i) => { const p = co[k]; assert.ok(p.y - 45 >= 0 && p.y + 45 <= V.VIEW.h && p.x + 45 <= V.VIEW.w, k + ' inside view'); ks.slice(i + 1).forEach((q) => assert.ok(!ovl(p, co[q], 45, 45), k + ' vs ' + q)); });
+assert.ok(!Object.keys(V.layoutCallouts([it('VT', 8), it('NH', 8), it('NY', 10), it('MA', 10)], {})).some((k) => k === 'VT' || k === 'NH'), 'small VT / NH stay on the map');
+co = V.layoutCallouts([it('VT', 30), it('NH', 30), it('MA', 20)], {}); assert.ok(co.VT && co.NH, 'VT / NH move out when they collide');
+assert.deepStrictEqual(V.layoutCallouts([it('TX', 30)], {}), {});
+// legend and tooltip copy
+assert.deepStrictEqual(V.legendFor({ hasValue: true, hasCount: true, shade: true, callouts: true, pinned: 0 }).map((x) => x.cls), ['v', 'c', 'shd', 'co'], 'no pin entry with 0 pins');
+assert.ok(V.legendFor({ pinned: 3 })[0].text.includes('(3)'));
+assert.deepStrictEqual(V.tooltipLines('Texas', { n: 3, nv: 2, v: 1500000 }, (v) => '$' + v / 1e6 + 'M'), ['Texas', '3 records', '$1.5M stated by 2 of them (fees, design-build values and project costs as the sources state them)']);
+assert.deepStrictEqual(V.tooltipLines('Maine', { n: 1, nv: 0, v: 0 }, String), ['Maine', '1 record', 'Count only, no stated value']);
+// shipped: the page loads the helpers after us-geo.js and the service worker caches them
+const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
+assert.ok(html.indexOf('<script src="mapview.js"></script>') > html.indexOf('<script src="us-geo.js"></script>') && html.indexOf('<script src="mapview.js"></script>') < html.indexOf('<script src="app.js"></script>'), 'index.html loads mapview.js before app.js');
+assert.ok(require('../shared/cache.js').files('national').indexOf('./mapview.js') >= 0, 'sw caches mapview.js');
+console.log('national map helper tests passed');
diff --git a/national/test.js b/national/test.js
--- a/national/test.js
+++ b/national/test.js
@@ -215,4 +215,5 @@ require('./test-v5.js');
 require('./test-v6.js');
 require('./test-shell.js');
 require('./test-dormant.js');
+require('./test-mapview.js');
 console.log('national-radar tests passed');
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
node national/test-mapview.js
```

Expected:

- `node national/test-mapview.js`: exit 1, with `Error: Cannot find module './mapview.js'`

- [ ] **Step 3: Implement**

Save as `/tmp/radar2-task09-impl.patch`, then run `git apply --whitespace=nowarn /tmp/radar2-task09-impl.patch`.

```diff
diff --git a/national/index.html b/national/index.html
--- a/national/index.html
+++ b/national/index.html
@@ -214,6 +214,7 @@ window.RadarLoadError=function(name){
 <script src="../shared/shell.js" onerror="RadarLoadError(this.src||this.href)"></script>
 <script src="proj.js"></script>
 <script src="us-geo.js"></script>
+<script src="mapview.js"></script>
 <script src="../shared/capture.js" onerror="RadarLoadError(this.src||this.href)"></script>
 <script src="v2.js"></script>
 <script src="v4.js"></script>
diff --git a/national/mapview.js b/national/mapview.js
new file mode 100644
--- /dev/null
+++ b/national/mapview.js
@@ -0,0 +1,86 @@
+/* National Radar map helpers (pure, no DOM), adapted from hydraulics-tools PR #19 mapview.js for this repo.
+   - Count markers as today (no dollar-sized bubbles, no lane modes); marker sizes stay the same on screen when zoomed.
+   - us-geo.js land is 975 x 610. While Northeast callouts are on (zoom under 1.8x) the viewBox widens to 1040 x 610 so the
+     Atlantic column (MA, RI, CT, NJ, DE, MD, DC, and VT / NH when they collide) sits in the extra space on the right.
+   - Shading is a theme-agnostic 0..1 value; the colors come from CSS tokens (--map-shade, --map-land) for Day and Night. */
+(function (root, factory) { if (typeof module === 'object' && module.exports) module.exports = factory(); else root.NationalMapView = factory(); })(typeof self !== 'undefined' ? self : this, function () {
+  'use strict';
+  var LAND = { w: 975, h: 610 }, VIEW = { w: 1040, h: 610 };
+  var CALLOUT = ['MA', 'RI', 'CT', 'NJ', 'DE', 'MD', 'DC'], CALLOUT_IF_NEEDED = ['VT', 'NH'], CALLOUT_MAX_ZOOM = 1.8, ZOOM_MAX = 8;
+  // list: records; valueOf(r) -> number (0 when the record states no value). Records with no state are kept apart in `none`.
+  function aggregate(list, valueOf) {
+    var by = {}, none = { n: 0, nv: 0, v: 0 };
+    list.forEach(function (r) {
+      var o = r.state ? (by[r.state] = by[r.state] || { n: 0, nv: 0, v: 0 }) : none, v = +valueOf(r) || 0;
+      o.n++; if (v > 0) { o.nv++; o.v += v; }
+    });
+    var maxV = 0, maxN = 0; Object.keys(by).forEach(function (k) { maxV = Math.max(maxV, by[k].v); maxN = Math.max(maxN, by[k].n); });
+    return { by: by, none: none, maxV: maxV, maxN: maxN };
+  }
+  // today's count-marker radius (map units at 1x), divided by the zoom so markers keep their on-screen size
+  function markerRadius(n, small, k) { var r = small ? (n > 99 ? 24 : 19) : (n > 99 ? 19 : 15); return r / Math.max(1, k || 1); }
+  // state shading by record count: 0..1 on a sqrt scale; shadeAlpha maps it to the share of --map-shade mixed into --map-land
+  function shade(n, maxN) { return n > 0 && maxN > 0 ? Math.sqrt(Math.min(1, n / maxN)) : 0; }
+  function shadeAlpha(t) { return t > 0 ? 0.15 + 0.6 * Math.min(1, t) : 0; }
+  // zoom state { k, x, y }: k in 1..8; x, y = top-left of the view in map units
+  function calloutsOn(k) { return (k || 1) < CALLOUT_MAX_ZOOM; }
+  function frameFor(k) { return calloutsOn(k) ? VIEW : LAND; }
+  function clampZoom(z) {
+    var k = Math.max(1, Math.min(ZOOM_MAX, +z.k || 1)), f = frameFor(k), w = f.w / k, h = f.h / k;
+    if (k === 1) return { k: 1, x: 0, y: 0 };
+    return { k: k, x: Math.max(0, Math.min(f.w - w, +z.x || 0)), y: Math.max(0, Math.min(f.h - h, +z.y || 0)) };
+  }
+  function viewBoxFor(z) { var c = clampZoom(z), f = frameFor(c.k); return [c.x, c.y, f.w / c.k, f.h / c.k].map(function (n) { return +n.toFixed(2); }).join(' '); }
+  // zoom by `factor` keeping the map point (ux, uy) under the pointer
+  function zoomAt(z, ux, uy, factor) {
+    var c = clampZoom(z), k2 = Math.max(1, Math.min(ZOOM_MAX, c.k * factor)); if (k2 === c.k) return c;
+    var f1 = frameFor(c.k), f2 = frameFor(k2), w1 = f1.w / c.k, h1 = f1.h / c.k, w2 = f2.w / k2, h2 = f2.h / k2;
+    return clampZoom({ k: k2, x: ux - (ux - c.x) / w1 * w2, y: uy - (uy - c.y) / h1 * h2 });
+  }
+  // a client point -> map units, for an SVG drawn with the default preserveAspectRatio (xMidYMid meet). rect = getBoundingClientRect()
+  function toMapUnits(rect, z, clientX, clientY) {
+    var c = clampZoom(z), f = frameFor(c.k), vw = f.w / c.k, vh = f.h / c.k, ppu = rect.width ? Math.min(rect.width / vw, rect.height ? rect.height / vh : Infinity) : 1;
+    var ox = (rect.width - vw * ppu) / 2, oy = (rect.height - vh * ppu) / 2;
+    return { x: c.x + (clientX - rect.left - ox) / ppu, y: c.y + (clientY - rect.top - oy) / ppu, ppu: ppu };
+  }
+  // items: [{ st, cx, cy, r }] in map units. Returns { ST: { x, y } } for the states moved to the callout column.
+  // opts: { right (x of the column's right edge), top, bottom, gap }
+  function layoutCallouts(items, opts) {
+    opts = opts || {}; var right = opts.right === undefined ? VIEW.w - 4 : opts.right, top = opts.top === undefined ? 6 : opts.top, bottom = opts.bottom === undefined ? VIEW.h - 6 : opts.bottom, gap = opts.gap === undefined ? 4 : opts.gap;
+    var overlaps = function (a) { return items.some(function (b) { return b !== a && CALLOUT.indexOf(b.st) < 0 && Math.hypot(a.cx - b.cx, a.cy - b.cy) < a.r + b.r; }); };
+    var chosen = items.filter(function (it) { return CALLOUT.indexOf(it.st) >= 0 || (CALLOUT_IF_NEEDED.indexOf(it.st) >= 0 && (overlaps(it) || items.some(function (b) { return CALLOUT.indexOf(b.st) >= 0 && Math.hypot(it.cx - b.cx, it.cy - b.cy) < it.r + b.r; }))); });
+    chosen.sort(function (a, b) { return a.cy - b.cy || (a.st < b.st ? -1 : 1); });
+    var out = {}; if (!chosen.length) return out;
+    var place = function (list, x) {
+      var ys = [], prev = null;
+      list.forEach(function (it) { var y = Math.max(it.cy, top + it.r); if (prev) y = Math.max(y, prev.y + prev.r + it.r + gap); ys.push(y); prev = { y: y, r: it.r }; });
+      var over = ys.length ? ys[ys.length - 1] + list[list.length - 1].r - bottom : 0;
+      if (over > 0) { var room = ys[0] - list[0].r - top, shift = Math.min(over, Math.max(0, room)); ys = ys.map(function (y) { return y - shift; }); over -= shift; }
+      return { ys: ys, over: over, x: x };
+    };
+    var maxR = Math.max.apply(null, chosen.map(function (c) { return c.r; }));
+    var col1 = place(chosen, right - maxR);
+    if (col1.over <= 0) { chosen.forEach(function (it, i) { out[it.st] = { x: col1.x, y: col1.ys[i] }; }); return out; }
+    var a = chosen.filter(function (_, i) { return i % 2 === 0; }), b = chosen.filter(function (_, i) { return i % 2 === 1; });
+    var ca = place(a, right - maxR), cb = place(b, right - 3 * maxR - gap);
+    a.forEach(function (it, i) { out[it.st] = { x: ca.x, y: ca.ys[i] }; }); b.forEach(function (it, i) { out[it.st] = { x: cb.x, y: cb.ys[i] }; });
+    return out;
+  }
+  // legend entries [{ cls, text }]; info: { hasValue, hasCount, shade, callouts, pinned }
+  function legendFor(info) {
+    info = info || {}; var e = [];
+    if (info.hasValue) e.push({ cls: 'v', text: 'Number = records in the state; blue = some records state a dollar value (hover or focus for the total)' });
+    if (info.hasCount) e.push({ cls: 'c', text: 'Amber = count only (no stated value)' });
+    if (info.shade) e.push({ cls: 'shd', text: 'State shade = number of records' });
+    if (info.callouts) e.push({ cls: 'co', text: 'Small Northeast states are drawn off the coast, with a line to the state' });
+    if (info.pinned > 0) e.push({ cls: 'p', text: 'Pin = city named in the source (' + info.pinned + ')' });
+    return e;
+  }
+  // tooltip / aria lines for one state; money(v) formats a stated total
+  function tooltipLines(name, o, money) {
+    var lines = [name, o.n + ' record' + (o.n === 1 ? '' : 's')];
+    lines.push(o.nv ? money(o.v) + ' stated by ' + o.nv + ' of them (fees, design-build values and project costs as the sources state them)' : 'Count only, no stated value');
+    return lines;
+  }
+  return { LAND: LAND, VIEW: VIEW, CALLOUT: CALLOUT, CALLOUT_IF_NEEDED: CALLOUT_IF_NEEDED, CALLOUT_MAX_ZOOM: CALLOUT_MAX_ZOOM, ZOOM_MAX: ZOOM_MAX, aggregate: aggregate, markerRadius: markerRadius, shade: shade, shadeAlpha: shadeAlpha, calloutsOn: calloutsOn, frameFor: frameFor, clampZoom: clampZoom, viewBoxFor: viewBoxFor, zoomAt: zoomAt, toMapUnits: toMapUnits, layoutCallouts: layoutCallouts, legendFor: legendFor, tooltipLines: tooltipLines };
+});
diff --git a/shared/cache.js b/shared/cache.js
--- a/shared/cache.js
+++ b/shared/cache.js
@@ -18,7 +18,7 @@
     if (app === 'texas') {
       return ['./', './index.html', './style.css', './magazine.css', './app.js', './model.js', './map.js', './intel.js', './intel-ui.js', './newsletter.js', './magazine.js', './texas-geo.js', './data/opportunities.json', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'].concat(shared('../shared/'));
     }
-    return ['./', './index.html', './style.css', './proj.js', './us-geo.js', './v2.js', './v4.js', './combined.js', './v6.js', './model.js', './cost.js', './roadway.js', './pse.js', './sources.js', './app.js', './data/national.json', './data/roadway.json', './data/pse.json', './data/cost-prices.json', './data/source-status.json', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'].concat(shared('../shared/'));
+    return ['./', './index.html', './style.css', './proj.js', './us-geo.js', './mapview.js', './v2.js', './v4.js', './combined.js', './v6.js', './model.js', './cost.js', './roadway.js', './pse.js', './sources.js', './app.js', './data/national.json', './data/roadway.json', './data/pse.json', './data/cost-prices.json', './data/source-status.json', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'].concat(shared('../shared/'));
   }
   return { VERSION: VERSION, name: name, files: files };
 });
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
node national/test-mapview.js
node test.js
```

Expected: `national/test-mapview.js` ends with `national map helper tests passed`; `node test.js` ends with `all radars tests passed`.

- [ ] **Step 5: Review screenshots (desktop 1280x800, phone 390x844)**

```bash
python3 /tmp/radar-shots.py . /tmp/radar-shots/task-09 national national:map texas
```

Expected: 6 lines ending in `errors: none`, and exit code 0. Check: Nothing visible changes yet: the helpers are loaded but not called. No console errors. Send the images to Luis and wait for his review before you commit and start Task 10.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Radar 2.0: National map helpers (mapview.js)"
```


### Task 10: National Map tab tools and map theme tokens

**Files:**
- Create: `national/test-maptools.js`
- Modify: `national/app.js`, `national/index.html`, `national/mapview.js`, `national/style.css`, `national/test-mapview.js`, `national/test.js`

**Interfaces:**
- Consumes: `NationalMapView` (Task 9), `scoped(S.scope, ['states'])`, `S.f.states`, `fee`, `project`, `M.fmtMoney`, `toast`, `SHELL.isDesktop()`.
- Produces in `national/mapview.js`: `nextSelection(sel, k, add)`. A plain click selects one state, and clicking the only selected state clears it. Add toggles the state.
- Produces in `national/index.html` (Map tab only): a toolbar (`#btnMulti`, `#btnShade` (on), `#btnTable`, `#zIn`, `#zOut`, `#zReset`), `#selBar`, `#noneChip`, `#mapTip`, `#mapTable`; `#usmap` becomes `role="group"`.
- Produces in `national/app.js`: `MV`, `MAPSEL`, `MAPDATA`, `stName`, `stLines`, a new `renderMap(list)`, `drawMapLayers`, `renderSelBar`, `renderMapTable`, `selectState(k, add, refocus)`, `showTip`, `hideTip`, `zoomBy`, `bindMapTools()` (called after the Escape handler). A `#v-map` click handler stops propagation, so the document `[data-st]` toggle still serves the List-tab mini map.
- Produces in `national/style.css`: tokens `--map-bg`, `--map-land`, `--map-edge`, `--map-shade` for Night (`:root`) and Day, replacing `#070c19`, `#16233f`, `#33466f`, `#dfe8f3` and the Day `.st` / `.mapwrap` / `.miniwrap` overrides; `.st.shd` uses `color-mix` with an inline `--shade-a`; plus styles for dim, lead lines, callout labels, the toolbar, the selection bar, the tooltip, and the table.

- [ ] **Step 1: Write the failing tests**

Save as `/tmp/radar2-task10-tests.patch` (test files only: `national/test-maptools.js`, `national/test-mapview.js`, `national/test.js`), then run `git apply --whitespace=nowarn /tmp/radar2-task10-tests.patch`.

```diff
diff --git a/national/test-maptools.js b/national/test-maptools.js
new file mode 100644
--- /dev/null
+++ b/national/test-maptools.js
@@ -0,0 +1,41 @@
+// Radar 2.0 Map tab tools (spec: Map tools). Run alone: node national/test-maptools.js (also run by national/test.js)
+const assert = require('assert'), fs = require('fs'), path = require('path');
+const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
+const app = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
+const css = fs.readFileSync(path.join(__dirname, 'style.css'), 'utf8');
+const vm = html.slice(html.indexOf('<section id="v-map"'), html.indexOf('<section id="v-list"'));
+const vl = html.slice(html.indexOf('<section id="v-list"'), html.indexOf('</section>', html.indexOf('<section id="v-list"')));
+// toolbar, selection bar, Nationwide chip, tooltip, table: all on the Map tab, before the map
+['btnMulti', 'btnShade', 'btnTable', 'zIn', 'zOut', 'zReset', 'selBar', 'noneChip', 'mapTip', 'mapTable'].forEach((id) => assert.ok(vm.indexOf('id="' + id + '"') > 0, 'Map tab has #' + id));
+assert.ok(vm.indexOf('role="toolbar"') > 0 && vm.indexOf('id="btnMulti"') < vm.indexOf('id="usmap"') && vm.indexOf('id="selBar"') < vm.indexOf('id="usmap"'), 'tools and selection bar sit above the map');
+assert.ok(/id="btnShade" aria-pressed="true"/.test(vm) && /id="btnMulti" aria-pressed="false"/.test(vm) && /id="btnTable" aria-pressed="false"/.test(vm), 'toggles expose their state');
+assert.ok(/<svg id="usmap" viewBox="0 0 975 610" role="group"/.test(vm), 'markup starts on the land frame; the script sets the 1040 view while callouts are on');
+// the List tab mini map stays compact: no tools
+['maptools', 'btnMulti', 'zIn', 'mapTable', 'selBar'].forEach((k) => assert.ok(vl.indexOf(k) < 0, 'mini map has no ' + k));
+assert.ok(/function renderMini\(list\)/.test(app) && /markersHtml\(by, true\)/.test(app), 'mini map keeps its count markers');
+// wiring
+assert.ok(/var MV = window\.NationalMapView/.test(app) && /bindMapTools\(\);/.test(app), 'map helpers and tools wired');
+assert.ok(/MV\.aggregate\(scoped\(S\.scope, \['states'\]\), fee\)/.test(app), 'map counts ignore the state filter, so unselected states stay visible (dimmed)');
+assert.ok(/classList\.toggle\('dim', sel\.length > 0 && sel\.indexOf\(k\) < 0\)/.test(app), 'unselected states dimmed while a selection is active');
+assert.ok(/e\.ctrlKey \|\| e\.metaKey \|\| e\.shiftKey/.test(app) && /add \|\| MAPSEL\.multi/.test(app) && /MV\.nextSelection\(/.test(app), 'Ctrl / Shift-click and Multi-select add states');
+assert.ok(/e\.stopPropagation\(\)/.test(app) && /\[data-mst\],#v-map \[data-st\],#selClear/.test(app), 'Map tab clicks stay on the Map tab; the document [data-st] toggle still serves the mini map');
+assert.ok(/id === 'selClear'/.test(app) && /<button type="button" class="chip" id="selClear">Clear<\/button>/.test(app), 'selection bar has Clear');
+assert.ok(/Nationwide \/ no state \(/.test(app) && /data-mst="\?\?"/.test(app), 'Nationwide / no state chip selects the no-state records');
+assert.ok(/addEventListener\('wheel'/.test(app) && /passive: false/.test(app) && /MV\.zoomAt\(/.test(app) && /\$\('zReset'\)/.test(app), 'wheel and +/- zoom, Reset');
+assert.ok(/MAPSEL\.zoom\.k <= 1/.test(app) && /MV\.clampZoom\(\{ k: MAPSEL\.zoom\.k, x: dr\.zx - dx, y: dr\.zy - dy \}\)/.test(app) && /MAPSEL\.moved/.test(app), 'drag-pan only when zoomed; a drag does not select');
+assert.ok(/e\.pointerType !== 'mouse'/.test(app) && /addEventListener\('focusin'/.test(app) && /tabindex="0" role="button"/.test(app) && /e\.key !== 'Enter' && e\.key !== ' '/.test(app), 'tooltips on hover and keyboard focus; markers are keyboard buttons');
+assert.ok(/MV\.calloutsOn\(z\.k\)/.test(app) && /MV\.viewBoxFor\(z\)/.test(app) && /MV\.layoutCallouts\(items, \{ right: MV\.VIEW\.w - 3, gap: 3 \}\)/.test(app), 'callouts only while on; viewBox from the helpers');
+assert.ok(/MV\.markerRadius\(d\.agg\.by\[k\]\.n, false, z\.k\)/.test(app) && !/bubbleFor|encodingFor|lane mode/i.test(app), 'count markers kept; no value bubbles or lane modes');
+assert.ok(/MAPSEL\.table/.test(app) && /<th scope="col">State<\/th>/.test(app) && /class="tsel" data-mst=/.test(app), 'Map as table, with selectable rows');
+assert.ok(/MV\.shadeAlpha\(t\)/.test(app) && /--shade-a/.test(app), 'shading passes a 0..1 value; colors come from CSS');
+// theme tokens instead of hard-coded night colors
+const tokens = ['--map-bg', '--map-land', '--map-edge', '--map-shade'];
+const night = css.slice(css.indexOf(':root{'), css.indexOf('}', css.indexOf(':root{')));
+const day = css.slice(css.indexOf('html[data-theme=day]{'), css.indexOf('}', css.indexOf('html[data-theme=day]{')));
+tokens.forEach((t) => { assert.ok(night.indexOf(t + ':') > 0, 'night defines ' + t); assert.ok(day.indexOf(t + ':') > 0, 'day defines ' + t); });
+const rules = css.replace(night, '').replace(day, '');
+assert.ok(rules.indexOf('#0c1428') < 0 && rules.indexOf('#16233f') < 0 && rules.indexOf('#070c19') < 0 && rules.indexOf('#dfe8f3') < 0, 'map colors come from tokens');
+assert.ok(/\.st\{fill:var\(--map-land\);stroke:var\(--map-edge\)/.test(css) && /\.st\.shd\{fill:color-mix\(in srgb,var\(--map-shade\) calc\(var\(--shade-a\) \* 100%\),var\(--map-land\)\)\}/.test(css), 'land and shading use the tokens');
+assert.ok(/\.mapwrap\{[^}]*background:var\(--map-bg\)/.test(css) && /\.miniwrap\{background:var\(--map-bg\)/.test(css), 'map backgrounds use the token');
+assert.ok(/\.st\.dim,\.mkg\.dim,\.lead\.dim\{opacity:\.4\}/.test(css) && /\.maptip\[hidden\]\{display:none\}/.test(css), 'dim and tooltip styles');
+console.log('national map tools tests passed');
diff --git a/national/test-mapview.js b/national/test-mapview.js
--- a/national/test-mapview.js
+++ b/national/test-mapview.js
@@ -50,6 +50,15 @@ ks.forEach((k, i) => { const p = co[k]; assert.ok(p.y - 45 >= 0 && p.y + 45 <= V
 assert.ok(!Object.keys(V.layoutCallouts([it('VT', 8), it('NH', 8), it('NY', 10), it('MA', 10)], {})).some((k) => k === 'VT' || k === 'NH'), 'small VT / NH stay on the map');
 co = V.layoutCallouts([it('VT', 30), it('NH', 30), it('MA', 20)], {}); assert.ok(co.VT && co.NH, 'VT / NH move out when they collide');
 assert.deepStrictEqual(V.layoutCallouts([it('TX', 30)], {}), {});
+// selection: click picks one state (click it again to clear); Ctrl / Shift / Multi-select toggles it in the set
+assert.deepStrictEqual(V.nextSelection([], 'TX', false), ['TX']);
+assert.deepStrictEqual(V.nextSelection(['TX'], 'TX', false), []);
+assert.deepStrictEqual(V.nextSelection(['TX', 'CA'], 'TX', false), ['TX'], 'plain click on a selected state in a set keeps only it');
+assert.deepStrictEqual(V.nextSelection(['TX'], 'CA', false), ['CA']);
+assert.deepStrictEqual(V.nextSelection(['TX'], 'CA', true), ['TX', 'CA']);
+assert.deepStrictEqual(V.nextSelection(['TX', 'CA'], 'TX', true), ['CA']);
+assert.deepStrictEqual(V.nextSelection(undefined, '??', true), ['??'], 'Nationwide / no state works like a state');
+const before = ['TX']; V.nextSelection(before, 'CA', true); assert.deepStrictEqual(before, ['TX'], 'does not change its input');
 // legend and tooltip copy
 assert.deepStrictEqual(V.legendFor({ hasValue: true, hasCount: true, shade: true, callouts: true, pinned: 0 }).map((x) => x.cls), ['v', 'c', 'shd', 'co'], 'no pin entry with 0 pins');
 assert.ok(V.legendFor({ pinned: 3 })[0].text.includes('(3)'));
diff --git a/national/test.js b/national/test.js
--- a/national/test.js
+++ b/national/test.js
@@ -216,4 +216,5 @@ require('./test-v6.js');
 require('./test-shell.js');
 require('./test-dormant.js');
 require('./test-mapview.js');
+require('./test-maptools.js');
 console.log('national-radar tests passed');
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
node national/test-maptools.js
node national/test-mapview.js
```

Expected:

- `node national/test-maptools.js`: exit 1, with `AssertionError [ERR_ASSERTION]: Map tab has #btnMulti`
- `node national/test-mapview.js`: exit 1, with `TypeError: V.nextSelection is not a function`

- [ ] **Step 3: Implement**

Save as `/tmp/radar2-task10-impl.patch`, then run `git apply --whitespace=nowarn /tmp/radar2-task10-impl.patch`.

```diff
diff --git a/national/app.js b/national/app.js
--- a/national/app.js
+++ b/national/app.js
@@ -286,8 +286,8 @@
   var mapBuilt = false, project = null;
   function buildMap() {
     if (mapBuilt || !G) return; mapBuilt = true; project = window.NationalProj.make(G.proj);
-    var html = '<g id="gSt">'; Object.keys(G.states).forEach(function (k) { html += '<path class="st" data-st="' + k + '" d="' + G.states[k].d + '"><title>' + esc(G.states[k].n) + '</title></path>'; });
-    $('usmap').innerHTML = html + '</g><g id="gBub"></g><g id="gPin"></g>';
+    var html = '<g id="gSt">'; Object.keys(G.states).forEach(function (k) { html += '<path class="st" data-st="' + k + '" d="' + G.states[k].d + '"></path>'; }); // Map tab: custom tooltip instead of <title>
+    $('usmap').innerHTML = html + '</g><g id="gLead"></g><g id="gBub"></g><g id="gPin"></g>';
   }
   // v6: count markers (no dollar-sized bubbles); dollar value in the tooltip and on tap. Shared by the full map and the small map.
   function stateTotals(list) { var by = {}; list.forEach(function (r) { if (!r.state) return; var o = by[r.state] = by[r.state] || { n: 0, v: 0, nv: 0 }; o.n++; var v = fee(r); if (v) { o.v += v; o.nv++; } }); return by; }
@@ -306,15 +306,107 @@
     var sel = S.f.states; $('miniSel').textContent = sel.length ? 'showing ' + sel.join(', ') + ' (tap again to remove)' : 'tap a state to filter the list'; $('miniSel2').textContent = $('miniSel').textContent; if (SHELL.isDesktop()) $('miniDet').open = true;
     var nost = list.filter(function (r) { return !r.state; }).length, nl = $('miniNoLoc'); $('miniNote').textContent = Object.keys(by).length + ' states'; nl.textContent = RadarShell.noLocLabel(nost); nl.hidden = !nost;
   }
+  // Radar 2.0 Map tab: click / Ctrl-Shift-click / Multi-select, dimmed unselected states, shading by count, zoom and pan,
+  // Northeast callouts in a 1040-wide view (off from 1.8x), tooltips on hover and keyboard focus, and Map as table. Helpers: mapview.js
+  var MV = window.NationalMapView, MAPSEL = { multi: false, shade: true, table: false, zoom: { k: 1, x: 0, y: 0 }, drag: null, moved: false }, MAPDATA = null;
+  function stName(k) { return k === '??' ? 'Nationwide / no state' : (M.STATE_NAMES[k] || (G && G.states[k] && G.states[k].n) || k); }
+  function stLines(k) { var o = MAPDATA && (k === '??' ? MAPDATA.agg.none : MAPDATA.agg.by[k]); return MV.tooltipLines(stName(k), o || { n: 0, nv: 0, v: 0 }, M.fmtMoney); }
   function renderMap(list) {
     buildMap(); if (!G) throw new Error('us-geo.js did not load');
-    var by = stateTotals(list); document.querySelectorAll('#gSt .st').forEach(function (p) { var k = p.getAttribute('data-st'); p.classList.toggle('sel', S.f.states.indexOf(k) >= 0); p.classList.toggle('has', !!by[k]); });
-    $('gBub').innerHTML = markersHtml(by, false);
-    var pins = ''; list.forEach(function (r) { if (r.lat && r.lon) { var xy = project(r.lon, r.lat, r.state); pins += '<circle class="pin" data-open="' + esc(r.id) + '" cx="' + xy[0].toFixed(1) + '" cy="' + xy[1].toFixed(1) + '" r="5"><title>' + esc(r.title) + '</title></circle>'; } });
+    // counts for every state in this view, so unselected states keep their numbers (dimmed) while a selection filters the list
+    MAPDATA = { list: list, agg: MV.aggregate(scoped(S.scope, ['states']), fee), pinned: list.filter(function (r) { return r.lat && r.lon; }).length };
+    var tb = MAPSEL.table;
+    $('mapWrap').classList.toggle('astable', tb); $('mapTable').hidden = !tb;
+    [['btnMulti', MAPSEL.multi], ['btnShade', MAPSEL.shade], ['btnTable', tb]].forEach(function (x) { $(x[0]).classList.toggle('on', x[1]); $(x[0]).setAttribute('aria-pressed', String(x[1])); });
+    ['zIn', 'zOut', 'zReset', 'btnShade'].forEach(function (id) { $(id).disabled = tb; });
+    renderSelBar(list); renderMapTable(); drawMapLayers();
+  }
+  function drawMapLayers() {
+    var d = MAPDATA; if (!d || !G) return;
+    var sel = S.f.states, z = MAPSEL.zoom, co = MV.calloutsOn(z.k), svg = $('usmap');
+    svg.setAttribute('viewBox', MV.viewBoxFor(z)); svg.classList.toggle('zoomed', z.k > 1);
+    document.querySelectorAll('#gSt .st').forEach(function (p) {
+      var k = p.getAttribute('data-st'), o = d.agg.by[k], t = MAPSEL.shade && o ? MV.shade(o.n, d.agg.maxN) : 0;
+      p.classList.toggle('shd', t > 0); if (t > 0) p.style.setProperty('--shade-a', MV.shadeAlpha(t).toFixed(3)); else p.style.removeProperty('--shade-a');
+      p.classList.toggle('sel', sel.indexOf(k) >= 0); p.classList.toggle('dim', sel.length > 0 && sel.indexOf(k) < 0); p.classList.toggle('has', !!o);
+    });
+    var items = Object.keys(d.agg.by).filter(function (k) { return G.states[k]; }).map(function (k) { return { st: k, cx: G.states[k].cx, cy: G.states[k].cy, r: MV.markerRadius(d.agg.by[k].n, false, z.k), o: d.agg.by[k] }; });
+    var place = co ? MV.layoutCallouts(items, { right: MV.VIEW.w - 3, gap: 3 }) : {}, fs = 13 / Math.max(1, z.k), lead = '', mk = '';
+    items.forEach(function (it) {
+      var c = place[it.st], x = c ? c.x : it.cx, y = c ? c.y : it.cy, on = sel.indexOf(it.st) >= 0, dim = sel.length > 0 && !on;
+      if (c) lead += '<g class="lead' + (dim ? ' dim' : '') + '"><line x1="' + it.cx + '" y1="' + it.cy + '" x2="' + x.toFixed(1) + '" y2="' + y.toFixed(1) + '"></line><circle cx="' + it.cx + '" cy="' + it.cy + '" r="2.5"></circle></g>';
+      var aria = stLines(it.st).join(', ') + (on ? ', selected' : '') + '. Enter selects; Shift+Enter adds to the selection.';
+      mk += '<g class="mkg' + (on ? ' sel' : '') + (dim ? ' dim' : '') + '" data-mst="' + it.st + '" tabindex="0" role="button" aria-pressed="' + on + '" aria-label="' + esc(aria) + '"><circle class="mk' + (it.o.nv ? '' : ' cnt') + '" cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + it.r.toFixed(2) + '"></circle><text class="mkt" x="' + x.toFixed(1) + '" y="' + (y + fs * 0.42).toFixed(1) + '" style="font-size:' + fs.toFixed(2) + 'px">' + it.o.n + '</text>' + (c ? '<text class="cot" x="' + (x - it.r - 4).toFixed(1) + '" y="' + (y + 4).toFixed(1) + '">' + it.st + '</text>' : '') + '</g>';
+    });
+    $('gLead').innerHTML = lead; $('gBub').innerHTML = mk;
+    var pins = '', pr = 5 / Math.max(1, z.k); d.list.forEach(function (r) { if (r.lat && r.lon) { var xy = project(r.lon, r.lat, r.state); pins += '<circle class="pin" data-open="' + esc(r.id) + '" cx="' + xy[0].toFixed(1) + '" cy="' + xy[1].toFixed(1) + '" r="' + pr.toFixed(2) + '"><title>' + esc(r.title) + '</title></circle>'; } });
     $('gPin').innerHTML = pins;
-    var nostate = list.filter(function (r) { return !r.state; }).length, pinned = list.filter(function (r) { return r.lat; }).length;
-    $('legend').innerHTML = '<span><i class="lg-v"></i>Number = records in the state; blue = some records state a dollar value (hover or tap for the total)</span><span><i class="lg-c"></i>Amber = count only (no stated value)</span><span><i class="lg-p"></i>Pin = city named in the source (' + pinned + ')</span>';
-    $('mapNote').textContent = (list.length ? 'Tap a state to filter the list by it. ' : '') + (nostate ? nostate + ' record(s) name no state (for example nationwide contracts) and are not on the map; they are in the List. ' : '');
+    var ks = Object.keys(d.agg.by);
+    $('legend').innerHTML = MV.legendFor({ hasValue: ks.some(function (k) { return d.agg.by[k].nv; }), hasCount: ks.some(function (k) { return !d.agg.by[k].nv; }), shade: MAPSEL.shade, callouts: co && Object.keys(place).length > 0, pinned: d.pinned }).map(function (e) { return '<span><i class="lg-' + e.cls + '"></i>' + esc(e.text) + '</span>'; }).join('');
+  }
+  function renderSelBar(list) {
+    var sel = S.f.states, none = MAPDATA.agg.none.n, onN = sel.indexOf('??') >= 0;
+    $('noneChip').innerHTML = none || onN ? '<button type="button" class="chip' + (onN ? ' on' : '') + '" data-mst="??" aria-pressed="' + onN + '">Nationwide / no state (' + none + ')</button>' : '';
+    $('selBar').innerHTML = sel.length ? '<span><b>Selected:</b> ' + esc(sel.map(stName).join(', ')) + ' &middot; ' + list.length + ' record' + (list.length === 1 ? '' : 's') + '</span><button type="button" class="chip" id="selClear">Clear</button>'
+      : '<span class="hint">' + (SHELL.isDesktop() ? 'Hover a state for its numbers. Click to select; Ctrl- or Shift-click adds. Scroll to zoom, drag to pan.' : 'Tap a state to select it. Turn on Multi-select to pick several.') + '</span>';
+    $('mapNote').textContent = (MAPDATA.pinned ? 'Pins appear only where the source names a city. ' : '') + 'Counts are as each source states them; nothing is estimated.';
+  }
+  function renderMapTable() {
+    if (!MAPSEL.table || !MAPDATA) return; var d = MAPDATA, sel = S.f.states;
+    var ks = Object.keys(d.agg.by).sort(function (a, b) { return (d.agg.by[b].n - d.agg.by[a].n) || (a < b ? -1 : 1); }); if (d.agg.none.n) ks.push('??');
+    var row = function (k) { var o = k === '??' ? d.agg.none : d.agg.by[k], on = sel.indexOf(k) >= 0; return '<tr class="' + (on ? 'on' : '') + '"><td><button type="button" class="tsel" data-mst="' + k + '" aria-pressed="' + on + '">' + esc(stName(k)) + '</button></td><td>' + o.n + '</td><td>' + (o.nv ? esc(M.fmtMoney(o.v)) + ' (' + o.nv + ' of ' + o.n + ')' : 'none stated') + '</td></tr>'; };
+    $('mapTable').innerHTML = ks.length ? '<table><caption class="hint">Records per state in this view. Select a state to filter the list.</caption><thead><tr><th scope="col">State</th><th scope="col">Records</th><th scope="col">Stated value</th></tr></thead><tbody>' + ks.map(row).join('') + '</tbody></table>' : '<p class="note">No records in this view.</p>';
+  }
+  function selectState(k, add, refocus) {
+    var nx = MV.nextSelection(S.f.states, k, add || MAPSEL.multi); S.f.states.length = 0; Array.prototype.push.apply(S.f.states, nx); S.rows = 50; hideTip(); render();
+    toast(S.f.states.indexOf(k) >= 0 ? stLines(k).join(' · ') : 'Removed ' + stName(k) + ' from the selection.');
+    if (refocus) { var g = document.querySelector('#v-map [data-mst="' + k + '"]'); if (g) g.focus(); }
+  }
+  function showTip(k, x, y) {
+    var tip = $('mapTip'), box = $('mapWrap').getBoundingClientRect();
+    tip.innerHTML = stLines(k).map(function (l, i) { return i ? '<span>' + esc(l) + '</span>' : '<b>' + esc(l) + '</b>'; }).join(''); tip.hidden = false;
+    var w = tip.offsetWidth, h = tip.offsetHeight, lx = Math.min(Math.max(4, x - box.left + 12), box.width - w - 4), ly = y - box.top - h - 12;
+    tip.style.left = lx + 'px'; tip.style.top = (ly < 4 ? y - box.top + 16 : ly) + 'px';
+  }
+  function hideTip() { $('mapTip').hidden = true; }
+  function zoomBy(f, ux, uy) {
+    var z = MAPSEL.zoom, fr = MV.frameFor(z.k);
+    if (ux === undefined) { ux = z.x + fr.w / z.k / 2; uy = z.y + fr.h / z.k / 2; }
+    MAPSEL.zoom = MV.zoomAt(z, ux, uy, f); hideTip(); drawMapLayers();
+  }
+  function bindMapTools() {
+    var svg = $('usmap');
+    $('v-map').addEventListener('click', function (e) {
+      var t = e.target.closest('[data-mst],#v-map [data-st],#selClear'); if (!t) return;
+      e.stopPropagation(); // the document handler keeps [data-st] for the small map on the List tab
+      if (MAPSEL.moved) { MAPSEL.moved = false; return; }
+      if (t.id === 'selClear') { S.f.states.length = 0; S.rows = 50; render(); return; }
+      selectState(t.getAttribute('data-mst') || t.getAttribute('data-st'), e.ctrlKey || e.metaKey || e.shiftKey, false);
+    });
+    svg.addEventListener('keydown', function (e) { var g = e.target.closest('[data-mst]'); if (!g || (e.key !== 'Enter' && e.key !== ' ')) return; e.preventDefault(); selectState(g.getAttribute('data-mst'), e.shiftKey || e.ctrlKey || e.metaKey, true); });
+    svg.addEventListener('focusin', function (e) { var g = e.target.closest('[data-mst]'); if (!g) return; var b = g.getBoundingClientRect(); showTip(g.getAttribute('data-mst'), b.left + b.width / 2, b.top); });
+    svg.addEventListener('focusout', hideTip);
+    svg.addEventListener('pointermove', function (e) {
+      var dr = MAPSEL.drag;
+      if (dr) { var dx = (e.clientX - dr.sx) / dr.ppu, dy = (e.clientY - dr.sy) / dr.ppu; if (Math.abs(e.clientX - dr.sx) + Math.abs(e.clientY - dr.sy) > 4) MAPSEL.moved = true; MAPSEL.zoom = MV.clampZoom({ k: MAPSEL.zoom.k, x: dr.zx - dx, y: dr.zy - dy }); svg.setAttribute('viewBox', MV.viewBoxFor(MAPSEL.zoom)); hideTip(); return; }
+      if (e.pointerType !== 'mouse') return;
+      var t = e.target.closest('[data-mst],[data-st]'); if (t) showTip(t.getAttribute('data-mst') || t.getAttribute('data-st'), e.clientX, e.clientY); else hideTip();
+    });
+    svg.addEventListener('pointerleave', function () { if (!MAPSEL.drag) hideTip(); });
+    svg.addEventListener('pointerdown', function (e) {
+      MAPSEL.moved = false; if (MAPSEL.zoom.k <= 1 || e.button) return;
+      var p = MV.toMapUnits(svg.getBoundingClientRect(), MAPSEL.zoom, e.clientX, e.clientY);
+      MAPSEL.drag = { sx: e.clientX, sy: e.clientY, zx: MAPSEL.zoom.x, zy: MAPSEL.zoom.y, ppu: p.ppu }; svg.classList.add('dragging');
+    });
+    var endDrag = function () { MAPSEL.drag = null; svg.classList.remove('dragging'); };
+    svg.addEventListener('pointerup', endDrag); svg.addEventListener('pointercancel', endDrag);
+    svg.addEventListener('wheel', function (e) { e.preventDefault(); var p = MV.toMapUnits(svg.getBoundingClientRect(), MAPSEL.zoom, e.clientX, e.clientY); zoomBy(e.deltaY < 0 ? 1.25 : 0.8, p.x, p.y); }, { passive: false });
+    $('zIn').addEventListener('click', function () { zoomBy(1.5); });
+    $('zOut').addEventListener('click', function () { zoomBy(1 / 1.5); });
+    $('zReset').addEventListener('click', function () { MAPSEL.zoom = { k: 1, x: 0, y: 0 }; hideTip(); drawMapLayers(); });
+    $('btnMulti').addEventListener('click', function () { MAPSEL.multi = !MAPSEL.multi; render(); });
+    $('btnShade').addEventListener('click', function () { MAPSEL.shade = !MAPSEL.shade; render(); });
+    $('btnTable').addEventListener('click', function () { MAPSEL.table = !MAPSEL.table; hideTip(); render(); });
   }
   function renderMapTop(list) {
     var top = sortFor(list, S.sort).slice(0, 5);
@@ -804,6 +896,7 @@
   });
   $('shClose').addEventListener('click', closeSheet); $('shBg').addEventListener('click', closeSheet);
   document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('sheet').hidden) closeSheet(); });
+  bindMapTools();
   $('shStar').addEventListener('click', function () { var id = $('sheet').getAttribute('data-id'); if (!toggleStar(id)) return; $('shStar').className = 'star big' + (WATCH[id] ? ' on' : ''); $('shStar').innerHTML = WATCH[id] ? '&#9733;' : '&#9734;'; refreshCapPanel(id); render(); });
   function onCapInput(e) { if (e.target.hasAttribute && e.target.hasAttribute('data-cap')) updateCapField(e.target); }
   document.addEventListener('input', onCapInput); document.addEventListener('change', onCapInput);
diff --git a/national/index.html b/national/index.html
--- a/national/index.html
+++ b/national/index.html
@@ -114,10 +114,20 @@ window.RadarLoadError=function(name){
   <section id="v-map" class="view" hidden aria-label="US map">
     <div class="shell-cols" id="colsMap">
       <div class="shell-primary">
+        <div class="maptools" role="toolbar" aria-label="Map tools">
+          <button type="button" class="chip" id="btnMulti" aria-pressed="false">Multi-select</button>
+          <button type="button" class="chip on" id="btnShade" aria-pressed="true">Shade by count</button>
+          <button type="button" class="chip" id="btnTable" aria-pressed="false">Map as table</button>
+          <span class="zbtns"><button type="button" class="chip" id="zIn" aria-label="Zoom in">+</button><button type="button" class="chip" id="zOut" aria-label="Zoom out">&minus;</button><button type="button" class="chip" id="zReset">Reset</button></span>
+        </div>
+        <div class="selbar" id="selBar" aria-live="polite"></div>
+        <div class="chips nonechip" id="noneChip"></div>
         <div class="mapwrap" id="mapWrap">
-          <svg id="usmap" viewBox="0 0 975 610" role="img" aria-label="Map of the United States. Numbers show record counts per state. Use the List tab for an accessible list."></svg>
+          <svg id="usmap" viewBox="0 0 975 610" role="group" aria-label="Map of the United States. Numbers show record counts per state; each count is a button. Map as table shows the same numbers as a table."></svg>
+          <div class="maptip" id="mapTip" role="tooltip" hidden></div>
           <details class="legd"><summary>Legend</summary><div class="legend" id="legend"></div></details>
         </div>
+        <div class="maptable" id="mapTable" hidden></div>
         <p class="shell-mapfail" id="mapFail" hidden></p>
         <p class="note" id="mapNote"></p>
       </div>
diff --git a/national/mapview.js b/national/mapview.js
--- a/national/mapview.js
+++ b/national/mapview.js
@@ -66,6 +66,12 @@
     a.forEach(function (it, i) { out[it.st] = { x: ca.x, y: ca.ys[i] }; }); b.forEach(function (it, i) { out[it.st] = { x: cb.x, y: cb.ys[i] }; });
     return out;
   }
+  // click selects one state (clicking the only selected state clears); add (Ctrl / Shift / Multi-select) toggles it in the set
+  function nextSelection(sel, k, add) {
+    sel = sel || []; var i = sel.indexOf(k);
+    if (add) return i >= 0 ? sel.filter(function (x) { return x !== k; }) : sel.concat([k]);
+    return sel.length === 1 && i === 0 ? [] : [k];
+  }
   // legend entries [{ cls, text }]; info: { hasValue, hasCount, shade, callouts, pinned }
   function legendFor(info) {
     info = info || {}; var e = [];
@@ -82,5 +88,5 @@
     lines.push(o.nv ? money(o.v) + ' stated by ' + o.nv + ' of them (fees, design-build values and project costs as the sources state them)' : 'Count only, no stated value');
     return lines;
   }
-  return { LAND: LAND, VIEW: VIEW, CALLOUT: CALLOUT, CALLOUT_IF_NEEDED: CALLOUT_IF_NEEDED, CALLOUT_MAX_ZOOM: CALLOUT_MAX_ZOOM, ZOOM_MAX: ZOOM_MAX, aggregate: aggregate, markerRadius: markerRadius, shade: shade, shadeAlpha: shadeAlpha, calloutsOn: calloutsOn, frameFor: frameFor, clampZoom: clampZoom, viewBoxFor: viewBoxFor, zoomAt: zoomAt, toMapUnits: toMapUnits, layoutCallouts: layoutCallouts, legendFor: legendFor, tooltipLines: tooltipLines };
+  return { LAND: LAND, VIEW: VIEW, CALLOUT: CALLOUT, CALLOUT_IF_NEEDED: CALLOUT_IF_NEEDED, CALLOUT_MAX_ZOOM: CALLOUT_MAX_ZOOM, ZOOM_MAX: ZOOM_MAX, aggregate: aggregate, markerRadius: markerRadius, shade: shade, shadeAlpha: shadeAlpha, calloutsOn: calloutsOn, frameFor: frameFor, clampZoom: clampZoom, viewBoxFor: viewBoxFor, zoomAt: zoomAt, toMapUnits: toMapUnits, layoutCallouts: layoutCallouts, nextSelection: nextSelection, legendFor: legendFor, tooltipLines: tooltipLines };
 });
diff --git a/national/style.css b/national/style.css
--- a/national/style.css
+++ b/national/style.css
@@ -1,5 +1,5 @@
 /* National Radar: dark navy look. System fonts only. 44px+ touch targets for iPhone. */
-:root{--bg:#0a1020;--panel:#111a30;--panel2:#18243f;--line:#27375a;--ink:#e8eefc;--dim:#9fb0d0;--acc:#7cb7ff;--ok:#34d399;--warn:#fbbf24;--bad:#fb7185;--tabs-h:64px}
+:root{--bg:#0a1020;--panel:#111a30;--panel2:#18243f;--line:#27375a;--ink:#e8eefc;--dim:#9fb0d0;--acc:#7cb7ff;--ok:#34d399;--warn:#fbbf24;--bad:#fb7185;--tabs-h:64px;--map-bg:#070c19;--map-land:#16233f;--map-edge:#33466f;--map-shade:#7cb7ff}
 *{box-sizing:border-box}
 html{touch-action:manipulation;-webkit-tap-highlight-color:transparent;-webkit-text-size-adjust:100%;max-width:100%;overflow-x:hidden}
 body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.45 -apple-system,BlinkMacSystemFont,system-ui,sans-serif;padding-bottom:calc(var(--tabs-h) + env(safe-area-inset-bottom) + 12px);max-width:100%;overflow-x:hidden}
@@ -42,9 +42,25 @@ h1{margin:0;font-size:22px;letter-spacing:.02em}
 .view{padding:0 0 8px}
 .sec{margin:16px calc(14px + env(safe-area-inset-right)) 8px calc(14px + env(safe-area-inset-left));font-size:17px}
 .note{margin:6px calc(14px + env(safe-area-inset-right)) 0 calc(14px + env(safe-area-inset-left));font-size:13px;color:var(--dim)}
-.mapwrap{position:relative;margin:0;border-top:1px solid var(--line);border-bottom:1px solid var(--line);background:#070c19;overflow:hidden}
+.mapwrap{position:relative;margin:0;border-top:1px solid var(--line);border-bottom:1px solid var(--line);background:var(--map-bg);overflow:hidden}
 #usmap{display:block;width:100%;height:auto;max-height:70vh}
-.st{fill:#16233f;stroke:#33466f;stroke-width:.8;stroke-linejoin:round;cursor:pointer}
+.st{fill:var(--map-land);stroke:var(--map-edge);stroke-width:.8;stroke-linejoin:round;cursor:pointer;vector-effect:non-scaling-stroke}
+.st.shd{fill:color-mix(in srgb,var(--map-shade) calc(var(--shade-a) * 100%),var(--map-land))}
+.st.dim,.mkg.dim,.lead.dim{opacity:.4}
+.lead line{stroke:var(--dim);stroke-width:1;vector-effect:non-scaling-stroke}.lead circle{fill:var(--dim)}
+.cot{fill:var(--ink);font:700 11px system-ui,-apple-system,sans-serif;text-anchor:end;pointer-events:none;paint-order:stroke;stroke:var(--map-bg);stroke-width:3px}
+.mkg{cursor:pointer;outline:none}.mkg:focus-visible .mk{stroke:var(--acc);stroke-width:4}
+#usmap.zoomed{cursor:grab;touch-action:none}#usmap.dragging{cursor:grabbing}
+.maptools{display:flex;flex-wrap:wrap;align-items:center;gap:6px;padding:8px 14px 4px}.maptools .zbtns{display:inline-flex;gap:6px;margin-left:auto}
+.maptools .chip{min-height:40px}.maptools .chip:disabled{opacity:.45;cursor:default}
+.selbar{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;padding:4px 14px 6px;font-size:13.5px;min-height:40px}
+.nonechip{padding:0 14px 6px}.nonechip:empty{display:none}
+.mapwrap.astable #usmap,.mapwrap.astable .legd{display:none}
+.maptip{position:absolute;z-index:5;pointer-events:none;display:flex;flex-direction:column;gap:2px;max-width:280px;padding:8px 10px;border-radius:10px;border:1px solid var(--line);background:var(--panel);color:var(--ink);font-size:12.5px;line-height:1.35;box-shadow:0 6px 18px rgba(0,0,0,.28)}
+.maptip[hidden]{display:none}
+.maptable{padding:4px 14px;overflow-x:auto}.maptable table{width:100%;border-collapse:collapse;font-size:14px}.maptable caption{text-align:left;padding:4px 0 6px}
+.maptable th,.maptable td{text-align:left;padding:4px 8px;border-bottom:1px solid var(--line)}.maptable tr.on td{background:color-mix(in srgb,var(--acc) 14%,transparent)}
+.maptable .tsel{background:none;border:0;padding:0;min-height:40px;color:var(--acc);font:inherit;font-weight:600;cursor:pointer;text-align:left}
 .st.sel{stroke:var(--acc);stroke-width:2}
 .bub{fill:rgba(124,183,255,.35);stroke:#9fd0ff;stroke-width:1.6;cursor:pointer}
 .bub.cnt{fill:rgba(251,191,36,.28);stroke:var(--warn)}
@@ -236,14 +252,12 @@ details.cap>summary{min-height:44px;display:flex;align-items:center;cursor:point
 .health p{margin:6px 0}.health .dot{display:inline-block;vertical-align:middle}
 .scmore:not([open]) .scmenu{display:none}
 /* ---- Day theme (default). Night = the original dark look above, via html[data-theme=night]. ---- */
-html[data-theme=day]{--bg:#f5f7fb;--panel:#ffffff;--panel2:#eef2f8;--line:#c9d3e3;--ink:#0f1a2e;--dim:#4a5875;--acc:#1d5fbf;--ok:#0f7a4a;--warn:#8a5a00;--bad:#b4233a}
+html[data-theme=day]{--bg:#f5f7fb;--panel:#ffffff;--panel2:#eef2f8;--line:#c9d3e3;--ink:#0f1a2e;--dim:#4a5875;--acc:#1d5fbf;--ok:#0f7a4a;--warn:#8a5a00;--bad:#b4233a;--map-bg:#dfe8f3;--map-land:#ffffff;--map-edge:#8fa1bd;--map-shade:#1d5fbf}
 html[data-theme=day] .top{background:linear-gradient(180deg,#e6edf8,var(--bg))}
 html[data-theme=day] .top .homebtn,html[data-theme=day] .homebtn{background:rgba(29,95,191,.08);border-color:rgba(29,95,191,.35);color:var(--ink)}
 html[data-theme=day] .btn:active{background:#dbe4f2}
 html[data-theme=day] .scope.on,html[data-theme=day] .modes button.on,html[data-theme=day] .tabs .tabmore button.on{background:rgba(29,95,191,.1)}
 html[data-theme=day] .chip.on{background:rgba(29,95,191,.12);color:var(--ink)}
-html[data-theme=day] .mapwrap{background:#dfe8f3}
-html[data-theme=day] .st{fill:#ffffff;stroke:#8fa1bd}
 html[data-theme=day] .bub{fill:rgba(29,95,191,.22);stroke:#1d5fbf}
 html[data-theme=day] .bub.cnt{fill:rgba(217,119,6,.22);stroke:#b45309}
 html[data-theme=day] .bubt{fill:#0f1a2e;stroke:#ffffff}
@@ -307,7 +321,7 @@ html[data-theme=day] .card{box-shadow:0 1px 2px rgba(15,26,46,.06)}
 .minisum{display:flex;align-items:center;gap:8px;min-height:40px;padding:0 12px;cursor:pointer;font-size:14px;font-weight:600;color:var(--ink);list-style:none}
 .minisum::-webkit-details-marker{display:none}.minisum::after{content:"\25BE";margin-left:auto;color:var(--dim)}details[open]>.minisum::after{content:"\25B4"}
 .minisum .hint{font-weight:400;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
-.miniwrap{background:#070c19;border-top:1px solid var(--line)}
+.miniwrap{background:var(--map-bg);border-top:1px solid var(--line)}
 #usmini{display:block;width:100%;height:auto;max-height:280px}
 .minibar{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:2px 12px 4px;font-size:12px}
 .minibar .linkbtn{min-height:36px;font-size:13px}
@@ -317,7 +331,7 @@ html[data-theme=day] .card{box-shadow:0 1px 2px rgba(15,26,46,.06)}
 .mkt{fill:#fff;font:700 13px system-ui,-apple-system,sans-serif;text-anchor:middle;pointer-events:none}.mkt.sm{font-size:17px}
 .legd{border-top:1px solid var(--line)}.legd>summary{min-height:36px;display:flex;align-items:center;padding:0 14px;font-size:13px;color:var(--dim);cursor:pointer}
 .legend i.lg-v,.legend i.lg-c,.legend i.lg-p{border-radius:50%}.lg-v{background:#1d4ed8}.lg-c{background:#b45309}.lg-p{background:#fb7185}
-html[data-theme=day] .miniwrap{background:#dfe8f3}
+.legend i.lg-shd{border-radius:2px;background:linear-gradient(90deg,var(--map-land),var(--map-shade))}.legend i.lg-co{border-radius:0;height:2px;width:14px;background:var(--dim)}
 #usmap{max-height:62vh}
 
 /* ===== v6.2: slim header, one control row, count-only KPI, phone tidy ===== */
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
node national/test-maptools.js
node national/test-mapview.js
node test.js
```

Expected: `national/test-maptools.js` ends with `national map tools tests passed`; `national/test-mapview.js` ends with `national map helper tests passed`; `node test.js` ends with `all radars tests passed`.

- [ ] **Step 5: Review screenshots (desktop 1280x800, phone 390x844)**

```bash
python3 /tmp/radar-shots.py . /tmp/radar-shots/task-10 national national:map texas texas:map
```

Expected: 8 lines ending in `errors: none`, and exit code 0. Check: National Map tab: toolbar above the map, states shaded by count, and Northeast callouts in the extra right-hand space with lines to their states. Hovering a state shows the tooltip. Click selects a state and dims the others; Ctrl-click adds one. Nationwide / no state and Clear work, +/- and wheel zoom work (callouts go away past 1.8x), drag pans, and Reset restores the view. Map as table shows the same counts. Check Day and Night. The List-tab mini map has no tools. Texas is unchanged. Extra review, optional: in the browser, Tab to a count marker. The tooltip shows, and Enter selects it with focus kept. Send the images to Luis and wait for his review before you commit and start Task 11.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Radar 2.0: National Map tab tools and map theme tokens"
```


### Task 11: Cache version, cache lists and READMEs

**Files:**
- Modify: `README.md`, `national/README.md`, `national/test-v6.js`, `shared/cache.js`, `shared/test-cache.js`, `shared/test-capture.js`, `texas/README.md`

**Interfaces:**
- Consumes: every shipped file changed in Tasks 1-10.
- Produces: `RadarCache.VERSION = 23` (`radars-national-v23`, `radars-texas-v23`, `radars-home-v23`); a cache-list test that every new shipped file (`./mapview.js`, `../shared/shell.js`, `../shared/weekly.js`, `../shared/filters.js`, `../shared/shell.css`) is cached and `./weekly.js` is not; README updates (root: shared modules; `national/README.md`: 1024px shell, `national.tab`, map tools, the mapview files; `texas/README.md`: tabs, Radar 2.0 layout, Pursuits, `texas.filtersets`).

- [ ] **Step 1: Write the failing tests**

Save as `/tmp/radar2-task11-tests.patch` (test files only: `national/test-v6.js`, `shared/test-cache.js`, `shared/test-capture.js`), then run `git apply --whitespace=nowarn /tmp/radar2-task11-tests.patch`.

```diff
diff --git a/national/test-v6.js b/national/test-v6.js
--- a/national/test-v6.js
+++ b/national/test-v6.js
@@ -31,7 +31,7 @@ const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8'), app =
 ['qsState', 'qsWork', 'qsDue', 'ftags', 'fsets', 'fsName', 'fsSave', 'usmini'].forEach((k) => assert.ok(html.includes('id="' + k + '"'), 'html has #' + k));
 assert.ok(/bk\.filtersets = FS/.test(app) && /j6\.filtersets/.test(app), 'saved sets go into the backup and come back on restore');
 const Cache = require('../shared/cache.js');
-assert.ok(Cache.files('national').indexOf('./v6.js') >= 0 && Cache.name('national') === 'radars-national-v22', 'sw caches v6.js, cache v22');
+assert.ok(Cache.files('national').indexOf('./v6.js') >= 0 && Cache.name('national') === 'radars-national-v23', 'sw caches v6.js, cache v23');
 assert.ok(/importScripts\('\.\.\/shared\/cache\.js'\)/.test(sw) && /RadarCache\.files\('national'\)/.test(sw), 'national sw uses the shared cache list');
 assert.ok(!/github|repo\b|repository/i.test(html + fs.readFileSync(path.join(__dirname, 'v6.js'), 'utf8')), 'no repo mentions');
 console.log('national v6 tests passed');
diff --git a/shared/test-cache.js b/shared/test-cache.js
--- a/shared/test-cache.js
+++ b/shared/test-cache.js
@@ -4,10 +4,10 @@ const fs = require('fs'), path = require('path');
 const C = require('./cache.js');
 const root = path.resolve(__dirname, '..');
 
-assert.strictEqual(C.VERSION, 22);
-assert.strictEqual(C.name('national'), 'radars-national-v22');
-assert.strictEqual(C.name('texas'), 'radars-texas-v22');
-assert.strictEqual(C.name('home'), 'radars-home-v22');
+assert.strictEqual(C.VERSION, 23);
+assert.strictEqual(C.name('national'), 'radars-national-v23');
+assert.strictEqual(C.name('texas'), 'radars-texas-v23');
+assert.strictEqual(C.name('home'), 'radars-home-v23');
 
 function appDir(app) {
   if (app === 'national') return path.join(root, 'national');
@@ -26,6 +26,16 @@ for (const app of ['national', 'texas', 'home']) {
   for (const name of sharedNames) assert.ok(joined.indexOf('shared/' + name) >= 0, app + ' lists shared/' + name);
 }
 
+// Radar 2.0: every new shipped file is cached
+['./mapview.js', '../shared/shell.js', '../shared/weekly.js', '../shared/shell.css'].forEach((f) => assert.ok(C.files('national').indexOf(f) >= 0, 'national caches ' + f));
+['../shared/shell.js', '../shared/weekly.js', '../shared/filters.js'].forEach((f) => assert.ok(C.files('texas').indexOf(f) >= 0, 'texas caches ' + f));
+assert.ok(C.files('national').indexOf('./weekly.js') < 0, 'national/weekly.js moved to shared/weekly.js');
+// READMEs describe the 2.0 layout
+const readme = (p) => fs.readFileSync(path.join(root, p), 'utf8');
+assert.ok(/1024px/.test(readme('national/README.md')) && !/1200px/.test(readme('national/README.md')) && /`national\.tab`/.test(readme('national/README.md')) && /mapview\.js/.test(readme('national/README.md')), 'national README: 1024 shell, national.tab, map tools');
+assert.ok(/^Tabs: \*\*List\*\* \(default\), Map, Pursuits, Intel; More: Timeline, Agencies, Sources\./m.test(readme('texas/README.md')) && /`texas\.filtersets`/.test(readme('texas/README.md')), 'texas README: tabs, filter sets');
+assert.ok(/shared\/weekly\.js/.test(readme('README.md')) && /Backups stay per app/.test(readme('README.md')), 'root README: shared modules');
+
 const workers = [
   ['national/sw.js', '../shared/cache.js', 'national'],
   ['texas/sw.js', '../shared/cache.js', 'texas'],
diff --git a/shared/test-capture.js b/shared/test-capture.js
--- a/shared/test-capture.js
+++ b/shared/test-capture.js
@@ -105,7 +105,7 @@ const html = fs.readFileSync(path.join(nat, 'index.html'), 'utf8'), sw = fs.read
 assert.ok(html.indexOf('../shared/capture.js') > 0 && html.indexOf('capture.js') < html.indexOf('app.js'), 'capture.js loads before app.js');
 const Cache = require('./cache.js');
 assert.ok(Cache.files('national').indexOf('../shared/capture.js') >= 0 && /RadarCache\.files\('national'\)/.test(sw), 'service worker caches capture.js');
-assert.ok(Cache.name('national') === 'radars-national-v22', 'service worker cache version was bumped past v3');
+assert.ok(Cache.name('national') === 'radars-national-v23', 'service worker cache version was bumped past v3');
 assert.ok(app.indexOf("'nr.watch'") > 0, 'existing nr.watch key is still read'); assert.ok(app.indexOf("'nr.capture'") > 0);
 ['capBar', 'btnCapCsv', 'btnBackup', 'btnRestore', 'btnRestoreAll', 'restoreFile', 'capSort'].forEach((id) => assert.ok(html.indexOf('id="' + id + '"') > 0, id + ' exists in the page'));
 
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
node national/test-v6.js
node shared/test-cache.js
node shared/test-capture.js
```

Expected:

- `node national/test-v6.js`: exit 1, with `AssertionError [ERR_ASSERTION]: sw caches v6.js, cache v23`
- `node shared/test-cache.js`: exit 1, with `AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:`
- `node shared/test-capture.js`: exit 1, with `AssertionError [ERR_ASSERTION]: service worker cache version was bumped past v3`

- [ ] **Step 3: Implement**

Save as `/tmp/radar2-task11-impl.patch`, then run `git apply --whitespace=nowarn /tmp/radar2-task11-impl.patch`.

```diff
diff --git a/README.md b/README.md
--- a/README.md
+++ b/README.md
@@ -13,7 +13,7 @@ The live pages intentionally carry no links to this repository; data-source cita
 | Texas Opportunity | [`texas/`](texas/) | Drainage PS&E opportunities across Texas agencies on a county map (formerly "Opportunity Radar"). |
 
 Vanilla JS, no build step, no dependencies. The landing page is `index.html`; each app's Home button returns to it
-(`shared/shell.css`). Texas Opportunity shares the capture-file model `shared/capture.js`.
+(`shared/shell.css`). Both apps share the layout shell (`shared/shell.js`, one 1024px breakpoint), the capture-file model (`shared/capture.js`), saved filter sets (`shared/filters.js`) and the weekly list (`shared/weekly.js`). Backups stay per app.
 
 ## Rebuilding data (Node 18+)
 
diff --git a/national/README.md b/national/README.md
--- a/national/README.md
+++ b/national/README.md
@@ -40,6 +40,7 @@ Uncertain records go to **Needs review**; open or upcoming water-sector engineer
 | model.js | rules, normalizers, dedupe, filters, CSV (shared by the browser, the build script and the tests) |
 | app.js, index.html, style.css | the UI |
 | proj.js, us-geo.js | map projection and state outlines (US Census TIGERweb, public domain) |
+| mapview.js, test-mapview.js, test-maptools.js | Map tab helpers (aggregation, count-marker sizes, shading, zoom, Northeast callouts, selection) and their tests |
 | sources.js | text for sources tested but not used, and the rules in plain words |
 | data/national.json | the snapshot, written by scripts/build-national.js |
 | pse.js, test-pse.js | PS&E / H&H lens, design-build and pipeline evaluator, filters, CSV; tests |
@@ -98,9 +99,14 @@ Bottom tab "Pursuits": every starred record plus any record with a non-empty cap
 - **One card per opportunity across sources** (`v2.js` `groupDupes`, applied on screen after the build's own `M.dedupe`). Records merge only when they share a solicitation / award number, or have the identical normalized title (20+ chars) + same agency or stated state + overlapping posted/due/award dates, and no contradicting notice numbers; PS&E lenses never merge with each other. The card is the highest-confidence record and shows its amount; the others are listed under "Also listed in" with their own links and amounts, and an "Amounts differ" tag appears when they disagree (nothing is averaged or combined). Fixtures: `test-fixtures/dedupe.json`.
 
 ## v6: list-first layout (`v6.js`)
-- Opens on the List. A small map (count markers per state; dollar value in the tooltip and on tap) sits beside the list at 1200px and wider, and is a collapsible strip above the list on phones. Tapping a state filters the list; **Expand map** or the Map tab opens the full map. The legend is collapsed.
+- Opens on the List. A small map (count markers per state; dollar value in the tooltip and on tap) sits beside the list at 1024px and wider (shared shell, `shared/shell.js`), and is a collapsible strip above the list on phones. Tapping a state filters the list; **Expand map** or the Map tab opens the full map. The legend is collapsed.
 - One slim header row: status, Closing / Changed, What counts (on phones What counts is in More). One control row: search, Filters (with active count and live result count), Confirmed only.
 - Quick chips above the list: State, Work type (Water, Wastewater, Drainage / flood, Roadway; inferred from words), Due date (7 / 30 / 90 days; the Sort menu is inside). Stage is the scope tabs (Upcoming, All, Open, Forecast, More > Awarded).
 - Active filters show as removable tags with Clear all. Agency, amount, source, status, sector, region focus (and the Texas prompt) are in the Filters drawer.
 - Saved filter sets: name + Save in the drawer, apply in one tap, delete with ×. Stored on this device in localStorage `nr.filtersets` and included in the capture backup JSON (`filtersets`), merged by name on restore.
+
+## Radar 2.0: shared shell and map tools
+- Layout: one breakpoint at 1024px (`shared/shell.js`, `shared/shell.css`). Phones get one column, bottom tabs and full-screen sheets. Desktop gets two columns on List (small map beside the list) and Map (Top of this view beside the map), with the record detail docked in the side column and Filters as a right-hand drawer. The last tab is remembered in localStorage `national.tab` (the old `nr.tab` is read once). Day / Night / Auto is in the header.
+- Map tab (`mapview.js`): click a state to select it; Ctrl- or Shift-click, or Multi-select, adds states. Unselected states are dimmed, and the selection bar has Clear plus a "Nationwide / no state" chip. Zoom with the wheel or + / -, drag to pan when zoomed, and Reset. Map as table shows the same counts as a table. Shade by count tints states by record count. Tooltips show on hover and on keyboard focus. While Northeast callouts are on (under 1.8x zoom) the view widens to 1040 x 610. Colors come from the `--map-*` theme tokens. The List tab mini map has no tools.
+- The weekly list (Print, Share, Copy, Download) is `shared/weekly.js`, used by both apps.
 - Cards lead with project name, agency / state, the date line with Positionable, then a smaller dollar box that keeps its basis label. No headline sum of amounts (it mixed fees and project costs).
diff --git a/shared/cache.js b/shared/cache.js
--- a/shared/cache.js
+++ b/shared/cache.js
@@ -4,7 +4,7 @@
   if (typeof module === 'object' && module.exports) module.exports = api; else root.RadarCache = api;
 })(typeof self !== 'undefined' ? self : this, function () {
   'use strict';
-  var VERSION = 22;
+  var VERSION = 23;
   var SHARED = ['storage.js', 'theme.js', 'filters.js', 'shell.js', 'weekly.js', 'capture.js', 'shell.css', 'cache.js'];
   function shared(prefix) { return SHARED.map(function (f) { return prefix + f; }); }
   function name(app) {
diff --git a/texas/README.md b/texas/README.md
--- a/texas/README.md
+++ b/texas/README.md
@@ -1,6 +1,11 @@
 # Texas Opportunity
 
-Tabs: Radar (default), Timeline, Agencies, List, **Intel**, Sources.
+Tabs: **List** (default), Map, Pursuits, Intel; More: Timeline, Agencies, Sources. The last tab is remembered in localStorage `texas.tab`.
+
+## Radar 2.0 layout
+- One breakpoint at 1024px, shared with National Radar (`shared/shell.js`, `shared/shell.css`). On desktop the List shows the county map beside the list, and the Map tab shows "On the radar now" beside the map. Record details dock in the side column, and Filters is a right-hand drawer. On phones the map is a collapsible strip above the list. Day / Night / Auto is in the header.
+- Pursuits: starred records plus any record with a capture file, split into This week and Later, with a badge for overdue and due-soon records. If a capture file has no due date, a solicitation uses the closing date from the source, and the card says so. The weekly list (Print, Share, Copy, Download), CSV and calendar (.ics) export come from `shared/weekly.js`.
+- Saved filter sets and removable filter tags (`shared/filters.js`): name and Save in the Filters drawer, apply with one tap, delete with ×. Stored on this device in localStorage `texas.filtersets` and included in the capture backup JSON (`filtersets`), merged by name on restore. Backups stay per app.
 
 ## Intel (news and planning signals)
 
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
node national/test-v6.js
node shared/test-cache.js
node shared/test-capture.js
node test.js
```

Expected: `national/test-v6.js` ends with `national v6 tests passed`; `shared/test-cache.js` ends with `shared cache tests passed`; `shared/test-capture.js` ends with `national-radar capture tests passed`; `node test.js` ends with `all radars tests passed`.

- [ ] **Step 5: Review screenshots (desktop 1280x800, phone 390x844)**

```bash
python3 /tmp/radar-shots.py . /tmp/radar-shots/task-11 home national national:map texas texas:map texas:pursuits
```

Expected: 12 lines ending in `errors: none`, and exit code 0. Check: Final look at all pages at both sizes, with no console errors. Then open each app once with service workers allowed (a normal browser on the PR preview or a local server) and confirm that the new cache `radars-*-v23` replaces v22. Send the images to Luis and wait for his review before you commit and start Task the PR.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Radar 2.0: cache v23 and README updates"
```

## Delivery

- Branch: `cursor/radar-2-visible-2-0`, created from `cursor/radar-2-foundation-design-spec-779b` and stacked on PR #1 (see Before you start).
- Pull request: one PR in `lbonil3/radars`, titled "Radar 2.0: visible 2.0 (shared desktop shell, Texas Pursuits, National map tools)". While PR #1 is open, it targets `cursor/radar-2-foundation-design-spec-779b`, so its diff shows only this phase. After PR #1 merges to `main`, retarget it to `main` (on GitHub: Edit, then base: `main`). Then rebase only if GitHub reports conflicts, and run `node test.js` again.
- Task by task, with Luis's review between tasks. Each task ends with its screenshots (Step 5) and one commit (Step 6). Push after each commit so the PR shows the task, then wait for Luis's OK before the next task. If Luis asks for a change, make it as a new commit in that task's scope before moving on.
- Nothing merges without Luis's say-so: not PR #1, not this PR, and no force-push to a shared branch. The live site at https://lbonil3.github.io/radars/ changes only when this PR merges to `main`, and reverting the PR rolls it back. No device data is migrated away (the only new keys are `texas.tab` and `texas.filtersets`).
- `RadarCache.VERSION` goes 22 to 23 once, in Task 11, the last commit. New shipped files are added to `RadarCache.files` in the task that creates them, so each commit caches what it ships. Intermediate commits are never served from `main`.
- The existing Tests workflow runs `node test.js` on the PR. Check it is green after each push.

## Decisions taken in this plan

- **One cache bump, at the end (Task 11).** The spec's delivery step 1 says to bump `RadarCache.VERSION` with the shell. This plan bumps it once in the final task, as instructed for this plan, and adds new files to the cache lists as they appear.
- **Theme placement:** Day / Night / Auto sits in the header right after the freshness line (`#fresh`) in both apps, and leaves National's More menu.
- **Views without two columns** (National Pursuits, Timeline, Breakdown, Data & sources; Texas Pursuits, Intel, Timeline, Agencies, Sources) keep the modal detail sheet on desktop. The docked panel is used where there is a side column (List and Map).
- **Texas backup carries `filtersets`.** This is the field National's Phase 1 backup already writes, not a new shape. A backup with only filter sets is allowed, and restore merges by name. If Luis reads "No new backup shape" as excluding this for Texas, drop the four backup lines in Task 8 Step 3; filter sets still work on the device.
- **Kept dormant code the spec did not list:** `renderDataPse` stays. `V2.pursuitRows` and `V4.ics` also stay: they are live National modules, and `RadarWeekly` has its own copies, with a test that the output is identical.
- **No-location chips:** Texas's chip is information only (it matches today's unmapped count). National's Map tab chip "Nationwide / no state (n)" selects the no-state records, using the existing `'??'` state filter.
- **Texas Pursuits due date:** when a capture file has no due date, a solicitation's closing date from the source is used and the card says so. Texas calendar and file names use "Texas Opportunity".
- **Texas filter tags** replace the old "active filters" note line.
- **Map tab selection:** a plain click selects one state, and clicking the only selected state clears it. Ctrl, Cmd or Shift-click, or Multi-select, add or remove a state. The List-tab mini map keeps today's tap-to-toggle. Map counts ignore the state filter, so unselected states keep their counts, dimmed.
- **Map tool settings are not saved** (Multi-select, shading, table and zoom reset on reload), because the spec allows no new saved-setting keys. Shading starts on.
- **Wheel zoom:** the mouse wheel over the National map zooms it, as in the spec, so the page does not scroll while the pointer is over the map.
- **Tooltip money:** the tooltip uses the existing `M.fmtMoney` and the same "stated by n of them" wording as today. PR #19's `compactMoney` and value encodings are not ported.

## Self-review

| Spec requirement | Task(s) |
|---|---|
| `shared/shell.js` `RadarShell.bind` with `showTab` / `openDetail` / `closeDetail` / `openFilters` / `closeFilters` / `isDesktop`, callable with a provided document root | 1 |
| One 1024px breakpoint shared by CSS and JS; replaces National 1200px rules, the 900px `.lgrid` / `.shell-lgrid` hook, and Texas's 900px / 1100px rule | 2, 3, 6 |
| `.shell-*` classes so app styles do not override the hook; shell CSS sets no accent | 2 |
| Desktop: list about 60% plus sticky small map about 40%; details swap the right column and restore it on close; list never moves | 2, 3, 6 |
| Map tab: full-size map in the wide column, records beside it, details swap the records column | 3, 6 |
| Phone under 1024px: stacked, bottom sheet, tab bar at the bottom | 2, 3, 6 |
| Slim header with Home, title, freshness, Day/Night/Auto; theme leaves National's More | 3, 6 |
| Filters drawer from the right with Close and Escape | 1, 2, 3, 6 |
| Both apps open on List and restore the last view, including Map; More is not a saved view; `texas.tab` does not touch `national.tab` | 1, 3, 6 |
| National keeps scopes, digest, since-last-visit, banner, saved sets, Pursuits, weekly list; Data & sources, Timeline, Breakdown, What counts under More | 3 |
| National list count shown again | 3 |
| Remove `renderMapV5`, unused lane scope arrays, `#pseCtl` only after tests show nothing uses them | 4 |
| `shared/weekly.js` (`RadarWeekly`) moved from `national/weekly.js`, no new weekly features | 5 |
| Texas tabs: List, Map, Pursuits, Intel, More (Timeline, Agencies, Sources); "Radar" becomes Map | 6, 7 |
| Texas canvas map unchanged, fills the map column, pin highlight on record click | 6 |
| Texas Pursuits and weekly list from existing stars and capture data, CSV and calendar actions | 7 |
| Texas saved filter sets (`texas.filtersets`) and removable tags via `RadarFilters` | 8 |
| Map failure leaves list and details working, with a short note in the map column | 1, 3, 6 |
| No-location records stay in the list; "no location" chip on the map side | 3, 6, 10 |
| Shared script tags get the `RadarLoadError` hook | 3, 5, 6, 7 |
| `national/mapview.js` port: aggregation, count-marker sizing, callouts, shading, legend and tooltip copy; no lane modes or value bubbles | 9 |
| viewBox widened to `0 0 1040 610` only while callouts are on; callouts off past 1.8x; `US_GEO` 975 x 610 unchanged | 9, 10 |
| Map interactions: hover and focus tooltip, click and Ctrl/Shift/Multi-select, dimmed unselected states, selection bar with Clear and "Nationwide / no state", wheel and +/- zoom, drag pan, Reset, Map as table, shading toggle | 10 |
| Day and Night theme tokens, no hard-coded night map colors | 10 |
| List-tab mini map stays compact, with no tools; Texas gets no National map tools | 10 |
| Tests: shell layout, tab memory, Texas Pursuits and weekly, ported helpers (sizing, 1040 view callouts, 0..1 shading), phone layout, existing tests and path checks | 1, 2, 3, 6, 7, 9, 10 (every task ends with `node test.js`) |
| Desktop and phone screenshots of both apps before each review | Step 5 of every task |
| Bump `RadarCache.VERSION` and cache every new or moved shipped file | 1, 5, 9 (lists), 11 (version) |
| Backups per app; migration never deletes user data; no new keys beyond `texas.tab` and `texas.filtersets` | 6, 8, 11 |
| Live pages carry no repository links; no relative path escapes the repo | every task (`scripts/check-paths.js` in `node test.js`) |

Checks run on this plan: the patches were applied in order, with `git apply`, to a tree whose files match `af9dd83` blob for blob. The result matched the checked tree, and `node test.js` passed after each task. Every Step 2 failure and Step 4 pass above is the real output of those runs, and so are the screenshot runs (no console errors).
