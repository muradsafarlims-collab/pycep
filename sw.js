/* PyCep service worker: keeps the app quick and usable on weak connections */
var V = 'pycep-v2';
var CORE = ['./', 'index.html', 'app.html', 'manifest.webmanifest', 'logo.svg', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(V).then(function (c) { return c.addAll(CORE); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) { return Promise.all(keys.filter(function (k) { return k !== V; }).map(function (k) { return caches.delete(k); })); })
      .then(function () { return self.clients.claim(); })
  );
});

function store(req, res) {
  try { caches.open(V).then(function (c) { return c.put(req, res); }).catch(function () {}); } catch (err) {}
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.pathname.indexOf('/downloads/') !== -1) return; // let file downloads go straight to the network
  if (url.origin === location.origin) {
    // Our own files: always try the network first so updates show up, fall back to the cache offline
    e.respondWith(
      fetch(req).then(function (res) { if (res && res.ok) store(req, res.clone()); return res; })
        .catch(function () { return caches.match(req).then(function (hit) { return hit || caches.match('index.html'); }); })
    );
  } else if (/(^|\.)(cdnjs\.cloudflare\.com|unpkg\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)$/.test(url.hostname)) {
    // Python engine and fonts: cache after the first load
    e.respondWith(
      caches.match(req).then(function (hit) {
        return hit || fetch(req).then(function (res) { store(req, res.clone()); return res; });
      })
    );
  }
});
