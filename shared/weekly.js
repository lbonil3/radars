/* Weekly pursuits list for National and Texas (browser + Node): pursuit rows, the plain HTML / text builders,
   calendar (.ics) due-date events, and the in-app Weekly list sheet (Print, Share, Copy text, Download).
   Moved from national/weekly.js (NRW) in Radar 2.0; the builders are unchanged. */
(function (root, factory) { if (typeof module === 'object' && module.exports) module.exports = factory(); else root.RadarWeekly = factory(); })(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  // starred records plus records with a non-empty capture file, sorted by due date (overdue first, no date last)
  function pursuitRows(watch, cap, snapFn, today, CP) {
    var ids = {}; Object.keys(watch || {}).forEach(function (id) { ids[id] = 1; });
    Object.keys(cap || {}).forEach(function (id) { if (cap[id] && !CP.isEmpty(cap[id])) ids[id] = 1; });
    var rows = Object.keys(ids).map(function (id) { var c = (cap && cap[id]) || CP.blank(), sn = snapFn(id) || (c.snap) || { title: id }; var d = CP.dueInfo(c.due, today); return { id: id, cap: c, snap: sn, title: sn.title, flag: d.flag, days: d.days, week: d.flag === 'overdue' || (d.days !== null && d.days <= 7) }; });
    return CP.sortRows(rows, 'due');
  }
  function item(r, today, CP, fmtDate) {
    var c = r.cap || {}, sn = r.snap || {};
    return { title: sn.title || r.id, where: [sn.agency, sn.state].filter(Boolean).join(' · '), due: c.due ? fmtDate(c.due) + ' (' + CP.dueText(c.due, today) + ')' : 'No due date', flag: r.flag || '', decision: c.decision || 'Undecided', next: c.next || '', notes: c.notes || '', url: sn.url || '' };
  }
  function model(rows, today, CP, fmtDate) {
    var m = function (r) { return item(r, today, CP, fmtDate); };
    return { today: today, heading: 'My pursuits: week of ' + fmtDate(today), week: rows.filter(function (r) { return r.week; }).map(m), later: rows.filter(function (r) { return !r.week; }).map(m) };
  }
  function itemHtml(x) {
    return '<li class="wk-i ' + esc(x.flag) + '"><div class="wk-t">' + esc(x.title) + '</div>' + (x.where ? '<div class="wk-w">' + esc(x.where) + '</div>' : '') +
      '<div class="wk-m"><span><b>Due:</b> ' + esc(x.due) + '</span><span><b>Go / No-go:</b> ' + esc(x.decision) + '</span></div>' +
      (x.next ? '<div class="wk-n"><b>Next action:</b> ' + esc(x.next) + '</div>' : '') + (x.notes ? '<div class="wk-notes"><b>Notes:</b> ' + esc(x.notes) + '</div>' : '') +
      (x.url ? '<div class="wk-u">' + esc(x.url) + '</div>' : '') + '</li>';
  }
  function bodyHtml(md) {
    var sec = function (h, list, empty) { return '<h2 class="wk-h">' + esc(h) + ' (' + list.length + ')</h2>' + (list.length ? '<ol class="wk-l">' + list.map(itemHtml).join('') + '</ol>' : '<p class="wk-e">' + esc(empty) + '</p>'); };
    if (!md.week.length && !md.later.length) return '<h1 class="wk-title">' + esc(md.heading) + '</h1><p class="wk-e">No pursuits yet. Star a record to start a capture file.</p>';
    return '<h1 class="wk-title">' + esc(md.heading) + '</h1>' + sec('This week: overdue or due within 7 days', md.week, 'Nothing overdue or due in the next 7 days.') + (md.later.length ? sec('Later or no due date', md.later, '') : '');
  }
  function text(md) {
    var out = [md.heading, ''], one = function (x, i) { out.push((i + 1) + '. ' + x.title); if (x.where) out.push('   ' + x.where); out.push('   Due: ' + x.due + ' | Go / No-go: ' + x.decision); if (x.next) out.push('   Next action: ' + x.next); if (x.notes) out.push('   Notes: ' + x.notes); if (x.url) out.push('   ' + x.url); out.push(''); };
    out.push('THIS WEEK: overdue or due within 7 days (' + md.week.length + ')'); if (!md.week.length) out.push('Nothing overdue or due in the next 7 days.', ''); md.week.forEach(one);
    if (md.later.length) { out.push('LATER OR NO DUE DATE (' + md.later.length + ')'); md.later.forEach(one); }
    return out.join('\n').trim() + '\n';
  }
  var CSS = 'body{font:15px/1.45 -apple-system,system-ui,Segoe UI,Roboto,sans-serif;color:#111;background:#fff;margin:0;padding:16px}.wk-title{font-size:20px;margin:0 0 8px}.wk-h{font-size:16px;margin:16px 0 6px;border-bottom:2px solid #111;padding-bottom:2px}.wk-l{margin:0;padding-left:22px}.wk-i{margin:0 0 10px;padding:6px 8px;border:1px solid #999;border-left:4px solid #111;break-inside:avoid;page-break-inside:avoid}.wk-i.overdue{border-left-color:#b91c1c}.wk-i.soon{border-left-color:#b45309}.wk-t{font-weight:700}.wk-w,.wk-u{color:#333;font-size:13px}.wk-u{word-break:break-all}.wk-m{display:flex;flex-wrap:wrap;gap:4px 16px}.wk-notes{white-space:pre-wrap}.wk-e{color:#333}';
  function docHtml(md) { return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + esc(md.heading) + '</title><style>' + CSS + '</style></head><body>' + bodyHtml(md) + '</body></html>'; }
  // ---- calendar: all-day due-date events with reminders 1 week and 1 day before ----
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function icsEsc(s) { return String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n'); }
  function u8len(s) { var n = 0; for (var i = 0; i < s.length; i++) { var c = s.charCodeAt(i); n += c < 0x80 ? 1 : c < 0x800 ? 2 : (c >= 0xd800 && c < 0xdc00) ? 4 : (c >= 0xdc00 && c < 0xe000) ? 0 : 3; } return n; }
  function fold(line) { var out = [], cur = ''; Array.from(line).forEach(function (ch) { if (u8len(cur + ch) > 74) { out.push(cur); cur = ' ' + ch; } else cur += ch; }); out.push(cur); return out.join('\r\n'); }
  function nextDay(d) { var x = new Date(Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10) + 1)); return x.getUTCFullYear() + pad(x.getUTCMonth() + 1) + pad(x.getUTCDate()); }
  function slug(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
  // events [{ uid, date, title, desc, url, alarms }] -> text/calendar; appName names the calendar product and the UID domain
  function ics(events, nowIso, calName, appName) {
    var app = appName || 'National Radar', stamp = String(nowIso || new Date().toISOString()).replace(/[-:]/g, '').replace(/\.\d+/, '').slice(0, 15) + 'Z';
    var L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//' + app + '//Pursuits//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:' + icsEsc(calName || app)];
    (events || []).filter(function (e) { return e && /^\d{4}-\d{2}-\d{2}$/.test(e.date || ''); }).forEach(function (e) {
      L.push('BEGIN:VEVENT', 'UID:' + icsEsc(e.uid) + '@' + slug(app), 'DTSTAMP:' + stamp, 'DTSTART;VALUE=DATE:' + e.date.replace(/-/g, ''), 'DTEND;VALUE=DATE:' + nextDay(e.date), 'SUMMARY:' + icsEsc(e.title), 'TRANSP:TRANSPARENT');
      if (e.desc) L.push('DESCRIPTION:' + icsEsc(e.desc)); if (e.url) L.push('URL:' + icsEsc(e.url));
      (e.alarms || []).forEach(function (a) { L.push('BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + icsEsc(e.title), 'TRIGGER:-' + a, 'END:VALARM'); });
      L.push('END:VEVENT');
    });
    L.push('END:VCALENDAR');
    return L.map(fold).join('\r\n') + '\r\n';
  }
  // pursuit rows -> one due-date event per row that has a due date (row.dueFrom === 'source' marks a date stated by the source)
  function dueEvents(rows) {
    var ev = [];
    (rows || []).forEach(function (r) {
      var c = r.cap || {}, sn = r.snap || {}, t = sn.title || r.title || r.id; if (!c.due) return;
      var desc = [sn.agency, sn.url ? 'Source: ' + sn.url : null, c.next ? 'Next action: ' + c.next : null, c.decision && c.decision !== 'Undecided' ? 'Decision: ' + c.decision : null].filter(Boolean).join('\n');
      ev.push({ uid: 'due-' + r.id, date: c.due, title: 'Due: ' + t, desc: desc + (r.dueFrom === 'source' ? '\n(due date stated by the source)' : '\n(due date from your capture file)'), url: sn.url || null, alarms: ['P7D', 'P1D'] });
    });
    return ev;
  }
  // ---- the in-app Weekly list sheet (#weekly, #wkBody, #wkHint, #wkClose, #wkPrint, #wkShare, #wkCopy, #wkDl) ----
  // o: { doc, win, model: () => md, fileName: (ext) => name, back: id to focus on close, toast: fn(text), download: fn(name, type, text, bom) }
  function bindSheet(o) {
    var doc = o.doc, win = o.win, nav = win.navigator || {}, md = null, $ = function (id) { return doc.getElementById(id); };
    var hint = function (t) { $('wkHint').textContent = t; }, cur = function () { return md || o.model(); };
    function open() { md = o.model(); $('wkBody').innerHTML = bodyHtml(md); hint(''); $('weekly').hidden = false; doc.body.classList.add('wk-open'); $('wkShare').hidden = !nav.share; $('wkClose').focus(); }
    function close() { $('weekly').hidden = true; doc.body.classList.remove('wk-open', 'print-weekly'); var b = $(o.back); if (b) b.focus(); }
    function endPrint() { doc.body.classList.remove('print-weekly'); }
    function print() {
      if (typeof win.print !== 'function') { hint('Printing is not available here. Use Share, Download or Copy text instead.'); return; }
      doc.body.classList.add('print-weekly');
      win.setTimeout(function () { try { win.print(); } catch (e) { hint('Printing did not start. Use Share or Download, then print from that app.'); } win.setTimeout(endPrint, 1500); }, 60);
      hint('If no print dialog appears (some iPhone home-screen apps), use Share or Download and print from there.');
    }
    function share() {
      var m = cur(), txt = text(m), data = { title: m.heading, text: txt };
      try { var f = new win.File([docHtml(m)], o.fileName('html'), { type: 'text/html' }); if (nav.canShare && nav.canShare({ files: [f] })) data = { title: m.heading, text: m.heading, files: [f] }; } catch (e) { /* files not supported */ }
      nav.share(data).catch(function (e) { if (e && e.name !== 'AbortError') { if (data.files) nav.share({ title: m.heading, text: txt }).catch(function () {}); } });
    }
    function copy() {
      var txt = text(cur()), ok = function () { o.toast('Weekly list copied.'); hint('Copied. Paste it into a note, email or message.'); };
      var fallback = function () { var ta = doc.createElement('textarea'); ta.value = txt; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.top = '0'; ta.style.opacity = '0'; $('weekly').appendChild(ta); ta.select(); ta.setSelectionRange(0, txt.length); var done = false; try { done = doc.execCommand('copy'); } catch (e) { done = false; } ta.remove(); if (done) ok(); else hint('Copy is blocked here. Select the list below and copy it, or use Download.'); };
      if (nav.clipboard && nav.clipboard.writeText) nav.clipboard.writeText(txt).then(ok, fallback); else fallback();
    }
    function download() { o.download(o.fileName('html'), 'text/html;charset=utf-8', docHtml(cur()), false); hint('Saved as an HTML file. Open it to print or share.'); }
    $('wkClose').addEventListener('click', close); $('wkPrint').addEventListener('click', print); $('wkShare').addEventListener('click', share); $('wkCopy').addEventListener('click', copy); $('wkDl').addEventListener('click', download);
    doc.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('weekly').hidden) close(); });
    win.addEventListener('afterprint', endPrint);
    if (win.matchMedia) { var mqp = win.matchMedia('print'), onMq = function (e) { if (!e.matches) endPrint(); }; if (mqp.addEventListener) mqp.addEventListener('change', onMq); else if (mqp.addListener) mqp.addListener(onMq); }
    return { open: open, close: close, print: print, share: share, copy: copy, download: download };
  }
  return { pursuitRows: pursuitRows, model: model, bodyHtml: bodyHtml, text: text, docHtml: docHtml, CSS: CSS, ics: ics, dueEvents: dueEvents, bindSheet: bindSheet };
});
