/* National Radar v4 helpers (browser + Node, no dependencies). */
(function (root, factory) { if (typeof module === 'object' && module.exports) module.exports = factory(); else root.NRV4 = factory(); })(this, function () {
  'use strict';
  // ---- 1. source health: merges the per-source status files written by the refresh scripts ----
  var GROUP_LABEL = { national: 'National Radar feeds', texas: 'Texas Opportunity feeds' };
  function health(files) {
    var all = [];
    (files || []).forEach(function (f) { if (f && Array.isArray(f.sources)) f.sources.forEach(function (s) { all.push(Object.assign({ group: f.group }, s)); }); });
    var bad = all.filter(function (s) { return s.health === 'stale' || s.health === 'failing'; });
    var c = { fresh: 0, stale: 0, failing: 0, off: 0 };
    all.forEach(function (s) { if (s.health === 'fresh' || s.health === 'stale' || s.health === 'failing') c[s.health]++; else c.off++; });
    return { all: all, bad: bad, counts: c, ids: bad.map(function (s) { return s.group + ':' + s.id; }) };
  }
  return { GROUP_LABEL: GROUP_LABEL, health: health };
});
