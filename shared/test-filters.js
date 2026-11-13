// Shared filter sets. Run: node shared/test-filters.js
const assert = require('assert');
const F = require('./filters.js');

function mem(map) {
  const o = { map: Object.assign({}, map || {}) };
  o.getItem = function (k) { return Object.prototype.hasOwnProperty.call(this.map, k) ? this.map[k] : null; };
  o.setItem = function (k, v) { this.map[k] = String(v); };
  return o;
}

assert.strictEqual(F.MAX_SETS, 30);
assert.strictEqual(F.keyFor('national'), 'national.filtersets');
assert.strictEqual(F.keyFor('texas'), 'texas.filtersets');
assert.strictEqual(F.legacyFor('national'), 'nr.filtersets');
assert.strictEqual(F.legacyFor('texas'), null);

const f = { q: 'pump', states: ['TX'], work: ['water'], dueWithin: 30, agencies: [], statuses: [], sectors: [], sources: [], feeMin: 5e6, hideUnconfirmed: true };
const tags = F.activeTags(f, { stateName: (k) => ({ TX: 'Texas' })[k], money: (v) => '$' + v / 1e6 + 'M', region: 'gulf', regionLabel: 'Texas + Gulf states' });
assert.deepStrictEqual(tags.map((t) => t.label), ['Search: pump', 'Texas', 'Water', 'Due in 30 days', 'Amount $5M+', 'Texas + Gulf states', 'Confirmed only']);
F.removeTag(f, 'states', 'TX'); F.removeTag(f, 'dueWithin'); F.removeTag(f, 'q');
assert.ok(!f.states.length && f.dueWithin === null && f.q === '');

let sets = F.upsert([], F.snapshot('Texas water', { states: ['TX'], work: ['water'], feeMin: null }, 'upcoming', 'tx'));
sets = F.upsert(sets, F.snapshot('texas WATER', { states: ['LA'] }, 'open', 'all'));
assert.strictEqual(sets.length, 1, 'same name (any case) replaces');
sets = F.upsert(sets, F.snapshot('Due soon', { dueWithin: 7 }, 'upcoming', 'all'));
assert.strictEqual(sets[0].name, 'Due soon');
const nat = mem({});
assert.ok(F.save(nat, 'national', sets));
assert.deepStrictEqual(F.load(nat, 'national').map((s) => s.name), ['Due soon', 'texas WATER']);
assert.strictEqual(nat.getItem('texas.filtersets'), null, 'national save does not write the texas key');
const ap = F.applyTo({ q: 'x', states: ['NY'], work: [], dueWithin: null }, F.load(nat, 'national')[1]);
assert.deepStrictEqual(ap.states, ['LA']);
assert.strictEqual(ap.q, '');
assert.strictEqual(F.remove(sets, 'Due soon').length, 1);
nat.setItem('national.filtersets', '{bad');
assert.deepStrictEqual(F.load(nat, 'national'), [], 'corrupt JSON => []');
assert.strictEqual(F.clean([{ name: '', f: {} }, null, { name: 'ok', f: { states: 'TX' } }]).length, 1, 'invalid entries dropped');
assert.deepStrictEqual(F.merge([F.snapshot('A', {}, 'all', 'all')], [F.snapshot('a', {}, 'all', 'all'), F.snapshot('B', {}, 'all', 'all')]).map((s) => s.name), ['A', 'B'], 'backup restore merges by name');

const shared = mem({});
assert.ok(F.save(shared, 'national', [F.snapshot('National only', { states: ['TX'] }, 'upcoming', 'tx')]));
assert.deepStrictEqual(F.load(shared, 'texas'), [], 'a National set does not appear in the Texas load');
assert.strictEqual(F.load(shared, 'national')[0].name, 'National only');

const tx = mem({});
assert.ok(F.save(tx, 'texas', [F.snapshot('Houston', { q: 'drain' }, 'all', 'all')]));
assert.ok(tx.getItem('texas.filtersets'));
assert.strictEqual(tx.getItem('national.filtersets'), null);
assert.strictEqual(tx.getItem('nr.filtersets'), null);
assert.strictEqual(F.load(tx, 'texas')[0].name, 'Houston');
assert.deepStrictEqual(F.load(tx, 'national'), []);

