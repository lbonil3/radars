/* Shared PWA cache names and precache lists. Browser (service worker) + Node, no dependencies. */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api; else root.RadarCache = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var VERSION = 22;
  var SHARED = ['storage.js', 'theme.js', 'filters.js', 'capture.js', 'shell.css', 'cache.js'];
  function shared(prefix) { return SHARED.map(function (f) { return prefix + f; }); }
  function name(app) {
    var prefix = app === 'texas' ? 'radars-texas-' : app === 'home' ? 'radars-home-' : 'radars-national-';
    return prefix + 'v' + VERSION;
  }
  function files(app) {
    if (app === 'home') {
      return ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png', './icons/apple-touch-icon.png', './national/icon-192.png', './texas/icon-192.png'].concat(shared('./shared/'));
    }
    if (app === 'texas') {
      return ['./', './index.html', './style.css', './magazine.css', './app.js', './model.js', './map.js', './intel.js', './intel-ui.js', './newsletter.js', './magazine.js', './texas-geo.js', './data/opportunities.json', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'].concat(shared('../shared/'));
    }
    return ['./', './index.html', './style.css', './proj.js', './us-geo.js', './v2.js', './v4.js', './combined.js', './weekly.js', './v6.js', './model.js', './cost.js', './roadway.js', './pse.js', './sources.js', './app.js', './data/national.json', './data/roadway.json', './data/pse.json', './data/cost-prices.json', './data/source-status.json', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'].concat(shared('../shared/'));
  }
  return { VERSION: VERSION, name: name, files: files };
});
