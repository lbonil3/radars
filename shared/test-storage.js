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
console.log('shared storage tests passed');
