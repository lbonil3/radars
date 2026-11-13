/* Shared app shell for National and Texas: tab bar and More menu, last-view memory (<app>.tab), the Filters drawer,
   and the details panel (desktop, 1024px and wider) or bottom sheet (phone). Browser + Node, no dependencies.
   It never fetches records and never draws cards or maps; each app does that and calls these methods. */
(function (root, factory) {
  var Storage = (typeof module === 'object' && module.exports) ? require('./storage.js') : root.RadarStorage;
  var api = factory(Storage);
  if (typeof module === 'object' && module.exports) module.exports = api; else root.RadarShell = api;
})(typeof self !== 'undefined' ? self : this, function (Storage) {
  'use strict';
  var BREAKPOINT = 1024;
  var QUERY = '(min-width: 1024px)'; // same value as the @media rule in shared/shell.css
  var MAP_FAIL_TEXT = 'The map could not be drawn here. The list and record details still work.';
  function tabKey(app) { return (app === 'texas' ? 'texas' : 'national') + '.tab'; }
  function restoreTab(ls, app, allowed, legacyKeys) {
    var key = tabKey(app), legacy = legacyKeys || [];
    legacy.forEach(function (k) { Storage.migrateCopy(ls, k, key); });
    var v = Storage.read(ls, key, legacy);
    return allowed.indexOf(v) >= 0 ? v : 'list';
  }
  function guardMap(doc, noteId, fn, hideId) {
    var note = doc.getElementById(noteId), hide = hideId ? doc.getElementById(hideId) : null;
    try {
      fn();
      if (note) note.hidden = true;
      if (hide) hide.hidden = false;
      return true;
    } catch (e) {
      if (note) { note.textContent = MAP_FAIL_TEXT; note.hidden = false; }
      if (hide) hide.hidden = true;
      return false;
    }
  }
  function noLocLabel(n) {
    if (!n) return '';
    return n.toLocaleString('en-US') + ' record' + (n === 1 ? '' : 's') + ' with no location (in the list, not on the map)';
  }
  function bind(opts) {
    var doc = opts.doc, ls = opts.ls, media = opts.media || null, app = opts.app;
    var more = opts.more || [], all = (opts.tabs || []).concat(more), labels = opts.labels || {}, cols = opts.cols || {};
    var $ = function (id) { return doc.getElementById(id); };
    var st = { tab: restoreTab(ls, app, all, opts.legacyTabKeys), detail: false, filters: false };
    function isDesktop() { return !!(media && media.matches); }
    function colsFor(id) { return cols[id] ? $(cols[id]) : null; }
    function setMore(open) {
      var m = $('tabMore'), b = $('tabMoreBtn');
      if (m) m.hidden = !open;
      if (b) b.setAttribute('aria-expanded', String(!!open));
    }
    function clearDock() {
      all.forEach(function (id) { var c = colsFor(id); if (c) c.classList.remove('shell-has-detail'); });
      var s = $('sheet'); if (s) s.classList.remove('shell-docked');
      doc.body.classList.remove('shell-docked-open');
    }
    function openDetail() {
      var sheet = $('sheet'); if (!sheet) return false;
      var c = colsFor(st.tab), dock = isDesktop() && !!c;
      clearDock();
      if (dock) {
        if (sheet.parentNode !== c) c.appendChild(sheet);
        c.classList.add('shell-has-detail'); sheet.classList.add('shell-docked'); doc.body.classList.add('shell-docked-open');
        sheet.setAttribute('aria-modal', 'false'); doc.body.style.overflow = '';
      } else {
        if (sheet.parentNode !== doc.body) doc.body.appendChild(sheet);
        sheet.setAttribute('aria-modal', 'true'); doc.body.style.overflow = 'hidden';
      }
      sheet.hidden = false; st.detail = true;
      return dock;
    }
    function closeDetail(o) {
      var sheet = $('sheet'), was = st.detail;
      if (sheet) sheet.hidden = true;
      clearDock(); doc.body.style.overflow = ''; st.detail = false;
      if (was && !(o && o.silent) && opts.onDetailClose) opts.onDetailClose();
      return was;
    }
    function openFilters() {
      var d = $('adv'), bg = $('advBg'), b = $('btnMore'), c = $('advClose'); if (!d) return;
      d.hidden = false; d.classList.add('shell-drawer-open'); if (bg) bg.hidden = false;
      if (b) b.setAttribute('aria-expanded', 'true');
      st.filters = true; if (c && c.focus) c.focus();
    }
    function closeFilters() {
      var d = $('adv'), bg = $('advBg'), b = $('btnMore'), was = st.filters; if (!d) return;
      d.hidden = true; d.classList.remove('shell-drawer-open'); if (bg) bg.hidden = true;
      if (b) b.setAttribute('aria-expanded', 'false');
      st.filters = false; if (was && b && b.focus) b.focus();
    }
    function showTab(id, o) {
      if (all.indexOf(id) < 0) id = 'list';
      if (st.detail) closeDetail({ silent: true });
      st.tab = id;
      if (!(o && o.save === false)) Storage.write(ls, tabKey(app), id);
      all.forEach(function (k) { var v = $('v-' + k); if (v) v.hidden = k !== id; });
      var btns = doc.querySelectorAll('.tabs [data-tab]');
      for (var i = 0; i < btns.length; i++) { var on = btns[i].getAttribute('data-tab') === id; btns[i].classList.toggle('on', on); btns[i].setAttribute('aria-current', on ? 'page' : 'false'); }
      var inMore = more.indexOf(id) >= 0, mb = $('tabMoreBtn'), ml = $('tabMoreLbl');
      if (mb) mb.classList.toggle('on', inMore);
      if (ml) ml.textContent = inMore ? (labels[id] || id) : '';
      setMore(false);
      doc.body.setAttribute('data-shell-tab', id);
      if (opts.onTab) opts.onTab(id);
      return id;
    }
    var moreBtn = $('tabMoreBtn');
    if (moreBtn) moreBtn.addEventListener('click', function (e) { if (e && e.stopPropagation) e.stopPropagation(); var m = $('tabMore'); setMore(m ? m.hidden : false); });
    doc.addEventListener('click', function (e) { var t = e && e.target; if (!(t && t.closest && t.closest('#tabMore,#tabMoreBtn'))) setMore(false); }, true);
    var fBtn = $('btnMore'), fClose = $('advClose'), fBg = $('advBg');
    if (fBtn) fBtn.addEventListener('click', function () { if (st.filters) closeFilters(); else openFilters(); });
    if (fClose) fClose.addEventListener('click', closeFilters);
    if (fBg) fBg.addEventListener('click', closeFilters);
    doc.addEventListener('keydown', function (e) {
      if (!e || e.key !== 'Escape') return;
      if (st.filters) { closeFilters(); return; }
      var m = $('tabMore'); if (m && !m.hidden) setMore(false);
    });
    if (media) {
      var onChange = function () { if (st.detail) openDetail(); };
      if (media.addEventListener) media.addEventListener('change', onChange); else if (media.addListener) media.addListener(onChange);
    }
    return {
      app: app, initial: st.tab, showTab: showTab, current: function () { return st.tab; },
      openDetail: openDetail, closeDetail: closeDetail, isDetailOpen: function () { return st.detail; },
      openFilters: openFilters, closeFilters: closeFilters, isFiltersOpen: function () { return st.filters; },
      isDesktop: isDesktop, setMore: setMore
    };
  }
  return { BREAKPOINT: BREAKPOINT, QUERY: QUERY, MAP_FAIL_TEXT: MAP_FAIL_TEXT, tabKey: tabKey, restoreTab: restoreTab, bind: bind, guardMap: guardMap, noLocLabel: noLocLabel };
});
