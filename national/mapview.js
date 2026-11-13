/* National Radar map helpers (pure, no DOM), adapted from hydraulics-tools PR #19 mapview.js for this repo.
   - Count markers as today (no dollar-sized bubbles, no lane modes); marker sizes stay the same on screen when zoomed.
   - us-geo.js land is 975 x 610. While Northeast callouts are on (zoom under 1.8x) the viewBox widens to 1040 x 610 so the
     Atlantic column (MA, RI, CT, NJ, DE, MD, DC, and VT / NH when they collide) sits in the extra space on the right.
   - Shading is a theme-agnostic 0..1 value; the colors come from CSS tokens (--map-shade, --map-land) for Day and Night. */
(function (root, factory) { if (typeof module === 'object' && module.exports) module.exports = factory(); else root.NationalMapView = factory(); })(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var LAND = { w: 975, h: 610 }, VIEW = { w: 1040, h: 610 };
  var CALLOUT = ['MA', 'RI', 'CT', 'NJ', 'DE', 'MD', 'DC'], CALLOUT_IF_NEEDED = ['VT', 'NH'], CALLOUT_MAX_ZOOM = 1.8, ZOOM_MAX = 8;
  // list: records; valueOf(r) -> number (0 when the record states no value). Records with no state are kept apart in `none`.
  function aggregate(list, valueOf) {
    var by = {}, none = { n: 0, nv: 0, v: 0 };
    list.forEach(function (r) {
      var o = r.state ? (by[r.state] = by[r.state] || { n: 0, nv: 0, v: 0 }) : none, v = +valueOf(r) || 0;
      o.n++; if (v > 0) { o.nv++; o.v += v; }
    });
    var maxV = 0, maxN = 0; Object.keys(by).forEach(function (k) { maxV = Math.max(maxV, by[k].v); maxN = Math.max(maxN, by[k].n); });
    return { by: by, none: none, maxV: maxV, maxN: maxN };
  }
  // today's count-marker radius (map units at 1x), divided by the zoom so markers keep their on-screen size
  function markerRadius(n, small, k) { var r = small ? (n > 99 ? 24 : 19) : (n > 99 ? 19 : 15); return r / Math.max(1, k || 1); }
  // state shading by record count: 0..1 on a sqrt scale; shadeAlpha maps it to the share of --map-shade mixed into --map-land
  function shade(n, maxN) { return n > 0 && maxN > 0 ? Math.sqrt(Math.min(1, n / maxN)) : 0; }
  function shadeAlpha(t) { return t > 0 ? 0.15 + 0.6 * Math.min(1, t) : 0; }
  // zoom state { k, x, y }: k in 1..8; x, y = top-left of the view in map units
  function calloutsOn(k) { return (k || 1) < CALLOUT_MAX_ZOOM; }
  function frameFor(k) { return calloutsOn(k) ? VIEW : LAND; }
  function clampZoom(z) {
    var k = Math.max(1, Math.min(ZOOM_MAX, +z.k || 1)), f = frameFor(k), w = f.w / k, h = f.h / k;
    if (k === 1) return { k: 1, x: 0, y: 0 };
    return { k: k, x: Math.max(0, Math.min(f.w - w, +z.x || 0)), y: Math.max(0, Math.min(f.h - h, +z.y || 0)) };
  }
  function viewBoxFor(z) { var c = clampZoom(z), f = frameFor(c.k); return [c.x, c.y, f.w / c.k, f.h / c.k].map(function (n) { return +n.toFixed(2); }).join(' '); }
  // zoom by `factor` keeping the map point (ux, uy) under the pointer
  function zoomAt(z, ux, uy, factor) {
    var c = clampZoom(z), k2 = Math.max(1, Math.min(ZOOM_MAX, c.k * factor)); if (k2 === c.k) return c;
    var f1 = frameFor(c.k), f2 = frameFor(k2), w1 = f1.w / c.k, h1 = f1.h / c.k, w2 = f2.w / k2, h2 = f2.h / k2;
    return clampZoom({ k: k2, x: ux - (ux - c.x) / w1 * w2, y: uy - (uy - c.y) / h1 * h2 });
  }
  // a client point -> map units, for an SVG drawn with the default preserveAspectRatio (xMidYMid meet). rect = getBoundingClientRect()
  function toMapUnits(rect, z, clientX, clientY) {
    var c = clampZoom(z), f = frameFor(c.k), vw = f.w / c.k, vh = f.h / c.k, ppu = rect.width ? Math.min(rect.width / vw, rect.height ? rect.height / vh : Infinity) : 1;
    var ox = (rect.width - vw * ppu) / 2, oy = (rect.height - vh * ppu) / 2;
    return { x: c.x + (clientX - rect.left - ox) / ppu, y: c.y + (clientY - rect.top - oy) / ppu, ppu: ppu };
  }
  // items: [{ st, cx, cy, r }] in map units. Returns { ST: { x, y } } for the states moved to the callout column.
  // opts: { right (x of the column's right edge), top, bottom, gap }
  function layoutCallouts(items, opts) {
    opts = opts || {}; var right = opts.right === undefined ? VIEW.w - 4 : opts.right, top = opts.top === undefined ? 6 : opts.top, bottom = opts.bottom === undefined ? VIEW.h - 6 : opts.bottom, gap = opts.gap === undefined ? 4 : opts.gap;
    var overlaps = function (a) { return items.some(function (b) { return b !== a && CALLOUT.indexOf(b.st) < 0 && Math.hypot(a.cx - b.cx, a.cy - b.cy) < a.r + b.r; }); };
    var chosen = items.filter(function (it) { return CALLOUT.indexOf(it.st) >= 0 || (CALLOUT_IF_NEEDED.indexOf(it.st) >= 0 && (overlaps(it) || items.some(function (b) { return CALLOUT.indexOf(b.st) >= 0 && Math.hypot(it.cx - b.cx, it.cy - b.cy) < it.r + b.r; }))); });
    chosen.sort(function (a, b) { return a.cy - b.cy || (a.st < b.st ? -1 : 1); });
    var out = {}; if (!chosen.length) return out;
    var place = function (list, x) {
      var ys = [], prev = null;
      list.forEach(function (it) { var y = Math.max(it.cy, top + it.r); if (prev) y = Math.max(y, prev.y + prev.r + it.r + gap); ys.push(y); prev = { y: y, r: it.r }; });
      var over = ys.length ? ys[ys.length - 1] + list[list.length - 1].r - bottom : 0;
      if (over > 0) { var room = ys[0] - list[0].r - top, shift = Math.min(over, Math.max(0, room)); ys = ys.map(function (y) { return y - shift; }); over -= shift; }
      return { ys: ys, over: over, x: x };
    };
    var maxR = Math.max.apply(null, chosen.map(function (c) { return c.r; }));
    var col1 = place(chosen, right - maxR);
    if (col1.over <= 0) { chosen.forEach(function (it, i) { out[it.st] = { x: col1.x, y: col1.ys[i] }; }); return out; }
    var a = chosen.filter(function (_, i) { return i % 2 === 0; }), b = chosen.filter(function (_, i) { return i % 2 === 1; });
    var ca = place(a, right - maxR), cb = place(b, right - 3 * maxR - gap);
    a.forEach(function (it, i) { out[it.st] = { x: ca.x, y: ca.ys[i] }; }); b.forEach(function (it, i) { out[it.st] = { x: cb.x, y: cb.ys[i] }; });
    return out;
  }
  // legend entries [{ cls, text }]; info: { hasValue, hasCount, shade, callouts, pinned }
  function legendFor(info) {
    info = info || {}; var e = [];
    if (info.hasValue) e.push({ cls: 'v', text: 'Number = records in the state; blue = some records state a dollar value (hover or focus for the total)' });
    if (info.hasCount) e.push({ cls: 'c', text: 'Amber = count only (no stated value)' });
    if (info.shade) e.push({ cls: 'shd', text: 'State shade = number of records' });
    if (info.callouts) e.push({ cls: 'co', text: 'Small Northeast states are drawn off the coast, with a line to the state' });
    if (info.pinned > 0) e.push({ cls: 'p', text: 'Pin = city named in the source (' + info.pinned + ')' });
    return e;
  }
  // tooltip / aria lines for one state; money(v) formats a stated total
  function tooltipLines(name, o, money) {
    var lines = [name, o.n + ' record' + (o.n === 1 ? '' : 's')];
    lines.push(o.nv ? money(o.v) + ' stated by ' + o.nv + ' of them (fees, design-build values and project costs as the sources state them)' : 'Count only, no stated value');
    return lines;
  }
  return { LAND: LAND, VIEW: VIEW, CALLOUT: CALLOUT, CALLOUT_IF_NEEDED: CALLOUT_IF_NEEDED, CALLOUT_MAX_ZOOM: CALLOUT_MAX_ZOOM, ZOOM_MAX: ZOOM_MAX, aggregate: aggregate, markerRadius: markerRadius, shade: shade, shadeAlpha: shadeAlpha, calloutsOn: calloutsOn, frameFor: frameFor, clampZoom: clampZoom, viewBoxFor: viewBoxFor, zoomAt: zoomAt, toMapUnits: toMapUnits, layoutCallouts: layoutCallouts, legendFor: legendFor, tooltipLines: tooltipLines };
});
