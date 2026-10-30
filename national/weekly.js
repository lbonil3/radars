/* Weekly pursuits list: plain HTML / text builders (browser + Node). Used by the in-app Weekly list sheet, Share, Copy and Download. */
(function (root, factory) { if (typeof module === 'object' && module.exports) module.exports = factory(); else root.NRW = factory(); })(this, function () {
  'use strict';
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
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
  return { model: model, bodyHtml: bodyHtml, text: text, docHtml: docHtml, CSS: CSS };
});
