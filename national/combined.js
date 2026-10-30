/* National Radar v5: one combined, ungrouped record set (browser + Node, no dependencies).
   Merges the three snapshot files, tags each record with the file it came from (r._ln, internal only, used to
   pick the right detail renderer), de-duplicates by record id, and filters/sorts without any lane or fee gating. */
(function (root, factory) { if (typeof module === 'object' && module.exports) module.exports = factory(); else root.NRC = factory(); })(this, function () {
  'use strict';
  function merge(dp, dw, dr) {
    var seen = {}, recs = [], sources = [], sseen = {}, asOf = '', gen = '';
    [[dp, 'pse'], [dw, 'water'], [dr, 'road']].forEach(function (x) {
      var d = x[0]; if (!d) return;
      if ((d.asOfDate || '') > asOf) asOf = d.asOfDate; if ((d.generatedAt || '') > gen) gen = d.generatedAt;
      (d.records || []).forEach(function (r) { if (seen[r.id]) return; seen[r.id] = 1; r._ln = x[1]; recs.push(r); });
      (d.sources || []).forEach(function (s) { if (!sseen[s.id]) { sseen[s.id] = 1; sources.push(s); } });
    });
    return { asOfDate: asOf, generatedAt: gen, sources: sources, records: recs, counts: { total: recs.length } };
  }
  function stageOf(r) {
    if (r._ln === 'pse') return r.stage === 'unclear' ? 'open' : (r.stage || 'open');
    if (r.status === 'awarded') return 'awarded';
    if (r.bucket === 'closed') return 'closed';
    if (r.status === 'upcoming' && /forecast|projected|look-?ahead|planning/i.test(r.noticeType || r.noticeLabel || '')) return 'forecast';
    return 'open';
  }
  function valueOf(r) { var a = r.amt || r.dbValue || r.projectCost || r.statedValue; return a && a.v ? a.v : 0; }
  // plain info only (not a grouping): what kind of dollar figure the source states
  function kindOf(r) {
    if (r._ln === 'pse') return r.lens === 'db' ? 'Design-build' : r.lens === 'pipeline' ? 'Project cost (not fee)' : r.lens === 'advance' ? 'Early notice' : 'Fee stated';
    return r.amt ? 'Fee stated' : 'Fee/amount not stated';
  }
  function isConfirmed(r) { return r._ln === 'pse' ? (r.lens !== 'fee' || r.conf === 'confirmed') : r.bucket !== 'review'; }
  function sectorsOf(r) { return r.sectors || r.domains || []; }
  var STAGE_LABEL = { open: 'Open / upcoming', forecast: 'Forecast', awarded: 'Awarded', closed: 'Closed' };
  var SCOPES = [
    { id: 'upcoming', label: 'Upcoming', sub: 'open, upcoming and forecast: work you can still position for' },
    { id: 'all', label: 'All', sub: 'every record from every source' },
    { id: 'open', label: 'Open', sub: 'open or upcoming, not yet awarded' },
    { id: 'forecast', label: 'Forecast', sub: 'agency forecasts and early notices' },
    { id: 'awarded', label: 'Awarded', sub: 'awarded or closed: recompete and competitor intel' },
    { id: 'watch', label: 'Watchlist', sub: 'starred on this device' }
  ];
  function inScope(r, scope, watch) {
    var s = stageOf(r);
    if (scope === 'watch') return !!(watch && watch[r.id]);
    if (scope === 'upcoming') return s === 'open' || s === 'forecast';
    if (scope === 'open') return s === 'open';
    if (scope === 'forecast') return s === 'forecast';
    if (scope === 'awarded') return s === 'awarded' || s === 'closed';
    return true;
  }
  function has(list, v) { return !list || !list.length || list.indexOf(v) >= 0; }
  function filter(records, f, scope, watch) {
    f = f || {}; var q = String(f.q || '').toLowerCase().trim();
    return (records || []).filter(function (r) {
      if (!inScope(r, scope || 'all', watch)) return false;
      if (q && [r.title, r.agency, r.subagency, r.office, r.desc, r.state, r.city, r.src, r.solNum, r.awardee].join(' ').toLowerCase().indexOf(q) < 0) return false;
      if (!has(f.states, r.state || '??') || !has(f.agencies, r.agency) || !has(f.statuses, stageOf(r)) || !has(f.sources, r.src)) return false;
      if (f.sectors && f.sectors.length && !sectorsOf(r).some(function (s) { return f.sectors.indexOf(s) >= 0; })) return false;
      if (f.feeMin !== null && f.feeMin !== undefined && valueOf(r) < f.feeMin) return false; // optional minimum, default none
      if (f.hideUnconfirmed && !isConfirmed(r)) return false;
      return true;
    });
  }
  function dateOf(r) { var d = r.dates || {}; return d.due || d.est || d.award || d.posted || '9999'; }
  // Positionable: not awarded or closed, and the response date (if any) is still at least 14 days away, so there is time to shape the pursuit.
  function isPositionable(r, today) {
    var s = stageOf(r); if (s !== 'open' && s !== 'forecast') return false;
    var d = r.dates || {}, t = today || new Date().toISOString().slice(0, 10); if (!d.due) return true;
    var lim = new Date(t + 'T12:00:00Z'); lim.setUTCDate(lim.getUTCDate() + 14); return d.due >= lim.toISOString().slice(0, 10);
  }
  function fwdDate(r, t) { var d = r.dates || {}, v = d.due || d.est || null; return v && v >= t ? v : null; } // past dates do not count as 'soon'
  function sort(list, key, today) {
    var a = list.slice();
    if (key === 'soon') { var rank = function (r) { var s = stageOf(r); return s === 'open' || s === 'forecast' ? (isPositionable(r, today) ? 0 : 1) : 2; };
      a.sort(function (x, y) { var d = rank(x) - rank(y); if (d) return d; var t = today || new Date().toISOString().slice(0, 10), dx = fwdDate(x, t), dy = fwdDate(y, t); if (rank(x) === 2) { dx = (x.dates || {}).award || dx; dy = (y.dates || {}).award || dy; return (dy || '') < (dx || '') ? -1 : (dy || '') > (dx || '') ? 1 : 0; }
        if (dx && dy && dx !== dy) return dx < dy ? -1 : 1; if (dx && !dy) return -1; if (dy && !dx) return 1; return valueOf(y) - valueOf(x); }); return a; }
    if (key === 'agency') a.sort(function (x, y) { return (x.agency || '') < (y.agency || '') ? -1 : (x.agency || '') > (y.agency || '') ? 1 : valueOf(y) - valueOf(x); });
    else if (key === 'date') a.sort(function (x, y) { return dateOf(x) < dateOf(y) ? -1 : dateOf(x) > dateOf(y) ? 1 : valueOf(y) - valueOf(x); });
    else if (key === 'conf') a.sort(function (x, y) { return (isConfirmed(y) ? 1 : 0) - (isConfirmed(x) ? 1 : 0) || valueOf(y) - valueOf(x); });
    else a.sort(function (x, y) { return valueOf(y) - valueOf(x); });
    return a;
  }
  return { merge: merge, stageOf: stageOf, valueOf: valueOf, kindOf: kindOf, isConfirmed: isConfirmed, isPositionable: isPositionable, sectorsOf: sectorsOf, STAGE_LABEL: STAGE_LABEL, SCOPES: SCOPES, inScope: inScope, filter: filter, sort: sort };
});
