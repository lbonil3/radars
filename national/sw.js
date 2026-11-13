importScripts('../shared/cache.js');
/* Offline cache for National Radar. Static files are cached on install; the data snapshot is network-first so a refreshed snapshot shows up when online. */
var CACHE = RadarCache.name('national');
var FILES = RadarCache.files('national');
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== CACHE && k.indexOf('radars-national-') === 0; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var req = e.request; if (req.method !== 'GET') return;
  var url = new URL(req.url); if (url.origin !== location.origin) return; // live API calls go straight to the network
  e.respondWith(fetch(req).then(function (r) {
    if (r && r.ok) { var copy = r.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }).catch(function () {}); }
    return r;
  }).catch(function () { return caches.match(req).then(function (m) { return m || caches.match('./index.html'); }); }));
});
