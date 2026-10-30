// National Radar v4 tests (required from test.js). Run alone: node national/test-v4.js
const assert = require('assert'), fs = require('fs'), path = require('path');
const V4 = require('./v4.js'), SS = require('../scripts/source-status.js');
const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8'), app = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8'), sw = fs.readFileSync(path.join(__dirname, 'sw.js'), 'utf8');
// v4.1 source status file + health view
{
  const now = '2026-10-29T12:00:00Z';
  const prev = { sources: [{ id: 'a', lastSuccess: '2026-10-20T10:00:00Z', failingSince: '2026-10-21T10:00:00Z' }, { id: 'b', lastSuccess: '2026-10-28T10:00:00Z' }] };
  const o = SS.build([{ id: 'a', status: 'stale', kept: 5, error: 'HTTP 429' }, { id: 'b', status: 'stale', kept: 3, error: 'HTTP 429' }, { id: 'c', status: 'ok', kept: 9, fetchedAt: now }, { id: 'd', status: 'failed', kept: 0, error: 'x' }, { id: 'e', status: 'disabled', note: 'no key' }], prev, 'texas', now);
  const by = {}; o.sources.forEach((s) => { by[s.id] = s; });
  assert.strictEqual(by.a.health, 'failing', 'stale longer than FAIL_DAYS is failing'); assert.strictEqual(by.a.failingSince, '2026-10-21T10:00:00Z', 'failingSince carried');
  assert.strictEqual(by.b.health, 'stale'); assert.strictEqual(by.b.lastSuccess, '2026-10-28T10:00:00Z', 'lastSuccess carried from previous file');
  assert.strictEqual(by.c.health, 'fresh'); assert.strictEqual(by.c.error, null); assert.strictEqual(by.d.health, 'failing'); assert.strictEqual(by.e.health, 'disabled');
  const h = V4.health([o, { group: 'national', sources: [{ id: 'z', health: 'fresh' }] }]);
  assert.strictEqual(h.bad.length, 3); assert.strictEqual(h.counts.fresh, 2); assert.strictEqual(h.counts.off, 1);
  ['national/data/source-status.json', 'texas/data/source-status.json'].forEach((f) => { const j = JSON.parse(fs.readFileSync(path.join(__dirname, '..', f), 'utf8')); assert.ok(Array.isArray(j.sources) && j.sources.length > 5 && j.sources.every((s) => ['fresh', 'stale', 'failing', 'disabled', 'skipped'].indexOf(s.health) >= 0 && 'lastSuccess' in s && 'records' in s), f + ' shape'); });
  assert.ok(html.includes('id="srcHealth"') && html.includes('id="healthDot"') && html.includes('id="healthWarn"') && html.includes('src="v4.js"'), 'health view, dot and v4.js');
  assert.ok(/data\/source-status\.json/.test(app) && /\.\.\/texas\/data\/source-status\.json/.test(app), 'loads both status files');
  assert.ok(sw.includes("'./v4.js'") && sw.includes("'./data/source-status.json'"), 'sw caches v4 files');
  const bo = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'build-opportunities.js'), 'utf8');
  assert.ok(/retry-after/i.test(bo) && /HOST_GAP_MS/.test(bo) && /source-status\.js/.test(bo), 'Texas refresh: polite throttle, Retry-After, status file');
  assert.ok(/source-status\.js/.test(fs.readFileSync(path.join(__dirname, '..', 'scripts', 'build-national.js'), 'utf8')), 'National refresh writes status file');
}
// v4.2 change tracking
{
  const prev = { records: [
    { id: 'a', title: 'Drainage design', status: 'open', noticeType: 'Solicitation', dates: { due: '2026-11-03' }, amt: { v: 6e6 }, fields: { 'Notices for this Sol# in the extract': '1' } },
    { id: 'b', title: 'Old title', status: 'open', noticeType: 'Solicitation', dates: {}, history: [{ t: '2026-10-01', k: 'due', from: '2026-10-05', to: '2026-10-09' }] },
    { id: 'c', title: 'Same', status: 'upcoming', noticeType: 'Sources Sought', dates: { due: '2026-12-01' } }] };
  const recs = [
    { id: 'a', title: 'Drainage design', status: 'open', noticeType: 'Solicitation', dates: { due: '2026-11-10' }, amt: { v: 7e6 }, fields: { 'Notices for this Sol# in the extract': '3' } },
    { id: 'b', title: 'New title', status: 'awarded', noticeType: 'Award Notice', dates: {} },
    { id: 'c', title: 'Same', status: 'upcoming', noticeType: 'Sources Sought', dates: { due: '2026-12-01' } },
    { id: 'd', title: 'Brand new', status: 'open', dates: {} }];
  const r = V4.trackChanges(recs, prev, '2026-10-29');
  const a = recs[0].history.map((c) => c.k).sort(); assert.deepStrictEqual(a, ['addendum', 'due', 'value']);
  assert.strictEqual(recs[0].history.find((c) => c.k === 'addendum').n, 2, 'addendum number from notice count');
  assert.strictEqual(V4.changeText(recs[0].history.find((c) => c.k === 'due')), 'Due date moved 2026-11-03 \u2192 2026-11-10');
  assert.deepStrictEqual(recs[1].history.map((c) => c.k), ['due', 'status', 'title'], 'history carried + status/title');
  assert.ok(!recs[2].history && !recs[3].history, 'no change, no history; new records have none');
  assert.strictEqual(r.changes, 5);
  const many = { id: 'x', title: 't0', dates: {}, history: Array.from({ length: 8 }, (_, i) => ({ t: '2026-09-0' + (i + 1), k: 'title', from: 'a', to: 'b' })) };
  const cur = [{ id: 'x', title: 't1', dates: {} }]; V4.trackChanges(cur, { records: [many] }, '2026-10-29'); assert.strictEqual(cur[0].history.length, V4.HISTORY_CAP, 'history capped');
  assert.ok(V4.isChanged(recs[0], '2026-10-30') && !V4.isChanged(recs[1], '2026-12-30') && V4.recentChanges(recs[1], '2026-10-29').length === 2, 'recent window');
  assert.ok(/chgLine\(r\)/.test(app) && /data-digest="changed"/.test(app) && /changesSheet\(r\)/.test(app), 'card change line, Changed filter, sheet list');
  assert.strictEqual((fs.readFileSync(path.join(__dirname, '..', 'scripts', 'build-national.js'), 'utf8').match(/V4\.trackChanges/g) || []).length, 3, 'refresh tracks changes in all three lanes');
}
// v4.3 since last visit + .ics
{
  const mem = () => { const o = {}; return { getItem: (k) => (k in o ? o[k] : null), setItem: (k, v) => { o[k] = String(v); } }; };
  const ls = mem(), ss1 = mem();
  assert.strictEqual(V4.visitBaseline(ls, ss1, '2026-10-01T10:00:00Z'), null, 'first visit: nothing to compare');
  const ss2 = mem(); assert.strictEqual(V4.visitBaseline(ls, ss2, '2026-10-05T10:00:00Z'), '2026-10-01T10:00:00Z', 'second visit sees the first');
  assert.strictEqual(V4.visitBaseline(ls, ss2, '2026-10-05T11:00:00Z'), '2026-10-01T10:00:00Z', 'frozen for the session');
  assert.ok(V4.changedSince({ history: [{ t: '2026-10-03' }] }, '2026-10-01T10:00:00Z') && !V4.changedSince({ history: [{ t: '2026-09-30' }] }, '2026-10-01T10:00:00Z'));
  assert.strictEqual(V4.newlyStale([{ health: 'stale', failingSince: '2026-10-02T00:00:00Z' }, { health: 'stale', failingSince: '2026-09-02T00:00:00Z' }, { health: 'fresh' }], '2026-10-01T10:00:00Z').length, 1);
  assert.strictEqual(V4.findDate('Pre-proposal conference November 4, 2026 at 10 AM'), '2026-11-04'); assert.strictEqual(V4.findDate('site visit 11/9/2026'), '2026-11-09');
  const r = { id: 'sam:1', title: 'Levee design, Phase 2; A/E', agency: 'USACE', url: 'https://sam.gov/x', dates: { due: '2026-11-20' }, desc: 'A pre-bid meeting will be held Nov 6, 2026. Optional site visit on 2026-11-07.' };
  const ev = V4.eventsFor(r, { due: '', next: 'Call PM', decision: 'Go' }, r.title);
  assert.deepStrictEqual(ev.map((e) => e.date), ['2026-11-20', '2026-11-06', '2026-11-07']);
  assert.deepStrictEqual(ev[0].alarms, ['P7D', 'P1D'], 'reminders 1 week and 1 day before due');
  assert.strictEqual(V4.eventsFor(r, { due: '2026-11-18' }, r.title)[0].date, '2026-11-18', 'capture due date wins');
  const txt = V4.ics(ev, '2026-10-29T12:00:00.000Z', 'Test');
  const lines = txt.split('\r\n'); assert.strictEqual(lines[0], 'BEGIN:VCALENDAR'); assert.strictEqual(lines[lines.length - 2], 'END:VCALENDAR');
  assert.strictEqual((txt.match(/BEGIN:VEVENT/g) || []).length, 3); assert.strictEqual((txt.match(/BEGIN:VALARM/g) || []).length, 4);
  assert.ok(txt.includes('DTSTART;VALUE=DATE:20261120') && txt.includes('DTEND;VALUE=DATE:20261121') && txt.includes('TRIGGER:-P7D') && txt.includes('DTSTAMP:20261029T120000Z'));
  assert.ok(txt.includes('SUMMARY:Due: Levee design\\, Phase 2\\; A/E'), 'escaped text');
  assert.ok(lines.every((l) => Buffer.byteLength(l) <= 75), 'lines folded to 75 octets');
  assert.ok(!/fetch\(|XMLHttpRequest/.test(fs.readFileSync(path.join(__dirname, 'v4.js'), 'utf8')), 'v4 helpers make no network requests');
  assert.ok(html.includes('id="since"') && html.includes('id="btnPurIcs"') && html.includes('id="btnViewIcs"') && /renderSince\(\)/.test(app) && /data-since/.test(app), 'since summary + .ics buttons wired');
}
console.log('national v4 tests passed');

// v4.4 interface polish
{
  const css = fs.readFileSync(path.join(__dirname, 'style.css'), 'utf8');
  assert.ok(/<details class="topdet" id="topDet"><summary[^>]*>Top of this view/.test(html) && /function initTopDet\(\)/.test(app) && /nr\.topOpen/.test(app), 'top-of-view list is collapsible and remembered');
  assert.ok(/function emptyActions\(\)/.test(app) && /emptyActions\(\);/.test(app) && /data-way/.test(app) && /function wayOut\(k\)/.test(app), 'empty states offer one-tap ways out');
  ['clear', 'conf', 'digest', 'scope', 'lane:'].forEach((k) => assert.ok(app.includes("'" + k), 'way out: ' + k));
  assert.ok(/@media \(min-width:1200px\)\{[\s\S]*#v-map:not\(\[hidden\]\)\{display:grid/.test(css) && /body\.docked \.sheet\{/.test(css) && /classList\.toggle\('docked', dock\)/.test(app), 'two-column desktop layout with a docked detail panel');
  assert.ok(!/@media \(max-width[^)]*\)\{[^}]*body\.docked/.test(css), 'mobile layout unchanged');
}
console.log('national v4.4 tests passed');
