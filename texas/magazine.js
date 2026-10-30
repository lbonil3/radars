/* Texas Intel Weekly: magazine print edition (Print / Magazine PDF and Download .html). Pure and deterministic: built only from one stored
   newsletter issue. Layout CSS is in texas/magazine.css (scoped to .mz); per-issue @page rules (running heads, page numbers) come from pageCss().
   Cover art: Texas outline and the 8 Houston-region counties simplified from texas-geo.js (US Census-derived), plus generated contour lines. */
(function (root, factory) { if (typeof module === 'object' && module.exports) module.exports = factory(require('./newsletter.js'), require('./intel.js')); else root.TXMagazine = factory(root.TXNewsletter, root.TXIntel); })(this, function (N, I) {
  'use strict';
  var TX = 'M169 273L159 273L150 269L148 273L138 274L133 283L131 296L127 297L123 305L112 302L109 298L91 291L75 278L69 267L69 257L63 248L61 240L45 230L26 209L17 205L11 195L7 194L2 188L3 184L125 184L125 4L230 4L230 82L232 81L240 89L250 89L251 86L255 88L257 95L264 95L272 99L276 97L282 102L286 98L292 99L295 98L295 104L300 104L299 108L304 110L310 104L320 111L325 107L328 115L333 106L336 106L337 109L341 111L344 108L347 108L345 110L352 113L354 116L357 113L361 114L362 111L369 109L375 110L381 107L389 109L393 106L402 110L406 114L409 114L418 119L420 118L422 122L429 120L434 122L434 184L442 193L441 201L444 203L449 217L451 217L452 223L451 231L444 242L446 261L438 272L441 277L431 278L410 289L409 289L412 285L419 283L417 281L409 282L412 276L410 273L404 278L402 276L401 282L404 284L405 292L396 296L395 299L407 290L410 291L388 309L359 324L334 345L325 361L320 378L321 392L327 421L323 402L320 402L322 401L319 388L320 370L328 350L335 340L352 330L352 328L343 331L341 328L340 334L335 339L332 337L327 339L325 341L331 340L332 342L326 351L316 349L324 356L318 371L315 373L315 370L311 373L314 375L318 373L317 396L323 413L322 418L327 422L328 426L321 427L320 430L315 429L310 423L292 422L282 415L276 415L271 410L261 408L255 390L249 383L249 377L246 371L246 361L234 352L232 345L220 333L218 324L213 318L207 301L193 286L187 283L187 279L185 281L181 274L169 273Z';
  var HOU = 'M402 269L423 269L423 282L423 280L418 282L417 281L410 283L409 282L411 279L412 274L407 274L404 278L404 271L402 269ZM395 250L406 244L410 244L415 260L420 259L420 268L402 269L402 265L400 264L395 250ZM373 239L381 244L389 244L390 248L394 250L393 251L395 250L398 257L391 263L387 259L385 260L382 257L378 260L374 260L373 239ZM371 295L375 291L379 292L381 290L382 286L385 286L387 281L390 280L394 282L393 285L399 296L396 296L395 299L398 299L397 301L388 309L384 311L382 311L378 305L375 305L375 302L372 300L371 295ZM374 260L378 260L382 257L391 263L398 257L400 264L402 265L402 269L404 271L403 275L404 276L402 276L401 282L395 284L392 280L387 281L381 278L373 272L368 257L374 260ZM364 255L374 254L374 260L368 257L373 272L366 275L365 272L363 272L363 265L364 264L360 258L362 258L361 256L364 255ZM418 282L423 280L423 282L410 289L409 289L412 285L418 282ZM398 299L407 292L407 290L410 291L397 301L398 299ZM394 282L395 284L401 282L404 284L403 286L405 287L405 292L399 296L393 285L394 282ZM364 280L366 280L366 275L373 272L387 281L385 286L382 286L381 290L379 292L375 291L371 293L365 285L366 284L364 280Z';
  var HX = 388, HY = 274;
  var MONTHS = 'January February March April May June July August September October November December'.split(' ');
  var DEPTS = [ // statewide departments (non-Houston items), in print order
    { id: 'grant', name: 'Funding & Grants', topics: ['grant'] }, { id: 'flood', name: 'Flood & Drainage', topics: ['flood'] },
    { id: 'budget', name: 'Budgets & Capital Plans', topics: ['budget', 'bond'] }, { id: 'road', name: 'Roadway & TxDOT', topics: ['road'] },
    { id: 'water', name: 'Water & Wastewater', topics: ['water'] }, { id: 'policy', name: 'Policy & Programs', topics: ['policy'] }, { id: 'agenda', name: 'Council Watch', topics: ['agenda'] }
  ];
  var COLOR = { hou: '#0f766e', grant: '#047857', flood: '#0369a1', budget: '#6d28d9', bond: '#a16207', road: '#c2410c', water: '#0e7490', policy: '#be185d', agenda: '#475569', dates: '#b45309' };
  function esc(s) { return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function d(iso) { var x = new Date(iso.length === 10 ? iso + 'T12:00:00Z' : iso); return MONTHS[x.getUTCMonth()].slice(0, 3) + ' ' + x.getUTCDate() + ', ' + x.getUTCFullYear(); }
  function range(n) { var a = new Date(n.start + 'T12:00:00Z'), b = new Date(n.end + 'T12:00:00Z'); return MONTHS[a.getUTCMonth()].slice(0, 3) + ' ' + a.getUTCDate() + '–' + (a.getUTCMonth() === b.getUTCMonth() ? '' : MONTHS[b.getUTCMonth()].slice(0, 3) + ' ') + b.getUTCDate() + ', ' + b.getUTCFullYear(); }
  function host(u) { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return ''; } }
  function letter(i) { return String.fromCharCode(65 + i); }
  // ---------- plan: which sections exist, their letters, and the cover lines (deterministic)
  function plan(n) {
    var top = N.topStory(n), all = [];
    n.houston.forEach(function (g) { g.items.forEach(function (e) { all.push(Object.assign({ hou: true }, e)); }); });
    n.texas.forEach(function (g) { g.items.forEach(function (e) { all.push(Object.assign({ hou: false }, e)); }); });
    var rank = function (a, b) { return (b.score - a.score) || (a.id < b.id ? -1 : 1); };
    var secs = [], idx = 0;
    if (top) secs.push({ key: 'feature', name: 'Cover Story', color: COLOR[top.topic] || COLOR.hou, items: [top] });
    var hou = all.filter(function (e) { return e.hou && (!top || e.id !== top.id); }).sort(rank);
    if (hou.length) secs.push({ key: 'hou', name: 'Houston Region', color: COLOR.hou, items: hou, total: n.counts.houston });
    DEPTS.forEach(function (dp) { var it = all.filter(function (e) { return !e.hou && dp.topics.indexOf(e.topic) >= 0 && (!top || e.id !== top.id); }).sort(rank); var tot = n.texas.filter(function (g) { return dp.topics.indexOf(g.topic) >= 0; }).reduce(function (a, g) { return a + g.total; }, 0); if (it.length) secs.push({ key: dp.id, name: dp.name, color: COLOR[dp.id], items: it, total: tot }); });
    if (n.deadlines.length) secs.push({ key: 'dates', name: 'Dates to Watch', color: COLOR.dates, items: [] });
    secs.forEach(function (s) { s.letter = letter(idx++); s.anchor = 'mz-' + s.letter; });
    var cover = []; secs.forEach(function (s) { if (s.key !== 'feature' && s.key !== 'dates' && s.items[0] && cover.length < 4) cover.push({ sec: s, e: s.items[0] }); });
    var sources = {}; all.forEach(function (e) { sources[e.source] = (sources[e.source] || 0) + 1; }); n.deadlines.forEach(function (x) { if (!sources[x.source]) sources[x.source] = 0; });
    return { top: top, sections: secs, cover: cover, sources: Object.keys(sources).sort().map(function (k) { return { name: k, n: sources[k] }; }), shown: all.length };
  }
  function desk(n, pl) { // editor's note: templated from counts only
    var st = n.stats || N.stats ? (n.stats || {}) : {}, mix = st.mix || {}, best = Object.keys(mix).sort(function (a, b) { return (mix[b] - mix[a]) || (a < b ? -1 : 1); })[0];
    var out = [];
    if (!n.counts.items) return ['No items were collected for this week. The collector checks every source daily; when a source returns nothing relevant, nothing is printed.'];
    out.push('This week the collector kept ' + n.counts.items + ' item' + (n.counts.items === 1 ? '' : 's') + ' from public news feeds, agenda systems and government pages. ' + n.counts.houston + ' ' + (n.counts.houston === 1 ? 'is' : 'are') + ' in the Houston region, and this edition prints ' + pl.shown + ' of them, ranked by keyword relevance.');
    if (best && mix[best]) out.push('The largest group is ' + N.LABEL[best] + ' (' + mix[best] + ' item' + (mix[best] === 1 ? '' : 's') + ').' + (st.grant ? ' ' + st.grant + ' mention grants or funding' + (st.flood ? ' and ' + st.flood + ' mention flood or drainage work.' : '.') : ''));
    if (n.deadlines.length) out.push(n.deadlines.length + ' dated item' + (n.deadlines.length === 1 ? '' : 's') + ' appear in Dates to Watch, the first on ' + d(n.deadlines[0].date) + '.');
    out.push(n.final ? 'This is the final edition for the week.' : 'This edition is still in progress and is rebuilt daily until the week ends on ' + d(n.end) + '.');
    out.push('Every item is a signal to check against its original source, not a solicitation.');
    return out;
  }
  // ---------- art
  function contours(seed, w, h, color, op) { var p = ''; for (var i = 0; i < 14; i++) { var y = 30 + i * (h / 14), a = 18 + ((seed * (i + 3)) % 23); p += '<path d="M-20 ' + y.toFixed(0) + ' C ' + (w * 0.25).toFixed(0) + ' ' + (y - a).toFixed(0) + ', ' + (w * 0.55).toFixed(0) + ' ' + (y + a).toFixed(0) + ', ' + (w + 20) + ' ' + (y - a / 2).toFixed(0) + '" fill="none" stroke="' + color + '" stroke-opacity="' + op + '" stroke-width="1.2"/>'; } return p; }
  function coverArt(n) {
    var seed = +n.week.slice(6) || 7;
    return '<svg class="mz-art" viewBox="0 0 470 440" role="img" aria-label="Map of Texas with the Houston region highlighted" preserveAspectRatio="xMidYMid meet">' +
      '<g>' + contours(seed, 470, 440, '#5eead4', 0.22) + '</g>' +
      '<path d="' + TX + '" fill="#115e59" stroke="#99f6e4" stroke-width="2"/>' +
      '<path d="' + HOU + '" fill="#fbbf24" stroke="#0b2722" stroke-width="0.8"/>' +
      '<circle cx="' + HX + '" cy="' + HY + '" r="34" fill="none" stroke="#fbbf24" stroke-width="2" stroke-dasharray="4 4"/>' +
      '<circle cx="' + HX + '" cy="' + HY + '" r="56" fill="none" stroke="#fbbf24" stroke-opacity=".55" stroke-width="1.2"/>' +
      '<text x="' + (HX - 150) + '" y="' + (HY + 92) + '" fill="#fde68a" font-family="Arial Narrow,Arial,sans-serif" font-weight="700" font-size="15" letter-spacing="2">HOUSTON REGION</text></svg>';
  }
  function bars(n) {
    var mix = (n.stats && n.stats.mix) || {}, keys = N.ORDER.filter(function (t) { return mix[t]; }), max = Math.max.apply(null, keys.map(function (t) { return mix[t]; }).concat([1]));
    if (!keys.length) return '';
    var h = 22 * keys.length + 6;
    return '<svg class="mz-chart" viewBox="0 0 320 ' + h + '" role="img" aria-label="Items by topic">' + keys.map(function (t, i) { var w = Math.max(3, Math.round(170 * mix[t] / max)), y = 4 + i * 22;
      return '<text x="0" y="' + (y + 13) + '" font-size="11" fill="#1f2937" font-family="Arial,sans-serif">' + esc(N.LABEL[t]) + '</text><rect x="130" y="' + (y + 2) + '" width="' + w + '" height="14" rx="2" fill="' + (COLOR[t] || '#475569') + '"/><text x="' + (136 + w) + '" y="' + (y + 13) + '" font-size="11" font-weight="700" fill="#111827" font-family="Arial,sans-serif">' + mix[t] + '</text>'; }).join('') + '</svg>';
  }
  // ---------- pieces
  function meta(e) { return esc([e.source, e.place, e.date ? d(e.date) : null].filter(Boolean).join(' · ')); }
  function link(e, inner) { return '<a href="' + esc(e.link) + '">' + inner + '</a>'; }
  function article(e, first) {
    return '<article class="mz-item' + (first ? ' mz-lead' : '') + '" style="--c:' + (COLOR[e.topic] || '#475569') + '"><div class="mz-tag">' + esc(N.LABEL[e.topic] || e.topic) + '</div><h3>' + link(e, esc(e.title)) + '</h3><p class="mz-meta">' + meta(e) + '</p>' +
      (e.desc ? '<p class="mz-body' + (first ? ' mz-drop' : '') + '">' + esc(e.desc) + '</p>' : '') + (e.why ? '<p class="mz-why"><b>Why it matters.</b> ' + esc(e.why) + '</p>' : '') + (e.hint ? '<p class="mz-hint"><b>Next step.</b> ' + esc(e.hint) + '</p>' : '') +
      (e.linkNote ? '<p class="mz-note">' + esc(e.linkNote) + '</p>' : '') + '<p class="mz-src">Original: ' + link(e, esc(host(e.link))) + '</p></article>';
  }
  function related(n, pl, top) { // teasers for other printed items on the same topic, pointing to their section
    var out = []; pl.sections.forEach(function (s) { if (s.key === 'feature' || s.key === 'dates') return; s.items.forEach(function (e) { if (e.topic === top.topic && out.length < 2) out.push({ e: e, s: s }); }); });
    if (!out.length) return '';
    return '<div class="mz-related" style="--c:' + (COLOR[top.topic] || '#475569') + '"><div class="mz-kick">More ' + esc(N.LABEL[top.topic]) + ' in this issue</div><div class="mz-rel-grid">' + out.map(function (x) { return '<div><span class="mz-rel-s">Sec. ' + x.s.letter + ' · ' + esc(x.s.name) + '</span>' + link(x.e, esc(x.e.title.length > 110 ? x.e.title.slice(0, 109) + '…' : x.e.title)) + '<p class="mz-meta">' + meta(x.e) + '</p></div>'; }).join('') + '</div></div>';
  }
  function secHead(s, n) { return '<header class="mz-sh"><div class="mz-tab">' + s.letter + '</div><div><div class="mz-kick">Section ' + s.letter + (s.total ? ' · ' + s.total + ' item' + (s.total === 1 ? '' : 's') + ' this week' + (s.total > s.items.length ? ', ' + s.items.length + ' printed' : '') : '') + '</div><h2>' + esc(s.name) + '</h2></div></header>'; }
  function build(n, opts) {
    opts = opts || {}; var pl = plan(n), st = n.stats || {}, issue = +n.week.slice(6), vol = n.week.slice(0, 4), top = pl.top, h = [];
    h.push('<div class="mz" lang="en">');
    // COVER
    h.push('<section class="mz-cover"><div class="mz-cv-top"><div class="mz-cv-meta"><span>Vol. ' + esc(vol) + '</span><span>Issue No. ' + issue + '</span><span>' + esc(range(n)) + '</span></div>' +
      '<h1 class="mz-mast">TEXAS <span>INTEL</span> WEEKLY</h1><div class="mz-tagline">Texas public-works opportunity intelligence</div></div>' +
      (n.final ? '' : '<div class="mz-draft">Draft edition · in progress</div>') +
      '<div class="mz-cv-mid">' + coverArt(n) + '<div class="mz-cv-lines">' + pl.cover.map(function (c) { return '<div class="mz-cl" style="--c:' + c.sec.color + '"><span class="mz-cl-k">' + esc(c.sec.name) + ' · Sec. ' + c.sec.letter + '</span>' + esc(c.e.title.length > 96 ? c.e.title.slice(0, 95) + '…' : c.e.title) + '</div>'; }).join('') + '</div></div>' +
      '<div class="mz-cv-bottom">' + (top ? '<div class="mz-cv-kick">Cover story · ' + esc(top.place || top.region || '') + '</div><div class="mz-cv-head">' + esc(top.title.length > 150 ? top.title.slice(0, 149) + '…' : top.title) + '</div><div class="mz-cv-deck">' + meta(top) + ' · Section A</div>' : '<div class="mz-cv-head">No items were collected this week</div>') +
      '<div class="mz-cv-foot">' + n.counts.items + ' signals · ' + n.counts.houston + ' Houston region · ' + (st.grant || 0) + ' funding · ' + (st.flood || 0) + ' flood &amp; drainage</div></div></section>');
    // CONTENTS
    h.push('<section class="mz-page mz-contents"><div class="mz-kick">Inside</div><h2 class="mz-big">In this issue</h2><div class="mz-two"><ol class="mz-toc">' +
      pl.sections.map(function (s) { return '<li style="--c:' + s.color + '"><a href="#' + s.anchor + '"><span class="mz-toc-l">' + s.letter + '</span><span class="mz-toc-n">' + esc(s.name) + '</span><span class="mz-toc-p" data-target="#' + s.anchor + '"></span></a>' + (s.items[0] && s.key !== 'feature' ? '<div class="mz-toc-t">' + esc(s.items[0].title.length > 80 ? s.items[0].title.slice(0, 79) + '…' : s.items[0].title) + '</div>' : s.key === 'feature' && top ? '<div class="mz-toc-t">' + esc(top.title.length > 80 ? top.title.slice(0, 79) + '…' : top.title) + '</div>' : '') + '</li>'; }).join('') +
      '<li style="--c:#334155"><span class="mz-toc-l">&#9632;</span><span class="mz-toc-n">Sources &amp; how to use (back cover)</span></li></ol>' +
      '<div><div class="mz-box mz-desk"><div class="mz-kick">From the desk</div>' + desk(n, pl).map(function (p, i) { return '<p' + (i ? '' : ' class="mz-drop"') + '>' + esc(p) + '</p>'; }).join('') + '</div>' +
      '<div class="mz-box"><div class="mz-kick">Topic mix</div>' + (bars(n) || '<p>No items.</p>') + '</div></div></div>' +
      '<div class="mz-nums">' + [['Signals', st.items === undefined ? n.counts.items : st.items], ['New this week', st.newThisWeek === undefined || st.newThisWeek === null ? '–' : st.newThisWeek], ['Houston region', n.counts.houston], ['Funding', st.grant || 0], ['Flood & drainage', st.flood || 0]].map(function (x) { return '<div><b>' + esc(x[1]) + '</b><span>' + esc(x[0]) + '</span></div>'; }).join('') + '</div>' +
      '<p class="mz-fine">Section letters stand in for page numbers: each section starts with its letter tab. In the PDF the entries above are links.</p></section>');
    // FEATURE
    if (top) { var s0 = pl.sections[0], tips = [], seen = {}; n.houston.concat(n.texas).forEach(function (g) { g.items.forEach(function (e) { if (e.hint && !seen[e.hint] && tips.length < 4) { seen[e.hint] = 1; tips.push(e); } }); });
      h.push('<section class="mz-page mz-feature" id="' + s0.anchor + '" style="--c:' + s0.color + '">' + secHead(s0, n) +
        '<h1 class="mz-fh' + (top.title.length > 110 ? ' mz-fh-long' : '') + '">' + link(top, esc(top.title)) + '</h1><p class="mz-deck">' + meta(top) + (top.region ? ' · ' + esc(top.region) : '') + '</p>' +
        '<div class="mz-fgrid"><div class="mz-fbody">' +
        '<p class="mz-drop">' + esc(top.desc || ('Reported by ' + top.source + (top.place ? ' for ' + top.place : '') + (top.date ? ' on ' + d(top.date) : '') + '. The full text is at the original source linked below.')) + '</p>' +
        (top.why ? '<blockquote class="mz-pull">' + esc(top.why) + '<cite>Why it matters</cite></blockquote>' : '') +
        '<p>Filed under ' + esc(N.LABEL[top.topic]) + (top.region ? ', ' + esc(top.region) : '') + '. This is the highest-scoring ' + (top.region === I.HOU ? 'Houston-region ' : '') + 'item of the week by keyword relevance; check the scope, schedule and owner at the original before acting.</p>' +
        (top.hint ? '<p><b>Positioning.</b> ' + esc(top.hint) + '</p>' : '') + (top.linkNote ? '<p class="mz-note">' + esc(top.linkNote) + '</p>' : '') +
        '<p class="mz-src">Original: ' + link(top, esc(host(top.link))) + '</p></div>' +
        '<aside class="mz-side"><div class="mz-kick">What to do next</div><ol>' + tips.map(function (e) { return '<li>' + esc(e.hint) + '<span>' + esc(e.title.length > 70 ? e.title.slice(0, 69) + '…' : e.title) + '</span></li>'; }).join('') + '</ol>' +
        (n.deadlines.length ? '<div class="mz-kick" style="margin-top:10px">Next date</div><p class="mz-nd"><b>' + esc(d(n.deadlines[0].date)) + '</b> ' + esc(n.deadlines[0].what.replace(/^[a-z]\S*\s+/, '')) + '</p>' : '') + '</aside></div>' + related(n, pl, top) + '</section>'); }
    // DEPARTMENTS
    var houSec = pl.sections.filter(function (s) { return s.key === 'hou'; })[0];
    var firstState = !houSec || houSec.items.length >= 6; // thin Houston sections share a page with the first statewide department
    pl.sections.forEach(function (s) {
      if (s.key === 'feature' || s.key === 'dates') return;
      var brk = s.key === 'hou' || (firstState && s.key !== 'hou'); if (s.key !== 'hou') firstState = false;
      h.push('<section class="mz-dept' + (brk ? ' mz-brk' : '') + '" id="' + s.anchor + '" style="--c:' + s.color + '">' + secHead(s, n) + '<div class="mz-cols">' + s.items.map(function (e, i) { return article(e, i === 0); }).join('') + '</div></section>');
    });
    // DATES
    var ds = pl.sections.filter(function (s) { return s.key === 'dates'; })[0];
    if (ds) h.push('<section class="mz-dept mz-dates" id="' + ds.anchor + '" style="--c:' + ds.color + '">' + secHead(ds, n) + '<div class="mz-cal">' + n.deadlines.map(function (x) { var dt = new Date(x.date + 'T12:00:00Z');
      return '<div class="mz-day"><div class="mz-dd"><span>' + MONTHS[dt.getUTCMonth()].slice(0, 3).toUpperCase() + '</span><b>' + dt.getUTCDate() + '</b><i>' + dt.getUTCFullYear() + '</i></div><div><p>' + esc(x.what.replace(/^[a-z]\S*\s+/, '')) + '</p><p class="mz-meta">' + link(x, esc(x.title.length > 90 ? x.title.slice(0, 89) + '…' : x.title)) + ' · ' + esc(x.source) + '</p></div></div>'; }).join('') + '</div></section>');
    // BACK COVER
    h.push('<section class="mz-back"><div class="mz-mast mz-mast-sm">TEXAS <span>INTEL</span> WEEKLY</div><div class="mz-back-grid">' +
      '<div><div class="mz-kick">Sources in this issue</div><ul class="mz-srcs">' + pl.sources.map(function (x) { return '<li>' + esc(x.name) + (x.n ? ' <b>' + x.n + '</b>' : '') + '</li>'; }).join('') + '</ul></div>' +
      '<div><div class="mz-kick">How to use this issue</div><ul class="mz-how"><li>Start with the Cover Story and the Houston Region section; items are ranked by keyword relevance.</li><li>Open the original for every item you act on. Headlines and short excerpts are quoted from the source; nothing else is added.</li><li>Use Dates to Watch for meetings, elections and funding windows mentioned in the items.</li><li>Tags, places and next steps are generated by keyword rules and may be wrong.</li></ul>' +
      '<div class="mz-disc"><b>Signals, not solicitations.</b> Texas Intel Weekly is compiled automatically from public news feeds, agenda systems and government pages. Items are not verified, may be incomplete, and are not invitations to bid. Check each original source before acting.</div></div></div>' +
      '<div class="mz-back-foot">Issue No. ' + issue + ' · ' + esc(n.week) + ' · ' + esc(range(n)) + ' · ' + esc(N.status(n)) + (n.generatedAt ? ' · built ' + esc(n.generatedAt.slice(0, 10)) : '') + '</div></section>');
    h.push('</div>');
    return h.join('\n');
  }
  // per-issue page rules: running head/foot and page numbers (CSS margin boxes; browsers without them just omit the running text)
  function pageCss(n) {
    var issue = +n.week.slice(6), q = function (s) { return '"' + String(s).replace(/["\\]/g, '') + '"'; };
    return '@page{margin:16mm 14mm 16mm 16mm;@top-left{content:' + q('TEXAS INTEL WEEKLY') + ';font:700 8pt Arial Narrow,Arial,sans-serif;letter-spacing:.12em;color:#0f766e}@top-right{content:' + q('Issue No. ' + issue + ' · ' + range(n)) + ';font:8pt Arial,sans-serif;color:#374151}@bottom-left{content:' + q('Signals, not solicitations. Verify at the original source.') + ';font:7.5pt Arial,sans-serif;color:#4b5563}@bottom-right{content:counter(page);font:700 9pt Arial,sans-serif;color:#111827}}' +
      '@page cover{margin:0;background:#0b2722;@top-left{content:none}@top-right{content:none}@bottom-left{content:none}@bottom-right{content:none}}@page back{margin:12mm;@top-left{content:none}@top-right{content:none}@bottom-left{content:none}@bottom-right{content:none}}';
  }
  function toDoc(n, css) { return '<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + esc('Texas Intel Weekly · Issue No. ' + (+n.week.slice(6)) + ' · ' + range(n)) + '</title><style>' + css + '\n' + pageCss(n) + '\n@media screen{body{background:#cbd5d1;margin:0;padding:12px}.mz>section{background:#fff;max-width:8.5in;margin:0 auto 14px;box-shadow:0 2px 10px rgba(0,0,0,.25)}}@media print{body{margin:0}}</style></head><body>' + build(n) + '</body></html>\n'; }
  return { plan: plan, desk: desk, build: build, pageCss: pageCss, toDoc: toDoc, DEPTS: DEPTS, COLOR: COLOR };
});
