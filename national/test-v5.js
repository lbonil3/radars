// v5: no value floor, EPA SRF source, upcoming-first preference. Run alone: node national/test-v5.js
const assert = require('assert');
const S = require('./srf.js'), PS = require('./pse.js'), C = require('./combined.js');
const AS = '2026-10-29', ms = (d) => Date.parse(d + 'T12:00:00Z');
const base = { PROJECT_NAME: 'Raw Water Main Replacement', P_DESCRIPTION: 'Complete planning and design to replace 5.5 miles of raw water main.', EPA_TRACKING_NO: 'DW-AK-1', STATE_NAME: 'Alaska', P_START: ms('2025-09-01'), INIT_AGREE_DATE: ms('2025-03-10'), AGREE_AMT: 1800000 };
const c = S.normSrf(base, 'dw', AS);
assert.strictEqual(c.state, 'AK'); assert.deepStrictEqual(c.amounts, [], 'SRF financing is never a fee amount'); assert.strictEqual(c.fields['SRF assistance (not a fee)'], '$1,800,000');
const e = PS.evaluatePse(c, { asOf: AS }); assert.strictEqual(e.lens, 'advance'); assert.strictEqual(e.stage, 'forecast'); assert.ok(e.badges.indexOf('Fee/amount not stated') >= 0);
assert.strictEqual(S.normSrf(Object.assign({}, base, { P_DESCRIPTION: 'Replace collection lines.', P_START: ms('2025-04-01') }), 'cw', AS), null, 'construction under way with no design scope: out');
assert.ok(S.normSrf(Object.assign({}, base, { P_DESCRIPTION: 'Replace collection lines.', P_START: ms('2027-02-01') }), 'cw', AS), 'not started yet: kept');
assert.ok(/P_END IS NULL OR P_END>=DATE '2026-10-29'/.test(S.where('2025-01-01', AS)));
// scope + sort + positionable
const R = (id, stage, due, est) => ({ id, _ln: 'pse', lens: 'fee', stage, dates: { due, est } });
const recs = [R('aw', 'awarded'), R('late', 'open', '2026-11-01'), R('f', 'forecast', null, '2027-03-01'), R('o', 'open', '2026-12-15'), R('nd', 'open')];
assert.deepStrictEqual(recs.filter((r) => C.inScope(r, 'upcoming')).map((r) => r.id).sort(), ['f', 'late', 'nd', 'o']);
assert.strictEqual(C.SCOPES[0].id, 'upcoming');
assert.strictEqual(C.isPositionable(recs[1], AS), false, 'due in 3 days: too late to position');
assert.strictEqual(C.isPositionable(recs[2], AS), true); assert.strictEqual(C.isPositionable(recs[0], AS), false);
assert.deepStrictEqual(C.sort(recs, 'soon', AS).map((r) => r.id), ['o', 'f', 'nd', 'late', 'aw'], 'positionable first by soonest date, then too-late, then awarded');
console.log('national v5 tests passed');
