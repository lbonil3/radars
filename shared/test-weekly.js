// Shared weekly pursuits list (National and Texas). Run: node shared/test-weekly.js
const assert = require('assert');
const W = require('./weekly.js'), CP = require('./capture.js');
const fmt = (d) => d; const T = '2026-10-29';
// builders (moved unchanged from national/weekly.js)
const rows = [{ id: 'a', week: true, flag: 'soon', cap: { due: '2026-11-02', decision: 'Go', next: 'Call PM', notes: 'Line1\nLine2 <b>' }, snap: { title: 'Drainage <PS&E>', agency: 'TxDOT', state: 'TX', url: 'https://example.test/a' } },
  { id: 'b', week: false, flag: '', cap: { due: '', decision: 'Undecided' }, snap: { title: 'Water plant design', agency: 'City', state: 'WA' } }];
const md = W.model(rows, T, CP, fmt);
assert.strictEqual(md.week.length, 1); assert.strictEqual(md.later.length, 1); assert.strictEqual(md.later[0].due, 'No due date');
const h = W.bodyHtml(md); assert.ok(h.indexOf('Drainage &lt;PS&amp;E&gt;') >= 0 && h.indexOf('<b>') === h.indexOf('<b>Due'), 'escaped');
assert.ok(h.indexOf('This week') < h.indexOf('Later or no due date'), 'this week first');
const t = W.text(md); assert.ok(/Next action: Call PM/.test(t) && /Go \/ No-go: Go/.test(t) && /TxDOT · TX/.test(t));
const d = W.docHtml(md); assert.ok(/^<!doctype html>/.test(d) && !/<script|https?:\/\/(?!example\.test)/i.test(d), 'standalone file: no scripts, no external requests');
assert.ok(!/github|repo/i.test(d + t));
assert.ok(/No pursuits yet/.test(W.bodyHtml(W.model([], T, CP, fmt))));
// pursuit rows: same result as National's V2.pursuitRows
const V2 = require('../national/v2.js');
const watch = { a: true, b: true, c: true };
const cap = { a: CP.clean({ due: '2026-11-20', decision: 'Go' }), b: CP.clean({ due: '2026-10-25', next: 'call PM' }), c: CP.clean({}), d: CP.clean({ due: '2026-11-02', notes: 'not starred, has notes' }), e: CP.clean({}) };
const snaps = { a: { title: 'A' }, b: { title: 'B' }, c: { title: 'C' }, d: { title: 'D' } };
const pr = W.pursuitRows(watch, cap, (id) => snaps[id], T, CP);
assert.deepStrictEqual(pr.map((r) => r.id), ['b', 'd', 'a', 'c'], 'overdue first, no date last, empty unstarred capture left out');
assert.deepStrictEqual(pr.map((r) => r.week), [true, true, false, false], 'this week = overdue or due within 7 days');
assert.deepStrictEqual(pr, V2.pursuitRows(watch, cap, (id) => snaps[id], T, CP), 'identical to National v2 rows');
// calendar: National output unchanged; Texas names itself
const V4 = require('../national/v4.js');
const ev = [{ uid: 'due-x', date: '2026-11-20', title: 'Due: X, Y', desc: 'a\nb', url: 'https://example.test/x', alarms: ['P7D', 'P1D'] }];
assert.strictEqual(W.ics(ev, '2026-10-29T12:00:00.000Z', 'National Radar: My pursuits'), V4.ics(ev, '2026-10-29T12:00:00.000Z', 'National Radar: My pursuits'), 'National .ics unchanged');
const tx = W.ics(ev, '2026-10-29T12:00:00.000Z', 'Texas Radar: My pursuits', 'Texas Radar');
assert.ok(tx.includes('PRODID:-//Texas Radar//Pursuits//EN') && tx.includes('UID:due-x@texas-radar') && tx.includes('X-WR-CALNAME:Texas Radar: My pursuits') && tx.includes('TRIGGER:-P7D') && tx.includes('TRIGGER:-P1D'));
const de = W.dueEvents([{ id: 'p', cap: { due: '2026-11-19', decision: 'Go', next: 'Call' }, snap: { title: 'Lamar', agency: 'City of Austin', url: 'https://example.test/p' }, dueFrom: 'source' }, { id: 'q', cap: { due: '' }, snap: { title: 'No date' } }]);
assert.strictEqual(de.length, 1, 'rows without a due date make no event');
assert.ok(de[0].uid === 'due-p' && de[0].date === '2026-11-19' && de[0].title === 'Due: Lamar' && /Next action: Call/.test(de[0].desc) && /Decision: Go/.test(de[0].desc) && /stated by the source/.test(de[0].desc));
assert.ok(/from your capture file/.test(W.dueEvents([{ id: 'r', cap: { due: '2026-11-19' }, snap: { title: 'R' } }])[0].desc));
// the Weekly list sheet controller, on a tiny fake DOM
function el(id) { const cls = new Set(); return { id, hidden: true, textContent: '', innerHTML: '', focused: false, l: {}, classList: { add: (...c) => c.forEach((x) => cls.add(x)), remove: (...c) => c.forEach((x) => cls.delete(x)), contains: (c) => cls.has(c) }, addEventListener(t, f) { this.l[t] = f; }, focus() { this.focused = true; }, appendChild() {} }; }
const ids = ['weekly', 'wkBody', 'wkHint', 'wkClose', 'wkPrint', 'wkShare', 'wkCopy', 'wkDl', 'btnPurPrint'], E = {}; ids.forEach((i) => { E[i] = el(i); });
const docL = {}, doc = { body: el('body'), getElementById: (i) => E[i] || null, addEventListener: (t, f) => { docL[t] = f; } };
const winL = {}, saved = [], toasts = [];
const win = { navigator: {}, addEventListener: (t, f) => { winL[t] = f; }, setTimeout: (f) => f() };
const sheet = W.bindSheet({ doc, win, model: () => md, fileName: (ext) => 'texas-radar-weekly-' + T + '.' + ext, back: 'btnPurPrint', toast: (x) => toasts.push(x), download: (...a) => saved.push(a) });
sheet.open();
assert.ok(!E.weekly.hidden && doc.body.classList.contains('wk-open') && E.wkBody.innerHTML.includes('My pursuits') && E.wkShare.hidden && E.wkClose.focused, 'open: sheet shown, Share hidden without navigator.share');
E.wkPrint.l.click();
assert.ok(/Printing is not available here/.test(E.wkHint.textContent), 'no window.print: a plain hint, no error');
E.wkDl.l.click();
assert.deepStrictEqual(saved[0].slice(0, 2), ['texas-radar-weekly-2026-10-29.html', 'text/html;charset=utf-8']); assert.ok(/^<!doctype html>/.test(saved[0][2]) && saved[0][3] === false);
docL.keydown({ key: 'Escape' });
assert.ok(E.weekly.hidden && !doc.body.classList.contains('wk-open') && E.btnPurPrint.focused, 'Escape closes and returns focus');
let printed = 0; win.print = () => { printed++; }; sheet.print();
assert.ok(printed === 1 && !doc.body.classList.contains('print-weekly'), 'print runs, then the print class is cleared');
// National loads the shared module instead of national/weekly.js
const fs = require('fs'), path = require('path'), root = path.resolve(__dirname, '..');
const nh = fs.readFileSync(path.join(root, 'national/index.html'), 'utf8'), na = fs.readFileSync(path.join(root, 'national/app.js'), 'utf8');
assert.ok(nh.includes('<script src="../shared/weekly.js" onerror="RadarLoadError(this.src||this.href)"></script>') && !nh.includes('<script src="weekly.js">'), 'National loads shared/weekly.js');
assert.ok(/var WKS = RadarWeekly\.bindSheet\(\{ doc: document, win: window/.test(na) && !/\bNRW\./.test(na) && /\$\('btnPurPrint'\)\.addEventListener\('click', WKS\.open\)/.test(na), 'National uses the shared Weekly list sheet');
assert.ok(!fs.existsSync(path.join(root, 'national/weekly.js')) && !fs.existsSync(path.join(root, 'national/test-weekly.js')), 'national/weekly.js moved to shared/weekly.js');
console.log('shared weekly-list tests passed');
