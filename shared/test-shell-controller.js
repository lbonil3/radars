// Shared shell controller (tabs, More, last view, filter drawer, detail panel / sheet). Run: node shared/test-shell-controller.js
const assert = require('assert');
const Shell = require('./shell.js');

function mem(map) {
  const o = { map: Object.assign({}, map) };
  o.getItem = function (k) { return Object.prototype.hasOwnProperty.call(this.map, k) ? this.map[k] : null; };
  o.setItem = function (k, v) { this.map[k] = String(v); };
  o.removeItem = function (k) { delete this.map[k]; };
  return o;
}
// Minimal DOM: just what shell.js touches (ids, hidden, classList, attributes, parent/child moves, listeners).
function el(id, attrs) {
  const e = { id: id, hidden: false, attrs: Object.assign({}, attrs || {}), children: [], parentNode: null, style: {}, textContent: '', listeners: {} };
  const cls = new Set();
  e.classList = { add: (c) => cls.add(c), remove: (c) => cls.delete(c), contains: (c) => cls.has(c), toggle: (c, v) => { const on = v === undefined ? !cls.has(c) : !!v; if (on) cls.add(c); else cls.delete(c); return on; } };
  e.setAttribute = (k, v) => { e.attrs[k] = String(v); };
  e.getAttribute = (k) => (k in e.attrs ? e.attrs[k] : null);
  e.removeAttribute = (k) => { delete e.attrs[k]; };
  e.appendChild = (c) => { if (c.parentNode) c.parentNode.children = c.parentNode.children.filter((x) => x !== c); c.parentNode = e; e.children.push(c); return c; };
  e.addEventListener = (t, fn) => { (e.listeners[t] = e.listeners[t] || []).push(fn); };
  e.fire = (t, ev) => (e.listeners[t] || []).forEach((fn) => fn(Object.assign({ target: e, stopPropagation() {}, preventDefault() {} }, ev || {})));
  e.focus = () => { e.doc.activeElement = e; };
  e.closest = (sel) => { for (let n = e; n; n = n.parentNode) if (sel.split(',').some((s) => s.trim() === '#' + n.id)) return n; return null; };
  return e;
}
function makeDoc(viewIds, colsIds) {
  const doc = { listeners: {}, activeElement: null };
  const body = el('body'); body.doc = doc; doc.body = body;
  const byId = {};
  const add = (e, parent) => { e.doc = doc; byId[e.id] = e; (parent || body).appendChild(e); return e; };
  viewIds.forEach((v) => { const view = add(el('v-' + v)); if (colsIds[v]) add(el(colsIds[v]), view); });
  ['tabMore', 'tabMoreBtn', 'tabMoreLbl', 'adv', 'advBg', 'advClose', 'btnMore', 'sheet', 'mapFail', 'mapWrap'].forEach((id) => add(el(id)));
  byId.tabMore.hidden = true; byId.adv.hidden = true; byId.advBg.hidden = true; byId.sheet.hidden = true;
  const tabs = viewIds.map((v) => { const b = el('tab-' + v, { 'data-tab': v }); b.doc = doc; return b; });
  doc.getElementById = (id) => byId[id] || null;
  doc.querySelectorAll = (sel) => (sel === '.tabs [data-tab]' ? tabs : []);
  doc.addEventListener = (t, fn) => { (doc.listeners[t] = doc.listeners[t] || []).push(fn); };
  doc.fire = (t, ev) => (doc.listeners[t] || []).forEach((fn) => fn(Object.assign({ stopPropagation() {}, preventDefault() {} }, ev || {})));
  doc.tabs = tabs;
  return doc;
}
function media(matches) { const m = { matches: matches, fns: [] }; m.addEventListener = (t, fn) => m.fns.push(fn); m.set = (v) => { m.matches = v; m.fns.forEach((fn) => fn({ matches: v })); }; return m; }

assert.strictEqual(Shell.BREAKPOINT, 1024);
assert.strictEqual(Shell.QUERY, '(min-width: 1024px)');
assert.strictEqual(Shell.tabKey('national'), 'national.tab');
assert.strictEqual(Shell.tabKey('texas'), 'texas.tab');

