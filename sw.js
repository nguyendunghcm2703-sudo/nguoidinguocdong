/* Service worker: lưu sách để đọc khi không có mạng.
   Khi sửa nội dung hoặc giao diện, đổi số phiên bản VERSION bên dưới để máy người đọc tải bản mới. */
var VERSION = 'tkk-v4';
var FONTS = 'tkk-fonts-v1';
var SHELL = [
  './', 'index.html', 'css/style.css', 'js/content.js', 'js/app.js',
  'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== VERSION && k !== FONTS; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

function staleWhileRevalidate(req, cacheName, fallbackKey) {
  return caches.open(cacheName).then(function (cache) {
    return cache.match(req).then(function (hit) {
      var net = fetch(req).then(function (res) {
        if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
        return res;
      }).catch(function () { return hit || (fallbackKey ? cache.match(fallbackKey) : undefined); });
      return hit || net;
    });
  });
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin === self.location.origin) {
    e.respondWith(staleWhileRevalidate(req, VERSION, req.mode === 'navigate' ? 'index.html' : null));
  } else if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(staleWhileRevalidate(req, FONTS, null));
  }
});
