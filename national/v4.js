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
  // ---- 2. change tracking between snapshots (run by the refresh; history capped per record) ----
  var HISTORY_CAP = 8, CHANGED_DAYS = 14, ADD_FIELDS = ['Notices for this Sol# in the extract', 'Revision', 'Amendment', 'Addendum', 'Addenda'];
  function fv(r, k) { var f = r && r.fields; if (!f) return null; if (Array.isArray(f)) { for (var i = 0; i < f.length; i++) if (f[i] && f[i][0] === k) return f[i][1]; return null; } return f[k] === undefined ? null : f[k]; }
  function dueOf(r) { return (r && r.dates && r.dates.due) || null; }
  function valOf(r) { return r && r.amt ? r.amt.v : null; }
  function addCount(r) { for (var i = 0; i < ADD_FIELDS.length; i++) { var v = fv(r, ADD_FIELDS[i]); if (v !== null && v !== '') { var n = parseInt(String(v).replace(/[^\d]/g, ''), 10); if (isFinite(n)) return { k: ADD_FIELDS[i], n: n }; } } return null; }
  var CLOSED = /cancel|closed|inactive|award/i;
  function diff(prev, r, today) {
    var out = [], add = function (k, from, to, extra) { out.push(Object.assign({ t: today, k: k, from: from, to: to }, extra || {})); };
    var d0 = dueOf(prev), d1 = dueOf(r); if (d0 !== d1 && (d0 || d1)) add('due', d0, d1);
    var a0 = addCount(prev), a1 = addCount(r);
    if (a1 && (!a0 || a1.n > a0.n) && a1.k === (a0 ? a0.k : a1.k)) { var n = a1.k === 'Notices for this Sol# in the extract' ? a1.n - 1 : a1.n; if (n > 0 && a0) add('addendum', a0 ? a0.n : null, a1.n, { n: n }); }
    else if (prev.noticeType !== r.noticeType && /amend|modif|addend/i.test(r.noticeType || '')) add('addendum', prev.noticeType || null, r.noticeType, { n: null });
    var s0 = prev.status, s1 = r.status; if (s0 !== s1 && (CLOSED.test(s1 || '') || /cancel/i.test(r.noticeType || ''))) add('status', s0 || null, s1 || null);
    else if (/cancel/i.test(r.noticeType || '') && !/cancel/i.test(prev.noticeType || '')) add('status', s0 || null, 'cancelled');
    var v0 = valOf(prev), v1 = valOf(r); if (v0 !== null && v1 !== null && v0 !== v1) add('value', v0, v1);
    if (prev.title && r.title && prev.title.trim() !== r.title.trim()) add('title', prev.title, r.title);
    return out;
  }
  function trackChanges(records, prev, today, cap) {
    cap = cap || HISTORY_CAP; var pm = {}, n = 0;
    if (prev && prev.records) prev.records.forEach(function (p) { pm[p.id] = p; });
    records.forEach(function (r) {
      var p = pm[r.id]; if (!p) { delete r.history; return; }
      var h = (p.history || []).slice(), ch = diff(p, r, today);
      if (ch.length) { n += ch.length; h = h.concat(ch); }
      if (h.length > cap) h = h.slice(h.length - cap);
      if (h.length) r.history = h; else delete r.history;
    });
    return { changes: n };
  }
  function dn(s) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || ''); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) / 864e5 : null; }
  function recentChanges(r, today, days) { var t = dn(today), w = days === undefined ? CHANGED_DAYS : days; return (r.history || []).filter(function (c) { var x = dn(c.t); return x !== null && t !== null && t - x <= w && t - x >= 0; }); }
  function isChanged(r, today, days) { return recentChanges(r, today, days).length > 0; }
  function changeText(c, fmtDate, fmtMoney) {
    fmtDate = fmtDate || function (x) { return x; }; fmtMoney = fmtMoney || function (x) { return '$' + x; };
    if (c.k === 'due') return c.from && c.to ? 'Due date moved ' + fmtDate(c.from) + ' \u2192 ' + fmtDate(c.to) : c.to ? 'Due date added: ' + fmtDate(c.to) : 'Due date removed (was ' + fmtDate(c.from) + ')';
    if (c.k === 'addendum') return c.n ? 'Addendum ' + c.n + ' posted' : 'Amendment posted (' + c.to + ')';
    if (c.k === 'status') return 'Status changed' + (c.from ? ' from ' + c.from : '') + ' to ' + c.to;
    if (c.k === 'value') return 'Stated value changed ' + fmtMoney(c.from) + ' \u2192 ' + fmtMoney(c.to);
    if (c.k === 'title') return 'Title changed (was \u201c' + String(c.from).slice(0, 80) + '\u201d)';
    return 'Changed';
  }
  return { GROUP_LABEL: GROUP_LABEL, health: health, HISTORY_CAP: HISTORY_CAP, CHANGED_DAYS: CHANGED_DAYS, diff: diff, trackChanges: trackChanges, recentChanges: recentChanges, isChanged: isChanged, changeText: changeText };
});
