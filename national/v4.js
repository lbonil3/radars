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
  // ---- 5. since last visit + calendar export (all on device) ----
  var VISIT_KEY = 'nr.lastVisit', VISIT_SESSION = 'nr.visitBaseline', SINCE_DISMISS = 'nr.sinceDismissed';
  // Previous visit time for this browser session (frozen per session); records this visit.
  function visitBaseline(ls, ss, nowIso) {
    var b = null; try { b = ss && ss.getItem(VISIT_SESSION); } catch (e) { b = null; }
    if (b === null) { var prev = null; try { prev = ls && ls.getItem(VISIT_KEY); } catch (e) { prev = null; } b = prev || ''; try { if (ss) ss.setItem(VISIT_SESSION, b); } catch (e) { /* private mode */ } }
    try { if (ls) ls.setItem(VISIT_KEY, nowIso); } catch (e) { /* private mode */ }
    return b || null;
  }
  function changedSince(r, sinceIso) { if (!sinceIso) return false; var d = sinceIso.slice(0, 10); return (r.history || []).some(function (c) { return c.t >= d; }); }
  function newlyStale(sources, sinceIso) { if (!sinceIso) return []; return (sources || []).filter(function (s) { return (s.health === 'stale' || s.health === 'failing') && s.failingSince && s.failingSince > sinceIso; }); }
  // pre-bid / pre-proposal meetings and site visits named in source text (explicit dates only)
  var MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function findDate(t) { // earliest explicit date in the text
    var best = null, pick = function (m, iso) { if (m && (!best || m.index < best.i)) best = { i: m.index, v: iso(m) }; };
    pick(/(\d{4})-(\d{2})-(\d{2})/.exec(t), function (m) { return m[1] + '-' + m[2] + '-' + m[3]; });
    pick(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/.exec(t), function (m) { return m[3] + '-' + pad(+m[1]) + '-' + pad(+m[2]); });
    pick(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4})/i.exec(t), function (m) { return m[3] + '-' + pad(MONTHS[m[1].toLowerCase()]) + '-' + pad(+m[2]); });
    return best ? best.v : null;
  }
  var MEET_RE = /(pre-?\s?(bid|proposal|submission|submittal)\s+(meeting|conference)|site\s+(visit|walk|tour)|mandatory\s+(meeting|walk-?through))/i;
  function meetings(r) {
    var out = [], seen = {}, add = function (label, txt) { var d = findDate(txt); if (d && !seen[d + label]) { seen[d + label] = 1; out.push({ date: d, label: label }); } };
    var f = r.fields || {}; (Array.isArray(f) ? f : Object.keys(f).map(function (k) { return [k, f[k]]; })).forEach(function (kv) { var m = MEET_RE.exec(kv[0]); if (m) add(/site/i.test(m[0]) ? 'Site visit' : 'Pre-bid meeting', String(kv[1])); });
    var d = String(r.desc || ''), re = new RegExp(MEET_RE.source, 'ig'), m;
    while ((m = re.exec(d))) add(/site/i.test(m[0]) ? 'Site visit' : 'Pre-bid meeting', d.slice(m.index, m.index + 120));
    return out;
  }
  function icsEsc(s) { return String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n'); }
  function u8len(s) { var n = 0; for (var i = 0; i < s.length; i++) { var c = s.charCodeAt(i); n += c < 0x80 ? 1 : c < 0x800 ? 2 : (c >= 0xd800 && c < 0xdc00) ? 4 : (c >= 0xdc00 && c < 0xe000) ? 0 : 3; } return n; }
  function fold(line) { var out = [], cur = ''; Array.from(line).forEach(function (ch) { if (u8len(cur + ch) > 74) { out.push(cur); cur = ' ' + ch; } else cur += ch; }); out.push(cur); return out.join('\r\n'); }
  function nextDay(d) { var x = new Date(Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10) + 1)); return x.getUTCFullYear() + pad(x.getUTCMonth() + 1) + pad(x.getUTCDate()); }
  // events [{ uid, date, title, desc, url, alarms }] -> text/calendar with all-day events and reminders
  function ics(events, nowIso, calName) {
    var stamp = String(nowIso || new Date().toISOString()).replace(/[-:]/g, '').replace(/\.\d+/, '').slice(0, 15) + 'Z';
    var L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//National Radar//Pursuits//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:' + icsEsc(calName || 'National Radar')];
    (events || []).filter(function (e) { return e && /^\d{4}-\d{2}-\d{2}$/.test(e.date || ''); }).forEach(function (e) {
      L.push('BEGIN:VEVENT', 'UID:' + icsEsc(e.uid) + '@national-radar', 'DTSTAMP:' + stamp, 'DTSTART;VALUE=DATE:' + e.date.replace(/-/g, ''), 'DTEND;VALUE=DATE:' + nextDay(e.date), 'SUMMARY:' + icsEsc(e.title), 'TRANSP:TRANSPARENT');
      if (e.desc) L.push('DESCRIPTION:' + icsEsc(e.desc)); if (e.url) L.push('URL:' + icsEsc(e.url));
      (e.alarms || []).forEach(function (a) { L.push('BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + icsEsc(e.title), 'TRIGGER:-' + a, 'END:VALARM'); });
      L.push('END:VEVENT');
    });
    L.push('END:VCALENDAR');
    return L.map(fold).join('\r\n') + '\r\n';
  }
  // pursuit -> due date (capture file first, else the source's) with 1-week and 1-day reminders, plus meetings
  function eventsFor(r, cap, title) {
    var ev = [], id = (r && r.id) || title, due = (cap && cap.due) || (r && r.dates && r.dates.due) || null, t = title || (r && r.title) || id;
    var desc = [r && r.agency, r && r.url ? 'Source: ' + r.url : null, cap && cap.next ? 'Next action: ' + cap.next : null, cap && cap.decision && cap.decision !== 'Undecided' ? 'Decision: ' + cap.decision : null].filter(Boolean).join('\n');
    if (due) ev.push({ uid: 'due-' + id, date: due, title: 'Due: ' + t, desc: desc + (cap && cap.due ? '\n(due date from your capture file)' : '\n(due date stated by the source)'), url: r && r.url, alarms: ['P7D', 'P1D'] });
    if (r) meetings(r).forEach(function (m) { ev.push({ uid: m.label.replace(/\W/g, '').toLowerCase() + '-' + m.date + '-' + id, date: m.date, title: m.label + ': ' + t, desc: desc, url: r.url, alarms: ['P1D'] }); });
    return ev;
  }
  return { VISIT_KEY: VISIT_KEY, VISIT_SESSION: VISIT_SESSION, SINCE_DISMISS: SINCE_DISMISS, visitBaseline: visitBaseline, changedSince: changedSince, newlyStale: newlyStale, findDate: findDate, meetings: meetings, ics: ics, eventsFor: eventsFor,
    GROUP_LABEL: GROUP_LABEL, health: health, HISTORY_CAP: HISTORY_CAP, CHANGED_DAYS: CHANGED_DAYS, diff: diff, trackChanges: trackChanges, recentChanges: recentChanges, isChanged: isChanged, changeText: changeText };
});
