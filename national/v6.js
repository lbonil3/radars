/* National Radar v6: quick filters (work type, due date). Saved sets and tags live in shared/filters.js. */
(function (root, factory) {
  var api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api; else root.NRV6 = api;
})(typeof self !== 'undefined' ? self : this, function (root) {
  'use strict';
  var WORK = [
    { id: 'water', label: 'Water', sectors: ['water'] },
    { id: 'wastewater', label: 'Wastewater', sectors: ['wastewater'] },
    { id: 'drainage', label: 'Drainage / flood', sectors: ['drainage', 'flood', 'coastal'] },
    { id: 'roadway', label: 'Roadway', sectors: ['roadway'] }
  ];
  var DUE = [{ d: 7, label: 'Next 7 days' }, { d: 30, label: 'Next 30 days' }, { d: 90, label: 'Next 90 days' }];
  var KEY = 'national.filtersets';
  function filters() { return (typeof module === 'object' && module.exports) ? require('../shared/filters.js') : root.RadarFilters; }
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
  function activeTags(f, o) { return filters().activeTags(f, o); }
  function removeTag(f, k, v) { return filters().removeTag(f, k, v); }
  function snapshot(name, f, scope, region) { return filters().snapshot(name, f, scope, region); }
  function clean(list) { return filters().clean(list); }
  function load(ls) { return filters().load(ls, 'national'); }
  function save(ls, sets) { return filters().save(ls, 'national', sets); }
  function upsert(sets, set) { return filters().upsert(sets, set); }
  function remove(sets, name) { return filters().remove(sets, name); }
  function applyTo(fresh, set) { return filters().applyTo(fresh, set); }
  function merge(a, b) { return filters().merge(a, b); }
  return { WORK: WORK, DUE: DUE, KEY: KEY, addDays: addDays, workOf: workOf, extra: extra, workLabel: workLabel, activeTags: activeTags, removeTag: removeTag, snapshot: snapshot, clean: clean, load: load, save: save, upsert: upsert, remove: remove, applyTo: applyTo, merge: merge };
});
