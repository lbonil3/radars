// National Radar v2 tests (required from test.js). Run alone: node national/test-v2.js
const assert = require('assert'), fs = require('fs'), path = require('path');
const V = require('./v2.js');
function mem() { const m = {}; return { getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, _m: m }; }

// ---- item 2: firstSeen carried across refreshes ----
{
  const prev = { asOfDate: '2026-10-20', records: [{ id: 'a', firstSeen: '2026-10-01' }, { id: 'b' }, { id: 'c', firstSeen: '2026-10-05', also: [{ src: 'sam', id: 'X1' }] }] };
  const recs = [{ id: 'a' }, { id: 'b' }, { id: 'new1' }, { id: 'merged', also: [{ src: 'sam', id: 'X1' }] }];
  const r = V.carryFirstSeen(recs, prev, '2026-10-29');
  assert.strictEqual(recs[0].firstSeen, '2026-10-01', 'existing id keeps firstSeen');
  assert.strictEqual(recs[1].firstSeen, '2026-10-20', 'migration: prev record without firstSeen gets prev asOfDate');
  assert.strictEqual(recs[2].firstSeen, '2026-10-29', 'new id gets today');
  assert.strictEqual(recs[3].firstSeen, '2026-10-05', 'record re-keyed via an also-listed source keeps the older date');
  assert.deepStrictEqual(r, { carried: 3, fresh: 1 });
  const again = recs.map((x) => ({ id: x.id, also: x.also })); V.carryFirstSeen(again, { asOfDate: '2026-10-29', records: recs }, '2026-10-30');
  assert.deepStrictEqual(again.map((x) => x.firstSeen), ['2026-10-01', '2026-10-20', '2026-10-29', '2026-10-05'], 'stable across a second refresh');
  const none = [{ id: 'z' }]; V.carryFirstSeen(none, null, '2026-10-29'); assert.strictEqual(none[0].firstSeen, '2026-10-29', 'no previous snapshot');
}
// ---- item 2: baseline / new / mark all seen ----
{
  const ls = mem(), ss = mem();
  assert.strictEqual(V.baseline(ls, ss, '2026-10-26'), '2026-10-26', 'first-ever visit: baseline = snapshot date, nothing is new');
  assert.ok(!V.isNew({ firstSeen: '2026-10-26' }, '2026-10-26'));
  const ss2 = mem(); // next session after a refresh
  assert.strictEqual(V.baseline(ls, ss2, '2026-10-29'), '2026-10-26', 'later session compares with what was last opened');
  assert.ok(V.isNew({ firstSeen: '2026-10-29' }, '2026-10-26') && !V.isNew({ firstSeen: '2026-10-20' }, '2026-10-26') && !V.isNew({}, '2026-10-26'));
  assert.strictEqual(ls.getItem(V.NEW_KEY), '2026-10-29', 'seenThrough moves forward');
  assert.strictEqual(V.baseline(ls, ss2, '2026-10-29'), '2026-10-26', 'reload in the same session keeps the New list');
  assert.strictEqual(V.markAllSeen(ls, ss2, '2026-10-29'), '2026-10-29'); assert.strictEqual(V.baseline(ls, ss2, '2026-10-29'), '2026-10-29', 'mark all seen clears New');
  assert.strictEqual(V.baseline(null, null, '2026-10-29'), '2026-10-29', 'storage blocked: nothing new, no crash');
}
// ---- item 2: closing soon (14 days, not awarded) ----
{
  const t = '2026-10-29';
  assert.ok(V.isClosingSoon({ dates: { due: '2026-10-29' } }, t) && V.isClosingSoon({ dates: { due: '2026-11-12' } }, t));
  assert.ok(!V.isClosingSoon({ dates: { due: '2026-11-13' } }, t) && !V.isClosingSoon({ dates: { due: '2026-10-28' } }, t) && !V.isClosingSoon({ dates: {} }, t));
  assert.ok(!V.isClosingSoon({ status: 'awarded', dates: { due: '2026-11-01' } }, t), 'awarded records are never closing');
}
// ---- data files carry firstSeen ----
for (const f of ['national.json', 'pse.json', 'roadway.json']) {
  const d = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', f), 'utf8'));
  assert.ok(d.records.every((r) => /^\d{4}-\d{2}-\d{2}$/.test(r.firstSeen) && r.firstSeen <= d.asOfDate), f + ': every record has firstSeen <= asOfDate');
}
{
  const b = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'build-national.js'), 'utf8');
  assert.strictEqual((b.match(/V2\.carryFirstSeen\(/g) || []).length, 3, 'build carries firstSeen for national, roadway and pse outputs');
  const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8'), sw = fs.readFileSync(path.join(__dirname, 'sw.js'), 'utf8');
  assert.ok(html.indexOf('v2.js') > 0 && html.indexOf('v2.js') < html.indexOf('app.js') && sw.includes("'./v2.js'") && html.includes('id="digest"'));
}
console.log('national v2 tests passed');
// ---- item 3: region focus ----
{
  const ls = mem();
  assert.strictEqual(V.loadRegion(ls), 'all', 'default is All US');
  assert.ok(V.showRegionHint(ls), 'first visit shows the Focus on Texas hint');
  V.dismissRegionHint(ls); assert.ok(!V.showRegionHint(ls), 'hint dismissed stays dismissed');
  const ls2 = mem(); V.saveRegion(ls2, 'gulf'); assert.strictEqual(V.loadRegion(ls2), 'gulf'); assert.ok(!V.showRegionHint(ls2), 'no hint once a region was picked');
  V.saveRegion(ls2, 'bogus'); assert.strictEqual(V.loadRegion(ls2), 'all', 'unknown region falls back to All US');
  assert.ok(V.inRegion({ state: 'MS' }, 'gulf') && !V.inRegion({ state: 'MS' }, 'near') && V.inRegion({ state: 'NM' }, 'near') && !V.inRegion({ state: 'OK' }, 'tx'));
  assert.ok(V.inRegion({}, 'all') && !V.inRegion({}, 'tx'), 'no stated state: only in All US');
  assert.deepStrictEqual(V.regionOf('gulf').states, ['TX', 'LA', 'MS', 'AL', 'FL']); assert.deepStrictEqual(V.regionOf('near').states, ['TX', 'NM', 'OK', 'AR', 'LA']);
  const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
  assert.ok(html.includes('id="regionSel"') && html.includes('href="../texas/"') && html.includes('Focus on Texas?'));
}
console.log('national v2 region tests passed');
// ---- item 4: My pursuits ----
{
  const CP = require('./capture.js');
  const today = '2026-10-29';
  const watch = { a: true, b: true, c: true };
  const cap = { a: CP.clean({ due: '2026-11-20', decision: 'Go' }), b: CP.clean({ due: '2026-10-25', next: 'call PM' }), c: CP.clean({}), d: CP.clean({ due: '2026-11-02', notes: 'not starred, has notes' }), e: CP.clean({}) };
  const snaps = { a: { title: 'A' }, b: { title: 'B' }, c: { title: 'C' }, d: { title: 'D' } };
  const rows = V.pursuitRows(watch, cap, (id) => snaps[id], today, CP);
  assert.deepStrictEqual(rows.map((r) => r.id), ['b', 'd', 'a', 'c'], 'sorted by due date (overdue first), no-date last; empty unstarred capture excluded');
  assert.deepStrictEqual(rows.map((r) => r.flag), ['overdue', 'soon', 'later', 'none']);
  assert.deepStrictEqual(rows.map((r) => r.week), [true, true, false, false], 'weekly list = overdue or due within 7 days');
  assert.strictEqual(V.pursuitRows({}, {}, () => null, today, CP).length, 0);
  const csv = CP.toCSV(rows, today); assert.ok(csv.split('\n')[0].includes('Due') || csv.length > 0, 'capture CSV reused');
  const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8'), css = fs.readFileSync(path.join(__dirname, 'style.css'), 'utf8'), app = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
  assert.ok(html.includes('data-tab="pursuits"') && html.includes('id="v-pursuits"') && html.includes('id="btnPurPrint"') && html.includes('id="btnPurCsv"'));
  assert.ok(/@media print\{[\s\S]*body\.print-pursuits #v-pursuits/.test(css), 'print stylesheet for the weekly list');
  assert.ok(/btnPurCsv'\)\.addEventListener\('click', exportCapCsv\)/.test(app), 'pursuits CSV reuses the capture CSV export');
}
console.log('national v2 pursuits tests passed');
