// v6: quick filters, active tags, saved filter sets. Run alone: node national/test-v6.js
const assert = require('assert'), fs = require('fs'), path = require('path'); const V = require('./v6.js'), C = require('./combined.js');
const T = '2026-10-30', recs = [{ id: 'a', sectors: ['water'], dates: { due: '2026-11-03' } }, { id: 'b', sectors: ['flood'], dates: { est: '2026-12-15' } }, { id: 'c', sectors: ['roadway'], dates: {} }, { id: 'd', sectors: ['wastewater', 'drainage'], dates: { due: '2026-10-01' } }];
const ids = (l) => l.map((r) => r.id).join(',');
assert.strictEqual(ids(V.extra(recs, { work: ['drainage'] }, T, C.sectorsOf)), 'b,d', 'Drainage / flood groups drainage, flood and coastal');
assert.strictEqual(ids(V.extra(recs, { work: ['water', 'roadway'] }, T, C.sectorsOf)), 'a,c');
assert.strictEqual(ids(V.extra(recs, { dueWithin: 7 }, T, C.sectorsOf)), 'a', 'due within: past dates and no date are out');
assert.strictEqual(ids(V.extra(recs, { dueWithin: 90 }, T, C.sectorsOf)), 'a,b', 'uses the forecast date when no due date');
assert.strictEqual(V.extra(recs, {}, T, C.sectorsOf), recs, 'no quick filter: same list');
const f = { q: 'pump', states: ['TX'], work: ['water'], dueWithin: 30, agencies: [], statuses: [], sectors: [], sources: [], feeMin: 5e6, hideUnconfirmed: true };
const tags = V.activeTags(f, { stateName: (k) => ({ TX: 'Texas' })[k], money: (v) => '$' + v / 1e6 + 'M', region: 'gulf', regionLabel: 'Texas + Gulf states' });
assert.deepStrictEqual(tags.map((t) => t.label), ['Search: pump', 'Texas', 'Water', 'Due in 30 days', 'Amount $5M+', 'Texas + Gulf states', 'Confirmed only']);
V.removeTag(f, 'states', 'TX'); V.removeTag(f, 'dueWithin'); V.removeTag(f, 'q'); assert.ok(!f.states.length && f.dueWithin === null && f.q === '');
// saved sets: snapshot, upsert by name, apply, delete, storage, merge (backup)
const mem = { v: null, getItem() { return this.v; }, setItem(k, v) { assert.strictEqual(k, 'nr.filtersets'); this.v = v; } };
let sets = V.upsert([], V.snapshot('Texas water', { states: ['TX'], work: ['water'], feeMin: null }, 'upcoming', 'tx'));
sets = V.upsert(sets, V.snapshot('texas WATER', { states: ['LA'] }, 'open', 'all')); assert.strictEqual(sets.length, 1, 'same name (any case) replaces');
sets = V.upsert(sets, V.snapshot('Due soon', { dueWithin: 7 }, 'upcoming', 'all')); assert.strictEqual(sets[0].name, 'Due soon');
assert.ok(V.save(mem, sets)); assert.deepStrictEqual(V.load(mem).map((s) => s.name), ['Due soon', 'texas WATER']);
const ap = V.applyTo({ q: 'x', states: ['NY'], work: [], dueWithin: null }, V.load(mem)[1]); assert.deepStrictEqual(ap.states, ['LA']); assert.strictEqual(ap.q, '');
assert.strictEqual(V.remove(sets, 'Due soon').length, 1);
mem.v = '{bad json'; assert.deepStrictEqual(V.load(mem), [], 'corrupt storage => empty, no crash');
assert.strictEqual(V.clean([{ name: '', f: {} }, null, { name: 'ok', f: { states: 'TX' } }]).length, 1, 'invalid entries dropped');
assert.deepStrictEqual(V.merge([V.snapshot('A', {}, 'all', 'all')], [V.snapshot('a', {}, 'all', 'all'), V.snapshot('B', {}, 'all', 'all')]).map((s) => s.name), ['A', 'B'], 'backup restore merges by name');
// wiring
const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8'), app = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8'), sw = fs.readFileSync(path.join(__dirname, 'sw.js'), 'utf8');
['qsState', 'qsWork', 'qsDue', 'ftags', 'fsets', 'fsName', 'fsSave', 'usmini'].forEach((k) => assert.ok(html.includes('id="' + k + '"'), 'html has #' + k));
assert.ok(/bk\.filtersets = FS/.test(app) && /j6\.filtersets/.test(app), 'saved sets go into the backup and come back on restore');
assert.ok(/'\.\/v6\.js'/.test(sw) && /radars-national-v2[1-9]/.test(sw), 'sw caches v6.js, cache v21+');
assert.ok(!/github|repo\b|repository/i.test(html + fs.readFileSync(path.join(__dirname, 'v6.js'), 'utf8')), 'no repo mentions');
console.log('national v6 tests passed');