const legacy = mem({ 'nr.filtersets': JSON.stringify([F.snapshot('Legacy', { states: ['TX'] }, 'upcoming', 'tx')]) });
assert.strictEqual(F.load(legacy, 'national')[0].name, 'Legacy');
assert.strictEqual(legacy.getItem('nr.filtersets'), JSON.stringify([F.snapshot('Legacy', { states: ['TX'] }, 'upcoming', 'tx')]), 'legacy key is not deleted');
assert.ok(legacy.getItem('national.filtersets'), 'national copy was written');
const legacyTx = mem({ 'nr.filtersets': JSON.stringify([F.snapshot('Legacy', { states: ['TX'] }, 'upcoming', 'tx')]) });
assert.deepStrictEqual(F.load(legacyTx, 'texas'), [], 'texas does not read the national legacy key');
assert.strictEqual(legacyTx.getItem('texas.filtersets'), null);
assert.strictEqual(legacyTx.getItem('nr.filtersets'), JSON.stringify([F.snapshot('Legacy', { states: ['TX'] }, 'upcoming', 'tx')]));

// Texas sets keep Texas fields (texas.filtersets); National sets are unchanged
const txf = { q: 'drain', rel: 'direct', consult: true, eng: true, agencies: ['HCFCD'], phases: ['design'], kinds: ['solicitation'], kw: ['drainage'], houston: true, located: false, watchOnly: false, month: '2026-11' };
const ts = F.snapshotFor('texas', ' Houston drainage ', txf);
assert.deepStrictEqual(ts, { name: 'Houston drainage', app: 'texas', f: { q: 'drain', rel: 'direct', consult: true, eng: true, houston: true, located: false, watchOnly: false, agencies: ['HCFCD'], phases: ['design'], kinds: ['solicitation'], kw: ['drainage'] } }, 'Texas snapshot keeps Texas fields and drops the timeline month');
assert.deepStrictEqual(F.snapshotFor('national', 'N', { states: ['TX'] }, 'upcoming', 'tx'), F.snapshot('N', { states: ['TX'] }, 'upcoming', 'tx'), 'National snapshot unchanged');
assert.strictEqual(F.snapshotFor('texas', 'bad', { rel: 'nope', consult: 'yes' }).f.rel, 'relevant', 'unknown relevance falls back to the default');
assert.strictEqual(F.snapshotFor('texas', 'bad', { consult: 'yes' }).f.consult, true, 'non-boolean switches fall back to the defaults');
const txls = mem({});
assert.ok(F.save(txls, 'texas', F.upsert([], ts)));
assert.deepStrictEqual(F.load(txls, 'texas'), [ts], 'Texas round trip through texas.filtersets');
assert.strictEqual(txls.getItem('national.filtersets'), null, 'Texas save never writes the National key');
const fresh = { q: '', rel: 'relevant', consult: true, eng: false, agencies: [], phases: [], kinds: [], kw: [], houston: false, located: false, watchOnly: false, month: '2026-12' };
const ap2 = F.applyFor('texas', fresh, ts);
assert.deepStrictEqual([ap2.q, ap2.rel, ap2.eng, ap2.houston, ap2.agencies, ap2.kw, ap2.month], ['drain', 'direct', true, true, ['HCFCD'], ['drainage'], null]);
ap2.agencies.push('X'); assert.deepStrictEqual(ts.f.agencies, ['HCFCD'], 'apply copies arrays');
const ttags = F.tagsFor('texas', Object.assign({}, txf, { consult: false }), { phaseLabel: { design: 'Design' }, kindLabel: { solicitation: 'Open solicitation' }, kwLabel: { drainage: 'Drainage' }, monthLabel: (m) => 'Nov 2026' });
assert.deepStrictEqual(ttags.map((t) => t.label), ['Search: drain', 'Drainage: direct only', 'All records (not only consultant services)', 'HCFCD', 'Design', 'Open solicitation', 'Drainage', 'Month: Nov 2026']);
const rt = Object.assign({}, txf, { agencies: ['HCFCD'], consult: false });
['q', 'rel', 'consult', 'month'].forEach((k) => F.removeTagFor('texas', rt, k)); F.removeTagFor('texas', rt, 'agencies', 'HCFCD');
assert.deepStrictEqual([rt.q, rt.rel, rt.consult, rt.month, rt.agencies], ['', 'relevant', true, null, []], 'removing a Texas tag restores the default');
assert.deepStrictEqual(F.tagsFor('national', f, {}), F.activeTags(f, {}), 'National tags unchanged');
assert.deepStrictEqual(F.mergeFor('texas', [ts], [F.snapshotFor('texas', 'HOUSTON DRAINAGE', {}), F.snapshotFor('texas', 'Austin', {})]).map((s) => s.name), ['Houston drainage', 'Austin'], 'Texas backup restore merges by name');

console.log('shared filter tests passed');
