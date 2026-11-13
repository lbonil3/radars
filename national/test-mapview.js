// National Radar map helpers (ported from hydraulics-tools PR #19). Run alone: node national/test-mapview.js (also run by national/test.js)
const assert = require('assert'), fs = require('fs'), path = require('path');
const V = require('./mapview.js');
// aggregate: counts, how many carry a value, sum of stated values; no-state records kept apart for the Nationwide chip
const agg = V.aggregate([{ state: 'TX', v: 10 }, { state: 'TX', v: 0 }, { state: 'DC', v: 5 }, { state: '', v: 7 }, { v: 0 }], (r) => r.v);
assert.deepStrictEqual(agg.by.TX, { n: 2, nv: 1, v: 10 });
assert.deepStrictEqual(agg.none, { n: 2, nv: 1, v: 7 });
assert.strictEqual(agg.maxV, 10); assert.strictEqual(agg.maxN, 2);
// count-marker sizing: today's radii at 1x, same on-screen size when zoomed
assert.deepStrictEqual([V.markerRadius(5, false, 1), V.markerRadius(120, false, 1), V.markerRadius(5, true, 1), V.markerRadius(120, true, 1)], [15, 19, 19, 24], 'same sizes as markersHtml today');
assert.strictEqual(V.markerRadius(5, false, 2), 7.5); assert.strictEqual(V.markerRadius(5, false, 0.5), 15, 'never larger than 1x');
// shading: theme-agnostic 0..1, sqrt, monotonic
assert.strictEqual(V.shade(0, 10), 0); assert.strictEqual(V.shade(10, 10), 1); assert.strictEqual(V.shade(5, 0), 0);
assert.ok(Math.abs(V.shade(25, 100) - 0.5) < 1e-12, 'sqrt scale');
assert.ok(V.shade(1, 100) < V.shade(50, 100) && V.shade(50, 100) < V.shade(100, 100));
[0, 0.2, 0.5, 1].forEach((t) => { const a = V.shadeAlpha(t); assert.ok(a >= 0 && a <= 1, 'alpha in 0..1'); });
assert.strictEqual(V.shadeAlpha(0), 0); assert.ok(V.shadeAlpha(0.01) > 0.15 - 1e-9 && V.shadeAlpha(1) === 0.75);
const src = fs.readFileSync(path.join(__dirname, 'mapview.js'), 'utf8');
assert.ok(!/#[0-9a-f]{6}\b|rgb\(/i.test(src), 'no colors in the helpers: Day and Night come from CSS tokens');
assert.ok(!/encodingFor|'pse'|'road'|'water'|compactMoney|bubbleFor/.test(src), 'no lane modes or value bubbles ported');
// viewBox: 1040 wide only while callouts are on (under 1.8x); the 975 x 610 land otherwise
assert.deepStrictEqual([V.LAND, V.VIEW], [{ w: 975, h: 610 }, { w: 1040, h: 610 }]);
assert.strictEqual(V.viewBoxFor({ k: 1, x: 0, y: 0 }), '0 0 1040 610');
assert.ok(V.calloutsOn(1.79) && !V.calloutsOn(1.8), 'callouts off from 1.8x');
assert.strictEqual(V.viewBoxFor({ k: 2, x: 0, y: 0 }), '0 0 487.5 305', 'zoomed views use the land frame');
assert.deepStrictEqual(V.clampZoom({ k: 20, x: -50, y: 9999 }), { k: 8, x: 0, y: 610 - 610 / 8 }, 'zoom and pan stay inside the map');
assert.deepStrictEqual(V.clampZoom({ k: 0.3, x: 40, y: 40 }), { k: 1, x: 0, y: 0 });
const z2 = V.zoomAt({ k: 1, x: 0, y: 0 }, 500, 300, 1.5);
assert.ok(z2.k === 1.5 && Math.abs((500 - z2.x) / (1040 / 1.5) - 500 / 1040) < 1e-9, 'the point under the pointer stays put');
assert.deepStrictEqual(V.zoomAt({ k: 8, x: 10, y: 10 }, 100, 100, 2), V.clampZoom({ k: 8, x: 10, y: 10 }), 'max zoom');
const mu = V.toMapUnits({ left: 0, top: 0, width: 1040, height: 610 }, { k: 1, x: 0, y: 0 }, 520, 305);
assert.ok(Math.abs(mu.x - 520) < 1e-9 && Math.abs(mu.y - 305) < 1e-9 && mu.ppu === 1);
const mu2 = V.toMapUnits({ left: 0, top: 0, width: 520, height: 600 }, { k: 1, x: 0, y: 0 }, 260, 300);
assert.ok(Math.abs(mu2.x - 520) < 1e-9 && Math.abs(mu2.y - 305) < 1e-9, 'letterboxed SVG maps through the meet offset');
// callouts: real us-geo centroids for the crowded Northeast, laid out in the 1040 view against the 975 land
const geo = fs.readFileSync(path.join(__dirname, 'us-geo.js'), 'utf8');
const G = new Function('window', geo + '\nreturn window.US_GEO;')({});
assert.ok(G && G.states && G.states.DC && G.states.MD && G.proj.w === 975, 'us-geo land stays 975 wide');
const it = (st, r) => ({ st, cx: G.states[st].cx, cy: G.states[st].cy, r });
const ovl = (p, q, r1, r2) => Math.hypot(p.x - q.x, p.y - q.y) < r1 + r2;
let co = V.layoutCallouts([it('DC', 15), it('MD', 15), it('VA', 15), it('NY', 19)], { right: V.VIEW.w - 3, gap: 3 });
assert.ok(co.DC && co.MD && !co.VA && !co.NY, 'small Northeast states move out, big states stay');
assert.ok(!ovl(co.DC, co.MD, 15, 15), 'DC no longer covers MD');
assert.ok(co.DC.x - 15 >= V.LAND.w - 40 && co.DC.x + 15 <= V.VIEW.w, 'callouts sit in the Atlantic column inside the widened view');
co = V.layoutCallouts(V.CALLOUT.map((st) => it(st, 45)), { right: V.VIEW.w - 3, gap: 3 });
assert.strictEqual(Object.keys(co).length, 7);
assert.strictEqual(new Set(Object.values(co).map((p) => p.x.toFixed(1))).size, 2, 'overflow splits into two columns');
const ks = Object.keys(co);
ks.forEach((k, i) => { const p = co[k]; assert.ok(p.y - 45 >= 0 && p.y + 45 <= V.VIEW.h && p.x + 45 <= V.VIEW.w, k + ' inside view'); ks.slice(i + 1).forEach((q) => assert.ok(!ovl(p, co[q], 45, 45), k + ' vs ' + q)); });
assert.ok(!Object.keys(V.layoutCallouts([it('VT', 8), it('NH', 8), it('NY', 10), it('MA', 10)], {})).some((k) => k === 'VT' || k === 'NH'), 'small VT / NH stay on the map');
co = V.layoutCallouts([it('VT', 30), it('NH', 30), it('MA', 20)], {}); assert.ok(co.VT && co.NH, 'VT / NH move out when they collide');
assert.deepStrictEqual(V.layoutCallouts([it('TX', 30)], {}), {});
// selection: click picks one state (click it again to clear); Ctrl / Shift / Multi-select toggles it in the set
assert.deepStrictEqual(V.nextSelection([], 'TX', false), ['TX']);
assert.deepStrictEqual(V.nextSelection(['TX'], 'TX', false), []);
assert.deepStrictEqual(V.nextSelection(['TX', 'CA'], 'TX', false), ['TX'], 'plain click on a selected state in a set keeps only it');
assert.deepStrictEqual(V.nextSelection(['TX'], 'CA', false), ['CA']);
assert.deepStrictEqual(V.nextSelection(['TX'], 'CA', true), ['TX', 'CA']);
assert.deepStrictEqual(V.nextSelection(['TX', 'CA'], 'TX', true), ['CA']);
assert.deepStrictEqual(V.nextSelection(undefined, '??', true), ['??'], 'Nationwide / no state works like a state');
const before = ['TX']; V.nextSelection(before, 'CA', true); assert.deepStrictEqual(before, ['TX'], 'does not change its input');
// legend and tooltip copy
assert.deepStrictEqual(V.legendFor({ hasValue: true, hasCount: true, shade: true, callouts: true, pinned: 0 }).map((x) => x.cls), ['v', 'c', 'shd', 'co'], 'no pin entry with 0 pins');
assert.ok(V.legendFor({ pinned: 3 })[0].text.includes('(3)'));
assert.deepStrictEqual(V.tooltipLines('Texas', { n: 3, nv: 2, v: 1500000 }, (v) => '$' + v / 1e6 + 'M'), ['Texas', '3 records', '$1.5M stated by 2 of them (fees, design-build values and project costs as the sources state them)']);
assert.deepStrictEqual(V.tooltipLines('Maine', { n: 1, nv: 0, v: 0 }, String), ['Maine', '1 record', 'Count only, no stated value']);
// shipped: the page loads the helpers after us-geo.js and the service worker caches them
const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
assert.ok(html.indexOf('<script src="mapview.js"></script>') > html.indexOf('<script src="us-geo.js"></script>') && html.indexOf('<script src="mapview.js"></script>') < html.indexOf('<script src="app.js"></script>'), 'index.html loads mapview.js before app.js');
assert.ok(require('../shared/cache.js').files('national').indexOf('./mapview.js') >= 0, 'sw caches mapview.js');
console.log('national map helper tests passed');
