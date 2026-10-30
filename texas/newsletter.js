/* Texas Opportunity: weekly Intel newsletter. Pure and deterministic: the same items, week and generatedAt always give the same issue.
   Only collected items are used; nothing is written that is not in an item (title, source, date, matched phrases, hint, detected dates). */
(function (root, factory) { if (typeof module === 'object' && module.exports) module.exports = factory(require('./intel.js')); else root.TXNewsletter = factory(root.TXIntel); })(this, function (I) {
  'use strict';
  var KEEP_WEEKS = 12, HOU_MAX = 15, SEC_MAX = 6;
  var ORDER = ['budget', 'bond', 'grant', 'flood', 'water', 'road', 'policy', 'agenda'];
  var LABEL = { budget: 'Budget / CIP', bond: 'Bond program', grant: 'Grant / funding', flood: 'Flood / drainage', water: 'Water / wastewater', road: 'Roadway / TxDOT', policy: 'New program / policy', agenda: 'Council / commissioners action' };
  var MONTHS = 'January February March April May June July August September October November December'.split(' ');
  // ISO 8601 week of a UTC date
  function isoWeek(iso) { var d = new Date(iso); d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())); var day = d.getUTCDay() || 7; d.setUTCDate(d.getUTCDate() + 4 - day); var y = d.getUTCFullYear(), w = Math.ceil(((d - Date.UTC(y, 0, 1)) / 864e5 + 1) / 7); return y + '-W' + (w < 10 ? '0' : '') + w; }
  function weekStart(key) { var m = /^(\d{4})-W(\d\d)$/.exec(key); if (!m) return null; var y = +m[1], jan4 = new Date(Date.UTC(y, 0, 4)), day = jan4.getUTCDay() || 7; return new Date(Date.UTC(y, 0, 4 - day + 1 + (+m[2] - 1) * 7)).toISOString(); }
  function weekEnd(key) { return new Date(Date.parse(weekStart(key)) + 7 * 864e5 - 1).toISOString(); }
  function addWeeks(key, n) { return isoWeek(new Date(Date.parse(weekStart(key)) + n * 7 * 864e5 + 3 * 864e5).toISOString()); }
  function fmt(iso) { var d = new Date(iso); return MONTHS[d.getUTCMonth()].slice(0, 3) + ' ' + d.getUTCDate() + ', ' + d.getUTCFullYear(); }
  // which week an item belongs to: its own date, or the day it was first collected; future dates (meetings) fall back to first seen
  function itemWeek(it) { var d = it.date && it.date <= (it.firstSeen || it.date) ? it.date : (it.firstSeen || it.date); return d ? isoWeek(d) : null; }
  function primary(it) { for (var i = 0; i < ORDER.length; i++) if (it.topics.indexOf(ORDER[i]) >= 0) return ORDER[i]; return 'agenda'; }
  function rank(a, b) { return (b.score - a.score) || ((b.date || '') > (a.date || '') ? 1 : (b.date || '') < (a.date || '') ? -1 : a.id < b.id ? -1 : 1); }
  // dates mentioned in an item that fall on or after the issue's week start
  var DATE_RE = /\b(?:(\d{1,2})\/(\d{1,2})\/(\d{4})|(January|February|March|April|May|June|July|August|September|October|November|December) (\d{1,2}),? (\d{4})|(20\d\d)-(\d\d)-(\d\d))\b/g;
  var CUE = /(closes?|deadline|due|election|hearing|meeting|workshop|end date|expires?|through|until|by|held on|application)/i;
  function detectDates(it, fromIso) {
    var s = it.title + ' · ' + (it.desc || ''), out = [], m; DATE_RE.lastIndex = 0;
    while ((m = DATE_RE.exec(s))) {
      var d = m[1] ? Date.UTC(+m[3], +m[1] - 1, +m[2]) : m[4] ? Date.UTC(+m[6], MONTHS.indexOf(m[4]), +m[5]) : Date.UTC(+m[7], +m[8] - 1, +m[9]);
      if (!isFinite(d) || d < Date.parse(fromIso)) continue;
      var before = s.slice(Math.max(0, m.index - 45), m.index), cue = CUE.exec(before.split(/[.;·]/).pop() || '');
      if (!cue) continue;
      var ctx = (before.split(/[.;·]/).pop() || '').replace(/^\W+/, '').trim();
      out.push({ date: new Date(d).toISOString().slice(0, 10), what: (ctx ? ctx + ' ' : '') + m[0], id: it.id, title: it.title, link: it.link, source: it.source });
    }
    return out;
  }
  function entry(it) { return { id: it.id, title: it.title, link: it.link, source: it.source, date: it.date ? it.date.slice(0, 10) : null, place: it.place || it.region, region: it.region, topic: primary(it), why: it.why && it.why.length ? 'Mentions ' + it.why.slice(0, 4).map(function (w) { return '“' + w + '”'; }).join(', ') + '.' : '', hint: it.hint || '', linkNote: it.linkNote || undefined, score: it.score }; }
  function group(list, max) { var g = {}; list.forEach(function (it) { (g[primary(it)] = g[primary(it)] || []).push(it); }); return ORDER.filter(function (t) { return g[t]; }).map(function (t) { var a = g[t].sort(rank); return { topic: t, label: LABEL[t], total: a.length, items: a.slice(0, max).map(entry) }; }); }
  function build(items, week, opts) {
    opts = opts || {}; var start = weekStart(week), end = weekEnd(week);
    var inWeek = items.filter(function (it) { return itemWeek(it) === week; });
    var hou = inWeek.filter(function (it) { return it.region === I.HOU; }).sort(rank), rest = inWeek.filter(function (it) { return it.region !== I.HOU; }).sort(rank);
    var houTop = hou.slice(0, HOU_MAX), houIds = {}; houTop.forEach(function (it) { houIds[it.id] = 1; });
    var seen = {}, dl = [];
    inWeek.slice().sort(rank).forEach(function (it) { detectDates(it, start).forEach(function (d) { var k = d.id + d.date; if (!seen[k]) { seen[k] = 1; dl.push(d); } }); });
    dl.sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : a.id < b.id ? -1 : 1; });
    return { week: week, start: start.slice(0, 10), end: end.slice(0, 10), title: 'Texas Intel weekly, ' + week + ' (' + fmt(start) + ' to ' + fmt(end) + ')', generatedAt: opts.generatedAt || null, final: !!opts.final, backfilled: !!opts.backfilled,
      counts: { items: inWeek.length, houston: hou.length, other: rest.length }, houston: group(houTop, HOU_MAX), texas: group(rest, SEC_MAX), deadlines: dl.slice(0, 20),
      note: 'News and planning signals collected automatically from public sources and tagged by keyword. Not solicitations and not verified; check each original source.' };
  }
  function esc(s) { return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function status(n) { return n.final ? (n.backfilled ? 'Final (built from items collected later)' : 'Final') : 'In progress (updates daily until the week ends)'; }
  function toText(n) {
    var L = [n.title, status(n) + ' · ' + n.counts.items + ' items (' + n.counts.houston + ' Houston region)', '', n.note, ''];
    function sec(name, groups) { if (!groups.length) return; L.push('== ' + name + ' ==', ''); groups.forEach(function (g) { L.push('-- ' + g.label + (g.total > g.items.length ? ' (top ' + g.items.length + ' of ' + g.total + ')' : '') + ' --'); g.items.forEach(function (e) { L.push('* ' + e.title, '  ' + [e.source, e.place, e.date].filter(Boolean).join(' · ')); if (e.why) L.push('  Why this matters: ' + e.why); if (e.hint) L.push('  Positioning: ' + e.hint); L.push('  ' + e.link + (e.linkNote ? ' (' + e.linkNote + ')' : '')); }); L.push(''); }); }
    sec('Houston region', n.houston); sec('Rest of Texas and federal', n.texas);
    if (n.deadlines.length) { L.push('== Deadlines & dates to watch ==', ''); n.deadlines.forEach(function (d) { L.push('* ' + d.date + ': ' + d.what + ' (' + d.source + ')', '  ' + d.link); }); L.push(''); }
    if (!n.counts.items) L.push('No items were collected for this week.', '');
    return L.join('\n');
  }
  function toHtml(n, opts) { // email-ready: one self-contained document with inline styles and no images or scripts
    opts = opts || {}; var a = 'color:#0f766e', h = [];
    h.push('<div style="font-family:Arial,Helvetica,sans-serif;max-width:680px;margin:0 auto;color:#111827;font-size:14px;line-height:1.45">');
    h.push('<h1 style="font-size:20px;margin:0 0 4px">' + esc(n.title) + '</h1><p style="margin:0 0 10px;color:#4b5563;font-size:13px">' + esc(status(n)) + ' · ' + n.counts.items + ' items (' + n.counts.houston + ' Houston region)</p>');
    h.push('<p style="margin:0 0 14px;padding:8px 10px;background:#fef3c7;border:1px solid #f59e0b;border-radius:6px;font-size:12.5px">' + esc(n.note) + '</p>');
    function sec(name, groups) { if (!groups.length) return; h.push('<h2 style="font-size:17px;margin:18px 0 6px;border-bottom:2px solid #0f766e;padding-bottom:3px">' + esc(name) + '</h2>');
      groups.forEach(function (g) { h.push('<h3 style="font-size:14.5px;margin:12px 0 4px;color:#0f766e">' + esc(g.label) + (g.total > g.items.length ? ' <span style="color:#6b7280;font-weight:normal">(top ' + g.items.length + ' of ' + g.total + ')</span>' : '') + '</h3><ul style="margin:0;padding-left:18px">');
        g.items.forEach(function (e) { h.push('<li style="margin:0 0 8px"><a href="' + esc(e.link) + '" style="' + a + ';font-weight:bold">' + esc(e.title) + '</a><br><span style="color:#6b7280;font-size:12.5px">' + esc([e.source, e.place, e.date].filter(Boolean).join(' · ')) + '</span>' + (e.why ? '<br><span style="font-size:13px"><b>Why this matters:</b> ' + esc(e.why) + '</span>' : '') + (e.hint ? '<br><span style="font-size:13px"><b>Positioning:</b> ' + esc(e.hint) + '</span>' : '') + (e.linkNote ? '<br><span style="font-size:12px;color:#92400e">' + esc(e.linkNote) + '</span>' : '') + '</li>'); });
        h.push('</ul>'); }); }
    sec('Houston region', n.houston); sec('Rest of Texas and federal', n.texas);
    if (n.deadlines.length) { h.push('<h2 style="font-size:17px;margin:18px 0 6px;border-bottom:2px solid #b45309;padding-bottom:3px">Deadlines &amp; dates to watch</h2><ul style="margin:0;padding-left:18px">'); n.deadlines.forEach(function (d) { h.push('<li style="margin:0 0 6px"><b>' + esc(d.date) + '</b>: ' + esc(d.what) + ' · <a href="' + esc(d.link) + '" style="' + a + '">' + esc(d.source) + '</a></li>'); }); h.push('</ul>'); }
    if (!n.counts.items) h.push('<p>No items were collected for this week.</p>');
    h.push('</div>');
    var body = h.join('\n');
    return opts.fragment ? body : '<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + esc(n.title) + '</title></head><body style="margin:16px;background:#ffffff">\n' + body + '\n</body></html>\n';
  }
  // which weeks to (re)build on a run: the current week (draft) and the previous KEEP_WEEKS-1 weeks; a week is final once it has ended
  function plan(nowIso) { var cur = isoWeek(nowIso), out = []; for (var i = 0; i < KEEP_WEEKS; i++) { var w = addWeeks(cur, -i); out.push({ week: w, final: Date.parse(weekEnd(w)) < Date.parse(nowIso) }); } return out; }
  return { KEEP_WEEKS: KEEP_WEEKS, ORDER: ORDER, LABEL: LABEL, isoWeek: isoWeek, weekStart: weekStart, weekEnd: weekEnd, addWeeks: addWeeks, itemWeek: itemWeek, primary: primary, detectDates: detectDates, build: build, toText: toText, toHtml: toHtml, plan: plan, status: status };
});
