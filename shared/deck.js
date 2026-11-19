/* In-app client deck. Pure build/render, plus a full-screen viewer. Browser + Node, no dependencies.
   Adapters read app records. build() trusts the item shape. Stars and notes arrive already copied by the app. */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api; else root.RadarDeck = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var DUE_ROWS = 6, CLIENT_ROWS = 4, WATCH_ROWS = 6, SOURCE_ROWS = 48;
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var MONS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var HEALTH = { ok: 'fresh', fresh: 'fresh', stale: 'stale', failed: 'failing', failing: 'failing', 'blocked by site': 'blocked by site' };
  var HEALTH_LABEL = { fresh: 'Fresh', stale: 'Stale', failing: 'Failing', blocked: 'Blocked by site' };
  var NON_CIVIL = /\bvessels?\b|\bESPC\b|\bcyber\b/i;
  var SOLICIT = /solicit|synopsis|sources sought|\brfqs?\b|\brfps?\b/i;
  var ON_CALL = /on[- ]call|as[- ]needed|rotation list|indefinite[- ]delivery|\bIDIQ\b/i;

  function addDays(iso, n) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
    if (!m) return '';
    var d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  }
  function parts(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
    return m ? { y: m[1], m: +m[2], d: +m[3] } : null;
  }
  function fmtDate(iso) { var p = parts(iso); return p ? MONS[p.m - 1] + ' ' + p.d + ', ' + p.y : ''; }
  function fmtLong(iso) { var p = parts(iso); return p ? MONTHS[p.m - 1] + ' ' + p.d + ', ' + p.y : ''; }
  function esc(s) {
    return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function chunk(list, n) {
    if (!list.length) return [[]];
    var out = [];
    for (var i = 0; i < list.length; i += n) out.push(list.slice(i, i + n));
    return out;
  }
  function byText(a, b) { return a < b ? -1 : a > b ? 1 : 0; }
  function opportunityUrl(url) {
    if (!/^https?:\/\//i.test(url || '')) return false;
    if (/\.(xlsx|xls|csv)(?:$|\?)/i.test(url)) return false;
    return true;
  }
  function hasSolicitation(status, url, number) {
    if (!opportunityUrl(url)) return false;
    if (status === 'open') return true;
    return !!number;
  }
  function kindOf(text, status) {
    var t = text || '';
    if (ON_CALL.test(t)) return 'On-call';
    if (/\bRFQ[sS]?\b|\bRFSQ\b|\bSOQ\b|qualifications/i.test(t)) return 'RFQ';
    if (/\bRFP\b|request for proposals/i.test(t)) return 'RFP';
    if (status === 'forecast') return 'Forecast';
    return 'Solicitation';
  }
  function markOf(marks, id) {
    var m = marks && marks[id];
    return { starred: !!(m && m.starred), note: m && m.note ? String(m.note).slice(0, 280) : '' };
  }
  function makeItem(spec, marks) {
    var mk = markOf(marks, spec.id);
    var url = opportunityUrl(spec.url) ? spec.url : '';
    var sol = hasSolicitation(spec.status, spec.url, spec.number);
    return {
      id: spec.id, client: spec.client || 'Agency not stated', state: spec.state || '',
      status: spec.status, kind: kindOf(spec.kindHint, spec.status), number: spec.number || '',
      title: spec.title || 'Untitled', due: spec.due || '', planDate: spec.planDate || '',
      url: sol ? url : '', hasSolicitation: sol, starred: mk.starred, note: mk.note
    };
  }

  function fromTexas(records, today, model, marks) {
    var out = [];
    (records || []).forEach(function (r) {
      if (!r) return;
      var status = model.aeStatus(r, today);
      if (status !== 'open' && status !== 'forecast') return;
      var text = [r.solType, r.title, r.work, r.stage].filter(Boolean).join(' ');
      out.push(makeItem({
        id: r.id, client: r.agency, state: 'TX', status: status, kindHint: text,
        number: r.solNum || '', title: r.title,
        due: status === 'open' ? (r.date || '') : '',
        planDate: status === 'forecast' ? (r.date || '') : '',
        url: r.url || ''
      }, marks));
    });
    return out;
  }

  function fromNational(records, today, model, stageOf, marks) {
    var out = [];
    (records || []).forEach(function (r) {
      if (!r || !r.id) return;
      var blob = (r.title || '') + ' ' + (r.desc || '');
      if (NON_CIVIL.test(blob)) return;
      var stage = stageOf(r);
      if (stage === 'awarded' || stage === 'closed') return;
      var due = (r.dates && r.dates.due) || '';
      var shaped = {
        title: r.title, solType: r.noticeType || '', work: r.noticeLabel || '',
        src: r.src, dept: r.office || r.subagency || '',
        stage: r.noticeType || r.stage || '', status: r.status || '', date: due
      };
      var ae = model.aeStatus(shaped, today);
      if (ae === 'past') return;
      var status = null;
      if (ae === 'open' || ae === 'forecast') status = ae;
      else if (stage === 'forecast') status = 'forecast';
      else if (stage === 'open' && model.hasAeWording(r.title || '') && SOLICIT.test(r.noticeType || '')) status = 'open';
      if (!status) return;
      out.push(makeItem({
        id: r.id, client: r.agency, state: r.state || '', status: status,
        kindHint: (r.noticeType || '') + ' ' + (r.title || ''),
        number: '', title: r.title,
        due: status === 'open' ? due : '',
        planDate: (r.dates && r.dates.est) || '',
        url: r.url || ''
      }, marks));
    });
    return out;
  }

  function selected(input) {
    var state = input.state || '', client = input.client || '';
    return (input.items || []).filter(function (it) {
      if (!it || (it.status !== 'open' && it.status !== 'forecast')) return false;
      if (state && it.state !== state) return false;
      if (client && it.client !== client) return false;
      return true;
    });
  }
  function dueRows(items, today, end) {
    return items.filter(function (it) {
      return it.status === 'open' && it.due && it.due >= today && it.due <= end;
    }).sort(function (a, b) {
      return byText(a.due, b.due) || byText(a.client, b.client) || byText(a.title, b.title);
    });
  }
  function clientGroups(items) {
    var by = {}, names = [];
    items.forEach(function (it) {
      if (!by[it.client]) { by[it.client] = []; names.push(it.client); }
      by[it.client].push(it);
    });
    names.sort(function (a, b) { return a.localeCompare(b); });
    return names.map(function (name) {
      var rows = by[name].slice().sort(function (a, b) {
        if (a.status !== b.status) return a.status === 'open' ? -1 : 1;
        var da = a.status === 'open' ? (a.due || '9999-99-99') : (a.planDate || '9999-99-99');
        var db = b.status === 'open' ? (b.due || '9999-99-99') : (b.planDate || '9999-99-99');
        return byText(da, db) || byText(a.title, b.title);
      });
      return { client: name, rows: rows };
    });
  }
  function shortFeed(name) {
    var n = String(name || 'Source').replace(/\s+/g, ' ').trim();
    var cut = n.search(/[:(]/);
    if (cut > 12) n = n.slice(0, cut).replace(/[:.\s]+$/, '');
    return n;
  }
  function sourceGroups(list) {
    var g = { fresh: [], stale: [], failing: [], blocked: [] };
    (list || []).forEach(function (s) {
      if (!s) return;
      var health = s.health || HEALTH[s.status] || '';
      var key = health === 'blocked by site' ? 'blocked' : health;
      if (!g[key]) return;
      g[key].push(shortFeed(s.name || s.id || 'Source'));
    });
    return g;
  }
  function sourceSlides(groups) {
    var flat = [];
    ['failing', 'stale', 'blocked', 'fresh'].forEach(function (k) {
      groups[k].forEach(function (name) { flat.push({ health: k, name: name }); });
    });
    return chunk(flat, SOURCE_ROWS).map(function (rows, i, all) {
      var g = { fresh: [], stale: [], failing: [], blocked: [] };
      rows.forEach(function (r) { g[r.health].push(r.name); });
      return { kind: 'sources', groups: g, counts: { fresh: groups.fresh.length, stale: groups.stale.length, failing: groups.failing.length, blocked: groups.blocked.length }, page: i + 1, pages: all.length, continued: i > 0 };
    });
  }

  function build(input) {
    input = input || {};
    var today = input.today || '';
    var items = selected(input);
    var open = items.filter(function (it) { return it.status === 'open'; });
    var slides = [{
      kind: 'cover', kicker: input.kicker || '', stateName: input.stateName || input.state || '',
      dateLabel: fmtLong(today), clientLabel: input.client || 'All clients',
      openCount: open.length, due14Count: dueRows(items, today, addDays(today, 14)).length,
      starredCount: items.filter(function (it) { return it.starred; }).length,
      accent: input.accent || ''
    }];
    chunk(dueRows(items, today, addDays(today, 30)), DUE_ROWS).forEach(function (rows, i, all) {
      slides.push({ kind: 'due', rows: rows, page: i + 1, pages: all.length, continued: i > 0, accent: input.accent || '' });
    });
    clientGroups(items).forEach(function (g) {
      chunk(g.rows, CLIENT_ROWS).forEach(function (rows, i, all) {
        slides.push({ kind: 'client', client: g.client, rows: rows, page: i + 1, pages: all.length, continued: i > 0, accent: input.accent || '' });
      });
    });
    var watch = items.filter(function (it) { return it.status === 'forecast' && !it.hasSolicitation; }).sort(function (a, b) {
      return byText(a.client, b.client) || byText(a.planDate || '9999-99-99', b.planDate || '9999-99-99') || byText(a.title, b.title);
    });
    chunk(watch, WATCH_ROWS).forEach(function (rows, i, all) {
      slides.push({ kind: 'watch', rows: rows, page: i + 1, pages: all.length, continued: i > 0, accent: input.accent || '' });
    });
    sourceSlides(sourceGroups(input.sources)).forEach(function (s) { s.accent = input.accent || ''; slides.push(s); });
    return { kicker: input.kicker || '', accent: input.accent || '', slides: slides };
  }

  function star(on) { return on ? '<span class="dstar" aria-label="Starred">★</span>' : '<span class="dstar dstar-off"></span>'; }
  function when(it) {
    if (it.status === 'forecast') return it.planDate ? 'Plan ' + fmtDate(it.planDate) : 'Plan date not stated';
    return it.due ? 'Due ' + fmtDate(it.due) : 'Due date not stated';
  }
  function link(it) {
    if (!it.hasSolicitation || !it.url) return '';
    return '<a href="' + esc(it.url) + '" target="_blank" rel="noopener noreferrer">Solicitation</a>';
  }
  function foot(slide, index, total, kicker) {
    var label = slide.continued ? 'Continued' : '';
    return '<footer class="dfoot"><span>' + esc(kicker || '') + '</span><span>' + esc(label) + '</span><span>' + (index + 1) + ' of ' + total + '</span></footer>';
  }
  function frame(slide, index, total, kicker, inner) {
    var accent = slide.accent ? ' style="--deck-acc:' + esc(slide.accent) + '"' : '';
    return '<article class="dslide d-' + slide.kind + '"' + accent + ' data-kind="' + slide.kind + '"><i class="dbar"></i><div class="dbody">' + inner + '</div>' + foot(slide, index, total, kicker) + '</article>';
  }
  function renderSlide(slide, index, total, deck) {
    var kicker = (deck && deck.kicker) || slide.kicker || '';
    if (slide.kind === 'cover') {
      return frame(slide, index, total, kicker,
        '<p class="dkick">' + esc(kicker) + '</p><h2 class="dstate">' + esc(slide.stateName) + '</h2>' +
        '<p class="ddate">' + esc(slide.dateLabel) + '</p><p class="dscope">' + esc(slide.clientLabel) + '</p>' +
        '<ul class="dstats"><li><b>' + slide.openCount + '</b><span>Open A/E items</span></li><li><b>' + slide.due14Count + '</b><span>Due in 14 days</span></li><li><b>' + slide.starredCount + '</b><span>Starred</span></li></ul>' +
        '<p class="dlead">Engineering and A/E consultant work. RFQs, RFPs, and on-call. Past and awarded items are not in this deck.</p>');
    }
    if (slide.kind === 'due') {
      var body = '<p class="dkick">' + esc(kicker) + '</p><h2>Due in the next 30 days' + (slide.continued ? ' <span class="dcont">continued</span>' : '') + '</h2>';
      if (!slide.rows.length) body += '<p class="dempty">No open items are due in the next 30 days.</p>';
      else {
        body += '<table class="dtable"><thead><tr><th>Due</th><th>Client</th><th>No.</th><th>Title</th><th></th></tr></thead><tbody>';
        slide.rows.forEach(function (r) {
          body += '<tr><td class="dwhen">' + esc(fmtDate(r.due)) + '</td><td>' + esc(r.client) + '</td><td>' + esc(r.number || '') + '</td><td>' + esc(r.title) + '</td><td>' + star(r.starred) + '</td></tr>';
        });
        body += '</tbody></table>';
      }
      return frame(slide, index, total, kicker, body);
    }
    if (slide.kind === 'client') {
      var html = '<p class="dkick">' + esc(kicker) + '</p><h2>' + esc(slide.client) + (slide.continued ? ' <span class="dcont">continued</span>' : '') + '</h2><ol class="dblocks">';
      slide.rows.forEach(function (r) {
        html += '<li><div class="dmeta"><span class="dpill">' + esc(r.kind) + '</span>' +
          (r.number ? '<span class="dnum">' + esc(r.number) + '</span>' : '') +
          '<span class="ddue">' + esc(when(r)) + '</span>' + star(r.starred) + link(r) + '</div>' +
          '<p class="ditemt">' + esc(r.title) + '</p>' +
          (r.note ? '<p class="dnote">' + esc(r.note) + '</p>' : '') +
          '<p class="dnext"><span>Next step / owner</span><i></i></p></li>';
      });
      return frame(slide, index, total, kicker, html + '</ol>');
    }
    if (slide.kind === 'watch') {
      var w = '<p class="dkick">' + esc(kicker) + '</p><h2>Watch list' + (slide.continued ? ' <span class="dcont">continued</span>' : '') + '</h2><p class="dsub">Forecast and capital-plan items with no solicitation yet.</p>';
      if (!slide.rows.length) w += '<p class="dempty">No forecast items are waiting on a solicitation.</p>';
      else {
        w += '<table class="dtable"><thead><tr><th>Client</th><th>Title</th><th>Plan date</th><th></th></tr></thead><tbody>';
        slide.rows.forEach(function (r) {
          w += '<tr><td>' + esc(r.client) + '</td><td>' + esc(r.title) + (r.note ? '<span class="dnote-in">' + esc(r.note) + '</span>' : '') + '</td><td class="dwhen">' + esc(r.planDate ? fmtDate(r.planDate) : '') + '</td><td>' + star(r.starred) + '</td></tr>';
        });
        w += '</tbody></table>';
      }
      return frame(slide, index, total, kicker, w);
    }
    var s = '<p class="dkick">' + esc(kicker) + '</p><h2>Sources' + (slide.continued ? ' <span class="dcont">continued</span>' : '') + '</h2><ul class="dcounts">';
    ['fresh', 'stale', 'failing', 'blocked'].forEach(function (k) {
      s += '<li><b>' + slide.counts[k] + '</b><span>' + HEALTH_LABEL[k] + '</span></li>';
    });
    s += '</ul>';
    ['failing', 'stale', 'blocked', 'fresh'].forEach(function (k) {
      if (!slide.groups[k].length) return;
      s += '<h3>' + HEALTH_LABEL[k] + '</h3><ul class="snames">';
      slide.groups[k].forEach(function (name) { s += '<li>' + esc(name) + '</li>'; });
      s += '</ul>';
    });
    return frame(slide, index, total, kicker, s);
  }
  function render(deck) {
    return deck.slides.map(function (s, i) { return renderSlide(s, i, deck.slides.length, deck); }).join('');
  }

  function statesFor(items, names) {
    var seen = {};
    (items || []).forEach(function (it) {
      if (it && it.state && (it.status === 'open' || it.status === 'forecast')) seen[it.state] = 1;
    });
    return Object.keys(seen).map(function (code) { return { code: code, name: (names && names[code]) || code }; })
      .sort(function (a, b) { return a.name.localeCompare(b.name); });
  }
  function clientsFor(items, state) {
    var seen = {}, out = [];
    (items || []).forEach(function (it) {
      if (!it || (state && it.state !== state)) return;
      if (it.status !== 'open' && it.status !== 'forecast') return;
      if (seen[it.client]) return;
      seen[it.client] = 1; out.push(it.client);
    });
    out.sort(function (a, b) { return a.localeCompare(b); });
    return out;
  }
  function defaultState(items) {
    var n = {}, best = '', bestN = -1;
    (items || []).forEach(function (it) {
      if (!it || !it.state || (it.status !== 'open' && it.status !== 'forecast')) return;
      n[it.state] = (n[it.state] || 0) + 1;
    });
    Object.keys(n).forEach(function (k) { if (n[k] > bestN) { best = k; bestN = n[k]; } });
    return best;
  }

  var keyHandler = null;
  var resizeHandler = null;
  var resizeWin = null;
  function open(doc, opts) {
    if (!doc || !doc.body) return;
    opts = opts || {};
    var items = opts.items || [];
    var names = opts.stateNames || {};
    var locked = opts.lockedState || '';
    var rootEl = doc.getElementById('deckRoot');
    if (!rootEl) {
      rootEl = doc.createElement('div');
      rootEl.id = 'deckRoot';
      doc.body.appendChild(rootEl);
    }
    rootEl.className = 'deck-root';
    rootEl.setAttribute('role', 'dialog');
    rootEl.setAttribute('aria-modal', 'true');
    rootEl.setAttribute('aria-label', 'Client deck');
    rootEl.hidden = false;
    doc.body.classList.add('deck-open');
    if (keyHandler) doc.removeEventListener('keydown', keyHandler);
    if (resizeHandler && resizeWin) resizeWin.removeEventListener('resize', resizeHandler);

    var state = locked || opts.state || defaultState(items);
    var client = opts.client || '';
    var viewing = false;
    var index = 0;
    var built = null;
    var x0 = null;

    function fit() {
      var frameEl = doc.getElementById('deckFrame');
      var scale = doc.getElementById('deckScale');
      var stage = doc.getElementById('deckStage');
      if (!frameEl || !scale || !stage) return;
      var s = Math.min(stage.clientWidth / 1280, stage.clientHeight / 720);
      if (!isFinite(s) || s <= 0) s = 1;
      frameEl.style.width = Math.floor(1280 * s) + 'px';
      frameEl.style.height = Math.floor(720 * s) + 'px';
      scale.style.transform = 'scale(' + s + ')';
    }
    function chrome(showNav) {
      var prev = doc.getElementById('deckPrev');
      var next = doc.getElementById('deckNext');
      var back = doc.getElementById('deckBack');
      var count = doc.getElementById('deckCount');
      [prev, next, back].forEach(function (b) { if (b) b.hidden = !showNav; });
      if (!showNav && count) count.textContent = '';
    }
    function draw() {
      var scale = doc.getElementById('deckScale');
      var count = doc.getElementById('deckCount');
      var prev = doc.getElementById('deckPrev');
      var next = doc.getElementById('deckNext');
      if (!scale || !built) return;
      scale.innerHTML = renderSlide(built.slides[index], index, built.slides.length, built);
      if (count) count.textContent = (index + 1) + ' of ' + built.slides.length;
      if (prev) prev.disabled = index === 0;
      if (next) next.disabled = index === built.slides.length - 1;
      fit();
    }
    function go(delta) {
      if (!viewing || !built) return;
      var n = index + delta;
      if (n < 0 || n >= built.slides.length) return;
      index = n;
      draw();
    }
    function fillClients() {
      var sel = doc.getElementById('deckClient');
      if (!sel) return;
      var list = clientsFor(items, state);
      var html = '<option value="">All clients</option>';
      list.forEach(function (name) { html += '<option value="' + esc(name) + '">' + esc(name) + '</option>'; });
      sel.innerHTML = html;
      sel.value = list.indexOf(client) >= 0 ? client : '';
      client = sel.value;
    }
    function showPicker() {
      viewing = false;
      built = null;
      chrome(false);
      var stage = doc.getElementById('deckStage');
      var states = locked ? [{ code: locked, name: names[locked] || locked }] : statesFor(items, names);
      if (!state && states[0]) state = states[0].code;
      var optsHtml = states.map(function (s) { return '<option value="' + esc(s.code) + '">' + esc(s.name) + '</option>'; }).join('');
      stage.innerHTML = '<div class="deck-pick"><p class="dkick">' + esc(opts.kicker || '') + '</p><h2>Client deck</h2>' +
        '<p class="dlead">Open and forecast A/E work for one state. Past and awarded items stay out.</p>' +
        '<label>State<select id="deckState"' + (locked ? ' disabled' : '') + '>' + optsHtml + '</select></label>' +
        '<label>Client<select id="deckClient"></select></label>' +
        '<button type="button" class="deck-go" id="deckGo">Show deck</button></div>';
      var stateSel = doc.getElementById('deckState');
      if (stateSel) {
        stateSel.value = state;
        stateSel.addEventListener('change', function () { state = stateSel.value; client = ''; fillClients(); });
      }
      fillClients();
      var clientSel = doc.getElementById('deckClient');
      if (clientSel) clientSel.addEventListener('change', function () { client = clientSel.value; });
      doc.getElementById('deckGo').addEventListener('click', function () { showSlides(0); });
    }
    function showSlides(start) {
      var stateName = names[state] || state;
      built = build({
        kicker: opts.kicker || '', state: state, stateName: stateName, client: client,
        today: opts.today || '', items: items, sources: opts.sources || [], accent: opts.accent || ''
      });
      viewing = true;
      index = Math.max(0, Math.min(start || 0, built.slides.length - 1));
      var stage = doc.getElementById('deckStage');
      stage.innerHTML = '<div class="deck-frame" id="deckFrame"><div class="deck-scale" id="deckScale"></div></div>';
      chrome(true);
      draw();
      stage.focus();
    }
    function close() {
      rootEl.hidden = true;
      doc.body.classList.remove('deck-open');
      if (keyHandler) doc.removeEventListener('keydown', keyHandler);
      keyHandler = null;
      if (resizeHandler && resizeWin) resizeWin.removeEventListener('resize', resizeHandler);
      resizeHandler = null;
      resizeWin = null;
      if (doc.fullscreenElement && doc.exitFullscreen) doc.exitFullscreen();
    }
    rootEl.innerHTML = '<div class="deck-bar"><button type="button" class="deck-nav" id="deckPrev" hidden>Previous</button>' +
      '<p class="deck-count" id="deckCount" aria-live="polite"></p>' +
      '<button type="button" class="deck-nav" id="deckNext" hidden>Next</button><span class="deck-grow"></span>' +
      '<button type="button" class="deck-nav" id="deckBack" hidden>Change selection</button>' +
      '<button type="button" class="deck-nav" id="deckFull">Full screen</button>' +
      '<button type="button" class="deck-nav" id="deckClose">Close</button></div>' +
      '<div class="deck-stage" id="deckStage" tabindex="0"></div>';
    var full = doc.getElementById('deckFull');
    if (!rootEl.requestFullscreen) full.hidden = true;
    doc.getElementById('deckPrev').addEventListener('click', function () { go(-1); });
    doc.getElementById('deckNext').addEventListener('click', function () { go(1); });
    doc.getElementById('deckBack').addEventListener('click', showPicker);
    doc.getElementById('deckClose').addEventListener('click', close);
    full.addEventListener('click', function () {
      if (doc.fullscreenElement && doc.exitFullscreen) doc.exitFullscreen();
      else if (rootEl.requestFullscreen) rootEl.requestFullscreen();
    });
    var stage = doc.getElementById('deckStage');
    stage.addEventListener('touchstart', function (e) { x0 = e.changedTouches && e.changedTouches[0] ? e.changedTouches[0].clientX : null; }, { passive: true });
    stage.addEventListener('touchend', function (e) {
      if (x0 === null || !e.changedTouches || !e.changedTouches[0]) return;
      var dx = e.changedTouches[0].clientX - x0;
      x0 = null;
      if (dx > 50) go(-1); else if (dx < -50) go(1);
    }, { passive: true });
    keyHandler = function (e) {
      if (rootEl.hidden) return;
      var tag = e.target && e.target.tagName;
      if (tag === 'SELECT' || tag === 'INPUT' || tag === 'TEXTAREA') {
        if (e.key === 'Escape') close();
        return;
      }
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
    };
    doc.addEventListener('keydown', keyHandler);
    resizeWin = doc.defaultView || null;
    resizeHandler = fit;
    if (resizeWin) resizeWin.addEventListener('resize', resizeHandler);
    if (typeof opts.slide === 'number') showSlides(opts.slide);
    else showPicker();
  }

  return {
    fromTexas: fromTexas, fromNational: fromNational, build: build, render: render, open: open,
    statesFor: statesFor, clientsFor: clientsFor
  };
});