// ---- tab memory: first visit opens List; a later visit restores the last view, Map included
const NAT = { tabs: ['list', 'map', 'pursuits'], more: ['timeline', 'break', 'data'], labels: { timeline: 'Timeline', break: 'Breakdown', data: 'Data' }, cols: { list: 'colsList', map: 'colsMap' } };
const views = NAT.tabs.concat(NAT.more);
assert.strictEqual(Shell.restoreTab(mem({}), 'national', views, ['nr.tab']), 'list', 'first visit => List');
assert.strictEqual(Shell.restoreTab(mem({ 'national.tab': 'map' }), 'national', views, ['nr.tab']), 'map', 'Map is restored too');
assert.strictEqual(Shell.restoreTab(mem({ 'national.tab': 'radar' }), 'national', views, []), 'list', 'unknown view => List');
const legacy = mem({ 'nr.tab': 'pursuits' });
assert.strictEqual(Shell.restoreTab(legacy, 'national', views, ['nr.tab']), 'pursuits');
assert.strictEqual(legacy.getItem('national.tab'), 'pursuits', 'legacy key copied forward');
assert.strictEqual(legacy.getItem('nr.tab'), 'pursuits', 'legacy key never deleted');
const blocked = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
assert.strictEqual(Shell.restoreTab(blocked, 'national', views, ['nr.tab']), 'list', 'blocked storage => List, no throw');

// ---- bind + showTab: views, tab bar, More label, storage
let ls = mem({}), doc = makeDoc(views, NAT.cols), mq = media(true), seen = [];
let sh = Shell.bind(Object.assign({ app: 'national', doc: doc, ls: ls, media: mq, onTab: (id) => seen.push(id) }, NAT));
assert.strictEqual(sh.initial, 'list');
assert.strictEqual(sh.showTab('map'), 'map');
assert.strictEqual(ls.getItem('national.tab'), 'map');
assert.ok(doc.getElementById('v-list').hidden && !doc.getElementById('v-map').hidden, 'only the Map view shows');
assert.ok(doc.tabs[1].classList.contains('on') && doc.tabs[1].getAttribute('aria-current') === 'page');
assert.ok(!doc.tabs[0].classList.contains('on') && doc.tabs[0].getAttribute('aria-current') === 'false');
sh.showTab('break');
assert.ok(doc.getElementById('tabMoreBtn').classList.contains('on'), 'More highlights for a view inside it');
assert.strictEqual(doc.getElementById('tabMoreLbl').textContent, 'Breakdown');
sh.showTab('nope');
assert.strictEqual(sh.current(), 'list', 'unknown id => List');
assert.strictEqual(doc.getElementById('tabMoreLbl').textContent, '');
assert.deepStrictEqual(seen, ['map', 'break', 'list']);
assert.strictEqual(doc.body.getAttribute('data-shell-tab'), 'list');
sh.showTab('timeline', { save: false });
assert.strictEqual(ls.getItem('national.tab'), 'list', 'save:false leaves the stored view alone');
const ls2 = mem({ 'national.tab': 'data' });
assert.strictEqual(Shell.bind(Object.assign({ app: 'national', doc: makeDoc(views, NAT.cols), ls: ls2, media: mq }, NAT)).initial, 'data', 'bind restores the last view');

// ---- Texas writes texas.tab and never touches National's key
const TX = { tabs: ['list', 'map', 'pursuits', 'intel'], more: ['timeline', 'agencies', 'sources'], labels: { timeline: 'Timeline', agencies: 'Agencies', sources: 'Sources' }, cols: { list: 'colsList', map: 'colsMap' } };
const shared = mem({ 'national.tab': 'map' });
const tx = Shell.bind(Object.assign({ app: 'texas', doc: makeDoc(TX.tabs.concat(TX.more), TX.cols), ls: shared, media: mq }, TX));
assert.strictEqual(tx.initial, 'list', 'Texas first visit => List, not National\'s stored Map');
tx.showTab('intel');
assert.strictEqual(shared.getItem('texas.tab'), 'intel');
assert.strictEqual(shared.getItem('national.tab'), 'map', 'National key untouched');

// ---- More menu: button toggles, outside click and Escape close it
doc.getElementById('tabMoreBtn').fire('click');
assert.ok(!doc.getElementById('tabMore').hidden && doc.getElementById('tabMoreBtn').getAttribute('aria-expanded') === 'true');
doc.fire('click', { target: doc.getElementById('v-list') });
assert.ok(doc.getElementById('tabMore').hidden, 'outside click closes More');
doc.getElementById('tabMoreBtn').fire('click');
doc.fire('keydown', { key: 'Escape' });
assert.ok(doc.getElementById('tabMore').hidden, 'Escape closes More');

// ---- filter drawer from the right: open, Close, scrim, Escape
doc.getElementById('btnMore').fire('click');
assert.ok(!doc.getElementById('adv').hidden && !doc.getElementById('advBg').hidden && sh.isFiltersOpen());
assert.ok(doc.getElementById('adv').classList.contains('shell-drawer-open'));
assert.strictEqual(doc.getElementById('btnMore').getAttribute('aria-expanded'), 'true');
assert.strictEqual(doc.activeElement, doc.getElementById('advClose'), 'focus moves into the drawer');
doc.getElementById('advClose').fire('click');
assert.ok(doc.getElementById('adv').hidden && doc.getElementById('advBg').hidden && !sh.isFiltersOpen());
assert.strictEqual(doc.activeElement, doc.getElementById('btnMore'), 'focus returns to Filters');
sh.openFilters(); doc.getElementById('advBg').fire('click'); assert.ok(!sh.isFiltersOpen(), 'scrim closes');
sh.openFilters(); doc.fire('keydown', { key: 'Escape' }); assert.ok(!sh.isFiltersOpen(), 'Escape closes');
doc.getElementById('btnMore').fire('click'); doc.getElementById('btnMore').fire('click'); assert.ok(!sh.isFiltersOpen(), 'Filters toggles');

