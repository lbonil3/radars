/* National Radar v6: quick filters (work type, due date), active-filter tags and saved filter sets. Browser + Node, no dependencies. */
(function (root, factory) { if (typeof module === 'object' && module.exports) module.exports = factory(); else root.NRV6 = factory(); })(this, function () {
  'use strict';
  var WORK = [
    { id: 'water', label: 'Water', sectors: ['water'] },
    { id: 'wastewater', label: 'Wastewater', sectors: ['wastewater'] },
    { id: 'drainage', label: 'Drainage / flood', sectors: ['drainage', 'flood', 'coastal'] },
    { id: 'roadway', label: 'Roadway', sectors: ['roadway'] }
  ];
  var DUE = [{ d: 7, label: 'Next 7 days' }, { d: 30, label: 'Next 30 days' }, { d: 90, label: 'Next 90 days' }];
  var KEY = 'nr.filtersets', MAX_SETS = 30;
  function addDays(iso, n) { var d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
  function dueOf(r) { var d = r.dates || {}; return d.due || d.est || null; }
  function workOf(r, sectorsOf) { var s = sectorsOf(r) || []; return WORK.filter(function (w) { return w.sectors.some(function (x) { return s.indexOf(x) >= 0; }); }).map(function (w) { return w.id; }); }
  // the quick filters that combined.filter does not know: work type and due-within
  function extra(list, f, today, sectorsOf) {
    var work = (f && f.work) || [], dw = f && f.dueWithin, lim = dw ? addDays(today, dw) : null;
    if (!work.length && !dw) return list;
    return list.filter(function (r) {
      if (work.length && !workOf(r, sectorsOf).some(function (w) { return work.indexOf(w) >= 0; })) return false;
      if (dw) { var d = dueOf(r); if (!d || d < today || d > lim) return false; }
      return true;
    });
  }
  function workLabel(id) { var w = WORK.filter(function (x) { return x.id === id; })[0]; return w ? w.label : id; }
  // small removable tags for every active filter
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
  // ---- saved filter sets (on this device only)
  var ARR = ['states', 'agencies', 'statuses', 'sectors', 'sources', 'work'];
  function snapshot(name, f, scope, region) {
    var o = { name: String(name || '').trim().slice(0, 60), scope: scope || 'upcoming', region: region || 'all', f: { q: String(f.q || '').slice(0, 120), feeMin: typeof f.feeMin === 'number' ? f.feeMin : null, dueWithin: typeof f.dueWithin === 'number' ? f.dueWithin : null } };
    ARR.forEach(function (k) { o.f[k] = (Array.isArray(f[k]) ? f[k] : []).slice(0, 80).map(String); }); return o;
  }
  function clean(list) {
    if (!Array.isArray(list)) return [];
    return list.filter(function (x) { return x && typeof x.name === 'string' && x.name.trim() && x.f && typeof x.f === 'object'; }).slice(0, MAX_SETS).map(function (x) { return snapshot(x.name, x.f, typeof x.scope === 'string' ? x.scope : 'upcoming', typeof x.region === 'string' ? x.region : 'all'); });
  }
  function load(ls) { try { return clean(JSON.parse(ls.getItem(KEY) || '[]')); } catch (e) { return []; } }
  function save(ls, sets) { try { ls.setItem(KEY, JSON.stringify(clean(sets))); return true; } catch (e) { return false; } }
  function upsert(sets, set) { var out = sets.filter(function (x) { return x.name.toLowerCase() !== set.name.toLowerCase(); }); out.unshift(set); return out.slice(0, MAX_SETS); }
  function remove(sets, name) { return sets.filter(function (x) { return x.name !== name; }); }
  function applyTo(fresh, set) { var f = fresh; f.q = set.f.q || ''; f.feeMin = set.f.feeMin; f.dueWithin = set.f.dueWithin; ARR.forEach(function (k) { f[k] = (set.f[k] || []).slice(); }); return f; }
  function merge(a, b) { var out = clean(a); clean(b).forEach(function (s) { if (!out.some(function (x) { return x.name.toLowerCase() === s.name.toLowerCase(); })) out.push(s); }); return out.slice(0, MAX_SETS); }
  return { WORK: WORK, DUE: DUE, KEY: KEY, addDays: addDays, workOf: workOf, extra: extra, workLabel: workLabel, activeTags: activeTags, removeTag: removeTag, snapshot: snapshot, clean: clean, load: load, save: save, upsert: upsert, remove: remove, applyTo: applyTo, merge: merge };
});
