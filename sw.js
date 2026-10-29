/* Radars landing page service worker. Precaches the landing shell; stale-while-revalidate for it.
   Requests under ./national/ and ./texas/ are NOT handled (they go straight to the network or to those apps' own service workers).
   lbonil3.github.io is shared with other repos: only caches named radars-home-* are ever deleted. Bump CACHE when files change. */
var PREFIX = 'radars-home-';
var CACHE = PREFIX + 'v1';
var FILES = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png', './icons/apple-touch-icon.png', './national/icon-192.png', './texas/icon-192.png'];
var BASE = new URL('./', self.location).href;
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== CACHE && k.indexOf(PREFIX) === 0; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); }));
});
function isShell(url) {
  if (url.indexOf(BASE) !== 0) return false;
  var rel = url.slice(BASE.length).split(/[?#]/)[0];
  if (rel === '' || rel === 'index.html') return true;
  return FILES.indexOf('./' + rel) >= 0;
}
self.addEventListener('fetch', function (e) {
  var req = e.request; if (req.method !== 'GET') return;
  if (!isShell(req.url)) return; // national/, texas/ and everything else: pass through untouched
  var key = req.mode === 'navigate' ? './index.html' : req.url.split(/[?#]/)[0];
  e.respondWith(caches.open(CACHE).then(function (c) {
    return c.match(key).then(function (hit) {
      var net = fetch(req).then(function (r) { if (r && r.ok) c.put(key, r.clone()); return r; });
      if (hit) { e.waitUntil(net.catch(function () {})); return hit; }
      return net.catch(function () { return c.match('./index.html'); });
    });
  }));
});