// ---- desktop: details swap the right column of the list view; closing restores it; the list column never moves
let closed = 0;
ls = mem({}); doc = makeDoc(views, NAT.cols); mq = media(true);
sh = Shell.bind(Object.assign({ app: 'national', doc: doc, ls: ls, media: mq, onDetailClose: () => closed++ }, NAT));
sh.showTab('list');
const sheet = doc.getElementById('sheet'), colsList = doc.getElementById('colsList'), colsMap = doc.getElementById('colsMap');
assert.strictEqual(sh.isDesktop(), true);
assert.strictEqual(sh.openDetail(), true, 'docked on desktop');
assert.ok(!sheet.hidden && sheet.parentNode === colsList && sheet.classList.contains('shell-docked'));
assert.ok(colsList.classList.contains('shell-has-detail'), 'right column swapped for details');
assert.strictEqual(sheet.getAttribute('aria-modal'), 'false');
assert.strictEqual(doc.body.style.overflow, '', 'desktop panel does not lock page scroll');
assert.strictEqual(sh.closeDetail(), true);
assert.ok(sheet.hidden && !colsList.classList.contains('shell-has-detail') && !sheet.classList.contains('shell-docked'), 'map column comes back');
assert.strictEqual(closed, 1, 'onDetailClose runs once');
assert.strictEqual(sh.closeDetail(), false, 'closing twice is a no-op'); assert.strictEqual(closed, 1);
// Map tab: details swap the records column (same right column), map stays
sh.showTab('map'); sh.openDetail();
assert.ok(sheet.parentNode === colsMap && colsMap.classList.contains('shell-has-detail') && !colsList.classList.contains('shell-has-detail'));
// switching tabs closes details silently
sh.showTab('list'); assert.ok(sheet.hidden && !sh.isDetailOpen()); assert.strictEqual(closed, 1, 'tab switch closes without the callback');
// views with no two-column layout keep the modal sheet even on desktop
sh.showTab('pursuits'); assert.strictEqual(sh.openDetail(), false);
assert.ok(sheet.parentNode === doc.body && sheet.getAttribute('aria-modal') === 'true' && !sheet.classList.contains('shell-docked'));
sh.closeDetail();

// ---- phone (under 1024px): bottom sheet, modal, body scroll locked
mq.set(false); sh.showTab('list');
assert.strictEqual(sh.isDesktop(), false);
assert.strictEqual(sh.openDetail(), false);
assert.ok(sheet.parentNode === doc.body && !sheet.hidden && sheet.getAttribute('aria-modal') === 'true');
assert.strictEqual(doc.body.style.overflow, 'hidden');
assert.ok(!colsList.classList.contains('shell-has-detail'));
// crossing the breakpoint while open re-places the details
mq.set(true);
assert.ok(sheet.parentNode === colsList && sheet.classList.contains('shell-docked') && doc.body.style.overflow === '');
sh.closeDetail(); assert.strictEqual(doc.body.style.overflow, '');
// no media query (old browser) => phone behaviour
assert.strictEqual(Shell.bind(Object.assign({ app: 'national', doc: makeDoc(views, NAT.cols), ls: mem({}) }, NAT)).isDesktop(), false);

// ---- map failure note and the no-location chip text
assert.strictEqual(Shell.guardMap(doc, 'mapFail', () => {}, 'mapWrap'), true);
assert.ok(doc.getElementById('mapFail').hidden && !doc.getElementById('mapWrap').hidden);
assert.strictEqual(Shell.guardMap(doc, 'mapFail', () => { throw new Error('boom'); }, 'mapWrap'), false);
assert.ok(!doc.getElementById('mapFail').hidden && doc.getElementById('mapWrap').hidden);
assert.strictEqual(doc.getElementById('mapFail').textContent, Shell.MAP_FAIL_TEXT);
assert.ok(/list and record details still work/.test(Shell.MAP_FAIL_TEXT));
assert.strictEqual(Shell.guardMap(doc, 'missing', () => {}), true, 'missing note id is fine');
assert.strictEqual(Shell.noLocLabel(0), '');
assert.strictEqual(Shell.noLocLabel(1), '1 record with no location (in the list, not on the map)');
assert.strictEqual(Shell.noLocLabel(1234), '1,234 records with no location (in the list, not on the map)');
console.log('shared shell controller tests passed');
