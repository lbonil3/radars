/* Saved filter sets and active-filter tags. Browser + Node, no dependencies. */
(function (root, factory) {
  var Storage = (typeof module === 'object' && module.exports) ? require('./storage.js') : root.RadarStorage;
  var api = factory(Storage);
  if (typeof module === 'object' && module.exports) module.exports = api; else root.RadarFilters = api;
})(typeof self !== 'undefined' ? self : this, function (Storage) {
  'use strict';
  var MAX_SETS = 30;
  var ARR = ['states', 'agencies', 'statuses', 'sectors', 'sources', 'work'];
  var WORK_LABELS = { water: 'Water', wastewater: 'Wastewater', drainage: 'Drainage / flood', roadway: 'Roadway' };
  function keyFor(app) { return app === 'texas' ? 'texas.filtersets' : 'national.filtersets'; }
  function legacyFor(app) { return app === 'national' ? 'nr.filtersets' : null; }
  function workLabel(id) { return WORK_LABELS[id] || id; }
  function activeTags(f, o) {
    o = o || {}; var t = [], nm = o.stateName || function (k) { return k; };
    if (f.q) t.push({ k: 'q', v: '', label: 'Search: ' + f.q });
    (f.states || []).forEach(function (s) { t.push({ k: 'states', v: s, label: s === '??' ? 'No state' : nm(s) }); });
    (f.work || []).forEach(function (w) { t.push({ k: 'work', v: w, label: workLabel(w) }); });
    if (f.dueWithin) t.push({ k: 'dueWithin', v: '', label: 'Due in ' + f.dueWithin + ' days' });
    (f.agencies || []).forEach(function (a) { t.push({ k: 'agencies', v: a, label: a }); });
    (f.statuses || []).forEach(function (a) { t.push({ k: 'statuses', v: a, label: (o.stageLabel && o.stageLabel[a]) || a }); });
    (f.sectors || []).forEach(function (a) { t.push({ k: 'sectors', v: a, label: o.secLabel ? o.secLabel(a) : a }); });
    (f.sources || []).forEach(function (a) { t.push({ k: 'sources', v: a, label: (o.srcLabel && o.srcLabel[a]) || a }); });
    if (f.feeMin !== null && f.feeMin !== undefined) t.push({ k: 'feeMin', v: '', label: 'Amount ' + (o.money ? o.money(f.feeMin) : f.feeMin) + '+' });
    if (o.region && o.region !== 'all') t.push({ k: 'region', v: '', label: o.regionLabel || o.region });
    if (f.hideUnconfirmed) t.push({ k: 'hideUnconfirmed', v: '', label: 'Confirmed only' });
    return t;
  }
  function removeTag(f, k, v) {
    if (Array.isArray(f[k])) { var i = f[k].indexOf(v); if (i >= 0) f[k].splice(i, 1); }
    else if (k === 'q') f.q = ''; else if (k === 'feeMin' || k === 'dueWithin') f[k] = null;
    return f;
  }
  function snapshot(name, f, scope, region) {
    var o = { name: String(name || '').trim().slice(0, 60), scope: scope || 'upcoming', region: region || 'all', f: { q: String(f.q || '').slice(0, 120), feeMin: typeof f.feeMin === 'number' ? f.feeMin : null, dueWithin: typeof f.dueWithin === 'number' ? f.dueWithin : null } };
    ARR.forEach(function (k) { o.f[k] = (Array.isArray(f[k]) ? f[k] : []).slice(0, 80).map(String); }); return o;
  }
  function clean(list) {
    if (!Array.isArray(list)) return [];
    return list.filter(function (x) { return x && typeof x.name === 'string' && x.name.trim() && x.f && typeof x.f === 'object'; }).slice(0, MAX_SETS).map(function (x) { return snapshot(x.name, x.f, typeof x.scope === 'string' ? x.scope : 'upcoming', typeof x.region === 'string' ? x.region : 'all'); });
  }
  function load(ls, app) {
    try {
      var key = keyFor(app), legacy = legacyFor(app);
      if (legacy && Storage && Storage.migrateCopy) Storage.migrateCopy(ls, legacy, key);
      var raw = (Storage && Storage.read) ? Storage.read(ls, key, legacy ? [legacy] : []) : ls.getItem(key);
      if (typeof raw !== 'string' && legacy) { try { raw = ls.getItem(legacy); } catch (e2) { raw = null; } }
      return clean(JSON.parse(raw || '[]'));
    } catch (e) { return []; }
  }
  function save(ls, app, sets) { try { ls.setItem(keyFor(app), JSON.stringify(clean(sets))); return true; } catch (e) { return false; } }
  function upsert(sets, set) { var out = sets.filter(function (x) { return x.name.toLowerCase() !== set.name.toLowerCase(); }); out.unshift(set); return out.slice(0, MAX_SETS); }
  function remove(sets, name) { return sets.filter(function (x) { return x.name !== name; }); }
  function applyTo(fresh, set) { var f = fresh; f.q = set.f.q || ''; f.feeMin = set.f.feeMin; f.dueWithin = set.f.dueWithin; ARR.forEach(function (k) { f[k] = (set.f[k] || []).slice(); }); return f; }
  function merge(a, b) { var out = clean(a); clean(b).forEach(function (s) { if (!out.some(function (x) { return x.name.toLowerCase() === s.name.toLowerCase(); })) out.push(s); }); return out.slice(0, MAX_SETS); }
  return { MAX_SETS: MAX_SETS, keyFor: keyFor, legacyFor: legacyFor, clean: clean, snapshot: snapshot, load: load, save: save, upsert: upsert, remove: remove, applyTo: applyTo, merge: merge, activeTags: activeTags, removeTag: removeTag };
});
