/* Product theme: Day default, Night, or Auto. Key radars.theme; copy-forward from nr.theme. Browser + Node. */
(function (root, factory) {
  var Storage = (typeof module === 'object' && module.exports) ? require('./storage.js') : root.RadarStorage;
  var api = factory(Storage);
  if (typeof module === 'object' && module.exports) module.exports = api; else root.RadarTheme = api;
})(typeof self !== 'undefined' ? self : this, function (Storage) {
  'use strict';
  var KEY = 'radars.theme', LEGACY_KEYS = ['nr.theme'], VALID = { day: 1, night: 1, auto: 1 };
  var COLORS = { day: '#f5f7fb', night: '#0a1020' };
  function migrate(ls) { return Storage.migrateCopy(ls, LEGACY_KEYS[0], KEY); }
  function readPref(ls) {
    migrate(ls);
    var v = Storage.read(ls, KEY, LEGACY_KEYS);
    return v && VALID[v] ? v : 'day';
  }
  function setPref(ls, pref) {
    if (!VALID[pref]) return false;
    return Storage.write(ls, KEY, pref);
  }
  function resolve(pref, darkQueryMatches) {
    if (pref === 'night') return 'night';
    if (pref === 'auto' && darkQueryMatches) return 'night';
    return 'day';
  }
  function apply(doc, pref, opts) {
    opts = opts || {};
    var p = VALID[pref] ? pref : 'day';
    var dark = typeof opts.dark === 'boolean' ? opts.dark : resolve(p, !!opts.darkQueryMatches) === 'night';
    var t = dark ? 'night' : 'day';
    var colors = opts.colors || COLORS;
    var d = doc.documentElement;
    d.setAttribute('data-theme', t);
    d.setAttribute('data-theme-pref', p);
    d.style.colorScheme = dark ? 'dark' : 'light';
    var m = doc.getElementById('themeColor'); if (m) m.setAttribute('content', dark ? colors.night : colors.day);
    var b = doc.getElementById('sbStyle'); if (b) b.setAttribute('content', dark ? 'black-translucent' : 'default');
    var nodes = doc.querySelectorAll('[data-theme-set]');
    for (var i = 0; i < nodes.length; i++) {
      var x = nodes[i], on = x.getAttribute('data-theme-set') === p;
      x.classList.toggle('on', on);
      x.setAttribute('aria-pressed', String(on));
    }
  }
  function bind(doc, ls, opts) {
    opts = opts || {};
    function currentDark() {
      if (typeof opts.darkQueryMatches === 'boolean') return opts.darkQueryMatches;
      return !!(doc.defaultView && doc.defaultView.matchMedia && doc.defaultView.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    function go() { apply(doc, readPref(ls), { darkQueryMatches: currentDark(), colors: opts.colors }); }
    migrate(ls); go();
    var nodes = doc.querySelectorAll('[data-theme-set]');
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].addEventListener('click', function (e) {
        e.stopPropagation();
        setPref(ls, this.getAttribute('data-theme-set'));
        go();
      });
    }
    var win = doc.defaultView;
    if (win && win.matchMedia) {
      var mq = win.matchMedia('(prefers-color-scheme: dark)');
      var onMq = function () { if (readPref(ls) === 'auto') go(); };
      if (mq.addEventListener) mq.addEventListener('change', onMq);
      else if (mq.addListener) mq.addListener(onMq);
    }
  }
  return { KEY: KEY, LEGACY_KEYS: LEGACY_KEYS, COLORS: COLORS, readPref: readPref, setPref: setPref, resolve: resolve, migrate: migrate, apply: apply, bind: bind };
});
