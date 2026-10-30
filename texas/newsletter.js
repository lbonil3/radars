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
      var ctx = (before.split(/[.;·]/).pop() || ''); if (m.index > 45 && before.length === 45) ctx = ctx.replace(/^\S*\s/, ''); ctx = ctx.replace(/^\W+/, '').trim();
      out.push({ date: new Date(d).toISOString().slice(0, 10), what: (ctx ? ctx + ' ' : '') + m[0], id: it.id, title: it.title, link: it.link, source: it.source });
    }
    return out;
  }
  function entry(it) { return { id: it.id, title: it.title, link: it.link, source: it.source, date: it.date ? it.date.slice(0, 10) : null, place: it.place || it.region, region: it.region, topic: primary(it), why: it.why && it.why.length ? 'Mentions ' + it.why.slice(0, 4).map(function (w) { return '“' + w + '”'; }).join(', ') + '.' : '', hint: it.hint || '', desc: it.desc || undefined, linkNote: it.linkNote || undefined, score: it.score }; }
  function group(list, max) { var g = {}; list.forEach(function (it) { (g[primary(it)] = g[primary(it)] || []).push(it); }); return ORDER.filter(function (t) { return g[t]; }).map(function (t) { var a = g[t].sort(rank); return { topic: t, label: LABEL[t], total: a.length, items: a.slice(0, max).map(entry) }; }); }
  // "By the numbers": counted from the week's collected items only
  function stats(inWeek, week) {
    var mix = {}; ORDER.forEach(function (t) { mix[t] = 0; }); inWeek.forEach(function (it) { mix[primary(it)]++; });
    return { items: inWeek.length, newThisWeek: inWeek.filter(function (it) { return it.firstSeen && isoWeek(it.firstSeen) === week; }).length, houston: inWeek.filter(function (it) { return it.region === I.HOU; }).length,
      grant: inWeek.filter(function (it) { return it.topics.indexOf('grant') >= 0; }).length, flood: inWeek.filter(function (it) { return it.topics.indexOf('flood') >= 0; }).length, mix: mix };
  }
  function issueNo(week) { return +week.slice(6); }
  function build(items, week, opts) {
    opts = opts || {}; var start = weekStart(week), end = weekEnd(week);
    var inWeek = items.filter(function (it) { return itemWeek(it) === week; });
    var hou = inWeek.filter(function (it) { return it.region === I.HOU; }).sort(rank), rest = inWeek.filter(function (it) { return it.region !== I.HOU; }).sort(rank);
    var houTop = hou.slice(0, HOU_MAX), houIds = {}; houTop.forEach(function (it) { houIds[it.id] = 1; });
    var seen = {}, dl = [];
    inWeek.slice().sort(rank).forEach(function (it) { detectDates(it, start).forEach(function (d) { var k = d.id + d.date; if (!seen[k]) { seen[k] = 1; dl.push(d); } }); });
    dl.sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : a.id < b.id ? -1 : 1; });
    return { week: week, start: start.slice(0, 10), end: end.slice(0, 10), title: 'Texas Intel weekly, ' + week + ' (' + fmt(start) + ' to ' + fmt(end) + ')', generatedAt: opts.generatedAt || null, final: !!opts.final, backfilled: !!opts.backfilled,
      counts: { items: inWeek.length, houston: hou.length, other: rest.length }, stats: stats(inWeek, week), houston: group(houTop, HOU_MAX), texas: group(rest, SEC_MAX), deadlines: dl.slice(0, 20),
      note: 'News and planning signals collected automatically from public sources and tagged by keyword. Not solicitations and not verified; check each original source.' };
  }
  function esc(s) { return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function status(n) { return n.final ? (n.backfilled ? 'Final (built from items collected later)' : 'Final') : 'In progress (updates daily until the week ends)'; }
  function toText(n) {
    var st = statsOf(n), top = topStory(n);
    var L = ['TEXAS INTEL WEEKLY · Issue No. ' + issueNo(n.week) + ' · ' + n.week, fmt(n.start + 'T12:00:00Z') + ' to ' + fmt(n.end + 'T12:00:00Z') + ' · ' + status(n), '', n.note, ''];
    if (n.counts.items) L.push('BY THE NUMBERS: ' + st.items + ' items · ' + (st.newThisWeek === null ? '–' : st.newThisWeek) + ' new this week · ' + st.houston + ' Houston region · ' + st.grant + ' grants/funding · ' + st.flood + ' flood/drainage', '');
    if (top) L.push('TOP STORY: ' + top.title, '  ' + [top.source, top.place, top.date].filter(Boolean).join(' · '), top.why ? '  Why this matters: ' + top.why : '', '  ' + top.link, '');
    function sec(name, groups) { if (!groups.length) return; L.push('== ' + name + ' ==', ''); groups.forEach(function (g) { L.push('-- ' + g.label + (g.total > g.items.length ? ' (top ' + g.items.length + ' of ' + g.total + ')' : '') + ' --'); g.items.forEach(function (e) { L.push('* ' + e.title, '  ' + [e.source, e.place, e.date].filter(Boolean).join(' · ')); if (e.why) L.push('  Why this matters: ' + e.why); if (e.hint) L.push('  Positioning: ' + e.hint); L.push('  ' + e.link + (e.linkNote ? ' (' + e.linkNote + ')' : '')); }); L.push(''); }); }
    sec('Houston region', n.houston); var tp = tips(n); if (tp.length) { L.push('== Positioning tips ==', ''); tp.forEach(function (t) { L.push('> ' + t.hint); }); L.push(''); } sec('Rest of Texas and federal', n.texas);
    if (n.deadlines.length) { L.push('== Deadlines & dates to watch ==', ''); n.deadlines.forEach(function (d) { L.push('* ' + d.date + ': ' + cleanWhat(d.what) + ' (' + d.source + ')', '  ' + d.link); }); L.push(''); }
    if (!n.counts.items) L.push('No items were collected for this week.', '');
    return L.join('\n');
  }
  // ---------- editorial HTML. Table layout with inline styles only, so the same markup works on the page and in Gmail / Outlook.
  // opts.theme: 'light' (email, print, download) or 'dark' (the page). opts.fragment: no <html> wrapper. opts.icons: inline SVG topic icons (page only).
  var ACC = { budget: '#6d28d9', bond: '#a16207', grant: '#047857', flood: '#0369a1', water: '#0e7490', road: '#c2410c', policy: '#be185d', agenda: '#475569' };
  var ACC_DARK = { budget: '#c4b5fd', bond: '#fcd34d', grant: '#6ee7b7', flood: '#7dd3fc', water: '#67e8f9', road: '#fdba74', policy: '#f9a8d4', agenda: '#cbd5e1' };
  var ICON = { // 16px stroke glyphs
    budget: '<rect x="3" y="3" width="10" height="10" rx="1"/><path d="M5 10V8M8 10V6M11 10V7"/>', bond: '<path d="M4 3h8v10H4z"/><path d="M6 6h4M6 9h4"/>',
    grant: '<circle cx="8" cy="8" r="5"/><path d="M8 5v6M6.5 6.5h2.5a1 1 0 010 2H7a1 1 0 000 2h2.5"/>', flood: '<path d="M2 10c2-2 4 2 6 0s4 2 6 0"/><path d="M2 13c2-2 4 2 6 0s4 2 6 0"/><path d="M8 2l2.5 4a2.5 2.5 0 11-5 0z"/>',
    water: '<path d="M8 2l3.5 5.5a3.5 3.5 0 11-7 0z"/>', road: '<path d="M5 2L3 14M11 2l2 12M8 3v2M8 7v2M8 11v2"/>', policy: '<path d="M4 2h6l3 3v9H4z"/><path d="M6 8h5M6 11h5"/>', agenda: '<path d="M3 4h10v9H3z"/><path d="M3 7h10M6 2v3M10 2v3"/>' };
  function palette(theme) {
    return theme === 'dark'
      ? { bg: '#0b1714', paper: '#0f1f1b', card: '#132824', ink: '#e8f2ef', dim: '#a9bfb9', line: '#244640', head: '#ffffff', acc: ACC_DARK, brand: '#5eead4', brandInk: '#04201b', warnBg: '#2a2208', warnBd: '#a16207', warnInk: '#fde68a', quote: '#1a332d', mast: 'linear-gradient(135deg,#0d3b33,#0b1714)' }
      : { bg: '#f3f6f5', paper: '#ffffff', card: '#f8faf9', ink: '#111827', dim: '#4b5563', line: '#d9e2df', head: '#0b2722', acc: ACC, brand: '#0f766e', brandInk: '#ffffff', warnBg: '#fffbeb', warnBd: '#b45309', warnInk: '#78350f', quote: '#ecfdf5', mast: 'linear-gradient(135deg,#0f766e,#134e4a)' };
  }
  var FONT = "Georgia,'Times New Roman',serif", SANS = "-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
  function icon(t, color, on) { return on ? '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="' + color + '" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:-3px;margin-right:6px">' + ICON[t] + '</svg>' : ''; }
  function badge(t, P) { return '<span style="display:inline-block;padding:2px 9px;border-radius:999px;background:' + ACC[t] + ';color:#ffffff;font:bold 11px ' + SANS + ';letter-spacing:.03em;text-transform:uppercase">' + esc(LABEL[t]) + '</span>'; }
  function meta(e) { return esc([e.source, e.place, e.date].filter(Boolean).join(' · ')); }
  function shortMonth(iso) { return MONTHS[+iso.slice(5, 7) - 1].slice(0, 3).toUpperCase(); }
  function cleanWhat(w) { return String(w || '').replace(/^[a-z]\S*\s+/, ''); } // older issues: drop a leading cut-off word
  function statsOf(n) { if (n.stats) return n.stats; var mix = {}; ORDER.forEach(function (t) { mix[t] = 0; }); var all = [].concat.apply([], n.houston.concat(n.texas).map(function (g) { mix[g.topic] = g.total; return g.items; }));
    return { items: n.counts.items, newThisWeek: null, houston: n.counts.houston, grant: mix.grant, flood: mix.flood, mix: mix, approx: all.length >= 0 }; }
  function topStory(n) { var c = n.houston.concat(n.texas).map(function (g) { return g.items[0]; }).filter(Boolean); c.sort(function (a, b) { return (b.score - a.score) || (a.region === I.HOU ? -1 : 1) || (a.id < b.id ? -1 : 1); }); var h = n.houston.length ? n.houston.map(function (g) { return g.items[0]; }).sort(function (a, b) { return b.score - a.score || (a.id < b.id ? -1 : 1); })[0] : null; return h || c[0] || null; }
  function tips(n, skip) { var seen = {}, out = []; n.houston.concat(n.texas).forEach(function (g) { g.items.forEach(function (e) { if (e.hint && !seen[e.hint] && out.length < 3 && e !== skip) { seen[e.hint] = 1; out.push({ hint: e.hint, title: e.title, link: e.link }); } }); }); return out; }
  function toHtml(n, opts) {
    opts = opts || {}; var P = palette(opts.theme), ic = !!opts.icons, h = [], st = statsOf(n), top = topStory(n);
    var td = function (style, inner, attrs) { return '<td' + (attrs || '') + ' style="' + style + '">' + inner + '</td>'; };
    var table = function (style, inner) { return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;' + (style || '') + '">' + inner + '</table>'; };
    var A = function (href, txt, style) { return '<a href="' + esc(href) + '" style="color:' + P.brand + ';text-decoration:none;' + (style || '') + '">' + txt + '</a>'; };
    // masthead
    h.push(table('background:' + P.brand + ';background-image:' + P.mast + ';border-radius:14px 14px 0 0', '<tr>' + td('padding:22px 22px 18px;color:#ffffff',
      '<div style="font:bold 11px ' + SANS + ';letter-spacing:.18em;text-transform:uppercase;color:#ccfbf1">Texas Opportunity · Weekly</div>' +
      '<div style="font:bold 32px/1.1 ' + FONT + ';color:#ffffff;margin:6px 0 6px">Texas Intel Weekly</div>' +
      '<div style="font:14px ' + SANS + ';color:#e6fffa">Issue No. ' + issueNo(n.week) + ' · ' + esc(n.week) + ' · ' + esc(fmt(n.start + 'T12:00:00Z')) + ' to ' + esc(fmt(n.end + 'T12:00:00Z')) + '</div>' +
      '<div style="font:12px ' + SANS + ';color:#ccfbf1;margin-top:4px">' + esc(status(n)) + '</div>') + '</tr>'));
    var body = [];
    body.push('<div style="margin:0 0 16px;padding:10px 12px;background:' + P.warnBg + ';border-left:4px solid ' + P.warnBd + ';border-radius:6px;color:' + P.warnInk + ';font:12.5px/1.45 ' + SANS + '">' + esc(n.note) + '</div>');
    if (!n.counts.items) body.push('<p style="font:15px ' + SANS + ';color:' + P.ink + '">No items were collected for this week.</p>');
    // by the numbers
    var nums = [['Items', st.items], ['New this week', st.newThisWeek === null ? '–' : st.newThisWeek], ['Houston region', st.houston], ['Grants / funding', st.grant], ['Flood / drainage', st.flood]];
    if (n.counts.items) {
      body.push('<div style="font:bold 11px ' + SANS + ';letter-spacing:.14em;text-transform:uppercase;color:' + P.dim + ';margin:0 0 6px">By the numbers</div>');
      body.push(table('margin:0 0 16px', '<tr>' + nums.map(function (x, i) { return td('width:20%;padding:10px 6px;text-align:center;background:' + P.card + ';border:1px solid ' + P.line + (i ? ';border-left:0' : ''), '<div style="font:bold 26px/1 ' + FONT + ';color:' + P.brand + '">' + esc(x[1]) + '</div><div style="font:11px/1.3 ' + SANS + ';color:' + P.dim + ';margin-top:4px">' + esc(x[0]) + '</div>'); }).join('') + '</tr>'));
      // topic mix bar
      var tot = ORDER.reduce(function (a, t) { return a + (st.mix[t] || 0); }, 0);
      if (tot) {
        body.push('<div style="font:bold 11px ' + SANS + ';letter-spacing:.14em;text-transform:uppercase;color:' + P.dim + ';margin:0 0 6px">Topic mix</div>');
        body.push(table('margin:0 0 6px;border-radius:6px;overflow:hidden', '<tr>' + ORDER.filter(function (t) { return st.mix[t]; }).map(function (t) { return td('height:12px;background:' + ACC[t] + ';font-size:1px;line-height:1px', '&nbsp;', ' width="' + Math.max(2, Math.round(st.mix[t] * 100 / tot)) + '%"'); }).join('') + '</tr>'));
        body.push('<div style="font:12px/1.7 ' + SANS + ';color:' + P.dim + ';margin:0 0 18px">' + ORDER.filter(function (t) { return st.mix[t]; }).map(function (t) { return '<span style="white-space:nowrap;margin-right:12px"><span style="display:inline-block;width:9px;height:9px;border-radius:2px;background:' + ACC[t] + ';margin-right:5px"></span>' + esc(LABEL[t]) + ' ' + st.mix[t] + '</span>'; }).join('') + '</div>');
      }
    }
    // top story
    if (top) {
      body.push(table('margin:0 0 18px;background:' + P.card + ';border:1px solid ' + P.line + ';border-top:4px solid ' + ACC[top.topic] + ';border-radius:10px', '<tr>' + td('padding:16px 18px',
        '<div style="font:bold 11px ' + SANS + ';letter-spacing:.14em;text-transform:uppercase;color:' + P.dim + ';margin-bottom:8px">Top story · ' + esc(top.region === I.HOU ? 'Houston region' : top.place || top.region) + '</div>' + badge(top.topic, P) +
        '<div style="font:bold 21px/1.25 ' + FONT + ';margin:10px 0 6px">' + A(top.link, esc(top.title), 'color:' + P.head) + '</div>' +
        '<div style="font:12.5px ' + SANS + ';color:' + P.dim + '">' + meta(top) + '</div>' +
        (top.why ? '<div style="margin:12px 0 0;padding:10px 14px;background:' + P.quote + ';border-left:4px solid ' + P.brand + ';font:italic 15px/1.45 ' + FONT + ';color:' + P.ink + '">' + esc(top.why) + '</div>' : '') +
        (top.linkNote ? '<div style="font:12px ' + SANS + ';color:' + P.warnInk + ';margin-top:8px">' + esc(top.linkNote) + '</div>' : '') +
        '<div style="margin-top:12px">' + A(top.link, 'Read the original &#8594;', 'font:bold 13px ' + SANS) + '</div>') + '</tr>'));
    }
    function item(e) {
      return table('margin:0 0 10px;background:' + P.card + ';border:1px solid ' + P.line + ';border-left:4px solid ' + ACC[e.topic] + ';border-radius:8px', '<tr>' + td('padding:11px 14px',
        '<div style="font:bold 15.5px/1.3 ' + FONT + '">' + A(e.link, esc(e.title), 'color:' + P.head) + '</div>' +
        '<div style="font:12px ' + SANS + ';color:' + P.dim + ';margin-top:3px">' + meta(e) + '</div>' +
        (e.why ? '<div style="margin-top:7px;font:italic 13.5px/1.4 ' + FONT + ';color:' + P.ink + '"><span style="font:bold 10.5px ' + SANS + ';font-style:normal;letter-spacing:.08em;text-transform:uppercase;color:' + P.brand + '">Why it matters&nbsp;</span>' + esc(e.why) + '</div>' : '') +
        (e.linkNote ? '<div style="font:12px ' + SANS + ';color:' + P.warnInk + ';margin-top:5px">' + esc(e.linkNote) + '</div>' : '')) + '</tr>');
    }
    function section(name, kicker, groups) {
      if (!groups.length) return;
      body.push('<div style="margin:22px 0 4px;font:bold 11px ' + SANS + ';letter-spacing:.16em;text-transform:uppercase;color:' + P.brand + '">' + esc(kicker) + '</div><div style="font:bold 24px/1.15 ' + FONT + ';color:' + P.head + ';margin:0 0 10px;padding-bottom:8px;border-bottom:2px solid ' + P.line + '">' + esc(name) + '</div>');
      groups.forEach(function (g) {
        body.push('<div style="margin:14px 0 8px;font:bold 14px ' + SANS + ';color:' + P.acc[g.topic] + '">' + icon(g.topic, P.acc[g.topic], ic) + esc(g.label) + (g.total > g.items.length ? '<span style="font-weight:normal;color:' + P.dim + '"> · top ' + g.items.length + ' of ' + g.total + '</span>' : '') + '</div>');
        g.items.forEach(function (e) { if (e !== top) body.push(item(e)); });
      });
    }
    section('Houston region spotlight', 'Spotlight', n.houston);
    // positioning tips
    var tp = tips(n);
    if (tp.length) body.push(table('margin:22px 0 4px;background:' + P.quote + ';border:1px solid ' + P.line + ';border-radius:10px', '<tr>' + td('padding:14px 18px', '<div style="font:bold 11px ' + SANS + ';letter-spacing:.14em;text-transform:uppercase;color:' + P.brand + ';margin-bottom:6px">Positioning tips</div>' +
      tp.map(function (t) { return '<div style="font:13.5px/1.45 ' + SANS + ';color:' + P.ink + ';margin:6px 0">&#9656; ' + esc(t.hint) + ' <span style="color:' + P.dim + '">(' + A(t.link, esc(t.title.length > 70 ? t.title.slice(0, 69) + '…' : t.title), 'color:' + P.dim + ';text-decoration:underline') + ')</span></div>'; }).join('')) + '</tr>'));
    section('Across Texas and federal', 'Statewide', n.texas);
    // deadlines timeline
    if (n.deadlines.length) {
      body.push('<div style="margin:24px 0 4px;font:bold 11px ' + SANS + ';letter-spacing:.16em;text-transform:uppercase;color:' + P.warnInk + '">Calendar</div><div style="font:bold 24px/1.15 ' + FONT + ';color:' + P.head + ';margin:0 0 10px;padding-bottom:8px;border-bottom:2px solid ' + P.line + '">Deadlines &amp; dates to watch</div>');
      body.push(table('', n.deadlines.map(function (d) { return '<tr>' + td('width:58px;padding:0 10px 10px 0;vertical-align:top', table('border:1px solid ' + P.line + ';border-radius:8px;background:' + P.card, '<tr>' + td('background:' + P.warnBd + ';color:#ffffff;text-align:center;font:bold 10px ' + SANS + ';letter-spacing:.1em;padding:3px 0;border-radius:7px 7px 0 0', shortMonth(d.date)) + '</tr><tr>' + td('text-align:center;font:bold 22px/1 ' + FONT + ';color:' + P.head + ';padding:5px 0 3px', String(+d.date.slice(8, 10))) + '</tr><tr>' + td('text-align:center;font:10px ' + SANS + ';color:' + P.dim + ';padding:0 0 4px', d.date.slice(0, 4)) + '</tr>')) +
        td('padding:2px 0 12px;vertical-align:top;border-bottom:1px dashed ' + P.line, '<div style="font:13.5px/1.4 ' + SANS + ';color:' + P.ink + '">' + esc(cleanWhat(d.what)) + '</div><div style="font:12.5px ' + SANS + ';margin-top:3px">' + A(d.link, esc(d.title.length > 90 ? d.title.slice(0, 89) + '…' : d.title)) + ' <span style="color:' + P.dim + '">· ' + esc(d.source) + '</span></div>') + '</tr>'; }).join('')));
    }
    body.push('<div style="margin:26px 0 0;padding-top:12px;border-top:1px solid ' + P.line + ';font:11.5px/1.5 ' + SANS + ';color:' + P.dim + '">Texas Intel Weekly is assembled automatically from public news feeds, agenda systems and government pages, and every headline links to its original. ' + (n.generatedAt ? 'Built ' + esc(n.generatedAt.slice(0, 10)) + '. ' : '') + 'Signals only, not solicitations.</div>');
    h.push(table('background:' + P.paper + ';border:1px solid ' + P.line + ';border-top:0;border-radius:0 0 14px 14px', '<tr>' + td('padding:20px 20px 22px;color:' + P.ink + ';font:14px/1.5 ' + SANS, body.join('\n')) + '</tr>'));
    var doc = '<div style="max-width:720px;margin:0 auto">' + h.join('\n') + '</div>';
    return opts.fragment ? doc : '<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>' + esc(n.title) + '</title></head><body style="margin:0;padding:16px 8px;background:' + P.bg + '">\n' + doc + '\n</body></html>\n';
  }
  // which weeks to (re)build on a run: the current week (draft) and the previous KEEP_WEEKS-1 weeks; a week is final once it has ended
  function plan(nowIso) { var cur = isoWeek(nowIso), out = []; for (var i = 0; i < KEEP_WEEKS; i++) { var w = addWeeks(cur, -i); out.push({ week: w, final: Date.parse(weekEnd(w)) < Date.parse(nowIso) }); } return out; }
  return { KEEP_WEEKS: KEEP_WEEKS, ORDER: ORDER, LABEL: LABEL, isoWeek: isoWeek, weekStart: weekStart, weekEnd: weekEnd, addWeeks: addWeeks, itemWeek: itemWeek, primary: primary, detectDates: detectDates, build: build, toText: toText, toHtml: toHtml, plan: plan, status: status, stats: stats, topStory: topStory, palette: palette };
});
