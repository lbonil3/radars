/* Texas Opportunity: Intel tab. Reads data/intel.json (same site). Stars, read marks and the last-visit time stay on this device. */
(function () {
  'use strict';
  var I = window.TXIntel, $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var K_STAR = 'opportunityRadar.intelWatch.v1', K_READ = 'opportunityRadar.intelRead.v1', K_SEEN = 'opportunityRadar.intelSeen.v1';
  function load(k, d) { try { var v = JSON.parse(localStorage.getItem(k) || 'null'); return v === null ? d : v; } catch (e) { return d; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage blocked: marks last for this visit only */ } }
  var S = { data: null, items: [], star: load(K_STAR, {}), read: load(K_READ, {}), seenAt: load(K_SEEN, null), newIds: {}, f: { q: '', topics: [], place: '', days: 90, starOnly: false, unreadOnly: false }, sort: 'date', rows: 60, err: null };
  var DAY = 864e5;
  function itDate(it) { return it.date || it.firstSeen; }
  function fmtD(iso) { if (!iso) return 'date unknown'; var d = new Date(iso); return isNaN(d) ? 'date unknown' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
  function fmtDT(iso) { try { return new Date(iso).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }); } catch (e) { return iso; } }
  function isNew(it) { return !!S.newIds[it.id]; }
  function computeNew() { S.newIds = {}; if (!S.seenAt) return; S.items.forEach(function (it) { if ((it.firstSeen || '') > S.seenAt) S.newIds[it.id] = 1; }); }
  function badge() { var b = $('intelBadge'); if (!b) return; var n = Object.keys(S.newIds).length; b.textContent = n > 99 ? '99+' : String(n); b.hidden = !n; b.setAttribute('aria-label', n + ' new since your last visit'); }
  function placeKey(it) { return it.place || ''; }
  function filtered() {
    var f = S.f, q = f.q.toLowerCase(), cut = Date.now() - f.days * DAY;
    var out = S.items.filter(function (it) {
      if (f.days < 90 && Date.parse(itDate(it)) < cut) return false;
      if (f.topics.length && !f.topics.some(function (t) { return it.topics.indexOf(t) >= 0; })) return false;
      if (f.place) { if (f.place.indexOf('r:') === 0) { if (it.region !== f.place.slice(2)) return false; } else if (placeKey(it) !== f.place.slice(2)) return false; }
      if (f.starOnly && !S.star[it.id]) return false;
      if (f.unreadOnly && S.read[it.id]) return false;
      if (q && (it.title + ' ' + it.source + ' ' + (it.place || '') + ' ' + it.region + ' ' + (it.desc || '') + ' ' + (it.why || []).join(' ')).toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
    out.sort(S.sort === 'score' ? function (a, b) { return (b.score - a.score) || (itDate(b) > itDate(a) ? 1 : -1); } : function (a, b) { var x = isNew(b) - isNew(a); return x || (itDate(b) > itDate(a) ? 1 : itDate(b) < itDate(a) ? -1 : b.score - a.score); });
    return out;
  }
  function buildControls() {
    var counts = {}; S.items.forEach(function (it) { it.topics.forEach(function (t) { counts[t] = (counts[t] || 0) + 1; }); });
    $('inTopics').innerHTML = I.TOPICS.map(function (t) { return '<button type="button" class="chip' + (S.f.topics.indexOf(t.id) >= 0 ? ' on' : '') + '" data-itopic="' + t.id + '" aria-pressed="' + (S.f.topics.indexOf(t.id) >= 0) + '">' + esc(t.label) + ' <small>' + (counts[t.id] || 0) + '</small></button>'; }).join('');
    var reg = {}, pl = {}; S.items.forEach(function (it) { reg[it.region] = (reg[it.region] || 0) + 1; if (it.place) (pl[it.region] = pl[it.region] || {})[it.place] = (pl[it.region][it.place] || 0) + 1; });
    var h = '<option value="">All of Texas (' + S.items.length + ')</option>';
    I.REGIONS.filter(function (r) { return reg[r]; }).forEach(function (r) {
      h += '<optgroup label="' + esc(r) + '"><option value="r:' + esc(r) + '">All ' + esc(r) + ' (' + reg[r] + ')</option>' + Object.keys(pl[r] || {}).sort().map(function (p) { return '<option value="p:' + esc(p) + '">' + esc(p) + ' (' + pl[r][p] + ')</option>'; }).join('') + '</optgroup>';
    });
    $('inPlace').innerHTML = h; $('inPlace').value = S.f.place;
    Array.prototype.forEach.call(document.querySelectorAll('#inDays button'), function (b) { b.classList.toggle('on', +b.getAttribute('data-idays') === S.f.days); });
    $('inStar').classList.toggle('on', S.f.starOnly); $('inUnread').classList.toggle('on', S.f.unreadOnly);
  }
  function card(it) {
    var st = !!S.star[it.id], rd = !!S.read[it.id];
    var tags = it.topics.map(function (t) { return '<span class="itag">' + esc(I.topicLabel(t)) + '</span>'; }).join('') + '<span class="itag pl">' + esc(it.place ? it.place + (it.region && it.region !== it.place ? ' · ' + it.region : '') : it.region) + '</span>';
    return '<article class="icard' + (rd ? ' read' : '') + (isNew(it) ? ' isnew' : '') + '" data-iid="' + esc(it.id) + '">' +
      '<button type="button" class="star" data-istar="' + esc(it.id) + '" aria-pressed="' + st + '" aria-label="' + (st ? 'Remove star' : 'Star this item') + '">' + (st ? '&#9733;' : '&#9734;') + '</button>' +
      '<div class="b"><h3 class="t"><a href="' + esc(it.link) + '" target="_blank" rel="noopener noreferrer" data-iopen="' + esc(it.id) + '">' + esc(it.title) + '</a></h3>' +
      '<div class="m">' + (isNew(it) ? '<span class="new">New</span>' : '') + '<span>' + esc(it.source) + '</span><span>' + esc(fmtD(it.date)) + (it.date ? '' : ' (first seen ' + esc(fmtD(it.firstSeen)) + ')') + '</span></div>' +
      '<div class="itags">' + tags + '</div>' +
      (it.desc ? '<p class="ids">' + esc(it.desc) + '</p>' : '') +
      (it.why && it.why.length ? '<p class="iwhy"><b>Why this matters:</b> mentions ' + it.why.map(function (w) { return '“' + esc(w) + '”'; }).join(', ') + '.</p>' : '') +
      (it.linkNote ? '<p class="ihint">' + esc(it.linkNote) + '</p>' : '') + (it.hint ? '<p class="ihint"><b>Positioning hint:</b> ' + esc(it.hint) + '</p>' : '') +
      '<div class="iact"><a class="btn small" href="' + esc(it.link) + '" target="_blank" rel="noopener noreferrer" data-iopen="' + esc(it.id) + '">Open original ↗</a><button type="button" class="btn small" data-iread="' + esc(it.id) + '">' + (rd ? 'Mark unread' : 'Mark read') + '</button>' +
      (it.also && it.also.length ? '<span class="also">Also reported by ' + it.also.map(function (a) { return '<a href="' + esc(a.link) + '" target="_blank" rel="noopener noreferrer">' + esc(a.source) + '</a>'; }).join(', ') + '</span>' : '') + '</div></div></article>';
  }
  function render() {
    if (!$('v-intel')) return;
    var d = S.data, st = $('inState');
    if (S.err) { st.innerHTML = '<p><b>Intel could not be loaded</b> (' + esc(S.err) + '). Nothing is shown; no sample items are substituted.</p>'; st.hidden = false; $('inList').innerHTML = ''; $('inCount').textContent = ''; return; }
    if (!d) return;
    var ageH = (Date.now() - Date.parse(d.generatedAt)) / 36e5;
    st.hidden = ageH < 48; st.innerHTML = ageH >= 48 ? '<p><b>Intel may be out of date:</b> last collected ' + esc(fmtDT(d.generatedAt)) + ' (' + Math.round(ageH / 24) + ' days ago). The daily collection may have failed; items still link to their originals.</p>' : '';
    buildControls();
    var list = filtered(), nNew = Object.keys(S.newIds).length;
    $('inCount').textContent = list.length + ' of ' + S.items.length + ' items · collected ' + fmtDT(d.generatedAt) + (S.seenAt ? ' · ' + nNew + ' new since your last visit' : '');
    $('inList').innerHTML = list.length ? list.slice(0, S.rows).map(card).join('') : '<div class="panel iempty"><p><b>No items match.</b> ' + (S.items.length ? 'Try fewer topics, a longer date range, or clear the search.' : 'The collector has not found any relevant items yet.') + '</p>' + (S.items.length ? '<button type="button" class="btn small" id="inClear2">Clear Intel filters</button>' : '') + '</div>';
    $('inMore').hidden = list.length <= S.rows;
  }
  function renderSourceHealth() {
    var el = $('srcIntel'); if (!el) return;
    if (!S.data) { el.innerHTML = '<div class="panel"><p>' + (S.err ? 'Intel feed could not be loaded (' + esc(S.err) + ').' : 'Loading…') + '</p></div>'; return; }
    var ss = (S.data.sources && S.data.sources.sources) || [], c = S.data.sources && S.data.sources.counts || {};
    el.innerHTML = '<div class="panel"><p><b>Intel collected:</b> ' + esc(fmtDT(S.data.generatedAt)) + ' · ' + ss.length + ' feeds · ' + (c.fresh || 0) + ' fresh, ' + (c.stale || 0) + ' stale, ' + (c.failing || 0) + ' failing. Only items matching drainage, water, roadway, budget, bond, grant or agenda words are kept, for ' + (S.data.keepDays || 90) + ' days.</p></div>' +
      '<div class="cards">' + ss.map(function (s) { var cls = s.health === 'fresh' ? 'ok' : s.health === 'stale' ? 'stale' : 'failed';
        return '<div class="src"><h3>' + esc(s.name) + '</h3><p><span class="st ' + cls + '">' + esc(String(s.health || '').toUpperCase()) + '</span> · items kept ' + (s.records || 0) + ' · read ' + (s.fetched || 0) + '</p><p>Last success ' + esc(s.lastSuccess ? fmtDT(s.lastSuccess) : 'never') + (s.error ? ' · ' + esc(s.error) : '') + '</p></div>'; }).join('') + '</div>';
  }
  function exportCsv() {
    var rows = [['date', 'title', 'source', 'place', 'region', 'topics', 'why', 'hint', 'link', 'starred']].concat(filtered().map(function (it) { return [(it.date || '').slice(0, 10), it.title, it.source, it.place || '', it.region, it.topics.map(I.topicLabel).join('; '), (it.why || []).join('; '), it.hint || '', it.link, S.star[it.id] ? 'yes' : '']; }));
    var csv = rows.map(function (r) { return r.map(function (v) { v = String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(','); }).join('\n');
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'texas-intel-' + new Date().toISOString().slice(0, 10) + '.csv'; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function markRead(id, v) { if (v) S.read[id] = 1; else delete S.read[id]; save(K_READ, S.read); }
  function onShow() { // opening the tab: keep this visit's New marks, then record the visit so the badge clears
    render(); S.seenAt = new Date().toISOString(); save(K_SEEN, S.seenAt); var b = $('intelBadge'); if (b) b.hidden = true;
  }
  function init() {
    var v = $('v-intel'); if (!v) return;
    v.addEventListener('click', function (e) {
      var t = e.target, el;
      if ((el = t.closest('[data-imode]'))) { setMode(el.getAttribute('data-imode')); return; }
      if ((el = t.closest('[data-nl]'))) { nlAction(el.getAttribute('data-nl')); return; }
      if ((el = t.closest('[data-istar]'))) { var id = el.getAttribute('data-istar'); if (S.star[id]) delete S.star[id]; else S.star[id] = 1; save(K_STAR, S.star); render(); return; }
      if ((el = t.closest('[data-iread]'))) { var r = el.getAttribute('data-iread'); markRead(r, !S.read[r]); render(); return; }
      if ((el = t.closest('[data-iopen]'))) { markRead(el.getAttribute('data-iopen'), true); setTimeout(render, 0); return; }
      if ((el = t.closest('[data-itopic]'))) { var k = el.getAttribute('data-itopic'), i = S.f.topics.indexOf(k); if (i >= 0) S.f.topics.splice(i, 1); else S.f.topics.push(k); S.rows = 60; render(); return; }
      if ((el = t.closest('[data-idays]'))) { S.f.days = +el.getAttribute('data-idays'); S.rows = 60; render(); return; }
      if (t.closest('#inStar')) { S.f.starOnly = !S.f.starOnly; render(); return; }
      if (t.closest('#inUnread')) { S.f.unreadOnly = !S.f.unreadOnly; render(); return; }
      if (t.closest('#inClear') || t.closest('#inClear2')) { S.f = { q: '', topics: [], place: '', days: 90, starOnly: false, unreadOnly: false }; $('inQ').value = ''; render(); return; }
      if (t.closest('#inMore')) { S.rows += 60; render(); return; }
      if (t.closest('#inCsv')) { exportCsv(); return; }
    });
    $('nlWeek').addEventListener('change', function () { loadWeek(this.value); });
    if (navigator.share) $('nlShare').hidden = false;
    $('inPlace').addEventListener('change', function () { S.f.place = this.value; S.rows = 60; render(); });
    $('inSort').addEventListener('change', function () { S.sort = this.value; render(); });
    $('inQ').addEventListener('input', function () { clearTimeout(init._t); var q = this.value; init._t = setTimeout(function () { S.f.q = q.trim(); render(); }, 200); });
    fetch('data/intel.json', { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (d) { S.data = d; S.items = (d.items || []).filter(function (it) { return it && it.id && /^https?:\/\//.test(it.link); }); computeNew(); badge(); render(); renderSourceHealth(); if (window.RadarApp && window.RadarApp.tab === 'intel') onShow(); })
      .catch(function (e) { S.err = e.message; render(); renderSourceHealth(); });
  }
  // ---------- weekly newsletter ----------
  var NL = { index: null, cur: null, cache: {}, mode: 'feed' };
  var Nw = window.TXNewsletter;
  function toast(m) { var t = $('toast'); if (!t) return; t.textContent = m; t.hidden = false; clearTimeout(toast._t); toast._t = setTimeout(function () { t.hidden = true; }, 3000); }
  function setMode(m) {
    NL.mode = m; $('inFeed').hidden = m !== 'feed'; $('inNews').hidden = m !== 'news';
    Array.prototype.forEach.call(document.querySelectorAll('#inMode button'), function (b) { var on = b.getAttribute('data-imode') === m; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
    if (m === 'news') loadIndex();
  }
  function loadIndex() {
    if (NL.index) return;
    $('nlStatus').textContent = 'Loading…';
    fetch('data/newsletters/index.json', { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }).then(function (ix) {
      NL.index = ix; var w = (ix.weeks || []);
      if (!w.length) { $('nlStatus').textContent = ''; $('nlPaper').innerHTML = '<p>No newsletter issues yet. The first one is built on the next daily collection.</p>'; return; }
      $('nlWeek').innerHTML = w.map(function (x) { return '<option value="' + esc(x.week) + '">' + esc(x.week + ' · ' + fmtD(x.start + 'T12:00:00Z') + ' to ' + fmtD(x.end + 'T12:00:00Z')) + (x.final ? '' : ' · in progress') + ' (' + x.items + ')</option>'; }).join('');
      var first = w.filter(function (x) { return x.final && x.items; })[0] || w.filter(function (x) { return x.items; })[0] || w[0]; /* open on the latest finished issue */ $('nlWeek').value = first.week; loadWeek(first.week);
    }).catch(function (e) { $('nlStatus').textContent = ''; $('nlPaper').innerHTML = '<p><b>Newsletter could not be loaded</b> (' + esc(e.message) + ').</p>'; });
  }
  function loadWeek(wk) {
    var show = function (n) { NL.cur = n; pmMark(); $('nlPaper').innerHTML = Nw.toHtml(n, { fragment: true, theme: 'dark', icons: true }); $('nlStatus').textContent = Nw.status(n) + (n.generatedAt ? ' · built ' + fmtDT(n.generatedAt) : ''); };
    if (NL.cache[wk]) return show(NL.cache[wk]);
    $('nlStatus').textContent = 'Loading…';
    fetch('data/newsletters/' + encodeURIComponent(wk) + '.json', { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }).then(function (n) { NL.cache[wk] = n; show(n); })
      .catch(function (e) { NL.cur = null; $('nlStatus').textContent = ''; $('nlPaper').innerHTML = '<p><b>This issue could not be loaded</b> (' + esc(e.message) + ').</p>'; });
  }
  function download(name, type, body) { var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([body], { type: type })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500); }
  function copyText(t) { if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(t); return Promise.reject(new Error('clipboard unavailable')); }
  var PMK = 'opportunityRadar.nlPrintMode.v1';
  function pmSet(m) { try { localStorage.setItem(PMK, m); } catch (e) {} pmMark(); }
  function pmMark() { var m = 'mag'; try { m = localStorage.getItem(PMK) || 'mag'; } catch (e) {} document.querySelectorAll('[data-pm]').forEach(function (b) { var on = b.getAttribute('data-pm') === m; b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.classList.toggle('on', on); }); }
  function nlAction(act) {
    var n = NL.cur; if (!n) { toast('Pick a week first.'); return; }
    var base = 'texas-intel-' + n.week;
    if (act === 'copytext') copyText(Nw.toText(n)).then(function () { toast('Newsletter copied as text.'); }, function () { toast('Copy is blocked in this browser. Use Download .txt.'); });
    else if (act === 'copyhtml') {
      var html = Nw.toHtml(n, { fragment: true, theme: 'light' });
      if (window.ClipboardItem && navigator.clipboard && navigator.clipboard.write) navigator.clipboard.write([new window.ClipboardItem({ 'text/html': new Blob([html], { type: 'text/html' }), 'text/plain': new Blob([Nw.toText(n)], { type: 'text/plain' }) })]).then(function () { toast('Copied. Paste into a new email.'); }, function () { copyText(html).then(function () { toast('Copied the HTML source.'); }, function () { toast('Copy is blocked here. Use Download .html.'); }); });
      else copyText(html).then(function () { toast('Copied the HTML source.'); }, function () { toast('Copy is blocked here. Use Download .html.'); });
    } else if (act === 'print') { pmSet('compact'); document.body.classList.add('nlprint'); $('nlPaper').innerHTML = Nw.toHtml(n, { fragment: true, theme: 'light', icons: true }); /* ink-friendly */ var done = function () { document.body.classList.remove('nlprint'); if (NL.cur) $('nlPaper').innerHTML = Nw.toHtml(NL.cur, { fragment: true, theme: 'dark', icons: true }); window.removeEventListener('afterprint', done); }; window.addEventListener('afterprint', done); setTimeout(function () { window.print(); setTimeout(done, 1500); }, 30); }
    else if (act === 'mag') { pmSet('mag'); var M = window.TXMagazine, box = $('nlMag'), st = document.getElementById('mzPage'); if (!st) { st = document.createElement('style'); st.id = 'mzPage'; document.head.appendChild(st); } st.textContent = M.pageCss(n); box.innerHTML = M.build(n); box.hidden = false; document.body.classList.add('nlmag'); var fin = function () { NL.magFin = null; document.body.classList.remove('nlmag'); box.hidden = true; box.innerHTML = ''; st.textContent = ''; window.removeEventListener('afterprint', fin); }; if (NL.magFin) NL.magFin(); NL.magFin = fin; window.addEventListener('afterprint', fin); setTimeout(function () { window.print(); }, 60); } /* no timed cleanup: mobile print() returns before the sheet closes */
    else if (act === 'html') { var Mz = window.TXMagazine; fetch('magazine.css').then(function (r) { return r.ok ? r.text() : ''; }).catch(function () { return ''; }).then(function (css) { download(base + '.html', 'text/html', css ? Mz.toDoc(n, css) : Nw.toHtml(n)); }); }
    else if (act === 'txt') download(base + '.txt', 'text/plain', Nw.toText(n));
    else if (act === 'share' && navigator.share) navigator.share({ title: n.title, text: Nw.toText(n) }).catch(function () { /* cancelled */ });
  }
  window.TXIntelUI = { onShow: onShow, setMode: setMode, nl: NL, render: render, renderSourceHealth: renderSourceHealth, state: S };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
